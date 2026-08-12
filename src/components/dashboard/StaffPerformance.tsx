import { useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";

const timeFilters = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "quarter", label: "Este trimestre" },
  { value: "year", label: "Este año" },
];

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const COMMISSION_RATE = 0.15;

export function StaffPerformance() {
  const [timeFilter, setTimeFilter] = useState("month");
  const navigate = useNavigate();

  const range = useMemo(() => {
    const today = startOfDay(new Date());
    switch (timeFilter) {
      case "today":
        return { from: today, to: today };
      case "week":
        return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
      case "quarter":
        return { from: startOfQuarter(today), to: today };
      case "year":
        return { from: startOfYear(today), to: today };
      default:
        return { from: startOfMonth(today), to: today };
    }
  }, [timeFilter]);

  const { data: barbers } = useQuery({
    queryKey: ["barbers-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name, specialty, avatar_url, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["staff-performance-appts", fmt(range.from), fmt(range.to)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, barber_id, status, service:services(price)")
        .gte("appointment_date", fmt(range.from))
        .lte("appointment_date", fmt(range.to));
      if (error) throw error;
      return data as any[];
    },
  });

  const stats = useMemo(() => {
    if (!barbers) return [];
    const rows = barbers.map((b: any) => {
      const own = (appointments || []).filter((a) => a.barber_id === b.id);
      const sales = own
        .filter((a) => a.status === "completed")
        .reduce((sum, a) => sum + Number(a.service?.price || 0), 0);
      return {
        id: b.id,
        name: b.name,
        role: b.specialty || "Barbero",
        avatar: b.avatar_url as string | null,
        sales,
        count: own.length,
        commission: sales * COMMISSION_RATE,
      };
    });
    const max = Math.max(...rows.map((r) => r.sales), 0);
    return rows
      .map((r) => ({ ...r, target: max > 0 ? max : 1 }))
      .sort((a, b) => b.sales - a.sales);
  }, [barbers, appointments]);

  const getFilterLabel = () =>
    timeFilters.find((f) => f.value === timeFilter)?.label.toLowerCase() || "este mes";

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-4 sm:p-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold">Rendimiento del Staff</h3>
          <p className="text-sm text-muted-foreground">
            Ventas y comisiones de {getFilterLabel()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => navigate("/staff")}
            className="text-sm text-primary font-medium hover:underline"
          >
            Ver detalles
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : stats.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Aún no hay miembros del staff registrados.
        </p>
      ) : (
        <div className="space-y-5">
          {stats.map((staff, index) => {
            const progress = Math.min((staff.sales / staff.target) * 100, 100);
            return (
              <div
                key={staff.id}
                className="space-y-3"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  {staff.avatar ? (
                    <img
                      src={staff.avatar}
                      alt={`Foto de ${staff.name}`}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold ring-2 ring-border">
                      {initials(staff.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{staff.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {staff.role} · {staff.count} citas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      ${staff.sales.toLocaleString("es-CO")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Comisión: ${Math.round(staff.commission).toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress.toFixed(0)}% del líder</span>
                    <span>Top: ${staff.target.toLocaleString("es-CO")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
