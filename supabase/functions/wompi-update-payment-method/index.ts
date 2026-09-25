// @ts-nocheck
// Cambia el medio de pago de una organización que ya tiene suscripción
// (Configuración → Mi plan). Solo la puede usar un admin de la organización.
//
//   - Si la suscripción está al día (trialing/active sin cobro vencido): solo
//     reemplaza la fuente de pago; el próximo cobro sale del cron como siempre.
//   - Si tiene un cobro vencido (past_due/suspended, o cancelada y la quiere
//     reactivar): cobra la mensualidad de inmediato con el medio nuevo, sin
//     prueba gratis. Espera unos segundos la respuesta de Wompi y, si se
//     aprueba, reactiva la suscripción en el acto (el webhook también lo haría,
//     pero así el acceso vuelve sin esperar).
//
// Nunca cobra si ya hay un cobro PENDING sin resolver (evita cobrar dos veces).
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

const OVERDUE_STATUSES = ["past_due", "suspended", "canceled"];
const FAILED_STATUSES = ["DECLINED", "ERROR", "VOIDED"];

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function wompiFetch(path: string, body?: unknown) {
  const res = await fetch(`${WOMPI_BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Wompi repite la llave recibida en algunos errores: nunca devolverla al navegador.
    const reason = String(data?.error?.reason ?? data?.error?.type ?? res.statusText)
      .replace(/prv_(prod|test)_\w+/g, "[llave privada]");
    throw new Error(`Wompi ${path} falló: ${reason}`);
  }
  return data.data;
}

/** Espera a que Wompi resuelva la transacción; devuelve PENDING si no alcanza. */
async function waitForTransaction(id: string, maxAttempts = 8, intervalMs = 3000) {
  let transaction = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    transaction = await wompiFetch(`/transactions/${id}`).catch(() => transaction);
    if (transaction && transaction.status !== "PENDING") return transaction;
  }
  return transaction;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Sesión inválida" }, 401);

    const { data: orgId, error: orgError } = await callerClient.rpc("current_org_id");
    if (orgError || !orgId) return json({ error: "No se pudo resolver la organización del usuario" }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (role?.role !== "admin") return json({ error: "Solo un administrador puede cambiar el medio de pago." }, 403);

    const body = await req.json().catch(() => ({}));
    const paymentType = String(body.payment_type ?? "");
    const token = String(body.token ?? "");
    const acceptanceToken = String(body.acceptance_token ?? "");
    const acceptPersonalAuth = String(body.accept_personal_auth ?? "");

    if (!["CARD", "NEQUI", "DAVIPLATA", "BANCOLOMBIA_TRANSFER"].includes(paymentType)) {
      return json({ error: `Medio de pago no soportado: ${paymentType}` }, 400);
    }
    if (!token || !acceptanceToken || !acceptPersonalAuth) {
      return json({ error: "Faltan datos de pago (token, acceptance_token o accept_personal_auth)." }, 400);
    }

    const { data: sub, error: subError } = await admin
      .from("organization_subscriptions")
      .select("id, status, plan_code, amount_in_cents, customer_email, next_charge_date")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (subError) throw new Error(subError.message);
    if (!sub) return json({ error: "Tu negocio no tiene una suscripción. Elige un plan en /planes." }, 404);

    const customerEmail = sub.customer_email ?? user.email;
    const paymentSource = await wompiFetch("/payment_sources", {
      type: paymentType,
      token,
      customer_email: customerEmail,
      acceptance_token: acceptanceToken,
      accept_personal_auth: acceptPersonalAuth,
    });

    const today = new Date().toISOString().slice(0, 10);
    const mustCharge = OVERDUE_STATUSES.includes(sub.status) ||
      (sub.next_charge_date !== null && sub.next_charge_date <= today);

    const { error: updateError } = await admin
      .from("organization_subscriptions")
      .update({
        payment_source_type: paymentType,
        wompi_payment_source_id: String(paymentSource.id),
        ...(mustCharge ? { cancel_at_period_end: false } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
    if (updateError) throw new Error(updateError.message);

    if (!mustCharge) return json({ charged: false, status: sub.status });

    const { data: pending } = await admin
      .from("subscription_payments")
      .select("id")
      .eq("subscription_id", sub.id)
      .eq("kind", "subscription")
      .eq("status", "PENDING")
      .limit(1)
      .maybeSingle();
    if (pending) {
      return json({ charged: false, pending: true, status: sub.status });
    }

    const currency = "COP";
    const paymentSourceId = Number(paymentSource.id) || paymentSource.id;
    const reference = `sub_${sub.id}_${Date.now()}`;
    const txBody: Record<string, unknown> = {
      amount_in_cents: sub.amount_in_cents,
      currency,
      customer_email: customerEmail,
      reference,
      signature: await sha256Hex(`${reference}${sub.amount_in_cents}${currency}${WOMPI_INTEGRITY_SECRET}`),
      payment_source_id: paymentSourceId,
    };
    if (paymentType === "CARD") {
      txBody.payment_method = { installments: 1 };
      txBody.recurrent = true;
    }
    const created = await wompiFetch("/transactions", txBody);

    const { data: payment, error: insertError } = await admin
      .from("subscription_payments")
      .insert({
        subscription_id: sub.id,
        wompi_transaction_id: String(created.id),
        reference,
        amount_in_cents: sub.amount_in_cents,
        status: created.status ?? "PENDING",
        kind: "subscription",
        raw_response: created,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    // Implementación: solo si nunca se ha cobrado (ej. canceló durante la
    // prueba gratis y ahora vuelve). Mismo criterio que el cron.
    const { data: plan } = await admin
      .from("subscription_plans")
      .select("implementation_fee_cents")
      .eq("code", sub.plan_code)
      .maybeSingle();
    const implementationFeeCents = Number(plan?.implementation_fee_cents) || 0;
    if (implementationFeeCents > 0) {
      const { data: alreadyCharged } = await admin
        .from("subscription_payments")
        .select("id")
        .eq("subscription_id", sub.id)
        .eq("kind", "implementation_fee")
        .in("status", ["APPROVED", "PENDING"])
        .limit(1)
        .maybeSingle();
      if (!alreadyCharged) {
        try {
          const implReference = `impl_${sub.id}_${Date.now()}`;
          const implTxBody: Record<string, unknown> = {
            amount_in_cents: implementationFeeCents,
            currency,
            customer_email: customerEmail,
            reference: implReference,
            signature: await sha256Hex(`${implReference}${implementationFeeCents}${currency}${WOMPI_INTEGRITY_SECRET}`),
            payment_source_id: paymentSourceId,
          };
          if (paymentType === "CARD") implTxBody.payment_method = { installments: 1 };
          const implTransaction = await wompiFetch("/transactions", implTxBody);
          await admin.from("subscription_payments").insert({
            subscription_id: sub.id,
            wompi_transaction_id: String(implTransaction.id),
            reference: implReference,
            amount_in_cents: implementationFeeCents,
            status: implTransaction.status ?? "PENDING",
            kind: "implementation_fee",
            raw_response: implTransaction,
          });
        } catch (e) {
          console.error(`[wompi-update-payment-method] implementación ${sub.id}:`, (e as Error).message);
        }
      }
    }

    const transaction = created.status === "PENDING" ? await waitForTransaction(String(created.id)) : created;
    const txStatus = String(transaction?.status ?? "PENDING");
    if (txStatus === "PENDING") {
      // Lo resuelve el webhook (o el cron, que nunca cobra encima de un PENDING).
      return json({ charged: true, status: "PENDING" });
    }

    await admin
      .from("subscription_payments")
      .update({ status: txStatus, raw_response: transaction })
      .eq("id", payment.id);

    if (txStatus === "APPROVED") {
      const nextChargeDate = new Date();
      nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
      await admin
        .from("organization_subscriptions")
        .update({
          status: "active",
          next_charge_date: nextChargeDate.toISOString().slice(0, 10),
          failed_attempts: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      return json({ charged: true, status: "APPROVED" });
    }

    if (FAILED_STATUSES.includes(txStatus) && sub.status !== "canceled") {
      const { data: current } = await admin
        .from("organization_subscriptions")
        .select("failed_attempts")
        .eq("id", sub.id)
        .maybeSingle();
      await admin
        .from("organization_subscriptions")
        .update({ failed_attempts: (current?.failed_attempts ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", sub.id);
    }
    return json({
      charged: true,
      status: txStatus,
      reason: transaction?.status_message ?? null,
    });
  } catch (e) {
    console.error("[wompi-update-payment-method] ERROR:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
