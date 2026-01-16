import { useState, useMemo } from "react";
import { Plus, UserPlus, CalendarPlus, Receipt, Search, DollarSign, CreditCard, Banknote, Smartphone, AlertCircle } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { initialClients, type Client } from "@/data/clients";

const staffMembers = [
  { id: "1", name: "Ana López", role: "Estilista" },
  { id: "2", name: "Miguel Santos", role: "Barbero" },
  { id: "3", name: "Carmen Ruiz", role: "Manicurista" },
  { id: "4", name: "Diego Fernández", role: "Estilista" },
];

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

const expenseCategories = [
  "Productos",
  "Nómina",
  "Servicios",
  "Mantenimiento",
  "Marketing",
  "Otros",
];

const paymentMethodsOptions = [
  { id: "cash", label: "Efectivo", icon: Banknote },
  { id: "card", label: "Tarjeta", icon: CreditCard },
  { id: "transfer", label: "Transferencia", icon: Smartphone },
  { id: "pending", label: "Pendiente (Crédito)", icon: AlertCircle },
];

export function QuickActions() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [services, setServices] = useState(initialServices);
  
  // Client search and add states
  const [clientSearch, setClientSearch] = useState("");
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "",
    identificationNumber: "",
    phone: "",
    email: "",
  });

  // Service add state
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  
  // Form states
  const [appointmentData, setAppointmentData] = useState({
    client: "",
    clientId: "",
    service: "",
    staffId: "",
    date: "",
    time: "",
    duration: "1",
    price: "",
    paymentMethod: "",
  });

  const [clientData, setClientData] = useState({
    name: "",
    email: "",
    phone: "",
    vip: false,
    tags: "",
    identificationNumber: "",
  });

  const [saleData, setSaleData] = useState({
    client: "",
    clientId: "",
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

  // Filtered clients for search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const search = clientSearch.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.identificationNumber.includes(search)
    );
  }, [clients, clientSearch]);

  const handleSelectClient = (client: Client, target: "appointment" | "sale") => {
    if (target === "appointment") {
      setAppointmentData({ ...appointmentData, client: client.name, clientId: client.id });
    } else {
      setSaleData({ ...saleData, client: client.name, clientId: client.id });
    }
    setClientSearch("");
    setIsClientPopoverOpen(false);
  };

  const handleAddNewClient = (target: "appointment" | "sale") => {
    if (newClientData.name && newClientData.identificationNumber) {
      const newClient: Client = {
        id: String(clients.length + 1),
        name: newClientData.name,
        email: newClientData.email,
        phone: newClientData.phone,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newClientData.name)}&background=random`,
        visits: 0,
        lastVisit: "Nuevo",
        totalSpent: 0,
        vip: false,
        tags: [],
        balance: 0,
        identificationNumber: newClientData.identificationNumber,
      };
      setClients([...clients, newClient]);
      if (target === "appointment") {
        setAppointmentData({ ...appointmentData, client: newClient.name, clientId: newClient.id });
      } else {
        setSaleData({ ...saleData, client: newClient.name, clientId: newClient.id });
      }
      setNewClientData({ name: "", identificationNumber: "", phone: "", email: "" });
      setIsAddingClient(false);
      setIsClientPopoverOpen(false);
    }
  };

  const handleAddService = () => {
    if (newServiceName.trim()) {
      setServices([...services, newServiceName.trim()]);
      setAppointmentData({ ...appointmentData, service: newServiceName.trim() });
      setNewServiceName("");
      setIsAddingService(false);
    }
  };

  const handleSubmit = (type: string) => {
    switch (type) {
      case "appointment":
        console.log("Nueva cita:", appointmentData);
        console.log("Venta registrada:", { 
          client: appointmentData.client, 
          service: appointmentData.service, 
          amount: parseFloat(appointmentData.price) || 0,
          date: appointmentData.date,
          paymentMethod: appointmentData.paymentMethod,
          isPending: appointmentData.paymentMethod === "pending"
        });
        setAppointmentData({ client: "", clientId: "", service: "", staffId: "", date: "", time: "", duration: "1", price: "", paymentMethod: "" });
        break;
      case "client":
        const newClient: Client = {
          id: String(clients.length + 1),
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientData.name)}&background=random`,
          visits: 0,
          lastVisit: "Nuevo",
          totalSpent: 0,
          vip: clientData.vip,
          tags: clientData.tags.split(",").map(t => t.trim()).filter(Boolean),
          balance: 0,
          identificationNumber: clientData.identificationNumber,
        };
        setClients([...clients, newClient]);
        console.log("Nuevo cliente:", newClient);
        setClientData({ name: "", email: "", phone: "", vip: false, tags: "", identificationNumber: "" });
        break;
      case "sale":
        console.log("Nueva venta:", saleData);
        setSaleData({ client: "", clientId: "", service: "", amount: "", paymentMethod: "" });
        break;
      case "expense":
        console.log("Nuevo gasto:", expenseData);
        setExpenseData({ description: "", category: "", amount: "", paymentMethod: "" });
        break;
    }
    setActiveDialog(null);
    setIsAddingClient(false);
    setIsAddingService(false);
  };

  const actions = [
    { icon: CalendarPlus, label: "Nueva Cita", color: "gradient-gold shadow-gold", dialog: "appointment" },
    { icon: UserPlus, label: "Agregar Cliente", color: "bg-success/10 text-success hover:bg-success/20", dialog: "client" },
    { icon: Receipt, label: "Registrar Venta", color: "bg-info/10 text-info hover:bg-info/20", dialog: "sale" },
    { icon: Plus, label: "Nuevo Gasto", color: "bg-secondary hover:bg-secondary/80", dialog: "expense" },
  ];

  // Client selector component for reuse
  const ClientSelector = ({ target, value }: { target: "appointment" | "sale", value: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Cliente</Label>
        {!isAddingClient && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs gap-1 text-primary"
            onClick={() => {
              setIsAddingClient(true);
              setIsClientPopoverOpen(false);
            }}
          >
            <UserPlus className="w-3 h-3" />
            Nuevo
          </Button>
        )}
      </div>

      {isAddingClient ? (
        <div className="space-y-3 p-3 border rounded-lg bg-secondary/30">
          <p className="text-sm font-medium">Nuevo Cliente</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Número de identificación"
              value={newClientData.identificationNumber}
              onChange={(e) => setNewClientData({ ...newClientData, identificationNumber: e.target.value })}
            />
            <Input
              placeholder="Nombre completo"
              value={newClientData.name}
              onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Teléfono"
              value={newClientData.phone}
              onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
            />
            <Input
              placeholder="Email (opcional)"
              value={newClientData.email}
              onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              type="button" 
              size="sm" 
              className="gradient-gold shadow-gold"
              onClick={() => handleAddNewClient(target)}
              disabled={!newClientData.name || !newClientData.identificationNumber}
            >
              Agregar Cliente
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => {
                setIsAddingClient(false);
                setNewClientData({ name: "", identificationNumber: "", phone: "", email: "" });
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal"
            >
              {value || "Seleccionar cliente..."}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 bg-popover" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder="Buscar por nombre o ID..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="h-9"
              />
            </div>
            <ScrollArea className="h-[200px]">
              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No se encontraron clientes
                </div>
              ) : (
                <div className="p-1">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary transition-colors text-left",
                        (target === "appointment" ? appointmentData.clientId : saleData.clientId) === client.id && "bg-primary/10"
                      )}
                      onClick={() => handleSelectClient(client, target)}
                    >
                      <img
                        src={client.avatar}
                        alt={client.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {client.identificationNumber} • {client.phone}
                        </p>
                      </div>
                      {client.balance > 0 && (
                        <span className="text-xs text-destructive font-medium">
                          Deuda: ${client.balance}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );

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
      <Dialog open={activeDialog === "appointment"} onOpenChange={(open) => { if (!open) { setActiveDialog(null); setIsAddingClient(false); setIsAddingService(false); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Cita</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit("appointment"); }} className="space-y-4">
            <ClientSelector target="appointment" value={appointmentData.client} />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Servicio</Label>
                {!isAddingService && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs gap-1 text-primary"
                    onClick={() => setIsAddingService(true)}
                  >
                    <Plus className="w-3 h-3" />
                    Nuevo
                  </Button>
                )}
              </div>
              
              {isAddingService ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del nuevo servicio"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddService();
                      }
                    }}
                    autoFocus
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    className="gradient-gold shadow-gold"
                    onClick={handleAddService}
                  >
                    Agregar
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsAddingService(false);
                      setNewServiceName("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
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
              )}
            </div>

            <div className="space-y-2">
              <Label>Staff</Label>
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
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={appointmentData.date}
                  onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={appointmentData.time}
                  onChange={(e) => setAppointmentData({ ...appointmentData, time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duración</Label>
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
                    <SelectItem value="2.5">2 horas 30 min</SelectItem>
                    <SelectItem value="3">3 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor del servicio</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-9"
                    value={appointmentData.price}
                    onChange={(e) => setAppointmentData({ ...appointmentData, price: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Medio de pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethodsOptions.map((method) => {
                  const Icon = method.icon;
                  const isSelected = appointmentData.paymentMethod === method.id;
                  const isPending = method.id === "pending";
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setAppointmentData({ ...appointmentData, paymentMethod: method.id })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200",
                        isSelected
                          ? isPending
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  );
                })}
              </div>
              {appointmentData.paymentMethod === "pending" && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Este pago quedará pendiente y se sumará al saldo del cliente
                </p>
              )}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cli-id">Número de identificación</Label>
                <Input
                  id="cli-id"
                  placeholder="Cédula o DNI"
                  value={clientData.identificationNumber}
                  onChange={(e) => setClientData({ ...clientData, identificationNumber: e.target.value })}
                  required
                />
              </div>
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
      <Dialog open={activeDialog === "sale"} onOpenChange={(open) => { if (!open) { setActiveDialog(null); setIsAddingClient(false); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Venta</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit("sale"); }} className="space-y-4">
            <ClientSelector target="sale" value={saleData.client} />

            <div className="space-y-2">
              <Label>Servicio / Producto</Label>
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
              <Label>Monto</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-9"
                  value={saleData.amount}
                  onChange={(e) => setSaleData({ ...saleData, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethodsOptions.map((method) => {
                  const Icon = method.icon;
                  const isSelected = saleData.paymentMethod === method.id;
                  const isPending = method.id === "pending";
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSaleData({ ...saleData, paymentMethod: method.id })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200",
                        isSelected
                          ? isPending
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  );
                })}
              </div>
              {saleData.paymentMethod === "pending" && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Este pago quedará pendiente y se sumará al saldo del cliente
                </p>
              )}
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
              <Label>Categoría</Label>
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
              <Label>Monto</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-9"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethodsOptions.slice(0, 3).map((method) => {
                  const Icon = method.icon;
                  const isSelected = expenseData.paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setExpenseData({ ...expenseData, paymentMethod: method.id })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  );
                })}
              </div>
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
