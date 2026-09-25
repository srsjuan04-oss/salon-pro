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
//
// Reintentos y suspensión: mientras el cobro no se aprueba, next_charge_date
// no avanza y se reintenta cada día. Pasados GRACE_DAYS desde la fecha de
// cobro se suspende el acceso (status=suspended) pero se sigue reintentando;
// si un cobro se aprueba, el webhook la reactiva. Pasados MAX_RETRY_DAYS se
// deja de cobrar y queda cancelada.
//
// Cobros PENDING (Nequi, Bancolombia): nunca se cobra de nuevo mientras haya
// uno sin resolver. Se consulta su estado en Wompi (por si el webhook no
// llegó) y, si sigue PENDING, se espera al día siguiente sin contar esos días
// para la suspensión.
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

const GRACE_DAYS = 4;
const MAX_RETRY_DAYS = 30;
const FAILED_STATUSES = ["DECLINED", "ERROR", "VOIDED"];

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Motivo del error de Wompi, con el detalle por campo de INPUT_VALIDATION_ERROR y sin la llave privada. */
function wompiErrorMessage(body: any, fallback: string): string {
  const error = body?.error;
  const details = error?.messages ? ` ${JSON.stringify(error.messages)}` : "";
  return `${error?.reason ?? error?.type ?? fallback}${details}`.replace(/prv_(prod|test)_\w+/g, "[llave privada]");
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
  if (!res.ok) throw new Error(wompiErrorMessage(body, res.statusText));
  return body.data;
}

async function getWompiTransaction(id: string) {
  const res = await fetch(`${WOMPI_BASE}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${WOMPI_PRIVATE_KEY}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(wompiErrorMessage(body, res.statusText));
  return body.data;
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.floor((Date.parse(toDate) - Date.parse(fromDate)) / 86_400_000);
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
    .select("id, status, plan_code, amount_in_cents, payment_source_type, wompi_payment_source_id, customer_email, cancel_at_period_end, next_charge_date, failed_attempts")
    .in("status", ["trialing", "active", "past_due", "suspended"])
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

      // Un cobro anterior sigue sin resolver: no se cobra de nuevo. Se
      // consulta a Wompi por si el webhook no llegó.
      const { data: pending } = await admin
        .from("subscription_payments")
        .select("id, wompi_transaction_id")
        .eq("subscription_id", sub.id)
        .eq("kind", "subscription")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pending) {
        const pendingTx = await getWompiTransaction(pending.wompi_transaction_id);
        const pendingStatus = String(pendingTx?.status ?? "PENDING");
        if (pendingStatus === "PENDING") {
          results.push({ subscription_id: sub.id, ok: true, detail: "waiting_pending_payment" });
          continue;
        }
        await admin
          .from("subscription_payments")
          .update({ status: pendingStatus, raw_response: pendingTx })
          .eq("id", pending.id);
        if (pendingStatus === "APPROVED") {
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
          results.push({ subscription_id: sub.id, ok: true, detail: "pending_payment_approved" });
          continue;
        }
        if (FAILED_STATUSES.includes(pendingStatus)) {
          sub.failed_attempts = (sub.failed_attempts ?? 0) + 1;
          if (sub.status !== "suspended") sub.status = "past_due";
          await admin
            .from("organization_subscriptions")
            .update({ status: sub.status, failed_attempts: sub.failed_attempts, updated_at: new Date().toISOString() })
            .eq("id", sub.id);
        }
      }

      const daysOverdue = daysBetween(sub.next_charge_date, today);
      if (daysOverdue >= MAX_RETRY_DAYS) {
        const { error: cancelError } = await admin
          .from("organization_subscriptions")
          .update({ status: "canceled", next_charge_date: null, updated_at: new Date().toISOString() })
          .eq("id", sub.id);
        if (cancelError) throw new Error(cancelError.message);
        results.push({ subscription_id: sub.id, ok: true, detail: "canceled_after_max_retries" });
        continue;
      }
      if (daysOverdue >= GRACE_DAYS && sub.status !== "suspended") {
        const { error: suspendError } = await admin
          .from("organization_subscriptions")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .eq("id", sub.id);
        if (suspendError) throw new Error(suspendError.message);
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
      // el plan la tiene y todavía no se ha cobrado (ni está en curso).
      const implementationFeeCents = implementationFeeByPlan.get(sub.plan_code) ?? 0;
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
