import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

type Role = "admin" | "staff";

export function TeamAccountsCard() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "staff" as Role });

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ["team-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, name, email");
      if (error) throw error;
      return data;
    },
  });

  const members = useMemo(() => {
    const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    return (roles ?? []).map((r) => ({
      ...r,
      name: profileByUser.get(r.user_id)?.name ?? "—",
      email: profileByUser.get(r.user_id)?.email ?? "—",
    }));
  }, [roles, profiles]);

  const createAccount = useMutation({
    mutationFn: async (payload: { name: string; email: string; password: string; role: Role }) => {
      const { data, error } = await supabase.functions.invoke("create-team-account", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Cuenta creada correctamente");
      qc.invalidateQueries({ queryKey: ["team-roles"] });
      qc.invalidateQueries({ queryKey: ["team-profiles"] });
      setIsDialogOpen(false);
      setFormData({ name: "", email: "", password: "", role: "staff" });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo crear la cuenta"),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const { error } = await supabase.from("user_roles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rol actualizado");
      qc.invalidateQueries({ queryKey: ["team-roles"] });
    },
    onError: () => toast.error("No se pudo actualizar el rol"),
  });

  const removeAccess = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acceso revocado");
      qc.invalidateQueries({ queryKey: ["team-roles"] });
    },
    onError: () => toast.error("No se pudo revocar el acceso"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || formData.password.length < 6) return;
    createAccount.mutate({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
    });
  };

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Cuentas del equipo
          </h3>
          <p className="text-sm text-muted-foreground">
            Crea accesos para tu equipo y controla quién es administrador
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-gold shadow-gold gap-2">
              <UserPlus className="w-4 h-4" />
              Nueva cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>Crear cuenta de acceso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Nombre completo</Label>
                <Input
                  id="team-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-email">Correo electrónico</Label>
                <Input
                  id="team-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-password">Contraseña</Label>
                <Input
                  id="team-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={formData.role} onValueChange={(v: Role) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="gradient-gold shadow-gold"
                  disabled={
                    !formData.name.trim() ||
                    !formData.email.trim() ||
                    formData.password.length < 6 ||
                    createAccount.isPending
                  }
                >
                  {createAccount.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear cuenta
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loadingRoles ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const isSelf = m.user_id === currentUser?.id;
            return (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-secondary/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{m.name}</p>
                    {isSelf && <Badge variant="outline" className="text-xs">Tú</Badge>}
                    {m.role === "admin" && (
                      <Badge className="text-xs gap-1">
                        <ShieldCheck className="w-3 h-3" /> Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={m.role}
                    onValueChange={(v: Role) => updateRole.mutate({ id: m.id, role: v })}
                    disabled={isSelf || updateRole.isPending}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isSelf} title="Revocar acceso">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Revocar acceso a {m.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta persona ya no podrá iniciar sesión en el sistema. Su cuenta de correo no se elimina,
                          solo pierde el acceso.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => removeAccess.mutate(m.id)}
                        >
                          Revocar acceso
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
