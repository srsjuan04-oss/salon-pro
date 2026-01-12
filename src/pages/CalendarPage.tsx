import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

const hours = Array.from({ length: 12 }, (_, i) => i + 8);

const appointments = [
  { id: 1, time: "09:00", duration: 2, client: "María García", service: "Corte + Tinte", stylist: "Ana López", color: "bg-primary/20 border-primary/40 text-primary" },
  { id: 2, time: "10:00", duration: 1, client: "Laura Martínez", service: "Manicure", stylist: "Carmen Ruiz", color: "bg-success/20 border-success/40 text-success" },
  { id: 3, time: "11:00", duration: 1.5, client: "Sofia Hernández", service: "Tratamiento", stylist: "Ana López", color: "bg-info/20 border-info/40 text-info" },
  { id: 4, time: "14:00", duration: 1, client: "Elena Pérez", service: "Corte", stylist: "Miguel Santos", color: "bg-primary/20 border-primary/40 text-primary" },
  { id: 5, time: "15:30", duration: 2, client: "Rosa Mendoza", service: "Coloración", stylist: "Ana López", color: "bg-accent/20 border-accent/40 text-accent" },
];

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const dates = [12, 13, 14, 15, 16, 17, 18];

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(0);

  const getAppointmentStyle = (time: string, duration: number) => {
    const hour = parseInt(time.split(":")[0]);
    const minute = parseInt(time.split(":")[1]);
    const top = ((hour - 8) * 80) + (minute / 60 * 80);
    const height = duration * 80 - 4;
    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Calendario</h1>
            <p className="text-muted-foreground mt-1">Gestiona las citas del salón</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Sincronizar Google
            </Button>
            <Button className="gradient-gold shadow-gold gap-2">
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

        {/* Time Grid */}
        <div className="bg-card rounded-2xl border shadow-soft overflow-hidden">
          <div className="grid grid-cols-[80px_1fr] divide-x divide-border">
            {/* Time Column */}
            <div className="divide-y divide-border">
              {hours.map((hour) => (
                <div key={hour} className="h-20 flex items-start justify-end pr-3 pt-2">
                  <span className="text-xs text-muted-foreground">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>
            
            {/* Appointments Column */}
            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="h-20 border-b border-border border-dashed" />
              ))}
              
              {/* Appointment Cards */}
              {appointments.map((apt) => {
                const style = getAppointmentStyle(apt.time, apt.duration);
                return (
                  <div
                    key={apt.id}
                    className={cn(
                      "absolute left-2 right-2 rounded-xl border-l-4 p-3 cursor-pointer",
                      "hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5",
                      apt.color
                    )}
                    style={style}
                  >
                    <p className="font-medium text-sm truncate">{apt.client}</p>
                    <p className="text-xs opacity-80 truncate">{apt.service}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                      <Clock className="w-3 h-3" />
                      {apt.time}
                      <User className="w-3 h-3 ml-2" />
                      {apt.stylist}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
