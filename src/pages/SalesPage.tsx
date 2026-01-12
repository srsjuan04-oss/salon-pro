import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const monthlyData = [
  { name: "Ene", ventas: 28000, comisiones: 4200 },
  { name: "Feb", ventas: 32000, comisiones: 4800 },
  { name: "Mar", ventas: 29000, comisiones: 4350 },
  { name: "Abr", ventas: 35000, comisiones: 5250 },
  { name: "May", ventas: 38000, comisiones: 5700 },
  { name: "Jun", ventas: 42000, comisiones: 6300 },
];

const serviceData = [
  { name: "Corte", value: 12500 },
  { name: "Coloración", value: 18000 },
  { name: "Manicure", value: 8500 },
  { name: "Tratamientos", value: 15000 },
  { name: "Barba", value: 6000 },
];

const recentSales = [
  { id: "1", client: "María García", service: "Corte + Tinte", amount: 850, stylist: "Ana López", time: "Hace 30 min", method: "Tarjeta" },
  { id: "2", client: "Laura Martínez", service: "Manicure", amount: 350, stylist: "Carmen Ruiz", time: "Hace 1 hora", method: "Efectivo" },
  { id: "3", client: "Sofia Hernández", service: "Tratamiento Keratina", amount: 1200, stylist: "Ana López", time: "Hace 2 horas", method: "Tarjeta" },
  { id: "4", client: "Carlos Mendez", service: "Corte + Barba", amount: 450, stylist: "Miguel Santos", time: "Hace 3 horas", method: "Efectivo" },
  { id: "5", client: "Elena Pérez", service: "Pedicure", amount: 400, stylist: "Carmen Ruiz", time: "Hace 4 horas", method: "Transferencia" },
];

export default function SalesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Ventas</h1>
            <p className="text-muted-foreground mt-1">
              Analiza el rendimiento financiero de tu salón
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
                <p className="text-sm text-primary-foreground/80">Ventas del Mes</p>
                <p className="text-2xl font-bold text-primary-foreground">$42,850</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comisiones</p>
                <p className="text-2xl font-bold">$6,427</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transacciones</p>
                <p className="text-2xl font-bold">186</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                <p className="text-2xl font-bold">$230</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="bg-card rounded-2xl border shadow-soft p-6">
            <h3 className="text-lg font-semibold mb-4">Tendencia Mensual</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorVentas2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
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
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                  <Area type="monotone" dataKey="ventas" stroke="hsl(38, 92%, 50%)" strokeWidth={2} fill="url(#colorVentas2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* By Service */}
          <div className="bg-card rounded-2xl border shadow-soft p-6">
            <h3 className="text-lg font-semibold mb-4">Ventas por Servicio</h3>
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
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Ventas"]}
                  />
                  <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-card rounded-2xl border shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Ventas Recientes</h3>
            <Button variant="ghost" size="sm">Ver todas</Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Servicio</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Staff</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Método</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tiempo</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Monto</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-4 font-medium">{sale.client}</td>
                    <td className="py-4 px-4 text-muted-foreground">{sale.service}</td>
                    <td className="py-4 px-4 text-muted-foreground">{sale.stylist}</td>
                    <td className="py-4 px-4">
                      <Badge variant="secondary">{sale.method}</Badge>
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">{sale.time}</td>
                    <td className="py-4 px-4 text-right font-semibold text-primary">${sale.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
