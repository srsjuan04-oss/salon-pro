import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, Download, Receipt, TrendingDown, Wallet, CreditCard } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const monthlyExpenses = [
  { mes: "Ene", gastos: 8500 },
  { mes: "Feb", gastos: 7200 },
  { mes: "Mar", gastos: 9100 },
  { mes: "Abr", gastos: 8800 },
  { mes: "May", gastos: 7600 },
  { mes: "Jun", gastos: 8200 },
];

const expensesByCategory = [
  { name: "Productos", value: 3500, color: "hsl(var(--primary))" },
  { name: "Salarios", value: 4200, color: "hsl(var(--success))" },
  { name: "Servicios", value: 1200, color: "hsl(var(--info))" },
  { name: "Alquiler", value: 1800, color: "hsl(var(--warning))" },
  { name: "Otros", value: 500, color: "hsl(var(--muted-foreground))" },
];

const recentExpenses = [
  { id: 1, description: "Productos capilares", category: "Productos", date: "Hoy", amount: 450, paymentMethod: "Transferencia" },
  { id: 2, description: "Electricidad", category: "Servicios", date: "Ayer", amount: 380, paymentMethod: "Débito" },
  { id: 3, description: "Salario - María", category: "Salarios", date: "15 Ene", amount: 1200, paymentMethod: "Transferencia" },
  { id: 4, description: "Insumos de limpieza", category: "Otros", date: "14 Ene", amount: 85, paymentMethod: "Efectivo" },
  { id: 5, description: "Tintes y decolorantes", category: "Productos", date: "12 Ene", amount: 620, paymentMethod: "Crédito" },
];

const categoryColors: Record<string, string> = {
  "Productos": "bg-primary/10 text-primary",
  "Salarios": "bg-success/10 text-success",
  "Servicios": "bg-info/10 text-info",
  "Alquiler": "bg-warning/10 text-warning",
  "Otros": "bg-muted text-muted-foreground",
};

const categories = ["Productos", "Salarios", "Servicios", "Alquiler", "Otros"];
const paymentMethods = ["Efectivo", "Transferencia", "Débito", "Crédito"];

export default function ExpensesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    category: "",
    amount: "",
    paymentMethod: "",
  });

  const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.value, 0);

  const handleSubmit = () => {
    console.log("Nuevo gasto:", formData);
    setFormData({ description: "", category: "", amount: "", paymentMethod: "" });
    setIsDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gastos</h1>
            <p className="text-muted-foreground mt-1">
              Control y registro de gastos del negocio
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button 
              size="sm" 
              className="gradient-gold text-primary-foreground"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Gasto
            </Button>
          </div>
        </div>

        {/* Dialog for new expense */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Gasto</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  placeholder="Ej: Productos capilares"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Método de Pago</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="gradient-gold text-primary-foreground">
                Guardar Gasto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Gastos del Mes</p>
                <p className="text-3xl font-bold">${totalExpenses.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-warning" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Gastos Hoy</p>
                <p className="text-3xl font-bold">$830</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-info" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-3xl font-bold">3</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Promedio Diario</p>
                <p className="text-3xl font-bold">$374</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Tendencia de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyExpenses}>
                    <defs>
                      <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Gastos"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="gastos" 
                      stroke="hsl(var(--destructive))" 
                      fill="url(#expensesGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {expensesByCategory.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-medium">${cat.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Expenses Table */}
        <Card className="border shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Gastos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={categoryColors[expense.category]}>
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>{expense.paymentMethod}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      -${expense.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
