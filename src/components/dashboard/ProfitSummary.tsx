import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfitData {
  sales: number;
  expenses: number;
}

export function ProfitSummary({ sales = 12450, expenses = 8200 }: Partial<ProfitData>) {
  const profit = sales - expenses;
  const profitMargin = ((profit / sales) * 100).toFixed(1);
  const isPositive = profit > 0;

  return (
    <Card className="border shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Utilidad del Mes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profit Display */}
        <div className={cn(
          "p-4 rounded-xl text-center",
          isPositive ? "bg-success/10" : "bg-destructive/10"
        )}>
          <p className="text-sm text-muted-foreground mb-1">Utilidad Neta</p>
          <p className={cn(
            "text-3xl font-bold",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? "+" : "-"}${Math.abs(profit).toLocaleString()}
          </p>
          <div className={cn(
            "inline-flex items-center gap-1 mt-2 text-sm font-medium px-2 py-1 rounded-full",
            isPositive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {profitMargin}% margen
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-success" />
              </div>
              <span className="text-sm font-medium">Ventas</span>
            </div>
            <span className="font-semibold text-success">+${sales.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-sm font-medium">Gastos</span>
            </div>
            <span className="font-semibold text-destructive">-${expenses.toLocaleString()}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Gastos vs Ventas</span>
            <span>{((expenses / sales) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-success to-warning rounded-full transition-all duration-500"
              style={{ width: `${Math.min((expenses / sales) * 100, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
