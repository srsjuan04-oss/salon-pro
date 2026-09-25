// @ts-nocheck
// Registra el medio de pago de una organización recién creada desde /planes
// y arranca su prueba gratis de 15 días — NO cobra nada todavía. Se llama ya
// autenticado (justo después de supabase.auth.signUp()). Nunca confía en el
// monto ni el organization_id que mande el cliente: el precio sale de
// subscription_plans y el org_id del JWT del caller.
//
// El primer cobro real (mensualidad + implementación juntas) lo hace
// wompi-charge-subscriptions el día en que vence la prueba, salvo que la
// organización haya cancelado antes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const WOMPI_BASE = Deno.env.get("WOMPI_ENV") === "production"
  ? "https://production.wompi.co/v1"
  : "https://sandbox.wompi.co/v1";
const WOMPI_PRIVATE_KEY = Deno.env.get("WOMPI_PRIVATE_KEY")!;
const TRIAL_DAYS = 15;
// retowpp (Chat CharlIA, el módulo de WhatsApp): cada compra crea allá la misma cuenta.
const RETOWPP_BASE_URL = Deno.env.get("RETOWPP_BASE_URL") ?? "https://chat.charliacrm.com";
const RETOWPP_PROVISIONING_SECRET = Deno.env.get("RETOWPP_PROVISIONING_SECRET");

/**
 * Crea en retowpp la empresa y su admin con el MISMO correo y contraseña que el cliente
 * eligió en /planes, y le deja conectado el MCP de esta organización para el agente de IA.
 * La contraseña solo pasa por memoria (nunca se loguea ni se guarda). Es best-effort: si
 * retowpp falla, la compra en SalonPro sigue igual y el resultado queda en
 * organization_subscriptions.retowpp_status/retowpp_error para reintentar o darla de alta a mano.
 */
async function provisionRetowpp(
  admin: ReturnType<typeof createClient>,
  params: { orgId: string; email: string; password: string; fullName: string | null },
): Promise<string> {
  let status: string;
  let errorMessage: string | null = null;
  try {
    if (!RETOWPP_PROVISIONING_SECRET) {
      status = "not_configured";
    } else if (!params.password) {
      status = "no_password";
    } else {
      const { data: org } = await admin
        .from("organizations")
        .select("name, mcp_token")
        .eq("id", params.orgId)
        .single();
      const res = await fetch(`${RETOWPP_BASE_URL}/api/integrations/salonpro/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-provisioning-secret": RETOWPP_PROVISIONING_SECRET },
        body: JSON.stringify({
          organization_id: params.orgId,
          email: params.email,
          password: params.password,
          company_name: org?.name ?? "Mi Salón",
          full_name: params.fullName ?? undefined,
          mcp_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mcp-server`,
          mcp_token: org?.mcp_token ?? undefined,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await res.json().catch(() => ({}));
      status = result?.status ?? (res.ok ? "created" : "error");
      if (!res.ok) errorMessage = result?.error ?? `HTTP ${res.status}`;
    }
  } catch (e) {
    status = "error";
    errorMessage = (e as Error).message;
  }

  if (errorMessage) console.error("[wompi-create-subscription] retowpp:", status, errorMessage);
  await admin
    .from("organization_subscriptions")
    .update({ retowpp_status: status, retowpp_error: errorMessage, retowpp_synced_at: new Date().toISOString() })
    .eq("organization_id", params.orgId);
  return status;
}

async function wompiFetch(path: string, body: unknown) {
  const res = await fetch(`${WOMPI_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.reason ?? data?.error?.type ?? res.statusText;
    throw new Error(`Wompi ${path} falló: ${reason}`);
  }
  return data.data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Sesión inválida" }, 401);

    const { data: orgId, error: orgError } = await callerClient.rpc("current_org_id");
    if (orgError || !orgId) return json({ error: "No se pudo resolver la organización del usuario" }, 400);

    const body = await req.json().catch(() => ({}));
    const planCode = String(body.plan_code ?? "");
    const paymentType = String(body.payment_type ?? "");
    const token = String(body.token ?? "");
    const acceptanceToken = String(body.acceptance_token ?? "");
    const acceptPersonalAuth = String(body.accept_personal_auth ?? "");
    const customerEmail = String(body.customer_email ?? user.email ?? "");
    const password = String(body.password ?? "");

    if (!["CARD", "NEQUI", "DAVIPLATA", "BANCOLOMBIA_TRANSFER"].includes(paymentType)) {
      return json({ error: `Medio de pago no soportado: ${paymentType}` }, 400);
    }
    if (!token || !acceptanceToken || !acceptPersonalAuth || !customerEmail) {
      return json({ error: "Faltan datos de pago (token, acceptance_token, accept_personal_auth o email)." }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // La prueba gratis es solo para organizaciones nuevas: si ya tuvo una
    // suscripción (incluso cancelada o suspendida por falta de pago), el medio
    // de pago se cambia/reactiva desde Configuración, con cobro inmediato
    // (wompi-update-payment-method).
    const { data: existing } = await admin
      .from("organization_subscriptions")
      .select("status")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (existing && existing.status !== "pending_payment") {
      return json({
        error: "Tu negocio ya tiene una suscripción. Para cambiar el medio de pago o reactivarla, inicia sesión y ve a Configuración → Mi plan.",
      }, 409);
    }

    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("code, amount_in_cents, currency")
      .eq("code", planCode)
      .eq("active", true)
      .maybeSingle();
    if (planError || !plan) return json({ error: `Plan no encontrado: ${planCode}` }, 404);

    // Único paso con Wompi: crear la fuente de pago (usa la llave privada, por
    // eso vive en el backend). Esto NO mueve dinero — solo guarda el medio de
    // pago tokenizado para poder cobrarlo automáticamente cuando corresponda.
    const paymentSource = await wompiFetch("/payment_sources", {
      type: paymentType,
      token,
      customer_email: customerEmail,
      acceptance_token: acceptanceToken,
      accept_personal_auth: acceptPersonalAuth,
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
    const trialEndsAtStr = trialEndsAt.toISOString().slice(0, 10);

    const { error: subError } = await admin
      .from("organization_subscriptions")
      .upsert({
        organization_id: orgId,
        plan_code: plan.code,
        amount_in_cents: plan.amount_in_cents,
        status: "trialing",
        payment_source_type: paymentType,
        wompi_payment_source_id: String(paymentSource.id),
        customer_email: customerEmail,
        next_charge_date: trialEndsAtStr,
        failed_attempts: 0,
        cancel_at_period_end: false,
      }, { onConflict: "organization_id" });
    if (subError) throw new Error(`No se pudo guardar la suscripción: ${subError.message}`);

    const retowppStatus = await provisionRetowpp(admin, {
      orgId,
      email: user.email ?? customerEmail,
      password,
      fullName: (user.user_metadata?.name as string | undefined) ?? null,
    });

    return json({ status: "trialing", trial_ends_at: trialEndsAtStr, retowpp: retowppStatus });
  } catch (e) {
    console.error("[wompi-create-subscription] ERROR:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
