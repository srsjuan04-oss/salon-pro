import { useState } from "react";
import { Clock, User, Check, X, RefreshCw, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  stylist: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "rescheduled";
  avatar?: string;
}

const initialAppointments: Appointment[] = [
  {
    id: "1",
    clientName: "María García",
    service: "Corte + Tinte",
    time: "09:00",
    stylist: "Ana López",
    status: "completed",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"
  },
  {
    id: "2",
    clientName: "Laura Martínez",
    service: "Manicure + Pedicure",
    time: "10:30",
    stylist: "Carmen Ruiz",
    status: "confirmed",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100"
  },
  {
    id: "3",
    clientName: "Sofia Hernández",
    service: "Tratamiento Capilar",
    time: "11:00",
    stylist: "Ana López",
    status: "pending",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
  },
  {
    id: "4",
    clientName: "Elena Pérez",
    service: "Corte de Cabello",
    time: "12:30",
    stylist: "Miguel Santos",
    status: "cancelled",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100"
  },
  {
    id: "5",
    clientName: "Rosa Mendoza",
    service: "Coloración",
    time: "14:00",
    stylist: "Ana López",
    status: "rescheduled",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100"
  },
];

const statusStyles = {
  pending: "bg-primary/10 text-primary border-primary/20",
  confirmed: "bg-info/10 text-info border-info/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  rescheduled: "bg-warning/10 text-warning border-warning/20",
};

const statusLabels = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

const statusIcons = {
  pending: Clock,
  confirmed: Check,
  completed: Check,
  cancelled: X,
  rescheduled: RefreshCw,
};

export function AppointmentList() {
  const [appointments, setAppointments] = useState(initialAppointments);

  const updateStatus = (id: string, newStatus: Appointment["status"]) => {
    setAppointments(prev => 
      prev.map(apt => apt.id === id ? { ...apt, status: newStatus } : apt)
    );
  };

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
      
      <div className="space-y-3">
        {appointments.map((apt, index) => {
          const StatusIcon = statusIcons[apt.status];
          return (
            <div 
              key={apt.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group",
                apt.status === "cancelled" && "opacity-60"
              )}
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
              
              <Badge 
                variant="outline"
                className={cn(
                  "gap-1 font-medium",
                  statusStyles[apt.status]
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {statusLabels[apt.status]}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => updateStatus(apt.id, "completed")}
                    className="gap-2"
                  >
                    <Check className="w-4 h-4 text-success" />
                    Marcar Completada
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => updateStatus(apt.id, "confirmed")}
                    className="gap-2"
                  >
                    <Check className="w-4 h-4 text-info" />
                    Confirmar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => updateStatus(apt.id, "rescheduled")}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4 text-warning" />
                    Reprogramar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => updateStatus(apt.id, "cancelled")}
                    className="gap-2 text-destructive"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}