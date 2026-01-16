import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock, DollarSign } from "lucide-react";
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

const hours = Array.from({ length: 12 }, (_, i) => i + 8);

const staffMembers = [
  { id: "1", name: "Ana López", role: "Estilista", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100", color: "bg-primary/20 border-primary/40 text-primary" },
  { id: "2", name: "Miguel Santos", role: "Barbero", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", color: "bg-success/20 border-success/40 text-success" },
  { id: "3", name: "Carmen Ruiz", role: "Manicurista", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100", color: "bg-info/20 border-info/40 text-info" },
  { id: "4", name: "Diego Fernández", role: "Estilista", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", color: "bg-accent/20 border-accent/40 text-accent" },
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

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client: "",
    service: "",
    staffId: "",
    date: "",
    time: "",
    duration: "1",
    price: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Nueva cita:", formData);
    // Aquí se agregaría la lógica para guardar la cita y registrar la venta
    console.log("Venta registrada:", { 
      client: formData.client, 
      service: formData.service, 
      amount: parseFloat(formData.price) || 0,
      date: formData.date 
    });
    setIsDialogOpen(false);
    setFormData({ client: "", service: "", staffId: "", date: "", time: "", duration: "1", price: "" });
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
      </div>

      {/* Dialog Nueva Cita */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Cita</DialogTitle>
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
