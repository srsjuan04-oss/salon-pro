import { useState } from "react";
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
  MoreVertical,
  Star,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { initialClients, calculateOverdueDays, getOverdueStatus, type Client } from "@/data/clients";

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vip: false,
    tags: "",
    identificationNumber: "",
  });

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
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
      balance: 0,
      identificationNumber: formData.identificationNumber,
    };
    setClients([...clients, newClient]);
    console.log("Nuevo cliente:", newClient);
    setIsDialogOpen(false);
    setFormData({ name: "", email: "", phone: "", vip: false, tags: "", identificationNumber: "" });
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
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
                  <div className="flex items-center justify-between">
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
              <Label htmlFor="tags">Servicios preferidos</Label>
              <Input
                id="tags"
                placeholder="Ej: Corte, Coloración, Manicure (separados por coma)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
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
    </DashboardLayout>
  );
}
