import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EntityCardProps {
  avatar?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Esquina superior derecha: badge de estado (VIP, activo/inactivo, etc). */
  badge?: ReactNode;
  /** Fila de botones de acción al pie de la card. */
  actions?: ReactNode;
  /** Cuerpo libre entre el header y las acciones (stats, tags, etc). */
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Wrapper de card genérico que formaliza el lenguaje visual "app card"
 * (bg-card rounded-2xl border shadow-soft, mismo usado por StatCard) que
 * hoy se repite a mano en el client-card y staff-card inline de
 * ClientsPage.tsx / StaffPage.tsx con padding/radius ligeramente distintos
 * en cada uno.
 */
export function EntityCard({ avatar, title, subtitle, badge, actions, children, onClick, className }: EntityCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl border shadow-soft p-5 transition-all duration-300",
        "hover:shadow-medium hover:-translate-y-1",
        "animate-slide-up",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {avatar}
          <div className="min-w-0">
            <div className="font-semibold truncate">{title}</div>
            {subtitle && <div className="text-sm text-muted-foreground truncate">{subtitle}</div>}
          </div>
        </div>
        {badge}
      </div>
      {children && <div className="mt-4">{children}</div>}
      {actions && (
        <div className="mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
