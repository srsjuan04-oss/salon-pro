import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<string, string> = {
  token_exchange_failed: "Google rechazó la conexión. Intenta de nuevo.",
  no_refresh_token: "Google no entregó permisos persistentes. Revoca el acceso en tu cuenta de Google y vuelve a intentarlo.",
  storage_failed: "No se pudo guardar la conexión. Intenta de nuevo.",
  missing_code: "La conexión fue cancelada.",
  unknown: "Ocurrió un error inesperado al conectar Google Calendar.",
};

export function GoogleCalendarCard() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: status, isLoading } = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar", { body: { action: "status" } });
      if (error) throw error;
      return data as { connected: boolean; connected_email: string | null };
    },
  });

  useEffect(() => {
    const calendar = searchParams.get("calendar");
    if (calendar !== "google") return;
    const result = searchParams.get("status");
    if (result === "connected") {
      toast.success("Google Calendar conectado");
      qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
    } else if (result === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      toast.error(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.unknown);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("calendar");
    next.delete("status");
    next.delete("reason");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar", {
        body: { action: "get_auth_url", origin: window.location.origin },
      });
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (d) => {
      window.location.href = d.url;
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo iniciar la conexión con Google"),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar", { body: { action: "disconnect" } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Google Calendar desconectado");
      qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const connected = Boolean(status?.connected);

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border">
      <div className="flex items-center gap-3">
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-8 h-8" />
        <div>
          <p className="font-medium">Google Calendar</p>
          <p className="text-sm text-muted-foreground">
            {connected && status?.connected_email
              ? `Conectado como ${status.connected_email}`
              : "Sincroniza tus citas con Google (CRM → Google)"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : connected ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
          </span>
          <Button variant="outline" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            Desconectar
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => connect.mutate()} disabled={connect.isPending}>
          {connect.isPending ? "Redirigiendo..." : "Conectar"}
        </Button>
      )}
    </div>
  );
}
