import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  completed: "Completada",
  cancelled: "Cancelada",
  confirmed: "Confirmada",
  pending: "Pendiente",
};

const STATUS_CLASSES: Record<string, string> = {
  completed: "bg-success",
  cancelled: "bg-destructive",
  confirmed: "bg-primary",
};

interface AppointmentStatusBadgeProps {
  status: string;
  variant?: "solid" | "outline";
  className?: string;
}

/**
 * Antes había dos mapeos status→etiqueta ligeramente distintos (la lista
 * móvil por defecto decía "Pendiente", el dialog de detalle decía
 * "Confirmada") para el mismo dato. Se unifica en un solo lugar.
 */
export function AppointmentStatusBadge({ status, variant = "outline", className }: AppointmentStatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? "Pendiente";

  if (variant === "solid") {
    return <Badge className={cn(STATUS_CLASSES[status], className)}>{label}</Badge>;
  }

  return (
    <Badge variant="outline" className={cn("capitalize", className)}>
      {label}
    </Badge>
  );
}
