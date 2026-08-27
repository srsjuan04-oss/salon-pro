// Public redirect target for Google's OAuth consent screen.
// Exchanges the auth code for tokens and stores them for the organization.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function redirect(origin: string, params: Record<string, string>) {
  const url = new URL(origin);
  url.pathname = "/settings";
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  let state: { org?: string; origin?: string } = {};
  try {
    if (stateRaw) state = JSON.parse(atob(stateRaw));
  } catch {
    // ignore malformed state
  }
  const origin = state.origin || "https://example.com";

  if (errorParam || !code || !state.org) {
    return redirect(origin, { calendar: "google", status: "error", reason: errorParam || "missing_code" });
  }

  try {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("google token exchange failed", tokenJson);
      return redirect(origin, { calendar: "google", status: "error", reason: "token_exchange_failed" });
    }

    if (!tokenJson.refresh_token) {
      // Happens if the user previously granted access without prompt=consent forcing a re-issue.
      return redirect(origin, { calendar: "google", status: "error", reason: "no_refresh_token" });
    }

    const userinfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const userinfo = await userinfoRes.json().catch(() => ({}));

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 3600) * 1000).toISOString();

    const { error } = await supabase.from("calendar_integrations").upsert({
      organization_id: state.org,
      provider: "google",
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      token_expires_at: expiresAt,
      connected_email: userinfo?.email ?? null,
      is_active: true,
    }, { onConflict: "organization_id,provider" });

    if (error) {
      console.error("calendar_integrations upsert error", error);
      return redirect(origin, { calendar: "google", status: "error", reason: "storage_failed" });
    }

    return redirect(origin, { calendar: "google", status: "connected" });
  } catch (e) {
    console.error("google-calendar-callback error", e);
    return redirect(origin, { calendar: "google", status: "error", reason: "unknown" });
  }
});
