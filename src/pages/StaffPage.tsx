import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  DollarSign,
  TrendingUp,
  Calendar as CalendarIcon,
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useServices } from "@/hooks/useAppointments";
import {
  useAllBarbers,
  useCreateBarber,
  useCreateTeamAccess,
  useStaffAppointments,
  useToggleBarberActive,
  useTodayStaffAppointments,
} from "@/hooks/useStaff";
import { reportError } from "@/lib/errors";
import { staffMemberSchema } from "@/lib/schemas/staff";
import { DateRangeFilterBar } from "@/components/shared/DateRangeFilterBar";
import { EntityCard } from "@/components/shared/EntityCard";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import type { DateFilterOption } from "@/hooks/useDateRangeFilter";
import { toast } from "sonner";

const timeFilterOptions: { value: DateFilterOption; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "15days", label: "Últimos 15 días" },
  { value: "30days", label: "Últimos 30 días" },
  { value: "custom", label: "Personalizado" },
];

export default function StaffPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<DateFilterOption>("30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { data: services } = useServices();

  // Barbers = the same source the calendar uses
  const { data: barbers, isLoading: loadingBarbers } = useAllBarbers();

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

  const { data: appointments } = useStaffAppointments(range);
  const { data: todayAppointments } = useTodayStaffAppointments();

  const createBarber = useCreateBarber();
  const toggleActive = useToggleBarberActive();

  const [accessBarber, setAccessBarber] = useState<{ id: string; name: string; email: string } | null>(null);
  const [accessPassword, setAccessPassword] = useState("");

  const createAccess = useCreateTeamAccess();

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

        <DateRangeFilterBar
          dateFilter={timeFilter}
          onDateFilterChange={setTimeFilter}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          label={getFilterLabel()}
          countLabel={`${totalAppointments} citas`}
        />

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
            {(barbers ?? []).map((member) => {
              const stats = statsByBarber[member.id] ?? { sales: 0, completed: 0, total: 0 };
              return (
                <EntityCard
                  key={member.id}
                  className={cn("md:p-6", !member.is_active && "opacity-60")}
                  avatar={
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
                  }
                  title={member.name}
                  subtitle={member.specialty || "Barbero"}
                  badge={
                    <Button
                      variant="ghost"
                      size="icon"
                      title={member.is_active ? "Desactivar" : "Activar"}
                      onClick={() =>
                        toggleActive.mutate(
                          { id: member.id, is_active: !member.is_active },
                          { onError: (error) => reportError(error, "No se pudo actualizar el estado") },
                        )
                      }
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  }
                >
                  <Badge variant="outline" className="text-xs">
                    {member.is_active ? "Activo" : "Inactivo"}
                  </Badge>

                  {(member.email || member.phone) && (
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-2 truncate">
                      {member.email && <p className="truncate">{member.email}</p>}
                      {member.phone && <p>{member.phone}</p>}
                    </div>
                  )}

                  {!member.user_id && member.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 gap-1"
                      onClick={() => setAccessBarber({ id: member.id, name: member.name, email: member.email! })}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Crear acceso
                    </Button>
                  )}

                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
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
                </EntityCard>
              );
            })}
          </div>
        )}
      </div>

      <EntityFormDialog<typeof staffMemberSchema>
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Agregar Miembro del Staff"
        schema={staffMemberSchema}
        defaultValues={{ name: "", email: "", phone: "", specialty: "" }}
        onSubmit={async (values) => {
          await createBarber.mutateAsync({
            name: values.name,
            email: values.email || null,
            phone: values.phone || null,
            specialty: values.specialty || null,
          });
          toast.success("Miembro agregado");
        }}
        submitLabel="Agregar Miembro"
        className="sm:max-w-[500px]"
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del barbero" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@salon.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+57 300 000 0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Especialidad
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="Ej: Corte y barba" {...field} />
                    </FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon" title="Elegir servicio">
                          <Scissors className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-0 bg-popover" align="end">
                        <Command>
                          <CommandInput placeholder="Buscar servicio..." />
                          <CommandList>
                            <CommandEmpty>No hay servicios configurados.</CommandEmpty>
                            <CommandGroup>
                              {(services ?? []).map((service) => (
                                <CommandItem
                                  key={service.id}
                                  value={service.name}
                                  onSelect={() => field.onChange(service.name)}
                                >
                                  {service.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormDialog>

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
              onClick={() =>
                accessBarber &&
                createAccess.mutate(
                  { name: accessBarber.name, email: accessBarber.email, password: accessPassword, role: "barber" },
                  {
                    onSuccess: () => {
                      toast.success("Cuenta de acceso creada");
                      setAccessBarber(null);
                      setAccessPassword("");
                    },
                    onError: (error) => reportError(error, "No se pudo crear la cuenta"),
                  },
                )
              }
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
