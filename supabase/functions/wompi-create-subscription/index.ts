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

    if (!["CARD", "NEQUI", "DAVIPLATA", "BANCOLOMBIA_TRANSFER"].includes(paymentType)) {
      return json({ error: `Medio de pago no soportado: ${paymentType}` }, 400);
    }
    if (!token || !acceptanceToken || !acceptPersonalAuth || !customerEmail) {
      return json({ error: "Faltan datos de pago (token, acceptance_token, accept_personal_auth o email)." }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

    return json({ status: "trialing", trial_ends_at: trialEndsAtStr });
  } catch (e) {
    console.error("[wompi-create-subscription] ERROR:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
