import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
} from "date-fns";
import { Loader2 } from "lucide-react";

const COMMISSION_RATE = 0.15;
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface DayPoint {
  name: string;
  date: Date;
  ventas: number;
  comisiones: number;
}

export function RevenueChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["weekly-revenue"],
    queryFn: async () => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      const from = format(weekStart, "yyyy-MM-dd");
      const to = format(weekEnd, "yyyy-MM-dd");

      const [appointmentsRes, salesRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("appointment_date, status, services(price)")
          .gte("appointment_date", from)
          .lte("appointment_date", to),
        supabase
          .from("sales_entries")
          .select("sale_date, amount, status")
          .gte("sale_date", from)
          .lte("sale_date", to),
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      if (salesRes.error) throw salesRes.error;

      const days: DayPoint[] = Array.from({ length: 7 }).map((_, i) => {
        const date = addDays(weekStart, i);
        return {
          name: DAY_LABELS[i],
          date,
          ventas: 0,
          comisiones: 0,
        };
      });

      (appointmentsRes.data ?? []).forEach((a: any) => {
        if (a.status !== "completed") return;
        const d = new Date(`${a.appointment_date}T00:00:00`);
        const day = days.find((x) => isSameDay(x.date, d));
        if (day) {
          day.ventas += Number(a.services?.price || 0);
        }
      });

      (salesRes.data ?? []).forEach((e: any) => {
        if (e.status !== "paid") return;
        const d = new Date(`${e.sale_date}T00:00:00`);
        const day = days.find((x) => isSameDay(x.date, d));
        if (day) {
          day.ventas += Number(e.amount || 0);
        }
      });

      days.forEach((d) => {
        d.comisiones = Math.round(d.ventas * COMMISSION_RATE);
      });

      return days;
    },
  });

  const totalSales = useMemo(
    () => (chartData ?? []).reduce((sum, d) => sum + d.ventas, 0),
    [chartData]
  );

  const totalCommission = useMemo(
    () => (chartData ?? []).reduce((sum, d) => sum + d.comisiones, 0),
    [chartData]
  );

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold">Ingresos de la Semana</h3>
          <p className="text-sm text-muted-foreground">
            Ventas vs Comisiones ·{" "}
            <span className="font-medium text-foreground">
              ${totalSales.toLocaleString("es-CO")}
            </span>{" "}
            /{" "}
            <span className="font-medium text-foreground">
              ${totalCommission.toLocaleString("es-CO")} comisiones
            </span>
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            Ventas
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-info" />
            Comisiones
          </div>
        </div>
      </div>

      <div className="h-[280px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Cargando ingresos...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorComisiones" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "var(--shadow-medium)",
                }}
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString("es-CO")}`,
                  name === "ventas" ? "Ventas" : "Comisiones",
                ]}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="ventas"
                stroke="hsl(38, 92%, 50%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVentas)"
              />
              <Area
                type="monotone"
                dataKey="comisiones"
                stroke="hsl(210, 80%, 55%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorComisiones)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
