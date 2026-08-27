// Crea una cuenta de acceso (login) nueva para el equipo del admin que la solicita.
// Requiere service role porque: 1) crea el usuario ya confirmado con auth.admin,
// y 2) el trigger handle_new_user_org le crea automáticamente una organización
// propia, que aquí se reasigna a la organización del admin y se limpia.
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

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: callerRole } = await admin
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (callerRole?.role !== "admin" || !callerRole.organization_id) {
      return json({ error: "Requiere permisos de administrador" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    const role = ["admin", "staff", "barber"].includes(body.role) ? body.role : "staff";

    if (!email || !email.includes("@")) return json({ error: "Email inválido" }, 400);
    if (password.length < 6) return json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);
    if (!name) return json({ error: "El nombre es requerido" }, 400);

    // Una cuenta de barbero solo puede crearse para un barbero que ya existe en
    // Staff, para que la vista de "solo mis citas" tenga a qué fila enlazarse.
    let matchedBarberId: string | null = null;
    if (role === "barber") {
      const { data: matchedBarber } = await admin
        .from("barbers")
        .select("id, user_id")
        .eq("organization_id", callerRole.organization_id)
        .ilike("email", email)
        .maybeSingle();

      if (!matchedBarber) {
        return json({ error: "No hay ningún barbero en Staff con ese correo. Agrégalo primero en Staff con este mismo email." }, 400);
      }
      if (matchedBarber.user_id) {
        return json({ error: "Ese barbero ya tiene una cuenta de acceso vinculada." }, 400);
      }
      matchedBarberId = matchedBarber.id;
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError || !created?.user) {
      const msg = createError?.message?.toLowerCase().includes("already")
        ? "Este email ya está registrado"
        : (createError?.message ?? "No se pudo crear la cuenta");
      return json({ error: msg }, 400);
    }

    const newUserId = created.user.id;

    // Mover al usuario recién creado a la organización del admin y limpiar
    // la organización huérfana que el trigger le creó por defecto.
    const { data: autoRole } = await admin
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", newUserId)
      .maybeSingle();
    const staleOrgId = autoRole?.organization_id as string | undefined;

    const { error: reassignError } = await admin
      .from("user_roles")
      .update({ organization_id: callerRole.organization_id, role })
      .eq("user_id", newUserId);

    if (reassignError) {
      return json({ error: reassignError.message }, 500);
    }

    if (staleOrgId && staleOrgId !== callerRole.organization_id) {
      await admin.from("organizations").delete().eq("id", staleOrgId);
    }

    if (matchedBarberId) {
      const { error: linkError } = await admin
        .from("barbers")
        .update({ user_id: newUserId })
        .eq("id", matchedBarberId);
      if (linkError) {
        console.error("barber link error", linkError);
      }
    }

    return json({ success: true, user_id: newUserId });
  } catch (e) {
    console.error("create-team-account error", e);
    return json({ error: "Error interno" }, 500);
  }
});
