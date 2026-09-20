import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { CreateTeamAccessDialog } from "@/components/settings/CreateTeamAccessDialog";
import { Loader2, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

type Role = "admin" | "staff" | "barber";

export function TeamAccountsCard() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

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
  });

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
        <Button className="gradient-gold shadow-gold gap-2" onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="w-4 h-4" />
          Nueva cuenta
        </Button>
      </div>

      <CreateTeamAccessDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

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
                    {m.role === "barber" && (
                      <Badge variant="secondary" className="text-xs">Barbero</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.role !== "barber" && (
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
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isSelf}
                    title="Revocar acceso"
                    onClick={() => setRevokeTarget({ id: m.id, name: m.name })}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title={`¿Revocar acceso a ${revokeTarget?.name}?`}
        description="Esta persona ya no podrá iniciar sesión en el sistema. Su cuenta de correo no se elimina, solo pierde el acceso."
        confirmLabel="Revocar acceso"
        onConfirm={async () => {
          if (revokeTarget) await removeAccess.mutateAsync(revokeTarget.id);
        }}
      />
    </div>
  );
}
