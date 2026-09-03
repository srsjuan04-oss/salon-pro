import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle,
  History,
  DollarSign,
  Receipt,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Calendar, label: "Calendario", path: "/calendar" },
  { icon: History, label: "Historial de Citas", path: "/appointments-history" },
  { icon: Users, label: "Clientes", path: "/clients" },
  { icon: CheckSquare, label: "Tareas", path: "/tasks" },
  { icon: UserCircle, label: "Staff", path: "/staff" },
  { icon: DollarSign, label: "Ventas", path: "/sales" },
  { icon: Receipt, label: "Gastos", path: "/expenses" },
  { icon: Settings, label: "Configuración", path: "/settings", adminOnly: true },
  { icon: Building2, label: "Empresas", path: "/empresas", platformAdminOnly: true },
];

interface SidebarProps {
  /** Renders the mobile variant: always expanded, no collapse button */
  mobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const [collapsedState, setCollapsed] = useState(false);
  const collapsed = mobile ? false : collapsedState;
  const location = useLocation();
  const { user, signOut, isAdmin, isPlatformAdmin, isBarber } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const visibleMenuItems = isBarber
    ? menuItems.filter((item) => item.path === "/calendar")
    : menuItems.filter(
        (item) => (!item.adminOnly || isAdmin) && (!item.platformAdminOnly || isPlatformAdmin)
      );

  return (
    <aside 
      className={cn(
        "gradient-dark h-full flex flex-col transition-all duration-300 ease-in-out",
        mobile ? "w-full" : collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <img src="/charlia-logo.png" alt="CharlIA" className="w-12 h-12 rounded-xl shadow-gold shrink-0" />
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-xl font-bold text-sidebar-foreground">CharlIA</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestión inteligente</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                "hover:bg-sidebar-accent group",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-primary" 
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 shrink-0 transition-transform duration-200",
                "group-hover:scale-110",
                isActive && "text-sidebar-primary"
              )} />
              {!collapsed && (
                <span className="font-medium animate-fade-in">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary animate-pulse-soft" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-t border-sidebar-border/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <UserCircle className="w-5 h-5 text-sidebar-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      )}

      {collapsed && user && (
        <div className="px-3 py-3 border-t border-sidebar-border/20">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Collapse Button (desktop only) */}
      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="m-4 p-3 rounded-xl bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 mx-auto" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Colapsar</span>
            </div>
          )}
        </button>
      )}
    </aside>
  );
}
