import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock, DollarSign, CreditCard, Banknote, Smartphone, AlertCircle, Search, UserPlus, X, CalendarX, CalendarClock, MessageSquare } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { initialClients, type Client, type AppointmentChange } from "@/data/clients";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const hours = Array.from({ length: 12 }, (_, i) => i + 8);

const staffMembers = [
  { id: "1", name: "Ana López", role: "Estilista", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100", color: "bg-primary/20 border-primary/40 text-primary" },
  { id: "2", name: "Miguel Santos", role: "Barbero", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", color: "bg-success/20 border-success/40 text-success" },
  { id: "3", name: "Carmen Ruiz", role: "Manicurista", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100", color: "bg-info/20 border-info/40 text-info" },
  { id: "4", name: "Diego Fernández", role: "Estilista", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", color: "bg-accent/20 border-accent/40 text-accent" },
];

interface PendingAppointment {
  id: string;
  clientId: string;
  client: string;
  service: string;
  staffId: string;
  staffName: string;
  date: string;
  time: string;
  duration: number;
}

const pendingAppointments: PendingAppointment[] = [
  { id: "1", clientId: "1", client: "María García", service: "Corte + Tinte", staffId: "1", staffName: "Ana López", date: "2026-01-16", time: "09:00", duration: 2 },
  { id: "2", clientId: "2", client: "Laura Martínez", service: "Manicure", staffId: "3", staffName: "Carmen Ruiz", date: "2026-01-16", time: "10:00", duration: 1.5 },
  { id: "3", clientId: "3", client: "Sofia Hernández", service: "Tratamiento", staffId: "1", staffName: "Ana López", date: "2026-01-16", time: "11:00", duration: 1.5 },
  { id: "4", clientId: "4", client: "Elena Pérez", service: "Corte", staffId: "4", staffName: "Diego Fernández", date: "2026-01-16", time: "11:00", duration: 2 },
  { id: "5", clientId: "5", client: "Rosa Mendoza", service: "Pedicure", staffId: "3", staffName: "Carmen Ruiz", date: "2026-01-16", time: "14:00", duration: 1 },
];

const appointments = [
  { id: 1, time: "09:00", duration: 2, client: "María García", service: "Corte + Tinte", staffId: "1" },
  { id: 2, time: "09:00", duration: 1, client: "Carlos Mendez", service: "Corte + Barba", staffId: "2" },
  { id: 3, time: "10:00", duration: 1.5, client: "Laura Martínez", service: "Manicure", staffId: "3" },
  { id: 4, time: "10:30", duration: 1, client: "Pedro Ruiz", service: "Fade", staffId: "2" },
  { id: 5, time: "11:00", duration: 1.5, client: "Sofia Hernández", service: "Tratamiento", staffId: "1" },
  { id: 6, time: "11:00", duration: 2, client: "Elena Pérez", service: "Corte", staffId: "4" },
  { id: 7, time: "14:00", duration: 1, client: "Rosa Mendoza", service: "Pedicure", staffId: "3" },
  { id: 8, time: "14:00", duration: 1.5, client: "Juan López", service: "Coloración", staffId: "1" },
  { id: 9, time: "15:00", duration: 1, client: "Luis García", service: "Corte", staffId: "2" },
];

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const dates = [12, 13, 14, 15, 16, 17, 18];

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

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [services, setServices] = useState(initialServices);
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [clientSearch, setClientSearch] = useState("");
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "",
    identificationNumber: "",
    phone: "",
    email: "",
  });
  const [formData, setFormData] = useState({
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

  // State for appointment action dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<PendingAppointment | null>(null);
  const [actionType, setActionType] = useState<"cancel" | "reschedule" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [rescheduleData, setRescheduleData] = useState({ date: "", time: "" });
  const [appointmentChanges, setAppointmentChanges] = useState<AppointmentChange[]>([]);
  const [pendingList, setPendingList] = useState<PendingAppointment[]>(pendingAppointments);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const search = clientSearch.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.identificationNumber.includes(search)
    );
  }, [clients, clientSearch]);

  const handleSelectClient = (client: Client) => {
    setFormData({ ...formData, client: client.name, clientId: client.id });
    setClientSearch("");
    setIsClientPopoverOpen(false);
  };

  const handleAddNewClient = () => {
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
      setFormData({ ...formData, client: newClient.name, clientId: newClient.id });
      setNewClientData({ name: "", identificationNumber: "", phone: "", email: "" });
      setIsAddingClient(false);
      setIsClientPopoverOpen(false);
    }
  };

  const handleAddService = () => {
    if (newServiceName.trim()) {
      setServices([...services, newServiceName.trim()]);
      setFormData({ ...formData, service: newServiceName.trim() });
      setNewServiceName("");
      setIsAddingService(false);
    }
  };

  const paymentMethods = [
    { id: "cash", label: "Efectivo", icon: Banknote },
    { id: "card", label: "Tarjeta", icon: CreditCard },
    { id: "transfer", label: "Transferencia", icon: Smartphone },
    { id: "pending", label: "Pendiente (Crédito)", icon: AlertCircle },
  ];

  const handleOpenActionDialog = (apt: PendingAppointment, type: "cancel" | "reschedule") => {
    setSelectedAppointment(apt);
    setActionType(type);
    setActionReason("");
    setRescheduleData({ date: apt.date, time: apt.time });
    setActionDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedAppointment || !actionType || !actionReason.trim()) return;

    const change: AppointmentChange = {
      id: String(appointmentChanges.length + 1),
      appointmentId: selectedAppointment.id,
      clientId: selectedAppointment.clientId,
      clientName: selectedAppointment.client,
      service: selectedAppointment.service,
      originalDate: selectedAppointment.date,
      originalTime: selectedAppointment.time,
      action: actionType === "cancel" ? "cancelled" : "rescheduled",
      reason: actionReason,
      newDate: actionType === "reschedule" ? rescheduleData.date : undefined,
      newTime: actionType === "reschedule" ? rescheduleData.time : undefined,
      createdAt: new Date().toISOString(),
    };

    setAppointmentChanges([...appointmentChanges, change]);

    // Update client's appointment changes
    setClients(clients.map(c => {
      if (c.id === selectedAppointment.clientId) {
        return {
          ...c,
          appointmentChanges: [...(c.appointmentChanges || []), change]
        };
      }
      return c;
    }));

    // Remove from pending if cancelled, or update if rescheduled
    if (actionType === "cancel") {
      setPendingList(pendingList.filter(apt => apt.id !== selectedAppointment.id));
    } else {
      setPendingList(pendingList.map(apt => {
        if (apt.id === selectedAppointment.id) {
          return { ...apt, date: rescheduleData.date, time: rescheduleData.time };
        }
        return apt;
      }));
    }

    console.log("Cambio de cita registrado:", change);
    setActionDialogOpen(false);
    setSelectedAppointment(null);
    setActionType(null);
    setActionReason("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Nueva cita:", formData);
    console.log("Venta registrada:", { 
      client: formData.client, 
      service: formData.service, 
      amount: parseFloat(formData.price) || 0,
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      isPending: formData.paymentMethod === "pending"
    });
    setIsDialogOpen(false);
    setFormData({ client: "", clientId: "", service: "", staffId: "", date: "", time: "", duration: "1", price: "", paymentMethod: "" });
  };

  const getAppointmentStyle = (time: string, duration: number) => {
    const hour = parseInt(time.split(":")[0]);
    const minute = parseInt(time.split(":")[1]);
    const top = ((hour - 8) * 80) + (minute / 60 * 80);
    const height = duration * 80 - 4;
    return { top: `${top}px`, height: `${height}px` };
  };

  const getStaffAppointments = (staffId: string) => {
    return appointments.filter(apt => apt.staffId === staffId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Calendario</h1>
            <p className="text-muted-foreground mt-1">Vista por staff - múltiples citas simultáneas</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Sincronizar Google
            </Button>
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
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold">Enero 2026</h3>
              <Button variant="ghost" size="icon">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm">Hoy</Button>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day, index) => (
              <button
                key={day}
                onClick={() => setSelectedDay(index)}
                className={cn(
                  "py-3 px-2 rounded-xl text-center transition-all duration-200",
                  selectedDay === index
                    ? "gradient-gold shadow-gold text-primary-foreground"
                    : "hover:bg-secondary"
                )}
              >
                <p className={cn(
                  "text-xs mb-1",
                  selectedDay === index ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {day}
                </p>
                <p className="text-lg font-semibold">{dates[index]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Staff Time Grid */}
        <div className="bg-card rounded-2xl border shadow-soft overflow-hidden">
          {/* Staff Headers */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `80px repeat(${staffMembers.length}, 1fr)` }}>
            <div className="p-4 border-r border-border bg-secondary/30">
              <span className="text-xs font-medium text-muted-foreground">Hora</span>
            </div>
            {staffMembers.map((staff) => (
              <div key={staff.id} className="p-3 border-r border-border last:border-r-0 bg-secondary/30">
                <div className="flex items-center gap-2">
                  <img 
                    src={staff.avatar} 
                    alt={staff.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-border"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid with Staff Columns */}
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${staffMembers.length}, 1fr)` }}>
            {/* Time Column */}
            <div className="border-r border-border">
              {hours.map((hour) => (
                <div key={hour} className="h-20 flex items-start justify-end pr-3 pt-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>
            
            {/* Staff Columns */}
            {staffMembers.map((staff, staffIndex) => (
              <div 
                key={staff.id} 
                className={cn(
                  "relative border-r border-border last:border-r-0",
                  staffIndex % 2 === 1 && "bg-secondary/10"
                )}
              >
                {hours.map((hour) => (
                  <div key={hour} className="h-20 border-b border-border border-dashed" />
                ))}
                
                {/* Appointments for this staff */}
                {getStaffAppointments(staff.id).map((apt) => {
                  const style = getAppointmentStyle(apt.time, apt.duration);
                  return (
                    <div
                      key={apt.id}
                      className={cn(
                        "absolute left-1 right-1 rounded-lg border-l-4 p-2 cursor-pointer",
                        "hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5",
                        staff.color
                      )}
                      style={style}
                    >
                      <p className="font-medium text-xs truncate">{apt.client}</p>
                      <p className="text-[10px] opacity-80 truncate">{apt.service}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-70">
                        <Clock className="w-2.5 h-2.5" />
                        {apt.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {staffMembers.map((staff) => (
            <div key={staff.id} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", staff.color.replace("/20", "").replace("bg-", "bg-"))} 
                   style={{ backgroundColor: staff.color.includes("primary") ? "hsl(var(--primary))" : 
                           staff.color.includes("success") ? "hsl(var(--success))" :
                           staff.color.includes("info") ? "hsl(var(--info))" : "hsl(var(--accent))" }} />
              <span>{staff.name}</span>
            </div>
          ))}
        </div>

        {/* Pending Appointments Section */}
        <div className="bg-card rounded-2xl border shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Citas Pendientes</h3>
              <p className="text-sm text-muted-foreground">Historial de citas del día con opciones de anulación o reprogramación</p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {pendingList.length} citas
            </Badge>
          </div>
          
          <div className="space-y-3">
            {pendingList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay citas pendientes</p>
            ) : (
              pendingList.map((apt) => {
                const staff = staffMembers.find(s => s.id === apt.staffId);
                return (
                  <div 
                    key={apt.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10 text-primary">
                        <span className="text-lg font-bold">{apt.time.split(":")[0]}</span>
                        <span className="text-xs">:{apt.time.split(":")[1]}</span>
                      </div>
                      <div>
                        <p className="font-medium">{apt.client}</p>
                        <p className="text-sm text-muted-foreground">{apt.service}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {staff && (
                            <div className="flex items-center gap-1">
                              <img 
                                src={staff.avatar}
                                alt={staff.name}
                                className="w-4 h-4 rounded-full"
                              />
                              <span className="text-xs text-muted-foreground">{staff.name}</span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">• {apt.duration}h</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-info hover:text-info hover:bg-info/10"
                        onClick={() => handleOpenActionDialog(apt, "reschedule")}
                      >
                        <CalendarClock className="w-4 h-4" />
                        Reprogramar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleOpenActionDialog(apt, "cancel")}
                      >
                        <CalendarX className="w-4 h-4" />
                        Anular
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Dialog for Cancel/Reschedule Action */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "cancel" ? (
                <>
                  <CalendarX className="w-5 h-5 text-destructive" />
                  Anular Cita
                </>
              ) : (
                <>
                  <CalendarClock className="w-5 h-5 text-info" />
                  Reprogramar Cita
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              {/* Appointment Info */}
              <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedAppointment.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Servicio:</span>
                  <span>{selectedAppointment.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fecha y hora:</span>
                  <span>{selectedAppointment.date} - {selectedAppointment.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Staff:</span>
                  <span>{selectedAppointment.staffName}</span>
                </div>
              </div>

              {/* Reschedule fields */}
              {actionType === "reschedule" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nueva Fecha</Label>
                    <Input
                      type="date"
                      value={rescheduleData.date}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva Hora</Label>
                    <Input
                      type="time"
                      value={rescheduleData.time}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Motivo {actionType === "cancel" ? "de anulación" : "de reprogramación"} *
                </Label>
                <Textarea
                  placeholder={`Ingrese el motivo de la ${actionType === "cancel" ? "anulación" : "reprogramación"}...`}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Este motivo quedará registrado en el historial del cliente
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  disabled={!actionReason.trim() || (actionType === "reschedule" && (!rescheduleData.date || !rescheduleData.time))}
                  className={actionType === "cancel" ? "bg-destructive hover:bg-destructive/90" : "gradient-gold shadow-gold"}
                >
                  {actionType === "cancel" ? "Confirmar Anulación" : "Confirmar Reprogramación"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nueva Cita */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Cita</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                      onClick={handleAddNewClient}
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
                      {formData.client || "Seleccionar cliente..."}
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
                                formData.clientId === client.id && "bg-primary/10"
                              )}
                              onClick={() => handleSelectClient(client)}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="service">Servicio</Label>
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
                  value={formData.service}
                  onValueChange={(value) => setFormData({ ...formData, service: value })}
                  required
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
              <Label htmlFor="staff">Staff</Label>
              <Select
                value={formData.staffId}
                onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                required
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
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duración</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => setFormData({ ...formData, duration: value })}
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
                <Label htmlFor="price">Valor del servicio</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-9"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Este valor se registrará como venta</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Medio de pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = formData.paymentMethod === method.id;
                  const isPending = method.id === "pending";
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
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
              {formData.paymentMethod === "pending" && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Este pago quedará pendiente y se sumará al saldo del cliente
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-gold shadow-gold">
                Agendar Cita
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
