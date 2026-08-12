import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { 
  UserPlus, 
  DollarSign, 
  TrendingUp,
  Calendar as CalendarIcon,
  Star,
  MoreVertical,
  Percent,
  Search,
  Filter
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TimeFilter = "today" | "yesterday" | "15days" | "30days" | "custom";

const timeFilterOptions: { value: TimeFilter; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "15days", label: "Últimos 15 días" },
  { value: "30days", label: "Últimos 30 días" },
  { value: "custom", label: "Personalizado" },
];

interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  phone: string;
  sales: number;
  target: number;
  commission: number;
  commissionRate: number;
  appointmentsToday: number;
  rating: number;
  status: "available" | "busy" | "break";
  specialties: string[];
}

const initialStaff: StaffMember[] = [
  {
    id: "1",
    name: "Ana López",
    role: "Estilista Senior",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
    email: "ana.lopez@salon.com",
    phone: "+52 55 1111 2222",
    sales: 4850,
    target: 5000,
    commission: 727.50,
    commissionRate: 15,
    appointmentsToday: 6,
    rating: 4.9,
    status: "busy",
    specialties: ["Coloración", "Corte", "Tratamientos"]
  },
  {
    id: "2",
    name: "Miguel Santos",
    role: "Barbero",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    email: "miguel.s@salon.com",
    phone: "+52 55 2222 3333",
    sales: 3200,
    target: 4000,
    commission: 480.00,
    commissionRate: 15,
    appointmentsToday: 8,
    rating: 4.7,
    status: "available",
    specialties: ["Corte masculino", "Barba", "Fade"]
  },
  {
    id: "3",
    name: "Carmen Ruiz",
    role: "Manicurista",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    email: "carmen.r@salon.com",
    phone: "+52 55 3333 4444",
    sales: 2100,
    target: 2500,
    commission: 315.00,
    commissionRate: 15,
    appointmentsToday: 5,
    rating: 4.8,
    status: "break",
    specialties: ["Manicure", "Pedicure", "Nail Art"]
  },
  {
    id: "4",
    name: "Diego Fernández",
    role: "Estilista",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    email: "diego.f@salon.com",
    phone: "+52 55 4444 5555",
    sales: 2800,
    target: 3500,
    commission: 420.00,
    commissionRate: 15,
    appointmentsToday: 4,
    rating: 4.6,
    status: "available",
    specialties: ["Corte", "Peinados", "Extensiones"]
  },
];

const availableServices = [
  "Corte de cabello",
  "Corte + Tinte",
  "Corte + Barba",
  "Corte masculino",
  "Manicure",
  "Pedicure",
  "Tratamiento capilar",
  "Coloración",
  "Fade",
  "Barba",
  "Peinados",
  "Extensiones",
  "Nail Art",
  "Keratina",
];

const roles = [
  "Estilista",
  "Estilista Senior",
  "Barbero",
  "Manicurista",
  "Recepcionista",
  "Gerente",
];

