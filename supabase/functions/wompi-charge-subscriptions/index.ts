// @ts-nocheck
// Cobro diario de suscripciones (invocado por pg_cron vía pg_net, ver
// migración wompi_daily_billing_cron). Cobra a toda organización cuya
// next_charge_date ya llegó, reusando su payment_source_id guardado — el
// cliente no interviene. El webhook (wompi-webhook) es quien confirma el
// resultado y recién ahí avanza next_charge_date; aquí solo se dispara el cobro.
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
    .select("id, amount_in_cents, payment_source_type, wompi_payment_source_id, customer_email")
    .in("status", ["active", "past_due"])
    .lte("next_charge_date", today);
  if (dueError) return json({ error: dueError.message }, 500);

  const results: { subscription_id: string; ok: boolean; detail: string }[] = [];

  for (const sub of due ?? []) {
    try {
      if (!sub.wompi_payment_source_id) throw new Error("Sin payment_source_id");

      const reference = `sub_${sub.id}_${today.replace(/-/g, "")}`;
      const currency = "COP";
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

      const res = await fetch(`${WOMPI_BASE}/transactions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(txBody),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.reason ?? body?.error?.type ?? res.statusText);
      }
      const transaction = body.data;

      const { error: insertError } = await admin.from("subscription_payments").insert({
        subscription_id: sub.id,
        wompi_transaction_id: String(transaction.id),
        reference,
        amount_in_cents: sub.amount_in_cents,
        status: transaction.status ?? "PENDING",
        raw_response: transaction,
      });
      if (insertError) throw new Error(insertError.message);

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
