import { useState } from "react";
import { Plus, UserPlus, CalendarPlus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";

const staffMembers = [
  { id: "1", name: "Ana López", role: "Estilista" },
  { id: "2", name: "Miguel Santos", role: "Barbero" },
  { id: "3", name: "Carmen Ruiz", role: "Manicurista" },
  { id: "4", name: "Diego Fernández", role: "Estilista" },
];

const services = [
  "Corte de cabello",
  "Corte + Tinte",
  "Corte + Barba",
  "Manicure",
  "Pedicure",
  "Tratamiento capilar",
  "Coloración",
  "Fade",
];

const expenseCategories = [
  "Productos",
  "Nómina",
  "Servicios",
  "Mantenimiento",
  "Marketing",
  "Otros",
];

const paymentMethods = ["Efectivo", "Tarjeta", "Transferencia"];

export function QuickActions() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  
  // Form states
  const [appointmentData, setAppointmentData] = useState({
    client: "",
    service: "",
    staffId: "",
    date: "",
    time: "",
    duration: "1",
  });

  const [clientData, setClientData] = useState({
    name: "",
    email: "",
    phone: "",
    vip: false,
    tags: "",
  });

  const [saleData, setSaleData] = useState({
    client: "",
    service: "",
    amount: "",
    paymentMethod: "",
  });

  const [expenseData, setExpenseData] = useState({
    description: "",
    category: "",
    amount: "",
    paymentMethod: "",
  });

  const handleSubmit = (type: string) => {
    switch (type) {
      case "appointment":
        console.log("Nueva cita:", appointmentData);
        setAppointmentData({ client: "", service: "", staffId: "", date: "", time: "", duration: "1" });
        break;
      case "client":
        console.log("Nuevo cliente:", clientData);
        setClientData({ name: "", email: "", phone: "", vip: false, tags: "" });
        break;
      case "sale":
        console.log("Nueva venta:", saleData);
        setSaleData({ client: "", service: "", amount: "", paymentMethod: "" });
        break;
      case "expense":
        console.log("Nuevo gasto:", expenseData);
        setExpenseData({ description: "", category: "", amount: "", paymentMethod: "" });
        break;
    }
    setActiveDialog(null);
  };

  const actions = [
    { icon: CalendarPlus, label: "Nueva Cita", color: "gradient-gold shadow-gold", dialog: "appointment" },
    { icon: UserPlus, label: "Agregar Cliente", color: "bg-success/10 text-success hover:bg-success/20", dialog: "client" },
    { icon: Receipt, label: "Registrar Venta", color: "bg-info/10 text-info hover:bg-info/20", dialog: "sale" },
    { icon: Plus, label: "Nuevo Gasto", color: "bg-secondary hover:bg-secondary/80", dialog: "expense" },
  ];

  return (
    <>
      <div className="bg-card rounded-2xl border shadow-soft p-6 animate-slide-up">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`h-auto py-4 flex flex-col gap-2 ${action.color} transition-all duration-200 hover:-translate-y-1`}
              onClick={() => setActiveDialog(action.dialog)}
            >
              <action.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Dialog Nueva Cita */}
      <Dialog open={activeDialog === "appointment"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Cita</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit("appointment"); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apt-client">Cliente</Label>
              <Input
                id="apt-client"
                placeholder="Nombre del cliente"
                value={appointmentData.client}
                onChange={(e) => setAppointmentData({ ...appointmentData, client: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apt-service">Servicio</Label>
              <Select
                value={appointmentData.service}
                onValueChange={(value) => setAppointmentData({ ...appointmentData, service: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apt-staff">Staff</Label>
              <Select
                value={appointmentData.staffId}
                onValueChange={(value) => setAppointmentData({ ...appointmentData, staffId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name} - {staff.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apt-date">Fecha</Label>
                <Input
                  id="apt-date"
                  type="date"
                  value={appointmentData.date}
                  onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apt-time">Hora</Label>
                <Input
                  id="apt-time"
                  type="time"
                  value={appointmentData.time}
                  onChange={(e) => setAppointmentData({ ...appointmentData, time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apt-duration">Duración</Label>
              <Select
                value={appointmentData.duration}
                onValueChange={(value) => setAppointmentData({ ...appointmentData, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Duración" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">30 minutos</SelectItem>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="1.5">1 hora 30 min</SelectItem>
                  <SelectItem value="2">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-gold shadow-gold">
                Agendar Cita
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Agregar Cliente */}
      <Dialog open={activeDialog === "client"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit("client"); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cli-name">Nombre completo</Label>
              <Input
                id="cli-name"
                placeholder="Nombre del cliente"
                value={clientData.name}
                onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cli-email">Correo electrónico</Label>
              <Input
                id="cli-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={clientData.email}
                onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cli-phone">Teléfono</Label>
              <Input
                id="cli-phone"
                type="tel"
                placeholder="+52 55 1234 5678"
                value={clientData.phone}
                onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cli-tags">Servicios preferidos</Label>
              <Input
                id="cli-tags"
                placeholder="Ej: Corte, Coloración (separados por coma)"
                value={clientData.tags}
                onChange={(e) => setClientData({ ...clientData, tags: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="cli-vip">Cliente VIP</Label>
                <p className="text-sm text-muted-foreground">Marcar como cliente preferencial</p>
              </div>
              <Switch
                id="cli-vip"
                checked={clientData.vip}
                onCheckedChange={(checked) => setClientData({ ...clientData, vip: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-gold shadow-gold">
                Guardar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Venta */}
      <Dialog open={activeDialog === "sale"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Venta</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit("sale"); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sale-client">Cliente</Label>
              <Input
                id="sale-client"
                placeholder="Nombre del cliente"
                value={saleData.client}
                onChange={(e) => setSaleData({ ...saleData, client: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-service">Servicio / Producto</Label>
              <Select
                value={saleData.service}
                onValueChange={(value) => setSaleData({ ...saleData, service: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-amount">Monto ($)</Label>
              <Input
                id="sale-amount"
                type="number"
                placeholder="0.00"
                value={saleData.amount}
                onChange={(e) => setSaleData({ ...saleData, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-payment">Método de pago</Label>
              <Select
                value={saleData.paymentMethod}
                onValueChange={(value) => setSaleData({ ...saleData, paymentMethod: value })}
              >
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-gold shadow-gold">
                Registrar Venta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuevo Gasto */}
      <Dialog open={activeDialog === "expense"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nuevo Gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit("expense"); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exp-description">Descripción</Label>
              <Input
                id="exp-description"
                placeholder="Descripción del gasto"
                value={expenseData.description}
                onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-category">Categoría</Label>
              <Select
                value={expenseData.category}
                onValueChange={(value) => setExpenseData({ ...expenseData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-amount">Monto ($)</Label>
              <Input
                id="exp-amount"
                type="number"
                placeholder="0.00"
                value={expenseData.amount}
                onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-payment">Método de pago</Label>
              <Select
                value={expenseData.paymentMethod}
                onValueChange={(value) => setExpenseData({ ...expenseData, paymentMethod: value })}
              >
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-gold shadow-gold">
                Guardar Gasto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}