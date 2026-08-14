import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requirePlatformAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requirePlatformAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isStaff, isAdmin, isPlatformAdmin, loading } = useAuth();

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

  if (!isStaff) {
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
