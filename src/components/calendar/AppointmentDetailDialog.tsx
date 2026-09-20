import { MessageSquare, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import type { Appointment } from "@/hooks/useAppointments";

interface AppointmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  isBarber: boolean;
  isUpdating: boolean;
  onComplete: () => void;
  onRequestCancel: () => void;
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
  isBarber,
  isUpdating,
  onComplete,
  onRequestCancel,
}: AppointmentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle de Cita</DialogTitle>
        </DialogHeader>
        {appointment && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                {appointment.customer?.name?.charAt(0) || "C"}
              </div>
              <div>
                <p className="font-semibold">{appointment.customer?.name || "Cliente"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {appointment.customer?.phone}
                </p>
              </div>
              <AppointmentStatusBadge status={appointment.status} variant="solid" className="ml-auto" />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="text-xs text-muted-foreground">Servicio</p>
                <p className="font-medium">{appointment.service?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Precio</p>
                <p className="font-medium">${appointment.service?.price}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Barbero</p>
                <p className="font-medium">{appointment.barber?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hora</p>
                <p className="font-medium">
                  {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                </p>
              </div>
              {appointment.source === "whatsapp" && (
                <div className="col-span-2">
                  <Badge variant="outline" className="gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Reservado por WhatsApp
                  </Badge>
                </div>
              )}
            </div>

            {appointment.notes && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Notas</p>
                <p className="text-sm">{appointment.notes}</p>
              </div>
            )}

            {appointment.cancellation_reason && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-muted-foreground mb-1">Motivo de cancelación</p>
                <p className="text-sm">{appointment.cancellation_reason}</p>
              </div>
            )}

            {!isBarber && appointment.status !== "cancelled" && appointment.status !== "completed" && (
              <DialogFooter className="gap-2">
                <Button variant="destructive" onClick={onRequestCancel} disabled={isUpdating}>
                  Cancelar Cita
                </Button>
                <Button className="gradient-gold" onClick={onComplete} disabled={isUpdating}>
                  Marcar Completada
                </Button>
              </DialogFooter>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