const statusStyles = {
  available: { color: "bg-success", label: "Disponible" },
  busy: { color: "bg-primary", label: "Ocupado" },
  break: { color: "bg-muted-foreground", label: "Descanso" },
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
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
    role: "",
    commissionRate: "15",
    target: "3000",
    specialties: [] as string[],
  });

  const getFilterLabel = () => {
    const filter = timeFilterOptions.find(f => f.value === timeFilter);
    if (timeFilter === "custom" && customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, "dd/MM", { locale: es })} - ${format(customDateRange.to, "dd/MM", { locale: es })}`;
    }
    return filter?.label || "Últimos 30 días";
  };

  // Simulated data multipliers based on filter (in real app, this would fetch from DB)
  const getMultiplier = () => {
    switch (timeFilter) {
      case "today": return 0.05;
      case "yesterday": return 0.04;
      case "15days": return 0.5;
      case "30days": return 1;
      case "custom": return 0.6;
      default: return 1;
    }
  };

  const multiplier = getMultiplier();
  const totalSales = Math.round(staff.reduce((acc, s) => acc + s.sales, 0) * multiplier);
  const totalCommissions = Math.round(staff.reduce((acc, s) => acc + s.commission, 0) * multiplier * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newMember: StaffMember = {
      id: String(staff.length + 1),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
      sales: 0,
      target: parseFloat(formData.target) || 3000,
      commission: 0,
      commissionRate: parseFloat(formData.commissionRate) || 15,
      appointmentsToday: 0,
      rating: 5.0,
      status: "available",
      specialties: formData.specialties,
    };
    setStaff([...staff, newMember]);
    console.log("Nuevo miembro:", newMember);
    setIsDialogOpen(false);
    setFormData({ name: "", email: "", phone: "", role: "", commissionRate: "15", target: "3000", specialties: [] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Staff</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tu equipo y sus comisiones
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
              {timeFilterOptions.map((option) => (
                option.value !== "custom" ? (
                  <Button
                    key={option.value}
                    variant={timeFilter === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeFilter(option.value)}
                    className={cn(
                      timeFilter === option.value && "gradient-gold shadow-gold"
                    )}
                  >
                    {option.label}
                  </Button>
                ) : (
                  <Popover key={option.value} open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={timeFilter === "custom" ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "gap-2",
                          timeFilter === "custom" && "gradient-gold shadow-gold"
                        )}
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
                        onSelect={(range) => {
                          setCustomDateRange({ from: range?.from, to: range?.to });
                          if (range?.from && range?.to) {
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
              ))}
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              Mostrando: <span className="font-medium text-foreground">{getFilterLabel()}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas Totales</p>
                <p className="text-2xl font-bold">${totalSales.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comisiones a Pagar</p>
                <p className="text-2xl font-bold">${totalCommissions.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Citas Hoy</p>
                <p className="text-2xl font-bold">
                  {staff.reduce((acc, s) => acc + s.appointmentsToday, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {staff.map((member, index) => {
            const progress = (member.sales / member.target) * 100;
            return (
              <div
                key={member.id}
                className={cn(
                  "bg-card rounded-2xl border shadow-soft p-6 transition-all duration-300",
                  "hover:shadow-medium animate-slide-up"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
                      />
                      <span 
                        className={cn(
                          "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card",
                          statusStyles[member.status].color
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                        <span className="text-sm font-medium">{member.rating}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {statusStyles[member.status].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {member.specialties.map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ventas este mes</span>
                    <span className="font-semibold">${member.sales.toLocaleString()}</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progreso hacia meta</span>
                      <span className="text-primary font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Meta: ${member.target.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Comisión ({member.commissionRate}%)</p>
                      <p className="text-lg font-bold text-success">${member.commission.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Citas hoy</p>
                      <p className="text-lg font-bold">{member.appointmentsToday}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog Agregar Miembro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar Miembro del Staff</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  placeholder="Nombre del miembro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {formData.role || "Seleccionar rol..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 bg-popover" align="start">
                    <ScrollArea className="h-[200px]">
                      <div className="p-2 space-y-1">
                        {roles.map((role) => (
                          <button
                            key={role}
                            type="button"
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary transition-colors text-left",
                              formData.role === role && "bg-primary/10"
                            )}
                            onClick={() => setFormData({ ...formData, role })}
                          >
                            <span className="text-sm">{role}</span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@salon.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commissionRate" className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Porcentaje de comisión
                </Label>
                <div className="relative">
                  <Input
                    id="commissionRate"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="15"
                    value={formData.commissionRate}
                    onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Porcentaje sobre cada venta</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Meta mensual
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="target"
                    type="number"
                    min="0"
                    placeholder="3000"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Servicios / Especialidades</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {formData.specialties.length > 0
                      ? `${formData.specialties.length} servicio(s) seleccionado(s)`
                      : "Seleccionar servicios..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-popover" align="start">
                  <ScrollArea className="h-[200px]">
                    <div className="p-2 space-y-1">
                      {availableServices.map((service) => {
                        const isSelected = formData.specialties.includes(service);
                        return (
                          <button
                            key={service}
                            type="button"
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary transition-colors text-left",
                              isSelected && "bg-primary/10"
                            )}
                            onClick={() => {
                              if (isSelected) {
                                setFormData({
                                  ...formData,
                                  specialties: formData.specialties.filter(s => s !== service)
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  specialties: [...formData.specialties, service]
                                });
                              }
                            }}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                            )}>
                              {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                            </div>
                            <span className="text-sm">{service}</span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              {formData.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.specialties.map((service) => (
                    <span key={service} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {service}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="gradient-gold shadow-gold"
                disabled={!formData.name || !formData.role}
              >
                Agregar Miembro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
