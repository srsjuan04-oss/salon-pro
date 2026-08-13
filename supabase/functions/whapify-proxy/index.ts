// Whapify (Chatrace) API proxy: validate token, list flows, sync flows
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHAPIFY_BASE = "https://api.chatrace.com";

async function whapifyFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${WHAPIFY_BASE}${path}`, {
    ...init,
    headers: {
      "X-ACCESS-TOKEN": token,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { ok: res.ok, status: res.status, data: json };
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
    const action = body.action as string;

    // Load current token (used by all actions except save_token)
    async function getToken(override?: string): Promise<string | null> {
      if (override) return override;
      const { data } = await supabase.from("whapify_settings").select("whapify_token").eq("singleton", true).maybeSingle();
      return data?.whapify_token ?? null;
    }

    if (action === "save_token") {
      const token = String(body.token ?? "").trim();
      if (!token) return new Response(JSON.stringify({ error: "Token requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // Validate
      const v = await whapifyFetch(token, "/accounts/flows");
      const valid = v.ok && Array.isArray(v.data);
      const { error: upsertError } = await supabase.from("whapify_settings").upsert({
        singleton: true,
        organization_id: organizationId,
        whapify_token: token,
        is_active: valid,
        last_validated_at: new Date().toISOString(),
      }, { onConflict: "singleton" });
      if (upsertError) {
        console.error("whapify_settings upsert error", upsertError);
        return new Response(JSON.stringify({ error: upsertError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: valid, flows_count: valid ? (v.data as unknown[]).length : 0 }), {
        status: valid ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "validate") {
      const token = await getToken(body.token);
      if (!token) return new Response(JSON.stringify({ valid: false, error: "Sin token" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const v = await whapifyFetch(token, "/accounts/flows");
      const valid = v.ok && Array.isArray(v.data);
      await supabase.from("whapify_settings").update({ is_active: valid, last_validated_at: new Date().toISOString() }).eq("singleton", true);
      return new Response(JSON.stringify({ valid, status: v.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "sync_flows") {
      const token = await getToken();
      if (!token) return new Response(JSON.stringify({ error: "Token no configurado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const v = await whapifyFetch(token, "/accounts/flows");
      if (!v.ok || !Array.isArray(v.data)) {
        return new Response(JSON.stringify({ error: "Whapify error", status: v.status, data: v.data }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const flows = v.data as Array<{ id: string | number; name: string }>;
      const rows = flows.map(f => ({
        flow_id: String(f.id),
        organization_id: organizationId,
        flow_name: f.name ?? `Flow ${f.id}`,
        is_active: true,
        raw_data: f as unknown as Record<string, unknown>,
        synced_at: new Date().toISOString(),
      }));
      // Upsert all
      if (rows.length) {
        const { error } = await supabase.from("whapify_flows").upsert(rows, { onConflict: "flow_id" });
        if (error) throw error;
      }
      await supabase.from("whapify_settings").update({ last_synced_at: new Date().toISOString() }).eq("singleton", true);
      return new Response(JSON.stringify({ success: true, count: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("whapify-proxy error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
