import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Mail, Phone, Hash, Calendar, DollarSign, MessageSquare, Plus, CreditCard, CheckSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCustomerPayments,
  useRegisterPayment,
  useCustomerNotes,
  useAddCustomerNote,
} from "@/hooks/useCustomers";
import { useTasks, useCreateTask, useUpdateTaskStatus } from "@/hooks/useTasks";

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ["customer-appointments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, start_time, status, services(name, price)")
        .eq("customer_id", id!)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: payments } = useCustomerPayments(id);
  const registerPayment = useRegisterPayment();
  const { data: notes, isLoading: loadingNotes } = useCustomerNotes(id);
  const addNote = useAddCustomerNote();
  const { data: tasks } = useTasks(id);
  const createTask = useCreateTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");

  if (isLoading || !customer) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const totalSpent = (appointments ?? [])
    .filter((a) => a.status !== "cancelled")
    .reduce((s, a: any) => s + (Number(a.services?.price) || 0), 0);

  const handleAddNote = async () => {
    if (!noteContent.trim() || !id) return;
    try {
      await addNote.mutateAsync({ customerId: id, content: noteContent.trim() });
      toast.success("Nota agregada");
      setNoteDialogOpen(false);
      setNoteContent("");
    } catch {
      toast.error("No se pudo agregar la nota");
    }
  };

  const handleRegisterPayment = async () => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0 || !id) return;
    try {
      await registerPayment.mutateAsync({ customerId: id, amount, method: paymentMethod });
      toast.success("Pago registrado");
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo registrar el pago");
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !id) return;
    try {
      await createTask.mutateAsync({ title: taskTitle.trim(), customer_id: id, due_at: taskDueAt || null });
      toast.success("Tarea creada");
      setTaskDialogOpen(false);
      setTaskTitle("");
      setTaskDueAt("");
    } catch {
      toast.error("No se pudo crear la tarea");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/clients")}>
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes
        </Button>

        <div className="bg-card rounded-2xl border shadow-soft p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=random`}
              alt={customer.name}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
            />
            <div>
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customer.email || "—"}</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>
                {customer.identification_number && (
                  <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{customer.identification_number}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Visitas", value: (appointments ?? []).filter((a) => a.status !== "cancelled").length },
            { label: "Total gastado", value: `$${totalSpent.toLocaleString()}` },
            { label: "Saldo pendiente", value: `$${Number(customer.balance).toLocaleString()}` },
            { label: "Tareas abiertas", value: (tasks ?? []).filter((t) => t.status === "pending").length },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border shadow-soft p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Historial de citas */}
          <Card className="bg-card rounded-2xl border shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-4 h-4" />Historial de Citas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {(appointments ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sin citas registradas</p>}
              {(appointments ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm">
                  <div>
                    <p className="font-medium">{a.services?.name ?? "Servicio"}</p>
                    <p className="text-xs text-muted-foreground">{a.appointment_date} · {a.start_time}</p>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pagos */}
          <Card className="bg-card rounded-2xl border shadow-soft">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="w-4 h-4" />Pagos</CardTitle>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1"><CreditCard className="w-3.5 h-3.5" />Registrar Pago</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[380px]">
                  <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Monto</Label>
                      <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Método</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleRegisterPayment} disabled={registerPayment.isPending}>Confirmar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {(payments ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sin pagos registrados</p>}
              {(payments ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm">
                  <div>
                    <p className="font-medium">${Number(p.amount).toLocaleString()} · {p.method}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("es-ES")}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notas */}
          <Card className="bg-card rounded-2xl border shadow-soft">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-4 h-4" />Notas</CardTitle>
              <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1"><Plus className="w-3.5 h-3.5" />Agregar Nota</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader><DialogTitle>Agregar Nota</DialogTitle></DialogHeader>
                  <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Ej: Llamó preguntando por la promoción de tinte..." rows={4} />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAddNote} disabled={addNote.isPending}>Guardar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {loadingNotes && <p className="text-sm text-muted-foreground">Cargando...</p>}
              {(notes ?? []).length === 0 && !loadingNotes && <p className="text-sm text-muted-foreground">Sin notas</p>}
              {(notes ?? []).map((n) => (
                <div key={n.id} className="p-3 rounded-lg bg-secondary/30 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">{n.note_type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(n.occurred_at).toLocaleString("es-ES")}</span>
                  </div>
                  <p className="whitespace-pre-line">{n.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tareas */}
          <Card className="bg-card rounded-2xl border shadow-soft">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><CheckSquare className="w-4 h-4" />Tareas</CardTitle>
              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1"><Plus className="w-3.5 h-3.5" />Nueva Tarea</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader><DialogTitle>Nueva Tarea</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Ej: Llamar para confirmar cita" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha límite</Label>
                      <Input type="datetime-local" value={taskDueAt} onChange={(e) => setTaskDueAt(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateTask} disabled={createTask.isPending}>Crear</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {(tasks ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sin tareas</p>}
              {(tasks ?? []).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm">
                  <div>
                    <p className={t.status === "done" ? "line-through text-muted-foreground" : "font-medium"}>{t.title}</p>
                    {t.due_at && <p className="text-xs text-muted-foreground">{new Date(t.due_at).toLocaleString("es-ES")}</p>}
                  </div>
                  {t.status !== "done" && (
                    <Button size="sm" variant="ghost" onClick={() => updateTaskStatus.mutate({ id: t.id, status: "done" })}>
                      Completar
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
