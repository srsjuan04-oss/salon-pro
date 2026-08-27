import { ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { Menu, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsBell } from "./NotificationsBell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useLocation();

  const { user, isAdmin, isBarber } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["current-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const displayName = profile?.name || user?.email?.split("@")[0] || "Usuario";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between gap-2 px-3 md:px-6">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Mobile menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[17rem] border-0">
                <Sidebar mobile onNavigate={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Mobile brand */}
            <div className="flex lg:hidden items-center gap-2">
              <img src="/charlia-logo.png" alt="CharlIA" className="w-9 h-9 rounded-lg shrink-0" />
              <span className="font-bold">CharlIA</span>
            </div>

            {/* Desktop search */}
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes, citas, servicios..."
                className="pl-10 bg-secondary/50 border-0 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Buscar"
              onClick={() => setSearchOpen((v) => !v)}
            >
              {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </Button>

            <NotificationsBell />

            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 border-2 border-primary/20">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden xl:block">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{isAdmin ? "Administrador" : isBarber ? "Barbero" : "Staff"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden px-3 py-2 border-b border-border bg-card/50 animate-fade-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar..."
                className="pl-10 bg-secondary/50 border-0 focus-visible:ring-primary/30"
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
