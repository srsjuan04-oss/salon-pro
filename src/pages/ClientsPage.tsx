import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  Calendar,
  Star,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Hash,
  History,
  CalendarX,
  CalendarClock,
  Eye,
  Edit,
  MessageSquare,
  CreditCard,
  Banknote,
  Check
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { initialClients, calculateOverdueDays, getOverdueStatus, type Client, type AppointmentChange } from "@/data/clients";

const initialServices = [
  "Corte de cabello",
  "Corte + Tinte",
  "Corte + Barba",
  "Manicure",
  "Pedicure",
  "Tratamiento capilar",
  "Coloración",
  "Fade",
];

// Sample appointment changes for demo
const sampleAppointmentChanges: AppointmentChange[] = [
  {
    id: "1",
    appointmentId: "apt1",
    clientId: "1",
    clientName: "María García",
    service: "Corte + Tinte",
    originalDate: "2026-01-10",
    originalTime: "10:00",
    action: "rescheduled",
    reason: "Cliente solicitó cambio por compromisos laborales",
    newDate: "2026-01-12",
    newTime: "14:00",
    createdAt: "2026-01-09T10:30:00Z"
  },
  {
    id: "2",
    appointmentId: "apt2",
    clientId: "2",
    clientName: "Laura Martínez",
    service: "Manicure",
    originalDate: "2026-01-08",
    originalTime: "11:00",
    action: "cancelled",
    reason: "No pudo asistir por enfermedad",
    createdAt: "2026-01-08T09:00:00Z"
  },
  {
    id: "3",
    appointmentId: "apt3",
    clientId: "3",
    clientName: "Sofia Hernández",
    service: "Tratamiento capilar",
    originalDate: "2026-01-05",
    originalTime: "15:00",
    action: "cancelled",
    reason: "Viaje de emergencia",
    createdAt: "2026-01-04T16:00:00Z"
  },
  {
    id: "4",
    appointmentId: "apt4",
    clientId: "1",
    clientName: "María García",
    service: "Coloración",
    originalDate: "2025-12-20",
    originalTime: "09:00",
    action: "rescheduled",
    reason: "Cambio de horario solicitado por la cliente",
    newDate: "2025-12-22",
    newTime: "11:00",
    createdAt: "2025-12-19T14:00:00Z"
  },
];

