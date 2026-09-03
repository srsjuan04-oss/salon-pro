import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CheckSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTasks, useCreateTask, useUpdateTaskStatus } from "@/hooks/useTasks";

export default function TasksPage() {
  const navigate = useNavigate();
  const { data: tasks, isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");

  const visibleTasks = (tasks ?? []).filter((t) => filter === "all" || t.status === filter);

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createTask.mutateAsync({ title: title.trim(), due_at: dueAt || null });
      toast.success("Tarea creada");
      setDialogOpen(false);
      setTitle("");
      setDueAt("");
    } catch {
      toast.error("No se pudo crear la tarea");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tareas y Seguimientos</h1>
            <p className="text-muted-foreground mt-1">Recordatorios de seguimiento con tus clientes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold shadow-gold gap-2">
                <Plus className="w-4 h-4" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader><DialogTitle>Nueva Tarea</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Llamar a María para confirmar cita" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha límite</Label>
                  <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createTask.isPending}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2">
          {(["pending", "done", "all"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "pending" ? "Pendientes" : f === "done" ? "Completadas" : "Todas"}
            </Button>
          ))}
        </div>

        <div className="bg-card rounded-2xl border shadow-soft divide-y">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando...</p>}
          {!isLoading && visibleTasks.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No hay tareas en este filtro</p>
          )}
          {visibleTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => updateTaskStatus.mutate({ id: t.id, status: t.status === "done" ? "pending" : "done" })}
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                    t.status === "done" ? "bg-primary border-primary" : "border-muted-foreground"
                  )}
                >
                  {t.status === "done" && <CheckSquare className="w-3.5 h-3.5 text-primary-foreground" />}
                </button>
                <div className="min-w-0">
                  <p className={cn("font-medium truncate", t.status === "done" && "line-through text-muted-foreground")}>
                    {t.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {t.due_at && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(t.due_at).toLocaleString("es-ES")}</span>
                    )}
                    {t.customers?.name && (
                      <button className="underline" onClick={() => t.customer_id && navigate(`/clients/${t.customer_id}`)}>
                        {t.customers.name}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{t.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
