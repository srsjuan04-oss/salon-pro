import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Lun", ventas: 1200, comisiones: 180 },
  { name: "Mar", ventas: 1800, comisiones: 270 },
  { name: "Mié", ventas: 1400, comisiones: 210 },
  { name: "Jue", ventas: 2200, comisiones: 330 },
  { name: "Vie", ventas: 2800, comisiones: 420 },
  { name: "Sáb", ventas: 3500, comisiones: 525 },
  { name: "Dom", ventas: 1000, comisiones: 150 },
];

export function RevenueChart() {
  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Ingresos de la Semana</h3>
          <p className="text-sm text-muted-foreground">Ventas vs Comisiones</p>
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
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
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
              formatter={(value: number) => [`$${value}`, ""]}
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
      </div>
    </div>
  );
}
