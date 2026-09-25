import { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requirePlatformAdmin?: boolean;
  /** Esta ruta no es parte de la vista restringida de un barbero (solo Calendario). */
  hideFromBarber?: boolean;
  /** Deja pasar aunque la suscripción esté cancelada o suspendida (ej. Configuración, para poder reactivarla). */
  allowWhenCanceled?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requirePlatformAdmin = false,
  hideFromBarber = false,
  allowWhenCanceled = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isStaff, isBarber, isAdmin, isPlatformAdmin, isSubscriptionCanceled, isSubscriptionSuspended, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (isBarber && hideFromBarber) {
    return <Navigate to="/calendar" replace />;
  }

  if (!isStaff && !isBarber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Acceso Denegado</h1>
          <p className="text-muted-foreground">
            Tu cuenta no tiene permisos para acceder a este sistema.
            Contacta al administrador para solicitar acceso.
          </p>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Acceso Restringido</h1>
          <p className="text-muted-foreground">
            Esta sección requiere permisos de administrador.
          </p>
        </div>
      </div>
    );
  }

  if (isSubscriptionCanceled && !allowWhenCanceled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-2xl font-bold text-foreground">Suscripción cancelada</h1>
          <p className="text-muted-foreground">
            El acceso de tu negocio a CharlIA fue suspendido. Reactiva tu suscripción desde Configuración para volver a usar la app.
          </p>
          <Button asChild className="gradient-gold shadow-gold">
            <Link to="/settings?tab=billing">Ir a Mi plan</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isSubscriptionSuspended && !allowWhenCanceled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-2xl font-bold text-foreground">Acceso pausado por falta de pago</h1>
          <p className="text-muted-foreground">
            No pudimos cobrar la mensualidad de tu negocio. Seguiremos intentando el cobro automáticamente cada día: asegúrate de que tu medio de pago tenga fondos, o paga ahora con otro desde Configuración. El acceso se reactiva en cuanto se apruebe el pago.
          </p>
          <Button asChild className="gradient-gold shadow-gold">
            <Link to="/settings?tab=billing">Pagar ahora</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (requirePlatformAdmin && !isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Acceso Restringido</h1>
          <p className="text-muted-foreground">
            Esta sección requiere permisos de propietario de la plataforma.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
