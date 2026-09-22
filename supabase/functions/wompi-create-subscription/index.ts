// @ts-nocheck
// Crea la primera suscripción de pago (Wompi) de una organización recién
// registrada desde /planes. Se llama ya autenticado (justo después de
// supabase.auth.signUp()). Nunca confía en el monto ni el organization_id
// que mande el cliente: el precio sale de subscription_plans y el org_id del
// JWT del caller.
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
const WOMPI_INTEGRITY_SECRET = Deno.env.get("WOMPI_INTEGRITY_SECRET")!;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
    const installments = Number.isFinite(body.installments) ? Number(body.installments) : 1;

    if (!["CARD", "NEQUI", "DAVIPLATA", "BANCOLOMBIA_TRANSFER"].includes(paymentType)) {
      return json({ error: `Medio de pago no soportado: ${paymentType}` }, 400);
    }
    if (!token || !acceptanceToken || !acceptPersonalAuth || !customerEmail) {
      return json({ error: "Faltan datos de pago (token, acceptance_token, accept_personal_auth o email)." }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("code, amount_in_cents, currency, implementation_fee_cents")
      .eq("code", planCode)
      .eq("active", true)
      .maybeSingle();
    if (planError || !plan) return json({ error: `Plan no encontrado: ${planCode}` }, 404);

    // Paso 1 (fuente de pago): usa la llave privada, por eso vive en el backend.
    const paymentSource = await wompiFetch("/payment_sources", {
      type: paymentType,
      token,
      customer_email: customerEmail,
      acceptance_token: acceptanceToken,
      accept_personal_auth: acceptPersonalAuth,
    });

    const amountInCents = plan.amount_in_cents;
    const currency = plan.currency ?? "COP";
    const reference = `sub_${orgId}_${Date.now()}`;
    const signature = await sha256Hex(`${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`);

    // Paso 2 (primer cobro): mismo endpoint que cualquier transacción, pero
    // usando payment_source_id en vez de payment_method con datos crudos.
    const txBody: Record<string, unknown> = {
      amount_in_cents: amountInCents,
      currency,
      customer_email: customerEmail,
      reference,
      signature,
      payment_source_id: paymentSource.id,
    };
    if (paymentType === "CARD") {
      txBody.payment_method = { installments };
      txBody.recurrent = true;
    }
    const transaction = await wompiFetch("/transactions", txBody);

    const { data: subscription, error: subError } = await admin
      .from("organization_subscriptions")
      .upsert({
        organization_id: orgId,
        plan_code: plan.code,
        amount_in_cents: amountInCents,
        status: "pending_payment",
        payment_source_type: paymentType,
        wompi_payment_source_id: String(paymentSource.id),
        customer_email: customerEmail,
      }, { onConflict: "organization_id" })
      .select("id")
      .single();
    if (subError) throw new Error(`No se pudo guardar la suscripción: ${subError.message}`);

    const { error: payError } = await admin.from("subscription_payments").insert({
      subscription_id: subscription.id,
      wompi_transaction_id: String(transaction.id),
      reference,
      amount_in_cents: amountInCents,
      status: transaction.status ?? "PENDING",
      kind: "subscription",
      raw_response: transaction,
    });
    if (payError) throw new Error(`No se pudo guardar el pago: ${payError.message}`);

    // Cobro único de implementación (si aplica): transacción SEPARADA, misma
    // fuente de pago. No debe sumarse al monto recurrente ni bloquear el
    // alta de la suscripción si falla — se puede reintentar/cobrar aparte.
    let implementationFee: { status: string; amount_in_cents: number } | null = null;
    if (plan.implementation_fee_cents > 0) {
      try {
        const implReference = `impl_${orgId}_${Date.now()}`;
        const implSignature = await sha256Hex(`${implReference}${plan.implementation_fee_cents}${currency}${WOMPI_INTEGRITY_SECRET}`);
        const implTxBody: Record<string, unknown> = {
          amount_in_cents: plan.implementation_fee_cents,
          currency,
          customer_email: customerEmail,
          reference: implReference,
          signature: implSignature,
          payment_source_id: paymentSource.id,
        };
        if (paymentType === "CARD") implTxBody.payment_method = { installments };
        const implTransaction = await wompiFetch("/transactions", implTxBody);

        await admin.from("subscription_payments").insert({
          subscription_id: subscription.id,
          wompi_transaction_id: String(implTransaction.id),
          reference: implReference,
          amount_in_cents: plan.implementation_fee_cents,
          status: implTransaction.status ?? "PENDING",
          kind: "implementation_fee",
          raw_response: implTransaction,
        });
        implementationFee = { status: implTransaction.status, amount_in_cents: plan.implementation_fee_cents };
      } catch (e) {
        console.error("[wompi-create-subscription] cobro de implementación falló:", (e as Error).message);
      }
    }

    return json({ reference, transaction_id: transaction.id, status: transaction.status, implementation_fee: implementationFee });
  } catch (e) {
    console.error("[wompi-create-subscription] ERROR:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
