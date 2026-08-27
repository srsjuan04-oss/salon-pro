// Pushes one appointment (create/update/cancel) to the organization's connected Google Calendar.
// Called by the frontend right after an appointment is created/updated. Never blocks the
// appointment flow: if Google isn't connected or the call fails, it responds 200 with synced:false.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_BASE = "https://www.googleapis.com/calendar/v3/calendars";

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error(`No se pudo renovar el token de Google: ${JSON.stringify(json)}`);
  return { accessToken: json.access_token as string, expiresIn: (json.expires_in ?? 3600) as number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: role } = await supabase
      .from("user_roles").select("organization_id").eq("user_id", user.id).maybeSingle();
    if (!role?.organization_id) {
      return new Response(JSON.stringify({ error: "Sin organización" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const organizationId = role.organization_id as string;

    const body = await req.json().catch(() => ({}));
    const appointmentId = body.appointment_id as string;
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: "Falta appointment_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: integration } = await supabase
      .from("calendar_integrations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("provider", "google")
      .eq("is_active", true)
      .maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ synced: false, reason: "not_connected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .select("*, customer:customers(name, phone), barber:barbers(name), service:services(name, duration_minutes)")
      .eq("id", appointmentId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (apptError || !appt) {
      return new Response(JSON.stringify({ error: "Cita no encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: org } = await supabase.from("organizations").select("timezone").eq("id", organizationId).maybeSingle();
    const timeZone = org?.timezone ?? "America/Bogota";

    // Refresh the access token if it's expired or about to expire.
    let accessToken = integration.access_token as string | null;
    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
    if (!accessToken || expiresAt < Date.now() + 60_000) {
      try {
        const refreshed = await refreshAccessToken(integration.refresh_token as string);
        accessToken = refreshed.accessToken;
        await supabase.from("calendar_integrations").update({
          access_token: refreshed.accessToken,
          token_expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
        }).eq("id", integration.id);
      } catch (e) {
        console.error("token refresh failed", e);
        await supabase.from("calendar_integrations").update({ is_active: false }).eq("id", integration.id);
        return new Response(JSON.stringify({ synced: false, reason: "reauth_required" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const calendarId = encodeURIComponent(integration.google_calendar_id || "primary");
    const eventsUrl = `${EVENTS_BASE}/${calendarId}/events`;
    const gcalHeaders = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // Cancelled appointment with a synced event: remove it from Google instead of updating it.
    if (appt.status === "cancelled") {
      if (appt.google_event_id) {
        const del = await fetch(`${eventsUrl}/${appt.google_event_id}`, { method: "DELETE", headers: gcalHeaders });
        if (del.ok || del.status === 404 || del.status === 410) {
          await supabase.from("appointments").update({ google_event_id: null }).eq("id", appointmentId);
        }
      }
      return new Response(JSON.stringify({ synced: true, action: "cancelled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const customerName = appt.customer?.name ?? "Cliente";
    const barberName = appt.barber?.name;
    const serviceName = appt.service?.name ?? "Servicio";
    const notesLines = [
      barberName ? `Con: ${barberName}` : null,
      appt.customer?.phone ? `Teléfono: ${appt.customer.phone}` : null,
      appt.notes ? `Notas: ${appt.notes}` : null,
      "Sincronizado desde CharlIA CRM.",
    ].filter(Boolean);

    const eventBody = {
      summary: `${serviceName} - ${customerName}`,
      description: notesLines.join("\n"),
      start: { dateTime: `${appt.appointment_date}T${appt.start_time}`, timeZone },
      end: { dateTime: `${appt.appointment_date}T${appt.end_time}`, timeZone },
    };

    let gcalRes: Response;
    if (appt.google_event_id) {
      gcalRes = await fetch(`${eventsUrl}/${appt.google_event_id}`, {
        method: "PATCH",
        headers: gcalHeaders,
        body: JSON.stringify(eventBody),
      });
      if (gcalRes.status === 404 || gcalRes.status === 410) {
        // The event was deleted on Google's side; recreate it.
        gcalRes = await fetch(eventsUrl, { method: "POST", headers: gcalHeaders, body: JSON.stringify(eventBody) });
      }
    } else {
      gcalRes = await fetch(eventsUrl, { method: "POST", headers: gcalHeaders, body: JSON.stringify(eventBody) });
    }

    const gcalJson = await gcalRes.json().catch(() => ({}));
    if (!gcalRes.ok) {
      console.error("google calendar event error", gcalRes.status, gcalJson);
      return new Response(JSON.stringify({ synced: false, reason: "google_error", status: gcalRes.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (gcalJson.id && gcalJson.id !== appt.google_event_id) {
      await supabase.from("appointments").update({ google_event_id: gcalJson.id }).eq("id", appointmentId);
    }

    return new Response(JSON.stringify({ synced: true, action: appt.google_event_id ? "updated" : "created" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sync-appointment-to-google error", e);
    return new Response(JSON.stringify({ synced: false, error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
