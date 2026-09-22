// @ts-nocheck
// Cobro diario de suscripciones (invocado por pg_cron vía pg_net, ver
// migración wompi_daily_billing_cron). Procesa toda organización cuya
// next_charge_date ya llegó:
//   - Si cancel_at_period_end=true: suspende (status=canceled) sin cobrar —
//     así se respeta el periodo ya pagado (la prueba gratis o el mes en
//     curso) sin generar un cobro que el negocio ya dijo que no quiere.
//   - Si no: cobra la mensualidad y, si todavía no se ha cobrado nunca el
//     fee de implementación de esta suscripción (primera conversión desde
//     prueba gratis, o primer cobro histórico), también lo cobra como
//     transacción separada.
// El webhook (wompi-webhook) es quien confirma el resultado y recién ahí
// avanza next_charge_date / activa la suscripción; aquí solo se disparan los
// cobros.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const WOMPI_BASE = Deno.env.get("WOMPI_ENV") === "production"
  ? "https://production.wompi.co/v1"
  : "https://sandbox.wompi.co/v1";
const WOMPI_PRIVATE_KEY = Deno.env.get("WOMPI_PRIVATE_KEY")!;
const WOMPI_INTEGRITY_SECRET = Deno.env.get("WOMPI_INTEGRITY_SECRET")!;
const CRON_SECRET = Deno.env.get("WOMPI_CRON_SECRET")!;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function chargeWompi(payload: Record<string, unknown>) {
  const res = await fetch(`${WOMPI_BASE}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.reason ?? body?.error?.type ?? res.statusText);
  }
  return body.data;
}

Deno.serve(async (req) => {
  const providedSecret = req.headers.get("x-cron-secret") ?? "";
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return json({ error: "No autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const today = new Date().toISOString().slice(0, 10);
  const { data: due, error: dueError } = await admin
    .from("organization_subscriptions")
    .select("id, plan_code, amount_in_cents, payment_source_type, wompi_payment_source_id, customer_email, cancel_at_period_end")
    .in("status", ["trialing", "active", "past_due"])
    .lte("next_charge_date", today);
  if (dueError) return json({ error: dueError.message }, 500);

  const { data: plans } = await admin.from("subscription_plans").select("code, implementation_fee_cents");
  const implementationFeeByPlan = new Map((plans ?? []).map((p: any) => [p.code, Number(p.implementation_fee_cents) || 0]));

  const results: { subscription_id: string; ok: boolean; detail: string }[] = [];

  for (const sub of due ?? []) {
    try {
      // La organización pidió no renovar: se respeta el periodo ya pagado
      // (no se cobra nada) y se suspende justo el día que le tocaba pagar.
      if (sub.cancel_at_period_end) {
        const { error: cancelError } = await admin
          .from("organization_subscriptions")
          .update({ status: "canceled", next_charge_date: null, updated_at: new Date().toISOString() })
          .eq("id", sub.id);
        if (cancelError) throw new Error(cancelError.message);
        results.push({ subscription_id: sub.id, ok: true, detail: "canceled_at_period_end" });
        continue;
      }

      if (!sub.wompi_payment_source_id) throw new Error("Sin payment_source_id");
      const currency = "COP";

      const reference = `sub_${sub.id}_${today.replace(/-/g, "")}`;
      const signature = await sha256Hex(`${reference}${sub.amount_in_cents}${currency}${WOMPI_INTEGRITY_SECRET}`);
      const txBody: Record<string, unknown> = {
        amount_in_cents: sub.amount_in_cents,
        currency,
        customer_email: sub.customer_email,
        reference,
        signature,
        payment_source_id: Number(sub.wompi_payment_source_id) || sub.wompi_payment_source_id,
      };
      if (sub.payment_source_type === "CARD") {
        txBody.payment_method = { installments: 1 };
        txBody.recurrent = true;
      }
      const transaction = await chargeWompi(txBody);

      const { error: insertError } = await admin.from("subscription_payments").insert({
        subscription_id: sub.id,
        wompi_transaction_id: String(transaction.id),
        reference,
        amount_in_cents: sub.amount_in_cents,
        status: transaction.status ?? "PENDING",
        kind: "subscription",
        raw_response: transaction,
      });
      if (insertError) throw new Error(insertError.message);

      // Primer cobro real de esta suscripción (fin de la prueba gratis, o
      // primera vez que se factura): también cobra la implementación, si
      // el plan la tiene y todavía no se ha cobrado nunca.
      const implementationFeeCents = implementationFeeByPlan.get(sub.plan_code) ?? 0;
      if (implementationFeeCents > 0) {
        const { data: alreadyCharged } = await admin
          .from("subscription_payments")
          .select("id")
          .eq("subscription_id", sub.id)
          .eq("kind", "implementation_fee")
          .eq("status", "APPROVED")
          .limit(1)
          .maybeSingle();

        if (!alreadyCharged) {
          try {
            const implReference = `impl_${sub.id}_${today.replace(/-/g, "")}`;
            const implSignature = await sha256Hex(`${implReference}${implementationFeeCents}${currency}${WOMPI_INTEGRITY_SECRET}`);
            const implTxBody: Record<string, unknown> = {
              amount_in_cents: implementationFeeCents,
              currency,
              customer_email: sub.customer_email,
              reference: implReference,
              signature: implSignature,
              payment_source_id: Number(sub.wompi_payment_source_id) || sub.wompi_payment_source_id,
            };
            if (sub.payment_source_type === "CARD") implTxBody.payment_method = { installments: 1 };
            const implTransaction = await chargeWompi(implTxBody);

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
            // No bloquea el cobro de la mensualidad si el de implementación falla.
            console.error(`[wompi-charge-subscriptions] implementación ${sub.id}:`, (e as Error).message);
          }
        }
      }

      results.push({ subscription_id: sub.id, ok: true, detail: transaction.status });
    } catch (e) {
      // Un error de una suscripción (ej. referencia duplicada si el cron ya
      // corrió hoy) no debe detener el cobro de las demás.
      console.error(`[wompi-charge-subscriptions] ${sub.id}:`, (e as Error).message);
      results.push({ subscription_id: sub.id, ok: false, detail: (e as Error).message });
    }
  }

  return json({ processed: results.length, results });
});
