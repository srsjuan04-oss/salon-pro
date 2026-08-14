// Sends pending appointment reminders via Whapify (Chatrace)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHAPIFY_BASE = "https://api.chatrace.com";

function normalizePhone(p: string): string {
  return (p || "").replace(/[^\d]/g, "");
}

async function findOrCreateContact(token: string, phone: string, name: string): Promise<string | null> {
  // Try find first
  const found = await fetch(`${WHAPIFY_BASE}/contacts/find_by_custom_field?field_id=phone&value=${encodeURIComponent(phone)}`, {
    headers: { "X-ACCESS-TOKEN": token },
  });
  if (found.ok) {
    const j = await found.json().catch(() => null);
    const list = j?.data;
    if (Array.isArray(list) && list.length && list[0]?.id) return String(list[0].id);
  }
  // Create
  const [first_name, ...rest] = (name || "Cliente").split(" ");
  const created = await fetch(`${WHAPIFY_BASE}/contacts`, {
    method: "POST",
    headers: { "X-ACCESS-TOKEN": token, "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: phone.startsWith("+") ? phone : `+${phone}`,
      first_name: first_name || "Cliente",
      last_name: rest.join(" ") || undefined,
    }),
  });
  if (!created.ok) return null;
  const cj = await created.json().catch(() => null);
  return cj?.id ? String(cj.id) : (cj?.data?.id ? String(cj.data.id) : null);
}

async function sendFlow(token: string, contactId: string, flowId: string) {
  const res = await fetch(`${WHAPIFY_BASE}/contacts/${contactId}/send/${flowId}`, {
    method: "POST",
    headers: { "X-ACCESS-TOKEN": token },
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Whapify ahora es una conexión independiente por organización: se carga
    // el token activo de cada organización en vez de un token global único.
    const { data: allSettings } = await supabase
      .from("whapify_settings")
      .select("organization_id, whapify_token, is_active");
    const tokenByOrg = new Map(
      (allSettings ?? [])
        .filter((s: any) => s.is_active && s.whapify_token)
        .map((s: any) => [s.organization_id as string, s.whapify_token as string])
    );

    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Load active reminder settings per organización — inactive types must NOT send
    const { data: activeSettings } = await supabase
      .from("reminder_settings")
      .select("organization_id, reminder_type, whapify_flow_id, active")
      .eq("active", true);
    const activeTypes = new Set(
      (activeSettings ?? []).map((s: any) => `${s.organization_id}|${s.reminder_type}`)
    );

    const { data: reminders, error } = await supabase
      .from("appointment_reminders")
      .select(`
        *,
        appointment:appointments(id, status, appointment_date, start_time)
      `)
      .eq("status", "pending")
      .lte("scheduled_at", now.toISOString())
      .gte("scheduled_at", tenMinAgo.toISOString())
      .limit(100);

    if (error) throw error;

    let processed = 0;
    let failed = 0;

    for (const rem of reminders ?? []) {
      const appt = (rem as any).appointment;
      const orgId = (rem as any).organization_id as string | null;
      if (!appt || appt.status === "cancelled") {
        await supabase.from("appointment_reminders").update({ status: "cancelled", error_message: "Cita cancelada o inexistente" }).eq("id", rem.id);
        continue;
      }
      if (!orgId || !activeTypes.has(`${orgId}|${rem.reminder_type}`)) {
        await supabase.from("appointment_reminders").update({ status: "cancelled", error_message: "Recordatorio desactivado en configuración" }).eq("id", rem.id);
        continue;
      }
      if (!rem.whapify_flow_id || !rem.customer_phone) {
        await supabase.from("appointment_reminders").update({ status: "failed", error_message: "Faltan flow_id o teléfono" }).eq("id", rem.id);
        failed++;
        continue;
      }

      const token = tokenByOrg.get(orgId);
      if (!token) {
        await supabase.from("appointment_reminders").update({ status: "failed", error_message: "Whapify no está conectado o activo para esta organización" }).eq("id", rem.id);
        failed++;
        continue;
      }

      const phone = normalizePhone(rem.customer_phone);
      try {
        const contactId = await findOrCreateContact(token, phone, rem.customer_name || "Cliente");
        if (!contactId) {
          await supabase.from("appointment_reminders").update({ status: "failed", error_message: "No se pudo crear/encontrar contacto en Whapify" }).eq("id", rem.id);
          failed++;
          continue;
        }
        const send = await sendFlow(token, contactId, rem.whapify_flow_id);
        if (send.ok) {
          await supabase.from("appointment_reminders").update({
            status: "sent",
            sent_at: new Date().toISOString(),
            whapify_response: send.data as any,
          }).eq("id", rem.id);
          processed++;
        } else {
          await supabase.from("appointment_reminders").update({
            status: "failed",
            error_message: `Whapify ${send.status}: ${JSON.stringify(send.data).slice(0, 500)}`,
            whapify_response: send.data as any,
          }).eq("id", rem.id);
          failed++;
        }
      } catch (e) {
        await supabase.from("appointment_reminders").update({
          status: "failed",
          error_message: e instanceof Error ? e.message : "Unknown",
        }).eq("id", rem.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed, failed, total: reminders?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-appointment-reminders error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
