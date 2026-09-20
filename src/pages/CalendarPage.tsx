import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock, Loader2, MessageSquare, CreditCard, User, Scissors, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  useAppointments,
  useAppointmentsRealtimeSync,
  useBarbers,
  useServices,
  useCustomers,
  useCreateAppointment,
  useUpdateAppointment,
  useCreateCustomer,
  Appointment,
} from "@/hooks/useAppointments";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { reportError } from "@/lib/errors";
import type { AppointmentFormValues } from "@/lib/schemas/appointment";
import { AppointmentStatusBadge } from "@/components/calendar/AppointmentStatusBadge";
import { NewAppointmentDialog } from "@/components/calendar/NewAppointmentDialog";
import { AppointmentDetailDialog } from "@/components/calendar/AppointmentDetailDialog";
import { CancelAppointmentDialog } from "@/components/calendar/CancelAppointmentDialog";

const HOUR_PX = 80;

const staffColors = [
  "bg-primary/20 border-primary/40 text-primary",
  "bg-success/20 border-success/40 text-success",
  "bg-info/20 border-info/40 text-info",
  "bg-amber-500/20 border-amber-500/40 text-amber-700",
  "bg-purple-500/20 border-purple-500/40 text-purple-700",
];

export default function CalendarPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const isMobile = useIsMobile();
  const formattedDate = format(selectedDate, "yyyy-MM-dd");
  
  const { data: appointments, isLoading: loadingAppointments } = useAppointments(formattedDate);
  const { data: barbers, isLoading: loadingBarbers } = useBarbers();
  const { data: services } = useServices();
  const { data: customers } = useCustomers();
  const { data: schedule } = useScheduleSettings();
  const { isBarber, user } = useAuth();

  // Un barbero solo ve su propia columna en el calendario (las citas ya llegan
  // filtradas por RLS; esto evita mostrar columnas vacías de otros barberos).
  const displayBarbers = useMemo(() => {
    if (!isBarber) return barbers;
    return (barbers ?? []).filter((b) => b.user_id === user?.id);
  }, [barbers, isBarber, user]);

  const startHour = schedule ? parseInt(schedule.day_start.split(":")[0], 10) : 10;
  const endHour = schedule ? parseInt(schedule.day_end.split(":")[0], 10) : 20;
  const slotMinutes = schedule?.slot_minutes ?? 40;
  const hours = useMemo(
    () => Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => i + startHour),
    [startHour, endHour]
  );
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const createCustomer = useCreateCustomer();

  useAppointmentsRealtimeSync();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const getAppointmentStyle = (startTime: string, durationMinutes: number) => {
    const [hour, minute] = startTime.split(":").map(Number);
    const top = (hour - startHour) * HOUR_PX + (minute / 60) * HOUR_PX;
    const height = (durationMinutes / 60) * HOUR_PX - 4;
    return { top: `${top}px`, height: `${height}px` };
  };

  const getBarberAppointments = (barberId: string) => {
    return appointments?.filter((apt) => apt.barber_id === barberId) || [];
  };

  const getBarberColor = (index: number) => {
    return staffColors[index % staffColors.length];
  };

  const handleCreateAppointment = async (values: AppointmentFormValues) => {
    let customerId = values.customerId;

    if (!customerId && values.newCustomerName && values.newCustomerPhone) {
      const newCustomer = await createCustomer.mutateAsync({
        name: values.newCustomerName,
        phone: values.newCustomerPhone,
      });
      customerId = newCustomer.id;
    }

    if (!customerId) {
      throw new Error("Selecciona o crea un cliente");
    }

    const service = services?.find((s) => s.id === values.serviceId);
    const [hours, minutes] = values.time.split(":").map(Number);
    const endMinutes = hours * 60 + minutes + (service?.duration_minutes || 30);
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

    await createAppointment.mutateAsync({
      customer_id: customerId,
      barber_id: values.barberId,
      service_id: values.serviceId,
      appointment_date: formattedDate,
      start_time: values.time,
      end_time: endTime,
      notes: values.notes,
      status: "confirmed",
      source: "manual",
    });

    toast.success("Cita agendada correctamente");
  };

  const handleStatusChange = async (appointmentId: string, status: string) => {
    try {
      await updateAppointment.mutateAsync({ id: appointmentId, status });
      toast.success(`Cita ${status === "completed" ? "completada" : status === "cancelled" ? "cancelada" : "actualizada"}`);
      setIsDetailOpen(false);
    } catch (error) {
      await reportError(error, "Error al actualizar la cita");
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!selectedAppointment) return;
    try {
      await updateAppointment.mutateAsync({
        id: selectedAppointment.id,
        status: "cancelled",
        cancellation_reason: reason,
      });
      toast.success("Cita cancelada");
      setIsCancelOpen(false);
      setIsDetailOpen(false);
    } catch (error) {
      await reportError(error, "Error al cancelar la cita");
    }
  };

  const isLoading = loadingAppointments || loadingBarbers;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Calendario</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las citas de tu barbería
            </p>
          </div>
          {!isBarber && (
            <div className="flex gap-3">
              <Button
                className="gradient-gold shadow-gold gap-2"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Nueva Cita
              </Button>
            </div>
          )}
        </div>

        {/* Week Navigation */}
        <div className="bg-card rounded-2xl border shadow-soft p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold">
                {format(currentWeekStart, "MMMM yyyy", { locale: es })}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
                setSelectedDate(new Date());
              }}
            >
              Hoy
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "py-2 px-0.5 md:py-3 md:px-2 rounded-xl text-center transition-all duration-200",
                  isSameDay(day, selectedDate)
                    ? "gradient-gold shadow-gold text-primary-foreground"
                    : isSameDay(day, new Date())
                    ? "bg-secondary ring-2 ring-primary/30"
                    : "hover:bg-secondary"
                )}
              >
                <p
                  className={cn(
                    "text-[10px] md:text-xs mb-1",
                    isSameDay(day, selectedDate)
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {format(day, "EEE", { locale: es })}
                </p>
                <p className="text-base md:text-lg font-semibold">{format(day, "d")}</p>
              </button>
            ))}
          </div>

        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : displayBarbers && displayBarbers.length > 0 && isMobile ? (
          /* Mobile: agenda list ordered by time */
          <div className="space-y-3">
            {(appointments ?? []).length === 0 ? (
              <div className="bg-card rounded-2xl border shadow-soft p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No hay citas para este día.
                </p>
              </div>
            ) : (
              [...(appointments ?? [])]
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((apt) => {
                  const barberIndex = displayBarbers.findIndex((b) => b.id === apt.barber_id);
                  return (
                    <button
                      key={apt.id}
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setIsDetailOpen(true);
                      }}
                      className={cn(
                        "w-full text-left bg-card rounded-2xl border shadow-soft p-3 flex gap-3 items-center border-l-4",
                        apt.status === "cancelled"
                          ? "border-l-destructive/50 opacity-60"
                          : apt.status === "completed"
                          ? "border-l-success/60"
                          : "border-l-primary/60"
                      )}
                    >
                      <div className="shrink-0 w-16 text-center">
                        <p className="font-semibold text-sm">{apt.start_time.slice(0, 5)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {apt.service?.duration_minutes ?? 30} min
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm truncate">
                            {apt.customer?.name || "Cliente"}
                          </p>
                          {apt.source === "whatsapp" && (
                            <MessageSquare className="w-3 h-3 text-green-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {apt.service?.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
                              getBarberColor(barberIndex < 0 ? 0 : barberIndex)
                            )}
                          >
                            {apt.barber?.name?.charAt(0) ?? "?"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {apt.barber?.name}
                          </span>
                        </div>
                      </div>
                      <AppointmentStatusBadge status={apt.status} className="shrink-0 text-[10px]" />
                    </button>
                  );
                })
            )}
          </div>
        ) : displayBarbers && displayBarbers.length > 0 ? (
          <div className="bg-card rounded-2xl border shadow-soft overflow-hidden">

            {/* Staff Headers */}
            <div
              className="grid border-b border-border"
              style={{ gridTemplateColumns: `80px repeat(${displayBarbers.length}, 1fr)` }}
            >
              <div className="p-4 border-r border-border bg-secondary/30">
                <span className="text-xs font-medium text-muted-foreground">Hora</span>
              </div>
              {displayBarbers.map((barber, index) => (
                <div
                  key={barber.id}
                  className="p-3 border-r border-border last:border-r-0 bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
                        getBarberColor(index)
                      )}
                    >
                      {barber.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{barber.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {barber.specialty || "Barbero"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <ScrollArea className="h-[600px]">
              <div
                className="grid"
                style={{ gridTemplateColumns: `80px repeat(${displayBarbers.length}, 1fr)` }}
              >
                {/* Time Column */}
                <div className="border-r border-border">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-20 flex items-start justify-end pr-3 pt-2 border-b border-border"
                    >
                      <span className="text-xs text-muted-foreground">
                        {hour.toString().padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Staff Columns */}
                {displayBarbers.map((barber, barberIndex) => (
                  <div
                    key={barber.id}
                    className={cn(
                      "relative border-r border-border last:border-r-0",
                      barberIndex % 2 === 1 && "bg-secondary/10"
                    )}
                  >
                    {hours.map((hour) => (
                      <div key={hour} className="h-20 border-b border-border border-dashed" />
                    ))}

                    {/* Appointments */}
                    {getBarberAppointments(barber.id).map((apt) => {
                      const style = getAppointmentStyle(
                        apt.start_time,
                        apt.service?.duration_minutes || 30
                      );
                      const isWhatsApp = apt.source === "whatsapp";

                      return (
                        <div
                          key={apt.id}
                          onClick={() => {
                            setSelectedAppointment(apt);
                            setIsDetailOpen(true);
                          }}
                          className={cn(
                            "absolute left-1 right-1 rounded-lg border-l-4 p-2 cursor-pointer",
                            "hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5",
                            apt.status === "cancelled"
                              ? "bg-destructive/10 border-destructive/40 opacity-60"
                              : apt.status === "completed"
                              ? "bg-success/10 border-success/40"
                              : getBarberColor(barberIndex)
                          )}
                          style={style}
                        >
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-xs truncate flex-1">
                              {apt.customer?.name || "Cliente"}
                            </p>
                            {isWhatsApp && (
                              <MessageSquare className="w-3 h-3 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] opacity-80 truncate">
                            {apt.service?.name}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-70">
                            <Clock className="w-2.5 h-2.5" />
                            {apt.start_time.slice(0, 5)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border shadow-soft p-12 text-center">
            <p className="text-muted-foreground">
              {isBarber
                ? "Tu cuenta aún no está vinculada a un barbero de Staff. Pide a un administrador que lo revise."
                : "No hay barberos configurados. Agrega barberos para ver el calendario."}
            </p>
          </div>
        )}

        {/* Legend */}
        {displayBarbers && displayBarbers.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {displayBarbers.map((barber, index) => (
              <div key={barber.id} className="flex items-center gap-2">
                <div
                  className={cn("w-3 h-3 rounded-full", getBarberColor(index))}
                  style={{
                    backgroundColor:
                      index === 0
                        ? "hsl(var(--primary))"
                        : index === 1
                        ? "hsl(var(--success))"
                        : index === 2
                        ? "hsl(var(--info))"
                        : "hsl(var(--accent))",
                  }}
                />
                <span>{barber.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3 h-3 text-green-600" />
              <span>Reserva por WhatsApp</span>
            </div>
          </div>
        )}

        {/* Today's Summary */}
        <div className="bg-card rounded-2xl border shadow-soft p-6">
          <h3 className="text-lg font-semibold mb-4">
            Resumen del {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="text-2xl font-bold">
                {appointments?.filter((a) => a.status !== "cancelled").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Citas totales</p>
            </div>
            <div className="p-4 rounded-xl bg-success/10">
              <p className="text-2xl font-bold text-success">
                {appointments?.filter((a) => a.status === "completed").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Completadas</p>
            </div>
            <div className="p-4 rounded-xl bg-primary/10">
              <p className="text-2xl font-bold text-primary">
                {appointments?.filter((a) => a.status === "confirmed" || a.status === "pending").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
            <div className="p-4 rounded-xl bg-info/10">
              <p className="text-2xl font-bold text-info">
                $
                {appointments
                  ?.filter((a) => a.status === "completed")
                  .reduce((sum, a) => sum + (a.service?.price || 0), 0)
                  .toLocaleString() || 0}
              </p>
              <p className="text-sm text-muted-foreground">Ingresos</p>
            </div>
          </div>
        </div>

        {/* Citas Pendientes - Lista para Cobrar */}
        {(() => {
          const pending = (appointments ?? [])
            .filter((a) => a.status === "pending" || a.status === "confirmed")
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          return (
            <div className="bg-card rounded-2xl border shadow-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Citas pendientes de cobro</h3>
                  <p className="text-sm text-muted-foreground">
                    {pending.length} cita{pending.length !== 1 ? "s" : ""} del {format(selectedDate, "d 'de' MMMM", { locale: es })}
                  </p>
                </div>
                <Badge variant="outline" className="gap-1 text-warning border-warning/40">
                  <Clock className="w-3 h-3" />
                  Por cobrar
                </Badge>
              </div>

              {pending.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay citas pendientes de cobro para este día.
                </div>
              ) : (
                <div className="space-y-2">
                  {pending.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <Clock className="w-3 h-3 text-primary" />
                          <span className="text-xs font-semibold text-primary">
                            {appt.start_time.slice(0, 5)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <p className="font-medium truncate">{appt.customer?.name ?? "Sin cliente"}</p>
                            {appt.customer?.phone && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                · {appt.customer.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Scissors className="w-3 h-3" />
                              {appt.service?.name ?? "Servicio"}
                            </span>
                            <span>· {appt.barber?.name ?? "Sin staff"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 md:justify-end">
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {(appt.service?.price ?? 0).toLocaleString()}
                          </p>
                        </div>
                        {!isBarber && (
                          <Button
                            size="sm"
                            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() =>
                              updateAppointment.mutate(
                                { id: appt.id, status: "completed" },
                                {
                                  onSuccess: () => toast.success("Cita cobrada y registrada en ventas"),
                                }
                              )
                            }
                            disabled={updateAppointment.isPending}
                          >
                            <CreditCard className="w-4 h-4" />
                            Cobrar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>


      <NewAppointmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        customers={customers ?? []}
        services={services ?? []}
        barbers={barbers ?? []}
        onSubmit={handleCreateAppointment}
      />

      <AppointmentDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        appointment={selectedAppointment}
        isBarber={isBarber}
        isUpdating={updateAppointment.isPending}
        onComplete={() => selectedAppointment && handleStatusChange(selectedAppointment.id, "completed")}
        onRequestCancel={() => setIsCancelOpen(true)}
      />

      <CancelAppointmentDialog open={isCancelOpen} onOpenChange={setIsCancelOpen} onConfirm={handleConfirmCancel} />

    </DashboardLayout>
  );
}
