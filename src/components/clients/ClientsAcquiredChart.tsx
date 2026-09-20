import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { UserCheck } from "lucide-react";
import type { Client } from "@/data/clients";

interface ClientsAcquiredChartProps {
  clients: Client[];
}

const chartConfig = {
  clientes: { label: "Clientes nuevos", color: "hsl(var(--primary))" },
};

export function ClientsAcquiredChart({ clients }: ClientsAcquiredChartProps) {
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("es-ES", { month: "short" }) };
  });
  const counts = new Map(months.map((m) => [m.key, 0]));
  clients.forEach((c) => {
    if (!c.createdAt) return;
    const d = new Date(c.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const chartData = months.map((m) => ({ mes: m.label, clientes: counts.get(m.key) ?? 0 }));
  const total = chartData.reduce((s, m) => s + m.clientes, 0);

  return (
    <Card className="bg-card rounded-2xl border shadow-soft">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <UserCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Clientes Adquiridos</CardTitle>
            <p className="text-sm text-muted-foreground">{total} clientes nuevos en los últimos 6 meses</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-semibold">{payload[0].payload.clientes} clientes nuevos</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="clientes" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
