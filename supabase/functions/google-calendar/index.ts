// Google Calendar integration: auth URL, disconnect, status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

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
    const action = body.action as string;

    if (action === "get_auth_url") {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      if (!clientId) {
        return new Response(JSON.stringify({ error: "GOOGLE_CLIENT_ID no está configurado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const origin = String(body.origin ?? "");
      if (!origin) {
        return new Response(JSON.stringify({ error: "Falta origin" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;
      const state = btoa(JSON.stringify({ org: organizationId, origin }));

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
        state,
      });

      return new Response(JSON.stringify({ url: `${GOOGLE_OAUTH_URL}?${params.toString()}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { data } = await supabase
        .from("calendar_integrations")
        .select("provider, connected_email, is_active, google_calendar_id")
        .eq("organization_id", organizationId)
        .eq("provider", "google")
        .maybeSingle();
      return new Response(JSON.stringify({ connected: !!data?.is_active, connected_email: data?.connected_email ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      const { error } = await supabase
        .from("calendar_integrations")
        .delete()
        .eq("organization_id", organizationId)
        .eq("provider", "google");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("google-calendar error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
