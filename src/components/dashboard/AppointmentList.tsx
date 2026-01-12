import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  stylist: string;
  status: "pending" | "confirmed" | "completed";
  avatar?: string;
}

const appointments: Appointment[] = [
  {
    id: "1",
    clientName: "María García",
    service: "Corte + Tinte",
    time: "09:00",
    stylist: "Ana López",
    status: "confirmed",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"
  },
  {
    id: "2",
    clientName: "Laura Martínez",
    service: "Manicure + Pedicure",
    time: "10:30",
    stylist: "Carmen Ruiz",
    status: "pending",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100"
  },
  {
    id: "3",
    clientName: "Sofia Hernández",
    service: "Tratamiento Capilar",
    time: "11:00",
    stylist: "Ana López",
    status: "confirmed",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
  },
  {
    id: "4",
    clientName: "Elena Pérez",
    service: "Corte de Cabello",
    time: "12:30",
    stylist: "Miguel Santos",
    status: "pending",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100"
  },
];

const statusStyles = {
  pending: "bg-primary/10 text-primary border-primary/20",
  confirmed: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground border-border",
};

const statusLabels = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
};

export function AppointmentList() {
  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Citas de Hoy</h3>
          <p className="text-sm text-muted-foreground">12 de Enero, 2026</p>
        </div>
        <button className="text-sm text-primary font-medium hover:underline">
          Ver todas
        </button>
      </div>
      
      <div className="space-y-4">
        {appointments.map((apt, index) => (
          <div 
            key={apt.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <img 
              src={apt.avatar} 
              alt={apt.clientName}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-border group-hover:ring-primary/30 transition-all"
            />
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{apt.clientName}</p>
              <p className="text-sm text-muted-foreground truncate">{apt.service}</p>
            </div>
            
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {apt.time}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <User className="w-3 h-3" />
                {apt.stylist}
              </div>
            </div>
            
            <span className={cn(
              "px-3 py-1 text-xs font-medium rounded-full border",
              statusStyles[apt.status]
            )}>
              {statusLabels[apt.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
