// Envía una notificación push (Web Push) a los dispositivos que deben
// recibirla. La invoca el trigger dispatch_push_notification_trg con
// { notification_id } y el header x-push-secret guardado en Vault.
// - Aviso con recipient_user_id -> solo los dispositivos de ese barbero.
// - Aviso sin recipient_user_id -> dispositivos de admin/staff de la org.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: config, error: configError } = await admin.rpc("get_push_config").single();
    if (configError || !config?.webhook_secret || !config.vapid_public_key || !config.vapid_private_key) {
      console.error("send-push: configuración incompleta", configError);
      return json({ error: "Configuración incompleta" }, 500);
    }

    if (req.headers.get("x-push-secret") !== config.webhook_secret) {
      return json({ error: "No autorizado" }, 401);
    }

    const { notification_id } = await req.json().catch(() => ({}));
    if (!notification_id) return json({ error: "notification_id requerido" }, 400);

    const { data: notification } = await admin
      .from("notifications")
      .select("id, organization_id, recipient_user_id, title, message")
      .eq("id", notification_id)
      .maybeSingle();
    if (!notification) return json({ error: "Notificación no encontrada" }, 404);

    let userIds: string[];
    if (notification.recipient_user_id) {
      userIds = [notification.recipient_user_id];
    } else {
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", notification.organization_id)
        .in("role", ["admin", "staff"]);
      userIds = (roles ?? []).map((r) => r.user_id);
    }
    if (!userIds.length) return json({ sent: 0 });

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("organization_id", notification.organization_id)
      .in("user_id", userIds);
    if (!subscriptions?.length) return json({ sent: 0 });

    webpush.setVapidDetails("mailto:soporte@charliacrm.com", config.vapid_public_key, config.vapid_private_key);

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      tag: notification.id,
      url: "/calendar",
    });

    let sent = 0;
    const expired: string[] = [];
    await Promise.all(
      subscriptions.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404/410: el dispositivo desactivó el permiso o desinstaló la app.
          if (status === 404 || status === 410) {
            expired.push(s.id);
          } else {
            console.error("send-push: fallo al enviar", status, (err as Error).message);
          }
        }
      }),
    );

    if (expired.length) {
      await admin.from("push_subscriptions").delete().in("id", expired);
    }

    return json({ sent, expired: expired.length });
  } catch (err) {
    console.error("send-push: error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
