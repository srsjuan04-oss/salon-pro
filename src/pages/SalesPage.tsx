import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Filter,
  DollarSign,
  TrendingUp,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Plus
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const monthlyData = [
  { name: "Ene", pagadas: 24000, pendientes: 4000 },
  { name: "Feb", pagadas: 28000, pendientes: 4000 },
  { name: "Mar", pagadas: 25000, pendientes: 4000 },
  { name: "Abr", pagadas: 31000, pendientes: 4000 },
  { name: "May", pagadas: 34000, pendientes: 4000 },
  { name: "Jun", pagadas: 38000, pendientes: 4850 },
];

const serviceData = [
  { name: "Corte", value: 12500 },
  { name: "Coloración", value: 18000 },
  { name: "Manicure", value: 8500 },
  { name: "Tratamientos", value: 15000 },
  { name: "Barba", value: 6000 },
];

const services = [
  { name: "Corte de cabello", price: 250 },
  { name: "Corte + Tinte", price: 850 },
  { name: "Corte + Barba", price: 450 },
  { name: "Manicure", price: 350 },
  { name: "Pedicure", price: 400 },
  { name: "Tratamiento Keratina", price: 1200 },
  { name: "Coloración", price: 600 },
  { name: "Fade", price: 200 },
];

interface Sale {
  id: string;
  client: string;
  service: string;
  amount: number;
  stylist: string;
  date: string;
  time: string;
  method: string;
  status: "paid" | "pending";
}

const initialSales: Sale[] = [
  { id: "1", client: "María García", service: "Corte + Tinte", amount: 850, stylist: "Ana López", date: "2026-01-12", time: "09:00", method: "Tarjeta", status: "paid" },
  { id: "2", client: "Laura Martínez", service: "Manicure", amount: 350, stylist: "Carmen Ruiz", date: "2026-01-12", time: "10:30", method: "Efectivo", status: "paid" },
  { id: "3", client: "Sofia Hernández", service: "Tratamiento Keratina", amount: 1200, stylist: "Ana López", date: "2026-01-12", time: "11:00", method: "-", status: "pending" },
  { id: "4", client: "Carlos Mendez", service: "Corte + Barba", amount: 450, stylist: "Miguel Santos", date: "2026-01-12", time: "12:00", method: "Efectivo", status: "paid" },
  { id: "5", client: "Elena Pérez", service: "Pedicure", amount: 400, stylist: "Carmen Ruiz", date: "2026-01-12", time: "14:00", method: "-", status: "pending" },
  { id: "6", client: "Rosa Mendoza", service: "Coloración", amount: 600, stylist: "Ana López", date: "2026-01-12", time: "15:00", method: "Transferencia", status: "paid" },
  { id: "7", client: "Juan López", service: "Corte de cabello", amount: 250, stylist: "Miguel Santos", date: "2026-01-12", time: "16:00", method: "-", status: "pending" },
  { id: "8", client: "Ana Martínez", service: "Tratamiento Keratina", amount: 1200, stylist: "Ana López", date: "2026-01-11", time: "10:00", method: "Tarjeta", status: "paid" },
];

const paymentMethods = ["Efectivo", "Tarjeta", "Transferencia"];

