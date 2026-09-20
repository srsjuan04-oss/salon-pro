import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { useCreateTeamAccess } from "@/hooks/useStaff";
import { teamAccessSchema } from "@/lib/schemas/staff";
import { toast } from "sonner";

interface CreateTeamAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Cuando se pasan, nombre/email/rol quedan fijos y no se muestran como
   * campos editables — caso de uso de StaffPage, que ya conoce esos datos
   * del barbero y solo necesita pedir la contraseña. Sin estas props, el
   * dialog pide los 4 campos (caso de uso de Configuración > Equipo).
   */
  fixedName?: string;
  fixedEmail?: string;
  fixedRole?: "admin" | "staff" | "barber";
  onSuccess?: () => void;
}

export function CreateTeamAccessDialog({
  open,
  onOpenChange,
  fixedName,
  fixedEmail,
  fixedRole,
  onSuccess,
}: CreateTeamAccessDialogProps) {
  const createAccess = useCreateTeamAccess();
  const isFixed = fixedName !== undefined && fixedEmail !== undefined;

  return (
    <EntityFormDialog<typeof teamAccessSchema>
      open={open}
      onOpenChange={onOpenChange}
      title="Crear cuenta de acceso"
      description={isFixed ? `Se creará una cuenta con rol Barbero para ${fixedEmail}` : undefined}
      schema={teamAccessSchema}
      defaultValues={{
        name: fixedName ?? "",
        email: fixedEmail ?? "",
        password: "",
        role: fixedRole ?? "staff",
      }}
      onSubmit={async (values) => {
        await createAccess.mutateAsync(values);
        toast.success(isFixed ? "Cuenta de acceso creada" : "Cuenta creada correctamente");
        onSuccess?.();
      }}
      submitLabel="Crear cuenta"
      className="sm:max-w-[440px]"
    >
      {(form) => (
        <>
          {!isFixed && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isFixed && (
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="barber">Barbero (solo su calendario)</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value === "barber" && (
                    <p className="text-xs text-muted-foreground">
                      El correo debe coincidir con el de un barbero ya agregado en Staff — así queda vinculada su
                      cuenta a sus propias citas. Solo verá el Calendario, sin poder crear ni editar citas.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </>
      )}
    </EntityFormDialog>
  );
}
