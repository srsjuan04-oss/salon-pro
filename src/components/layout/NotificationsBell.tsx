import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellRing, Calendar, CalendarX, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Notification {
  id: string;
  type: "new_appointment" | "cancellation";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function PushNotificationsToggle() {
  const { status, busy, enable, disable } = usePushNotifications();

  if (status === "loading" || status === "unsupported") return null;

  if (status === "needs-install") {
    return (
      <p className="text-xs text-muted-foreground">
        Para recibir avisos en el iPhone: en Safari toca Compartir → "Agregar a inicio" y abre CharlIA desde ese ícono.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-muted-foreground">
        Bloqueaste las notificaciones. Actívalas en los Ajustes del teléfono para CharlIA.
      </p>
    );
  }

  const onClick = async () => {
    try {
      if (status === "enabled") {
        await disable();
        toast.success("Notificaciones desactivadas en este dispositivo");
      } else if (await enable()) {
        toast.success("Listo, te avisaremos en este dispositivo");
      }
    } catch (err) {
      toast.error((err as Error).message || "No se pudieron activar las notificaciones");
    }
  };

  return (
    <Button
      variant={status === "enabled" ? "ghost" : "secondary"}
      size="sm"
      className="w-full gap-2 text-xs"
      onClick={onClick}
      disabled={busy}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
      {status === "enabled" ? "Desactivar avisos en este dispositivo" : "Activar avisos en este dispositivo"}
    </Button>
  );
}

export function NotificationsBell() {
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, read, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Notification[];
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (!unreadIds.length) return;
      const { error } = await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-semibold text-sm">Notificaciones</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3 h-3" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin notificaciones</p>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead.mutate(n.id)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-secondary/50 transition-colors ${!n.read ? "bg-secondary/30" : ""}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {n.type === "cancellation" ? (
                      <CalendarX className="w-4 h-4 text-destructive" />
                    ) : (
                      <Calendar className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm ${!n.read ? "font-medium" : ""}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t px-4 py-3">
          <PushNotificationsToggle />
        </div>
      </PopoverContent>
    </Popover>
  );
}