const paymentMethods = [
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { id: "transferencia", label: "Transferencia", icon: DollarSign },
];

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClients = async () => {
      setLoading(true);
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, email, phone, created_at")
        .order("created_at", { ascending: false });

      const { data: appts } = await supabase
        .from("appointments")
        .select("customer_id, appointment_date, status, service_id, services(name, price)");

      const apptsByCustomer = new Map<string, any[]>();
      (appts ?? []).forEach((a: any) => {
        const arr = apptsByCustomer.get(a.customer_id) ?? [];
        arr.push(a);
        apptsByCustomer.set(a.customer_id, arr);
      });

      const mapped: Client[] = (customers ?? []).map((c: any) => {
        const list = apptsByCustomer.get(c.id) ?? [];
        const valid = list.filter((a) => a.status !== "cancelled");
        const totalSpent = valid.reduce(
          (s, a) => s + (Number(a.services?.price) || 0),
          0
        );
        const dates = valid
          .map((a) => a.appointment_date)
          .sort()
          .reverse();
        const last = dates[0];
        const tags = Array.from(
          new Set(valid.map((a: any) => a.services?.name).filter(Boolean))
        ).slice(0, 3) as string[];
        return {
          id: c.id,
          name: c.name,
          email: c.email ?? "",
          phone: c.phone ?? "",
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            c.name
          )}&background=random`,
          visits: valid.length,
          lastVisit: last
            ? new Date(last).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Sin visitas",
          totalSpent,
          vip: valid.length >= 10,
          tags,
          balance: 0,
          identificationNumber: c.id.slice(0, 8),
        };
      });
      setClients(mapped);
      setLoading(false);
    };
    loadClients();
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "efectivo",
    note: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vip: false,
    preferredServices: [] as string[],
    identificationNumber: "",
  });
  const [services] = useState(initialServices);

  const handleOpenPayment = (client: Client) => {
    setSelectedClient(client);
    setPaymentData({ amount: String(client.balance), method: "efectivo", note: "" });
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    const paymentAmount = parseFloat(paymentData.amount) || 0;
    const newBalance = Math.max(0, selectedClient.balance - paymentAmount);
    
    setClients(clients.map(c => 
      c.id === selectedClient.id 
        ? { ...c, balance: newBalance, balanceDueDate: newBalance === 0 ? undefined : c.balanceDueDate }
        : c
    ));
    
    console.log("Pago registrado:", {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      amount: paymentAmount,
      method: paymentData.method,
      note: paymentData.note,
      previousBalance: selectedClient.balance,
      newBalance,
    });
    
    setPaymentDialogOpen(false);
    setPaymentData({ amount: "", method: "efectivo", note: "" });
    setSelectedClient(null);
  };

  const getClientHistory = (clientId: string): AppointmentChange[] => {
    return sampleAppointmentChanges.filter(change => change.clientId === clientId);
  };

  const handleOpenHistory = (client: Client) => {
    setSelectedClient(client);
    setHistoryDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: String(clients.length + 1),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
      visits: 0,
      lastVisit: "Nuevo",
      totalSpent: 0,
      vip: formData.vip,
      tags: formData.preferredServices,
      balance: 0,
      identificationNumber: formData.identificationNumber,
    };
    setClients([...clients, newClient]);
    console.log("Nuevo cliente:", newClient);
    setIsDialogOpen(false);
    setFormData({ name: "", email: "", phone: "", vip: false, preferredServices: [], identificationNumber: "" });
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.identificationNumber.includes(searchTerm)
  );


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tu base de clientes • {clients.length} clientes totales
            </p>
          </div>
          <Button 
            className="gradient-gold shadow-gold gap-2"
            onClick={() => setIsDialogOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            Agregar Cliente
          </Button>
        </div>

        {/* Gráfico de Deudas */}
        {(() => {
          const clientsWithDebt = clients
            .filter(c => c.balance > 0)
            .sort((a, b) => b.balance - a.balance);
          
          const totalDebt = clientsWithDebt.reduce((sum, c) => sum + c.balance, 0);
          
          const chartData = clientsWithDebt.map(c => ({
            name: c.name.split(' ')[0], // Solo primer nombre para el gráfico
            fullName: c.name,
            deuda: c.balance,
            mora: calculateOverdueDays(c.balanceDueDate)
          }));

          const chartConfig = {
            deuda: {
              label: "Deuda",
              color: "hsl(var(--destructive))",
            },
          };

          if (clientsWithDebt.length === 0) return null;

          return (
            <Card className="bg-card rounded-2xl border shadow-soft">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <TrendingUp className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Clientes con Deuda</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {clientsWithDebt.length} clientes • Total: ${totalDebt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        fontSize={12}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={80}
                        fontSize={12}
                      />
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg p-3">
                                <p className="font-semibold">{data.fullName}</p>
                                <p className="text-destructive font-bold">
                                  Deuda: ${data.deuda.toLocaleString()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Mora: {data.mora > 0 ? `${data.mora} días` : 'Al corriente'}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="deuda" 
                        radius={[0, 4, 4, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.mora > 30 ? 'hsl(var(--destructive))' : entry.mora > 15 ? 'hsl(30, 80%, 55%)' : 'hsl(45, 80%, 55%)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-muted-foreground">≤15 días mora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-muted-foreground">16-30 días mora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive"></div>
                    <span className="text-muted-foreground">&gt;30 días mora</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Search and Filters */}
        <div className="bg-card rounded-2xl border shadow-soft p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm">Todos</Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Star className="w-3 h-3 text-primary" />
                VIP
              </Button>
              <Button variant="outline" size="sm">Recientes</Button>
              <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30">
                <AlertCircle className="w-3 h-3" />
                Con Deuda
              </Button>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client, index) => (
            <div
              key={client.id}
              className={cn(
                "bg-card rounded-2xl border shadow-soft p-5 transition-all duration-300",
                "hover:shadow-medium hover:-translate-y-1 cursor-pointer",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={client.avatar}
                      alt={client.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
                    />
                    {client.vip && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                        <Star className="w-3 h-3 text-primary-foreground fill-current" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">{client.visits} visitas</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <History className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover">
                    <DropdownMenuItem onClick={() => handleOpenHistory(client)} className="gap-2 cursor-pointer">
                      <History className="w-4 h-4" />
                      Ver Historial
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <Eye className="w-4 h-4" />
                      Ver Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <Edit className="w-4 h-4" />
                      Editar Cliente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="w-4 h-4" />
                  <span>ID: {client.identificationNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {client.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Última visita: {client.lastVisit}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {client.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Sección de Saldo Pendiente y Mora */}
              {client.balance > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">Saldo Pendiente</span>
                    </div>
                    <span className="text-lg font-bold text-destructive">
                      ${client.balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Tiempo de mora</span>
                    </div>
                    {(() => {
                      const overdueDays = calculateOverdueDays(client.balanceDueDate);
                      const status = getOverdueStatus(overdueDays);
                      return (
                        <Badge variant="outline" className={cn("text-xs", status.color)}>
                          {status.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPayment(client);
                    }}
                  >
                    <CreditCard className="w-4 h-4" />
                    Registrar Pago
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total gastado</p>
                  <p className="text-lg font-bold text-primary">${client.totalSpent.toLocaleString()}</p>
                </div>
                <Button variant="outline" size="sm">Agendar Cita</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog Agregar Cliente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="identificationNumber">Número de identificación</Label>
                <Input
                  id="identificationNumber"
                  placeholder="Cédula o DNI"
                  value={formData.identificationNumber}
                  onChange={(e) => setFormData({ ...formData, identificationNumber: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  placeholder="Nombre del cliente"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
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

            <div className="space-y-2">
              <Label>Servicios preferidos</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {formData.preferredServices.length > 0
                      ? `${formData.preferredServices.length} servicio(s) seleccionado(s)`
                      : "Seleccionar servicios..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-popover" align="start">
                  <ScrollArea className="h-[200px]">
                    <div className="p-2 space-y-1">
                      {services.map((service) => {
                        const isSelected = formData.preferredServices.includes(service);
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
                                  preferredServices: formData.preferredServices.filter(s => s !== service)
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  preferredServices: [...formData.preferredServices, service]
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
              {formData.preferredServices.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.preferredServices.map((service) => (
                    <span key={service} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {service}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="vip">Cliente VIP</Label>
                <p className="text-sm text-muted-foreground">Marcar como cliente preferencial</p>
              </div>
              <Switch
                id="vip"
                checked={formData.vip}
                onCheckedChange={(checked) => setFormData({ ...formData, vip: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-gold shadow-gold">
                Guardar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Historial de Citas */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Historial de Citas - {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-4">
              {/* Client Summary */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                <img
                  src={selectedClient.avatar}
                  alt={selectedClient.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-border"
                />
                <div className="flex-1">
                  <p className="font-semibold">{selectedClient.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedClient.identificationNumber}</p>
                </div>
                <div className="text-right">
                  {(() => {
                    const history = getClientHistory(selectedClient.id);
                    const cancellations = history.filter(h => h.action === "cancelled").length;
                    const reschedules = history.filter(h => h.action === "rescheduled").length;
                    return (
                      <div className="flex gap-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-destructive">{cancellations}</p>
                          <p className="text-xs text-muted-foreground">Anuladas</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-info">{reschedules}</p>
                          <p className="text-xs text-muted-foreground">Reprogramadas</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* History List */}
              <ScrollArea className="h-[300px] pr-4">
                {(() => {
                  const history = getClientHistory(selectedClient.id);
                  
                  if (history.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Este cliente no tiene cambios de citas registrados</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {history.map((change) => (
                        <div
                          key={change.id}
                          className={cn(
                            "p-4 rounded-lg border",
                            change.action === "cancelled" 
                              ? "bg-destructive/5 border-destructive/20" 
                              : "bg-info/5 border-info/20"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {change.action === "cancelled" ? (
                                <CalendarX className="w-4 h-4 text-destructive" />
                              ) : (
                                <CalendarClock className="w-4 h-4 text-info" />
                              )}
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  change.action === "cancelled" 
                                    ? "text-destructive border-destructive/30" 
                                    : "text-info border-info/30"
                                )}
                              >
                                {change.action === "cancelled" ? "Anulada" : "Reprogramada"}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(change.createdAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          
                          <p className="font-medium mb-1">{change.service}</p>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Fecha original: </span>
                              <span>{change.originalDate} - {change.originalTime}</span>
                            </div>
                            {change.action === "rescheduled" && change.newDate && (
                              <div>
                                <span className="text-muted-foreground">Nueva fecha: </span>
                                <span className="text-info">{change.newDate} - {change.newTime}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-start gap-2 p-2 rounded bg-background/50">
                            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-sm text-muted-foreground">{change.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </ScrollArea>

              <DialogFooter>
                <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Pago */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Registrar Pago
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* Info del cliente */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <img
                  src={selectedClient.avatar}
                  alt={selectedClient.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{selectedClient.name}</p>
                  <p className="text-sm text-destructive font-semibold">
                    Saldo: ${selectedClient.balance.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Monto a pagar */}
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Monto a pagar</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="paymentAmount"
                    type="number"
                    min="0"
                    max={selectedClient.balance}
                    step="0.01"
                    placeholder="0.00"
                    className="pl-9"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaymentData({ ...paymentData, amount: String(selectedClient.balance) })}
                  >
                    Pago Total
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaymentData({ ...paymentData, amount: String(selectedClient.balance / 2) })}
                  >
                    50%
                  </Button>
                </div>
              </div>

              {/* Método de pago */}
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <Button
                        key={method.id}
                        type="button"
                        variant={paymentData.method === method.id ? "default" : "outline"}
                        className={cn(
                          "flex flex-col gap-1 h-auto py-3",
                          paymentData.method === method.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setPaymentData({ ...paymentData, method: method.id })}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{method.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Nota */}
              <div className="space-y-2">
                <Label htmlFor="paymentNote">Nota (opcional)</Label>
                <Input
                  id="paymentNote"
                  placeholder="Ej: Abono parcial, pago con tarjeta..."
                  value={paymentData.note}
                  onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                />
              </div>

              {/* Resumen */}
              {paymentData.amount && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saldo actual:</span>
                    <span className="font-medium">${selectedClient.balance.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pago:</span>
                    <span className="font-medium text-green-600">-${parseFloat(paymentData.amount || "0").toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 mt-2 border-t border-green-500/20">
                    <span className="font-medium">Nuevo saldo:</span>
                    <span className="font-bold">
                      ${Math.max(0, selectedClient.balance - (parseFloat(paymentData.amount) || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2 bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4" />
                  Confirmar Pago
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
