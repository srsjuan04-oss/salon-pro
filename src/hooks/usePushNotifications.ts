import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Llave pública VAPID (la privada vive en Supabase Vault).
const VAPID_PUBLIC_KEY =
  "BM4dxI3kuslnsX62A4yqPIps4vHjTwkGUNdipWELzRV5rZ3m4XvpLiYzzA9JIWMwZ6Gu_wBQaUwRcbXfkCk3QxU";

export type PushStatus =
  | "loading"
  | "unsupported" // el navegador no soporta push
  | "needs-install" // iPhone/iPad fuera del acceso directo de la pantalla de inicio
  | "denied" // el usuario bloqueó el permiso
  | "disabled" // soportado, aún no activado en este dispositivo
  | "enabled";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js");
}

async function saveSubscription(sub: PushSubscription) {
  const { endpoint, keys } = sub.toJSON();
  const { error } = await supabase.rpc("register_push_subscription", {
    _endpoint: endpoint!,
    _p256dh: keys!.p256dh,
    _auth: keys!.auth,
    _user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (isIos() && !isStandalone()) return setStatus("needs-install");
      if (!isSupported()) return setStatus("unsupported");
      if (Notification.permission === "denied") return setStatus("denied");

      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        // Re-vincula el dispositivo a la cuenta con la que se inició sesión.
        await saveSubscription(sub).catch(() => {});
        setStatus("enabled");
      } else {
        setStatus("disabled");
      }
    })().catch(() => setStatus("unsupported"));
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      // En iOS el permiso debe pedirse directamente desde el toque del usuario.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "disabled");
        return false;
      }
      const reg = await getRegistration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      await saveSubscription(sub);
      setStatus("enabled");
      return true;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.rpc("unregister_push_subscription", { _endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setStatus("disabled");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable };
}
