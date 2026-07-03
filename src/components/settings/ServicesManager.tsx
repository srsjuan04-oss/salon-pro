import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Scissors } from "lucide-react";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
};

const empty: FormState = {
  name: "",
  description: "",
  duration_minutes: 30,
  price: 0,
  is_active: true,
};

export function ServicesManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

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
    mutationFn: async (f: FormState) => {
      const payload = {
        name: f.name,
        description: f.description || null,
        duration_minutes: Number(f.duration_minutes),
        price: Number(f.price),
        is_active: f.is_active,
      };
      if (f.id) {
        const { error } = await supabase.from("services").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setOpen(false);
      setForm(empty);
      toast.success("Servicio guardado");
    },
    onError: (e: any) => toast.error(e.message),
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
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (s: Service) => {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      duration_minutes: s.duration_minutes,
      price: Number(s.price),
      is_active: s.is_active,
    });
    setOpen(true);
  };

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Servicios</h3>
          <p className="text-sm text-muted-foreground">Define los servicios que ofrece tu salón, su duración y precio.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo servicio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Corte de cabello" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalles del servicio" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duración (minutos)</Label>
                  <Input type="number" min={5} step={5} value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Precio</Label>
                  <Input type="number" min={0} step="0.01" value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                <div>
                  <p className="font-medium">Activo</p>
                  <p className="text-xs text-muted-foreground">Disponible para agendar</p>
                </div>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => upsert.mutate(form)} disabled={!form.name || upsert.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.duration_minutes} min · ${Number(s.price).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => {
                  if (confirm(`¿Eliminar "${s.name}"?`)) remove.mutate(s.id);
                }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
