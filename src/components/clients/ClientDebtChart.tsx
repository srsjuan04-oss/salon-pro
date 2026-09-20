import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { TrendingUp } from "lucide-react";
import { calculateOverdueDays, type Client } from "@/data/clients";

interface ClientDebtChartProps {
  clients: Client[];
}

const chartConfig = {
  deuda: {
    label: "Deuda",
    color: "hsl(var(--destructive))",
  },
};

export function ClientDebtChart({ clients }: ClientDebtChartProps) {
  const clientsWithDebt = clients.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance);
  const totalDebt = clientsWithDebt.reduce((sum, c) => sum + c.balance, 0);

  const chartData = clientsWithDebt.map((c) => ({
    name: c.name.split(" ")[0],
    fullName: c.name,
    deuda: c.balance,
    mora: calculateOverdueDays(c.balanceDueDate),
  }));

  if (clientsWithDebt.length === 0) return null;

  return (
    <Card className="bg-card rounded-2xl border shadow-soft">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <TrendingUp className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg">Clientes con Deuda</CardTitle>
              <p className="text-sm text-muted-foreground">
                {clientsWithDebt.length} clientes • Total: ${totalDebt.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
              <XAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} fontSize={12} />
              <YAxis type="category" dataKey="name" width={80} fontSize={12} />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-semibold">{data.fullName}</p>
                        <p className="text-destructive font-bold">Deuda: ${data.deuda.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          Mora: {data.mora > 0 ? `${data.mora} días` : "Al corriente"}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="deuda" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.mora > 30 ? "hsl(var(--destructive))" : entry.mora > 15 ? "hsl(30, 80%, 55%)" : "hsl(45, 80%, 55%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">≤15 días mora</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">16-30 días mora</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">&gt;30 días mora</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
