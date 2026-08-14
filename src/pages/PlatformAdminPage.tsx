import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Building2, CheckCircle2, Circle, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

interface PlatformOrganization {
  organization_id: string;
  organization_name: string;
  created_at: string;
  admin_name: string | null;
  admin_email: string | null;
  users_count: number;
  customers_count: number;
  appointments_count: number;
  appointments_last_30d: number;
  sales_total: number;
  is_active: boolean;
}

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default function PlatformAdminPage() {
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ salonName: "", name: "", email: "", password: "" });

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["platform-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_organizations");
      if (error) throw error;
      return (data ?? []) as PlatformOrganization[];
    },
  });

  const summary = useMemo(() => {
    return {
      total: organizations.length,
      active: organizations.filter((o) => o.is_active).length,
      salesTotal: organizations.reduce((sum, o) => sum + Number(o.sales_total), 0),
      appointments30d: organizations.reduce((sum, o) => sum + Number(o.appointments_last_30d), 0),
    };
  }, [organizations]);

  const createCompany = useMutation({
    mutationFn: async (payload: { salonName: string; name: string; email: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("create-company-account", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Empresa creada correctamente");
      qc.invalidateQueries({ queryKey: ["platform-organizations"] });
      setIsDialogOpen(false);
      setFormData({ salonName: "", name: "", email: "", password: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo crear la empresa"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.salonName.trim() || !formData.name.trim() || !formData.email.trim() || formData.password.length < 6) return;
    createCompany.mutate({
      salonName: formData.salonName.trim(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Empresas</h1>
            <p className="text-muted-foreground mt-1">Crea y supervisa las empresas que usan la plataforma</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold shadow-gold gap-2">
                <Plus className="w-4 h-4" />
                Nueva empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader>
                <DialogTitle>Crear empresa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pa-salon-name">Nombre del negocio</Label>
                  <Input
                    id="pa-salon-name"
                    value={formData.salonName}
                    onChange={(e) => setFormData({ ...formData, salonName: e.target.value })}
                    placeholder="Ej: Barbería El Corte"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pa-name">Nombre del administrador</Label>
                  <Input
                    id="pa-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pa-email">Correo electrónico</Label>
                  <Input
                    id="pa-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pa-password">Contraseña</Label>
                  <Input
                    id="pa-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-gold shadow-gold"
                    disabled={
                      !formData.salonName.trim() ||
                      !formData.name.trim() ||
                      !formData.email.trim() ||
                      formData.password.length < 6 ||
                      createCompany.isPending
                    }
                  >
                    {createCompany.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Crear empresa
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border shadow-soft p-4">
            <p className="text-sm text-muted-foreground">Empresas</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-card rounded-2xl border shadow-soft p-4">
            <p className="text-sm text-muted-foreground">Activas (30 días)</p>
            <p className="text-2xl font-bold">{summary.active}</p>
          </div>
          <div className="bg-card rounded-2xl border shadow-soft p-4">
            <p className="text-sm text-muted-foreground">Citas últimos 30 días</p>
            <p className="text-2xl font-bold">{summary.appointments30d}</p>
          </div>
          <div className="bg-card rounded-2xl border shadow-soft p-4">
            <p className="text-sm text-muted-foreground">Ventas totales</p>
            <p className="text-2xl font-bold">{currency.format(summary.salesTotal)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org.organization_id}
                className="bg-card rounded-2xl border shadow-soft p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-semibold truncate">{org.organization_name}</p>
                    {org.is_active ? (
                      <Badge className="gap-1 text-xs">
                        <CheckCircle2 className="w-3 h-3" /> Activa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Circle className="w-3 h-3" /> Inactiva
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {org.admin_name ?? "Sin admin"} {org.admin_email ? `· ${org.admin_email}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Creada el {new Date(org.created_at).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Usuarios</p>
                    <p className="font-medium">{org.users_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clientes</p>
                    <p className="font-medium">{org.customers_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Citas (30d)</p>
                    <p className="font-medium">{org.appointments_last_30d}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ventas</p>
                    <p className="font-medium">{currency.format(Number(org.sales_total))}</p>
                  </div>
                </div>
              </div>
            ))}

            {organizations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Todavía no hay empresas registradas.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
