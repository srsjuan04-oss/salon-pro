import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Clock, User, Check, X, RefreshCw, MoreVertical, Loader2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppointments, useUpdateAppointment, Appointment } from "@/hooks/useAppointments";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const statusStyles: Record<string, string> = {
  pending: "bg-primary/10 text-primary border-primary/20",
  confirmed: "bg-info/10 text-info border-info/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  rescheduled: "bg-warning/10 text-warning border-warning/20",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  confirmed: Check,
  completed: Check,
  cancelled: X,
  rescheduled: RefreshCw,
};

const avatarFallbacks = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100",
];

export function AppointmentList() {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointments(todayStr);
  const updateAppointment = useUpdateAppointment();

  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  const displayedAppointments = (appointments ?? []).map((apt) => ({
    ...apt,
    status: (localStatuses[apt.id] as Appointment["status"]) || apt.status,
  }));

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLocalStatuses((prev) => ({ ...prev, [id]: newStatus }));
    try {
      await updateAppointment.mutateAsync({ id, status: newStatus });
      toast.success(`Cita ${statusLabels[newStatus]?.toLowerCase() || "actualizada"}`);
    } catch (error) {
      setLocalStatuses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.error("Error al actualizar la cita");
    }
  };

  const handleViewCalendar = () => {
    navigate("/calendar");
  };

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Citas de Hoy</h3>
          <p className="text-sm text-muted-foreground">
            {format(today, "d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <button
          onClick={handleViewCalendar}
          className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
        >
          <CalendarIcon className="w-4 h-4" />
          Ver en calendario
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : displayedAppointments.length === 0 ? (
        <div className="text-center py-10">
          <CalendarIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No tienes citas para hoy.</p>
          <Button
            variant="link"
            className="text-primary mt-2"
            onClick={handleViewCalendar}
          >
            Ir al calendario
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedAppointments.map((apt, index) => {
            const StatusIcon = statusIcons[apt.status] || Clock;
            const avatarUrl = avatarFallbacks[index % avatarFallbacks.length];
            return (
              <div
                key={apt.id}
                onClick={() => navigate("/calendar")}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group cursor-pointer",
                  apt.status === "cancelled" && "opacity-60"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <img
                  src={avatarUrl}
                  alt={apt.customer?.name || "Cliente"}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-border group-hover:ring-primary/30 transition-all"
                />

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {apt.customer?.name || "Cliente"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {apt.service?.name || "Servicio"}
                  </p>
                </div>

                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {apt.start_time?.slice(0, 5) || "--:--"}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <User className="w-3 h-3" />
                    {apt.barber?.name || "Barbero"}
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1 font-medium",
                    statusStyles[apt.status] || statusStyles.pending
                  )}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusLabels[apt.status] || apt.status}
                </Badge>

                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(apt.id, "completed")}
                        className="gap-2"
                      >
                        <Check className="w-4 h-4 text-success" />
                        Marcar Completada
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(apt.id, "confirmed")}
                        className="gap-2"
                      >
                        <Check className="w-4 h-4 text-info" />
                        Confirmar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(apt.id, "rescheduled")}
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4 text-warning" />
                        Reprogramar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(apt.id, "cancelled")}
                        className="gap-2 text-destructive"
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
