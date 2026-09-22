import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Scissors, Package, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function uploadCatalogImage(serviceId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${serviceId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("catalog-images").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("catalog-images").getPublicUrl(path);
  return data.publicUrl;
}

type ItemType = "service" | "product";

type Service = {
  id: string;
  name: string;
  description: string | null;
  benefits: string | null;
  item_type: ItemType;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  image_url: string | null;
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  benefits: string;
  item_type: ItemType;
  duration_minutes: number;
  price: number;
  is_active: boolean;
};

const empty: FormState = {
  name: "",
  description: "",
  benefits: "",
  item_type: "service",
  duration_minutes: 30,
  price: 0,
  is_active: true,
};

export function ServicesManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

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
        benefits: f.benefits || null,
        item_type: f.item_type,
        duration_minutes: f.item_type === "product" ? 0 : Number(f.duration_minutes),
        price: Number(f.price),
        is_active: f.is_active,
      };
      if (f.id) {
        const { error } = await supabase.from("services").update(payload).eq("id", f.id);
        if (error) throw error;
        return f.id;
      } else {
        const { data, error } = await supabase.from("services").insert(payload as any).select("id").single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      const serviceId = await upsert.mutateAsync(form);
      if (imageFile) {
        try {
          const url = await uploadCatalogImage(serviceId, imageFile);
          const { error } = await supabase.from("services").update({ image_url: url }).eq("id", serviceId);
          if (error) throw error;
        } catch {
          toast.error("Se guardó, pero no se pudo subir la foto. Intenta de nuevo.");
        }
      } else if (removeImage && form.id) {
        const { error } = await supabase.from("services").update({ image_url: null }).eq("id", serviceId);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["services"] });
      setOpen(false);
      setForm(empty);
      setImageFile(null);
      setImagePreview(null);
      setRemoveImage(false);
      toast.success("Servicio guardado");
    } finally {
      setSaving(false);
    }
  };

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

  const openNew = () => {
    setForm(empty);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setOpen(true);
  };
  const openEdit = (s: Service) => {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      benefits: s.benefits ?? "",
      item_type: s.item_type,
      duration_minutes: s.duration_minutes,
      price: Number(s.price),
      is_active: s.is_active,
    });
    setImageFile(null);
    setImagePreview(s.image_url);
    setRemoveImage(false);
    setOpen(true);
  };

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Servicios y productos</h3>
          <p className="text-sm text-muted-foreground">
            Los servicios se agendan con duración y barbero. Los productos se venden sin cita.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar" : "Nuevo servicio o producto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="justify-start"
                  value={form.item_type}
                  onValueChange={(value) => value && setForm({ ...form, item_type: value as ItemType })}
                >
                  <ToggleGroupItem value="service" className="gap-2 px-4">
                    <Scissors className="w-4 h-4" /> Servicio
                  </ToggleGroupItem>
                  <ToggleGroupItem value="product" className="gap-2 px-4">
                    <Package className="w-4 h-4" /> Producto
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs text-muted-foreground">
                  {form.item_type === "product"
                    ? "Se vende sin agendar cita (ej: un producto para llevar)."
                    : "Se agenda con duración y barbero."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Foto (opcional)</Label>
                {imagePreview ? (
                  <div className="flex items-center gap-3">
                    <img src={imagePreview} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setRemoveImage(true);
                      }}
                    >
                      <X className="w-3.5 h-3.5" /> Quitar
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      id="catalog-image-input"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > MAX_IMAGE_BYTES) {
                          toast.error("La imagen no puede pesar más de 5MB");
                          e.target.value = "";
                          return;
                        }
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                        setRemoveImage(false);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => document.getElementById("catalog-image-input")?.click()}
                    >
                      <ImagePlus className="w-4 h-4" /> Subir foto
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  El cliente podrá verla cuando el asistente se la muestre por WhatsApp.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Corte de cabello" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalles del servicio" />
              </div>
              <div className="space-y-2">
                <Label>Beneficios</Label>
                <Textarea
                  value={form.benefits}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                  placeholder="Ej: Deja el cabello hidratado, incluye masaje capilar y peinado final"
                />
                <p className="text-xs text-muted-foreground">
                  El asistente de IA usa este texto para explicar el servicio al cliente.
                </p>
              </div>
              <div className={cn("grid gap-4", form.item_type === "product" ? "grid-cols-1" : "grid-cols-2")}>
                {form.item_type !== "product" && (
                  <div className="space-y-2">
                    <Label>Duración (minutos)</Label>
                    <Input type="number" min={5} step={5} value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                  </div>
                )}
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
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.name || saving}>
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
          Aún no has creado servicios ni productos.
        </div>
      ) : (
        <div className="divide-y">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3 gap-3">
              {s.image_url ? (
                <img src={s.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg border border-dashed flex items-center justify-center shrink-0 text-muted-foreground">
                  {s.item_type === "product" ? <Package className="w-5 h-5" /> : <Scissors className="w-5 h-5" />}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{s.name}</p>
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs px-2 py-0.5 rounded",
                      s.item_type === "product" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {s.item_type === "product" ? <Package className="w-3 h-3" /> : <Scissors className="w-3 h-3" />}
                    {s.item_type === "product" ? "Producto" : "Servicio"}
                  </span>
                  {!s.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Inactivo</span>
                  )}
                </div>
                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                {s.benefits && <p className="text-xs text-primary mt-0.5">Beneficios: {s.benefits}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.item_type === "product" ? `$${Number(s.price).toLocaleString()}` : `${s.duration_minutes} min · $${Number(s.price).toLocaleString()}`}
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
