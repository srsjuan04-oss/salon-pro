// @ts-nocheck
// URL de eventos de Wompi (configurar en el Dashboard de comercios, una
// distinta para Sandbox y Producción). Verifica el checksum SHA256 antes de
// procesar cualquier evento — ver https://docs.wompi.co/docs/colombia/eventos/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const WOMPI_EVENTS_SECRET = Deno.env.get("WOMPI_EVENTS_SECRET")!;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: any, key) => (acc == null ? acc : acc[key]), obj);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => null);
    if (!payload || !payload.signature || !payload.data) return json({ received: true });

    const properties: string[] = payload.signature.properties ?? [];
    const concatenated = properties.map((p) => String(getPath(payload.data, p) ?? "")).join("") +
      String(payload.timestamp) + WOMPI_EVENTS_SECRET;
    const computed = await sha256Hex(concatenated);
    const provided = String(payload.signature.checksum ?? "").toLowerCase();
    if (computed.toLowerCase() !== provided) {
      console.warn("[wompi-webhook] checksum inválido, evento ignorado");
      return json({ received: true, ignored: true });
    }

    if (payload.event !== "transaction.updated") {
      return json({ received: true });
    }

    const transaction = payload.data.transaction;
    const reference = String(transaction?.reference ?? "");
    const status = String(transaction?.status ?? "");
    if (!reference || !status) return json({ received: true });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: payment, error: findError } = await admin
      .from("subscription_payments")
      .select("id, subscription_id, kind, status")
      .eq("reference", reference)
      .maybeSingle();
    if (findError) throw new Error(findError.message);
    if (!payment) {
      // Puede ser un evento de otra referencia (no relacionada a suscripciones).
      return json({ received: true, unmatched: true });
    }

    const { error: updatePaymentError } = await admin
      .from("subscription_payments")
      .update({
        wompi_transaction_id: String(transaction.id ?? ""),
        status,
        raw_response: payload.data,
      })
      .eq("id", payment.id);
    if (updatePaymentError) throw new Error(updatePaymentError.message);

    // El cobro de implementación es único y no debe activar/extender la
    // suscripción ni contar como un ciclo de facturación fallido — solo se
    // registra su propio estado arriba.
    if (payment.kind === "implementation_fee") {
      return json({ received: true });
    }

    // Evento repetido (Wompi reintenta), o el cron ya resolvió este cobro
    // PENDING consultando a Wompi: la suscripción ya quedó actualizada.
    if (payment.status === status) {
      return json({ received: true, duplicate: true });
    }

    if (status === "APPROVED") {
      const nextChargeDate = new Date();
      nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
      const { error: subUpdateError } = await admin
        .from("organization_subscriptions")
        .update({
          status: "active",
          next_charge_date: nextChargeDate.toISOString().slice(0, 10),
          failed_attempts: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.subscription_id);
      if (subUpdateError) throw new Error(subUpdateError.message);
    } else if (status === "DECLINED" || status === "ERROR" || status === "VOIDED") {
      const { data: sub } = await admin
        .from("organization_subscriptions")
        .select("status, failed_attempts")
        .eq("id", payment.subscription_id)
        .maybeSingle();
      if (sub?.status === "canceled") return json({ received: true });
      const { error: subUpdateError } = await admin
        .from("organization_subscriptions")
        .update({
          // Una suscripción ya suspendida sigue suspendida hasta que un cobro se apruebe.
          status: sub?.status === "suspended" ? "suspended" : "past_due",
          failed_attempts: (sub?.failed_attempts ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.subscription_id);
      if (subUpdateError) throw new Error(subUpdateError.message);
    }

    return json({ received: true });
  } catch (e) {
    console.error("[wompi-webhook] ERROR:", (e as Error).message);
    // 500 para que Wompi reintente (30min, 3h, 24h) — ver docs/eventos.
    return json({ error: (e as Error).message }, 500);
  }
});
