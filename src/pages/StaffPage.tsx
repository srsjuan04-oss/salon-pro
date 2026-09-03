import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  UserPlus,
  DollarSign,
  TrendingUp,
  Calendar as CalendarIcon,
  Filter,
  Search,
  Loader2,
  Scissors,
  Power,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServices } from "@/hooks/useAppointments";
import { toast } from "sonner";

type TimeFilter = "today" | "yesterday" | "15days" | "30days" | "custom";

const timeFilterOptions: { value: TimeFilter; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "15days", label: "Últimos 15 días" },
  { value: "30days", label: "Últimos 30 días" },
  { value: "custom", label: "Personalizado" },
];

const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
  });

  const { data: services } = useServices();

  // Barbers = the same source the calendar uses
  const { data: barbers, isLoading: loadingBarbers } = useQuery({
    queryKey: ["barbers-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const range = useMemo(() => {
    const today = startOfDay(new Date());
    switch (timeFilter) {
      case "today":
        return { from: today, to: today };
      case "yesterday":
        return { from: subDays(today, 1), to: subDays(today, 1) };
      case "15days":
        return { from: subDays(today, 14), to: today };
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          return { from: customDateRange.from, to: customDateRange.to };
        }
        return { from: subDays(today, 29), to: today };
      default:
        return { from: subDays(today, 29), to: today };
    }
  }, [timeFilter, customDateRange]);

  const { data: appointments } = useQuery({
    queryKey: ["staff-appointments", fmtDate(range.from), fmtDate(range.to)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, barber_id, status, appointment_date, service:services(name, price)")
        .gte("appointment_date", fmtDate(range.from))
        .lte("appointment_date", fmtDate(range.to));
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ["staff-appointments-today", fmtDate(new Date())],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, barber_id, status")
        .eq("appointment_date", fmtDate(new Date()));
      if (error) throw error;
      return data as any[];
    },
  });

  const createBarber = useMutation({
    mutationFn: async (payload: { name: string; email: string | null; phone: string | null; specialty: string | null }) => {
      const { error } = await supabase.from("barbers").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-all"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      toast.success("Miembro agregado");
      setIsDialogOpen(false);
      setFormData({ name: "", email: "", phone: "", specialty: "" });
    },
    onError: () => toast.error("No se pudo agregar el miembro"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("barbers").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-all"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
    onError: () => toast.error("No se pudo actualizar el estado"),
  });

  const [accessBarber, setAccessBarber] = useState<{ id: string; name: string; email: string } | null>(null);
  const [accessPassword, setAccessPassword] = useState("");

  const createAccess = useMutation({
    mutationFn: async () => {
      if (!accessBarber) return;
      const { data, error } = await supabase.functions.invoke("create-team-account", {
        body: { name: accessBarber.name, email: accessBarber.email, password: accessPassword, role: "barber" },
      });
      if (error) {
        const body = await (error as any)?.context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Cuenta de acceso creada");
      queryClient.invalidateQueries({ queryKey: ["barbers-all"] });
      setAccessBarber(null);
      setAccessPassword("");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo crear la cuenta"),
  });

  const statsByBarber = useMemo(() => {
    const map: Record<string, { sales: number; completed: number; total: number }> = {};
    (appointments ?? []).forEach((apt) => {
      const s = (map[apt.barber_id] ??= { sales: 0, completed: 0, total: 0 });
      if (apt.status === "cancelled") return;
      s.total += 1;
      if (apt.status === "completed") {
        s.completed += 1;
        s.sales += Number(apt.service?.price ?? 0);
      }
    });
    return map;
  }, [appointments]);

  const todayCountByBarber = useMemo(() => {
    const map: Record<string, number> = {};
    (todayAppointments ?? []).forEach((apt) => {
      if (apt.status === "cancelled") return;
      map[apt.barber_id] = (map[apt.barber_id] ?? 0) + 1;
    });
    return map;
  }, [todayAppointments]);

  const totalSales = Object.values(statsByBarber).reduce((a, s) => a + s.sales, 0);
  const totalAppointments = Object.values(statsByBarber).reduce((a, s) => a + s.total, 0);
  const totalToday = Object.values(todayCountByBarber).reduce((a, n) => a + n, 0);

  const getFilterLabel = () => {
    if (timeFilter === "custom" && customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, "dd/MM", { locale: es })} - ${format(customDateRange.to, "dd/MM", { locale: es })}`;
    }
    return timeFilterOptions.find((f) => f.value === timeFilter)?.label ?? "Últimos 30 días";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    createBarber.mutate({
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      specialty: formData.specialty.trim() || null,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Staff</h1>
            <p className="text-muted-foreground mt-1">
              El mismo equipo que aparece en el calendario
            </p>
          </div>
          <Button
            className="gradient-gold shadow-gold gap-2"
            onClick={() => setIsDialogOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            Agregar Miembro
          </Button>
        </div>

        {/* Time Filter */}
        <div className="bg-card rounded-2xl border shadow-soft p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar ingresos:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {timeFilterOptions.map((option) =>
                option.value !== "custom" ? (
                  <Button
                    key={option.value}
                    variant={timeFilter === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeFilter(option.value)}
                    className={cn(timeFilter === option.value && "gradient-gold shadow-gold")}
                  >
                    {option.label}
                  </Button>
                ) : (
                  <Popover key={option.value} open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={timeFilter === "custom" ? "default" : "outline"}
                        size="sm"
                        className={cn("gap-2", timeFilter === "custom" && "gradient-gold shadow-gold")}
                      >
                        <CalendarIcon className="w-4 h-4" />
                        {timeFilter === "custom" && customDateRange.from && customDateRange.to
                          ? `${format(customDateRange.from, "dd/MM")} - ${format(customDateRange.to, "dd/MM")}`
                          : "Personalizado"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover" align="start">
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">Seleccionar rango de fechas</p>
                      </div>
                      <Calendar
                        mode="range"
                        selected={{ from: customDateRange.from, to: customDateRange.to }}
                        onSelect={(r) => {
                          setCustomDateRange({ from: r?.from, to: r?.to });
                          if (r?.from && r?.to) {
                            setTimeFilter("custom");
                            setIsCustomDateOpen(false);
                          }
                        }}
                        numberOfMonths={1}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                )
              )}
            </div>
            <div className="sm:ml-auto text-sm text-muted-foreground">
              Mostrando: <span className="font-medium text-foreground">{getFilterLabel()}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas (citas completadas)</p>
                <p className="text-2xl font-bold">${totalSales.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Citas en el periodo</p>
                <p className="text-2xl font-bold">{totalAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Citas Hoy</p>
                <p className="text-2xl font-bold">{totalToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Grid */}
        {loadingBarbers ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (barbers ?? []).length === 0 ? (
          <div className="bg-card rounded-2xl border shadow-soft p-10 text-center">
            <p className="text-muted-foreground">
              Aún no tienes miembros del equipo. Agrega el primero para que aparezca en el calendario.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(barbers ?? []).map((member, index) => {
              const stats = statsByBarber[member.id] ?? { sales: 0, completed: 0, total: 0 };
              return (
                <div
                  key={member.id}
                  className={cn(
                    "bg-card rounded-2xl border shadow-soft p-5 md:p-6 transition-all duration-300",
                    "hover:shadow-medium animate-slide-up",
                    !member.is_active && "opacity-60"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full gradient-gold flex items-center justify-center text-primary-foreground text-xl font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card",
                            member.is_active ? "bg-success" : "bg-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold truncate">{member.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.specialty || "Barbero"}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {member.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={member.is_active ? "Desactivar" : "Activar"}
                      onClick={() =>
                        toggleActive.mutate({ id: member.id, is_active: !member.is_active })
                      }
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  </div>

                  {(member.email || member.phone) && (
                    <div className="text-xs text-muted-foreground space-y-0.5 mb-2 truncate">
                      {member.email && <p className="truncate">{member.email}</p>}
                      {member.phone && <p>{member.phone}</p>}
                    </div>
                  )}

                  {!member.user_id && member.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mb-4 gap-1"
                      onClick={() => setAccessBarber({ id: member.id, name: member.name, email: member.email! })}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Crear acceso
                    </Button>
                  )}

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Ventas</p>
                      <p className="text-lg font-bold">${stats.sales.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Completadas</p>
                      <p className="text-lg font-bold text-success">{stats.completed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Citas hoy</p>
                      <p className="text-lg font-bold">{todayCountByBarber[member.id] ?? 0}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog Agregar Miembro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar Miembro del Staff</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                placeholder="Nombre del barbero"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@salon.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+57 300 000 0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty" className="flex items-center gap-2">
                <Scissors className="w-4 h-4" />
                Especialidad
              </Label>
              <div className="flex gap-2">
                <Input
                  id="specialty"
                  placeholder="Ej: Corte y barba"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="icon" title="Elegir servicio">
                      <Search className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0 bg-popover" align="end">
                    <ScrollArea className="h-[200px]">
                      <div className="p-2 space-y-1">
                        {(services ?? []).map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            className="w-full text-left text-sm p-2 rounded-md hover:bg-secondary transition-colors"
                            onClick={() => setFormData({ ...formData, specialty: service.name })}
                          >
                            {service.name}
                          </button>
                        ))}
                        {(services ?? []).length === 0 && (
                          <p className="text-xs text-muted-foreground p-2">
                            No hay servicios configurados.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gradient-gold shadow-gold"
                disabled={!formData.name.trim() || createBarber.isPending}
              >
                {createBarber.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Agregar Miembro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!accessBarber} onOpenChange={(open) => !open && setAccessBarber(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Crear acceso para {accessBarber?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Se creará una cuenta de acceso con rol Barbero para <strong>{accessBarber?.email}</strong>, vinculada
              directamente a esta ficha de Staff. Solo podrá ver su propio calendario.
            </p>
            <div className="space-y-2">
              <Label htmlFor="access-password">Contraseña</Label>
              <Input
                id="access-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessBarber(null)}>Cancelar</Button>
            <Button
              onClick={() => createAccess.mutate()}
              disabled={accessPassword.length < 6 || createAccess.isPending}
            >
              {createAccess.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear acceso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
