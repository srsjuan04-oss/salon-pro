import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2, Search, CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Row = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  source: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  customer: { name: string; phone: string } | null;
  barber: { name: string } | null;
  service: { name: string; price: number } | null;
};

const statusLabel = (s: string) =>
  s === "completed" ? "Completada" : s === "cancelled" ? "Cancelada" : "Pendiente";

export default function AppointmentsHistoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["appointments-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `id, appointment_date, start_time, end_time, status, source, notes, cancellation_reason,
           customer:customers(name, phone), barber:barbers(name), service:services(name, price)`
        )
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (status !== "all") {
        const s = r.status === "completed" || r.status === "cancelled" ? r.status : "pending";
        if (s !== status) return false;
      }
      if (from && r.appointment_date < from) return false;
      if (to && r.appointment_date > to) return false;
      if (!q) return true;
      return [r.customer?.name, r.customer?.phone, r.barber?.name, r.service?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, search, status, from, to]);

  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      completed: all.filter((a) => a.status === "completed").length,
      cancelled: all.filter((a) => a.status === "cancelled").length,
      pending: all.filter((a) => a.status !== "completed" && a.status !== "cancelled").length,
    };
  }, [data]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Historial de Citas</h1>
          <p className="text-muted-foreground text-sm">
            Todas las citas completadas, pendientes y canceladas
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, icon: CalendarDays, tone: "text-primary" },
            { label: "Completadas", value: stats.completed, icon: CheckCircle2, tone: "text-success" },
            { label: "Pendientes", value: stats.pending, icon: Clock, tone: "text-info" },
            { label: "Canceladas", value: stats.cancelled, icon: XCircle, tone: "text-destructive" },
          ].map((s) => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <s.icon className={cn("w-5 h-5", s.tone)} />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4 grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por cliente, teléfono, barbero o servicio"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No hay citas para estos filtros</Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.customer?.name ?? "Cliente"}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.service?.name} · {r.barber?.name} · {r.start_time.slice(0, 5)}-
                      {r.end_time.slice(0, 5)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(r.appointment_date + "T12:00:00"), "EEEE d 'de' MMMM yyyy", {
                        locale: es,
                      })}
                      {r.source === "whatsapp" && " · WhatsApp"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge
                      className={cn(
                        r.status === "completed" && "bg-success",
                        r.status === "cancelled" && "bg-destructive",
                        r.status !== "completed" && r.status !== "cancelled" && "bg-primary"
                      )}
                    >
                      {statusLabel(r.status)}
                    </Badge>
                    {r.service?.price != null && (
                      <p className="text-sm font-medium">${r.service.price}</p>
                    )}
                  </div>
                </div>
                {r.status === "cancelled" && r.cancellation_reason && (
                  <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20">
                    <span className="text-xs text-muted-foreground">Motivo: </span>
                    <span className="text-sm">{r.cancellation_reason}</span>
                  </div>
                )}
                {r.notes && <p className="mt-2 text-sm text-muted-foreground">{r.notes}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
