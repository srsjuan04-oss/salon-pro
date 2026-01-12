import { Plus, UserPlus, CalendarPlus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { icon: CalendarPlus, label: "Nueva Cita", color: "gradient-gold shadow-gold" },
  { icon: UserPlus, label: "Agregar Cliente", color: "bg-success/10 text-success hover:bg-success/20" },
  { icon: Receipt, label: "Registrar Venta", color: "bg-info/10 text-info hover:bg-info/20" },
  { icon: Plus, label: "Nuevo Servicio", color: "bg-secondary hover:bg-secondary/80" },
];

export function QuickActions() {
  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 animate-slide-up">
      <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="ghost"
            className={`h-auto py-4 flex flex-col gap-2 ${action.color} transition-all duration-200 hover:-translate-y-1`}
          >
            <action.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
