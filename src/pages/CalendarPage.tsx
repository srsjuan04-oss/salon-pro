import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock, Loader2, Phone, MessageSquare, CreditCard, User, Scissors, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  useAppointments,
  useBarbers,
  useServices,
  useCustomers,
  useCreateAppointment,
  useUpdateAppointment,
  useCreateCustomer,
  Appointment,
} from "@/hooks/useAppointments";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [cancelReason, setCancelReason] = useState("");
  const [cancelPreset, setCancelPreset] = useState("");
  
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const formattedDate = format(selectedDate, "yyyy-MM-dd");
  
  const { data: appointments, isLoading: loadingAppointments } = useAppointments(formattedDate);
  const { data: barbers, isLoading: loadingBarbers } = useBarbers();
  const { data: services } = useServices();
  const { data: customers } = useCustomers();
  const { data: schedule } = useScheduleSettings();

  const startHour = schedule ? parseInt(schedule.day_start.split(":")[0], 10) : 10;
  const endHour = schedule ? parseInt(schedule.day_end.split(":")[0], 10) : 20;
  const slotMinutes = schedule?.slot_minutes ?? 40;
  const hours = useMemo(
    () => Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => i + startHour),
    [startHour, endHour]
  );
  const timeSlots = useMemo(() => {
    const out: string[] = [];
    const startMin = startHour * 60;
    const endMin = endHour * 60;
    for (let m = startMin; m + slotMinutes <= endMin; m += slotMinutes) {
      out.push(
        `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
      );
    }
    return out;
  }, [startHour, endHour, slotMinutes]);
  
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const createCustomer = useCreateCustomer();

  const [formData, setFormData] = useState({
    customerId: "",
    newCustomerName: "",
    newCustomerPhone: "",
    serviceId: "",
    barberId: "",
    time: "",
    notes: "",
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serviceId || !formData.barberId || !formData.time) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    try {
      let customerId = formData.customerId;

      // Create new customer if needed
      if (!customerId && formData.newCustomerName && formData.newCustomerPhone) {
        const newCustomer = await createCustomer.mutateAsync({
          name: formData.newCustomerName,
          phone: formData.newCustomerPhone,
        });
        customerId = newCustomer.id;
      }

      if (!customerId) {
        toast.error("Selecciona o crea un cliente");
        return;
      }

      const service = services?.find((s) => s.id === formData.serviceId);
      const [hours, minutes] = formData.time.split(":").map(Number);
      const endMinutes = hours * 60 + minutes + (service?.duration_minutes || 30);
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

      await createAppointment.mutateAsync({
        customer_id: customerId,
        barber_id: formData.barberId,
        service_id: formData.serviceId,
        appointment_date: formattedDate,
        start_time: formData.time,
        end_time: endTime,
        notes: formData.notes,
        status: "confirmed",
        source: "manual",
      });

      toast.success("Cita agendada correctamente");
      setIsDialogOpen(false);
      setFormData({
        customerId: "",
        newCustomerName: "",
        newCustomerPhone: "",
        serviceId: "",
        barberId: "",
        time: "",
        notes: "",
      });
    } catch (error) {
      console.error(error);
      toast.error("Error al agendar la cita");
    }
  };

  const handleStatusChange = async (appointmentId: string, status: string) => {
    try {
      await updateAppointment.mutateAsync({ id: appointmentId, status });
      toast.success(`Cita ${status === "completed" ? "completada" : status === "cancelled" ? "cancelada" : "actualizada"}`);
      setIsDetailOpen(false);
    } catch (error) {
      toast.error("Error al actualizar la cita");
    }
  };

  const CANCEL_REASONS = [
    "Cliente canceló",
    "Cliente no asistió",
    "Reprogramación solicitada",
    "Barbero no disponible",
    "Error al agendar",
    "Otro",
  ];

  const handleConfirmCancel = async () => {
    if (!selectedAppointment) return;
    const reason = cancelPreset === "Otro" || !cancelPreset ? cancelReason.trim() : cancelPreset;
    if (!reason) {
      toast.error("Indica el motivo de la cancelación");
      return;
    }
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          cancellation_reason:
            cancelPreset && cancelPreset !== "Otro" && cancelReason.trim()
              ? `${cancelPreset} — ${cancelReason.trim()}`
              : reason,
        } as any)
        .eq("id", selectedAppointment.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Cita cancelada");
      setIsCancelOpen(false);
      setIsDetailOpen(false);
      setCancelReason("");
      setCancelPreset("");
    } catch (e) {
      toast.error("Error al cancelar la cita");
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
          <div className="flex gap-3">
            <Button
              className="gradient-gold shadow-gold gap-2"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Nueva Cita
            </Button>
          </div>
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
        ) : barbers && barbers.length > 0 && isMobile ? (
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
                  const barberIndex = barbers.findIndex((b) => b.id === apt.barber_id);
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
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px] capitalize"
                      >
                        {apt.status === "completed"
                          ? "Completada"
                          : apt.status === "cancelled"
                          ? "Cancelada"
                          : "Pendiente"}
                      </Badge>
                    </button>
                  );
                })
            )}
          </div>
        ) : barbers && barbers.length > 0 ? (
          <div className="bg-card rounded-2xl border shadow-soft overflow-hidden">

            {/* Staff Headers */}
            <div
              className="grid border-b border-border"
              style={{ gridTemplateColumns: `80px repeat(${barbers.length}, 1fr)` }}
            >
              <div className="p-4 border-r border-border bg-secondary/30">
                <span className="text-xs font-medium text-muted-foreground">Hora</span>
              </div>
              {barbers.map((barber, index) => (
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
                style={{ gridTemplateColumns: `80px repeat(${barbers.length}, 1fr)` }}
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
                {barbers.map((barber, barberIndex) => (
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
              No hay barberos configurados. Agrega barberos para ver el calendario.
            </p>
          </div>
        )}

        {/* Legend */}
        {barbers && barbers.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {barbers.map((barber, index) => (
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>


      {/* New Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Cita</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) =>
                  setFormData({ ...formData, customerId: value, newCustomerName: "", newCustomerPhone: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente existente" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!formData.customerId && (
              <div className="space-y-2 p-3 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium">O crear nuevo cliente:</p>
                <Input
                  placeholder="Nombre del cliente"
                  value={formData.newCustomerName}
                  onChange={(e) =>
                    setFormData({ ...formData, newCustomerName: e.target.value })
                  }
                />
                <Input
                  placeholder="Teléfono"
                  value={formData.newCustomerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, newCustomerPhone: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Servicio *</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - ${service.price} ({service.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Barbero *</Label>
              <Select
                value={formData.barberId}
                onValueChange={(value) => setFormData({ ...formData, barberId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barbero" />
                </SelectTrigger>
                <SelectContent>
                  {barbers?.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hora *</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                step={60}
              />
              <p className="text-xs text-muted-foreground">
                Puedes elegir cualquier hora manualmente.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas adicionales..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gradient-gold"
                disabled={createAppointment.isPending}
              >
                {createAppointment.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Agendar Cita"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Appointment Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de Cita</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                  {selectedAppointment.customer?.name?.charAt(0) || "C"}
                </div>
                <div>
                  <p className="font-semibold">{selectedAppointment.customer?.name || "Cliente"}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedAppointment.customer?.phone}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "ml-auto",
                    selectedAppointment.status === "completed" && "bg-success",
                    selectedAppointment.status === "cancelled" && "bg-destructive",
                    selectedAppointment.status === "confirmed" && "bg-primary"
                  )}
                >
                  {selectedAppointment.status === "completed"
                    ? "Completada"
                    : selectedAppointment.status === "cancelled"
                    ? "Cancelada"
                    : "Confirmada"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-secondary/30">
                <div>
                  <p className="text-xs text-muted-foreground">Servicio</p>
                  <p className="font-medium">{selectedAppointment.service?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Precio</p>
                  <p className="font-medium">${selectedAppointment.service?.price}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Barbero</p>
                  <p className="font-medium">{selectedAppointment.barber?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hora</p>
                  <p className="font-medium">
                    {selectedAppointment.start_time.slice(0, 5)} - {selectedAppointment.end_time.slice(0, 5)}
                  </p>
                </div>
                {selectedAppointment.source === "whatsapp" && (
                  <div className="col-span-2">
                    <Badge variant="outline" className="gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Reservado por WhatsApp
                    </Badge>
                  </div>
                )}
              </div>

              {selectedAppointment.notes && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}

              {(selectedAppointment as any).cancellation_reason && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-muted-foreground mb-1">Motivo de cancelación</p>
                  <p className="text-sm">{(selectedAppointment as any).cancellation_reason}</p>
                </div>
              )}

              {selectedAppointment.status !== "cancelled" && selectedAppointment.status !== "completed" && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setCancelPreset("");
                      setCancelReason("");
                      setIsCancelOpen(true);
                    }}
                    disabled={updateAppointment.isPending}
                  >
                    Cancelar Cita
                  </Button>
                  <Button
                    className="gradient-gold"
                    onClick={() => handleStatusChange(selectedAppointment.id, "completed")}
                    disabled={updateAppointment.isPending}
                  >
                    Marcar Completada
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel reason dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Motivo de la cancelación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={cancelPreset} onValueChange={setCancelPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un motivo" />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalle {cancelPreset === "Otro" || !cancelPreset ? "(obligatorio)" : "(opcional)"}</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Describe brevemente el motivo..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCancelOpen(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
