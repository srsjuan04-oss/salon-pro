import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { serviceSchema } from "@/lib/schemas/service";
import { Plus, Pencil, Trash2, Scissors } from "lucide-react";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  description: string | null;
  benefits: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
};

export function ServicesManager() {
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ id, ...values }: { id?: string } & ReturnType<typeof serviceSchema.parse>) => {
      const payload = {
        name: values.name,
        description: values.description || null,
        benefits: values.benefits || null,
        duration_minutes: values.duration_minutes,
        price: values.price,
        is_active: values.is_active,
      };
      if (id) {
        const { error } = await supabase.from("services").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio guardado");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio eliminado");
    },
  });

  const openNew = () => {
    setEditingService(null);
    setIsDialogOpen(true);
  };
  const openEdit = (s: Service) => {
    setEditingService(s);
    setIsDialogOpen(true);
  };

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Servicios</h3>
          <p className="text-sm text-muted-foreground">Define los servicios que ofrece tu salón, su duración y precio.</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo servicio
        </Button>
      </div>

      <EntityFormDialog<typeof serviceSchema>
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingService ? "Editar servicio" : "Nuevo servicio"}
        schema={serviceSchema}
        defaultValues={
          editingService
            ? {
                name: editingService.name,
                description: editingService.description ?? "",
                benefits: editingService.benefits ?? "",
                duration_minutes: editingService.duration_minutes as unknown as number,
                price: Number(editingService.price) as unknown as number,
                is_active: editingService.is_active,
              }
            : { name: "", description: "", benefits: "", duration_minutes: 30 as unknown as number, price: 0 as unknown as number, is_active: true }
        }
        onSubmit={async (values) => {
          await upsert.mutateAsync({ id: editingService?.id, ...values });
        }}
        submitLabel="Guardar"
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Corte de cabello" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalles del servicio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beneficios</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Deja el cabello hidratado, incluye masaje capilar y peinado final" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    El asistente de IA usa este texto para explicar el servicio al cliente.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (minutos)</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} step={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <div>
                    <FormLabel>Activo</FormLabel>
                    <p className="text-xs text-muted-foreground">Disponible para agendar</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormDialog>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !services?.length ? (
        <div className="text-center py-10 text-muted-foreground">
          <Scissors className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Aún no has creado servicios.
        </div>
      ) : (
        <div className="divide-y">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{s.name}</p>
                  {!s.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Inactivo</span>
                  )}
                </div>
                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                {s.benefits && <p className="text-xs text-primary mt-0.5">Beneficios: {s.benefits}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.duration_minutes} min · ${Number(s.price).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`¿Eliminar "${deleteTarget?.name}"?`}
        description="Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (deleteTarget) await remove.mutateAsync(deleteTarget.id);
        }}
      />
    </div>
  );
}
