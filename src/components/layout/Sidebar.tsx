import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  UserCircle, 
  DollarSign, 
  MessageCircle,
  Settings,
  Scissors,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Calendar, label: "Calendario", path: "/calendar" },
  { icon: Users, label: "Clientes", path: "/clients" },
  { icon: UserCircle, label: "Staff", path: "/staff" },
  { icon: DollarSign, label: "Ventas", path: "/sales" },
  { icon: MessageCircle, label: "WhatsApp", path: "/whatsapp" },
  { icon: Settings, label: "Configuración", path: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside 
      className={cn(
        "gradient-dark h-screen flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
          <Scissors className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-xl font-bold text-sidebar-foreground">SalonPro</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestión inteligente</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                "hover:bg-sidebar-accent group",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-primary" 
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform duration-200",
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

      {/* Collapse Button */}
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
    </aside>
  );
}