export default function SalesPage() {
  const [sales, setSales] = useState(initialSales);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [formData, setFormData] = useState({
    client: "",
    service: "",
    amount: "",
    paymentMethod: "",
  });

  const paidSales = sales.filter(s => s.status === "paid");
  const pendingSales = sales.filter(s => s.status === "pending");
  
  const totalPaid = paidSales.reduce((acc, s) => acc + s.amount, 0);
  const totalPending = pendingSales.reduce((acc, s) => acc + s.amount, 0);
  const totalSales = totalPaid + totalPending;

  const handleServiceChange = (serviceName: string) => {
    const service = services.find(s => s.name === serviceName);
    setFormData({ 
      ...formData, 
      service: serviceName, 
      amount: service ? service.price.toString() : "" 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Nueva venta:", formData);
    setIsDialogOpen(false);
    setFormData({ client: "", service: "", amount: "", paymentMethod: "" });
  };

  const markAsPaid = (saleId: string, method: string) => {
    setSales(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, status: "paid" as const, method } : sale
    ));
  };

  const filteredSales = activeTab === "all" 
    ? sales 
    : activeTab === "paid" 
      ? paidSales 
      : pendingSales;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Ventas</h1>
            <p className="text-muted-foreground mt-1">
              Control de ingresos por servicios prestados
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtrar
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button className="gradient-gold shadow-gold gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Nueva Venta
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border shadow-soft p-5 gradient-gold">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-primary-foreground/80">Total Ventas</p>
                <p className="text-2xl font-bold text-primary-foreground">${totalSales.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas Pagadas</p>
                <p className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{paidSales.length} transacciones</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas Pendientes</p>
                <p className="text-2xl font-bold text-warning">${totalPending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{pendingSales.length} por cobrar</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                <p className="text-2xl font-bold">${Math.round(totalSales / sales.length).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{sales.length} servicios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="bg-card rounded-2xl border shadow-soft p-6">
            <h3 className="text-lg font-semibold mb-4">Ingresos Mensuales</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorPagadas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPendientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      `$${value.toLocaleString()}`, 
                      name === "pagadas" ? "Pagadas" : "Pendientes"
                    ]}
                  />
                  <Area type="monotone" dataKey="pagadas" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#colorPagadas)" />
                  <Area type="monotone" dataKey="pendientes" stroke="hsl(var(--warning))" strokeWidth={2} fill="url(#colorPendientes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">Pagadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-sm text-muted-foreground">Pendientes</span>
              </div>
            </div>
          </div>

          {/* By Service */}
          <div className="bg-card rounded-2xl border shadow-soft p-6">
            <h3 className="text-lg font-semibold mb-4">Ingresos por Servicio</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Ingresos"]}
                  />
                  <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sales Table with Tabs */}
        <div className="bg-card rounded-2xl border shadow-soft p-6">
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold">Registro de Ventas</h3>
              <TabsList className="grid w-full sm:w-auto grid-cols-3">
                <TabsTrigger value="all" className="gap-2">
                  Todas
                  <Badge variant="secondary" className="ml-1">{sales.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="paid" className="gap-2">
                  Pagadas
                  <Badge variant="secondary" className="ml-1 bg-success/20 text-success">{paidSales.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  Pendientes
                  <Badge variant="secondary" className="ml-1 bg-warning/20 text-warning">{pendingSales.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <SalesTable sales={filteredSales} onMarkAsPaid={markAsPaid} />
            </TabsContent>
            <TabsContent value="paid" className="mt-0">
              <SalesTable sales={filteredSales} onMarkAsPaid={markAsPaid} />
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              <SalesTable sales={filteredSales} onMarkAsPaid={markAsPaid} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialog Nueva Venta */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Venta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Input
                id="client"
                placeholder="Nombre del cliente"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Servicio</Label>
              <Select
                value={formData.service}
                onValueChange={handleServiceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.name} value={service.name}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground">${service.price}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto ($)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">El precio se ajusta automáticamente al seleccionar servicio</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Método de pago</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método (opcional si pendiente)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning" />
                      Dejar como pendiente
                    </div>
                  </SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-gold shadow-gold">
                Registrar Venta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

interface SalesTableProps {
  sales: Sale[];
  onMarkAsPaid: (id: string, method: string) => void;
}

function SalesTable({ sales, onMarkAsPaid }: SalesTableProps) {
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("");

  const handleConfirmPayment = () => {
    if (paymentDialog && selectedMethod) {
      onMarkAsPaid(paymentDialog, selectedMethod);
      setPaymentDialog(null);
      setSelectedMethod("");
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Servicio</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Staff</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Fecha</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Monto</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="py-4 px-4">
                  <p className="font-medium">{sale.client}</p>
                </td>
                <td className="py-4 px-4 text-muted-foreground">{sale.service}</td>
                <td className="py-4 px-4 text-muted-foreground hidden md:table-cell">{sale.stylist}</td>
                <td className="py-4 px-4 text-sm text-muted-foreground hidden sm:table-cell">
                  <div>{sale.date}</div>
                  <div className="text-xs">{sale.time}</div>
                </td>
                <td className="py-4 px-4">
                  {sale.status === "paid" ? (
                    <Badge className="bg-success/10 text-success border-success/20 gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Pagado
                    </Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Pendiente
                    </Badge>
                  )}
                </td>
                <td className={cn(
                  "py-4 px-4 text-right font-semibold",
                  sale.status === "paid" ? "text-success" : "text-warning"
                )}>
                  ${sale.amount.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right">
                  {sale.status === "pending" ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-1"
                      onClick={() => setPaymentDialog(sale.id)}
                    >
                      <CreditCard className="w-3 h-3" />
                      Cobrar
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="font-normal">
                      {sale.method}
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={(open) => !open && setPaymentDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPaymentDialog(null)}>
              Cancelar
            </Button>
            <Button 
              className="gradient-gold shadow-gold"
              onClick={handleConfirmPayment}
              disabled={!selectedMethod}
            >
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}