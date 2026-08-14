// Crea una empresa nueva e independiente (con su propio admin) desde el
// panel del propietario de la plataforma. A diferencia de create-team-account
// (que reasigna al usuario a la organización del admin que lo invita), aquí
// dejamos que el trigger handle_new_user_org haga lo suyo: crea una
// organización nueva y asigna al usuario como admin de esa organización.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Sesión inválida" }, 401);

    const { data: isPlatformAdmin, error: platformAdminError } = await callerClient.rpc("is_platform_admin");
    if (platformAdminError || !isPlatformAdmin) {
      return json({ error: "Requiere permisos de propietario de la plataforma" }, 403);
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    const salonName = String(body.salonName ?? "").trim();

    if (!email || !email.includes("@")) return json({ error: "Email inválido" }, 400);
    if (password.length < 6) return json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);
    if (!name) return json({ error: "El nombre del administrador es requerido" }, 400);
    if (!salonName) return json({ error: "El nombre del negocio es requerido" }, 400);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, salon_name: salonName },
    });

    if (createError || !created?.user) {
      const msg = createError?.message?.toLowerCase().includes("already")
        ? "Este email ya está registrado"
        : (createError?.message ?? "No se pudo crear la cuenta");
      return json({ error: msg }, 400);
    }

    return json({ success: true, user_id: created.user.id });
  } catch (e) {
    console.error("create-company-account error", e);
    return json({ error: "Error interno" }, 500);
  }
});
