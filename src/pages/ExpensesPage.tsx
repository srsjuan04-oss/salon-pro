import { useState, useMemo } from "react";
import { CsvImportDialog } from "@/components/financial/CsvImportDialog";
import { ImportHistoryDialog } from "@/components/financial/ImportHistoryDialog";
import { Upload, History } from "lucide-react";
import { toast } from "sonner";
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
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Receipt,
  TrendingDown,
  Wallet,
  Lock,
  Repeat,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { useCreateExpense, useExpenses, type Expense } from "@/hooks/useExpenses";
import { expenseSchema } from "@/lib/schemas/expense";
import { useDateRangeFilter } from "@/hooks/useDateRangeFilter";
import { usePagination } from "@/hooks/usePagination";
import { DateRangeFilterBar } from "@/components/shared/DateRangeFilterBar";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";

const ITEMS_PER_PAGE = 10;

const categories = [
  { name: "Alquiler", type: "fixed" as const },
  { name: "Salarios", type: "fixed" as const },
  { name: "Servicios", type: "fixed" as const },
  { name: "Internet/Teléfono", type: "fixed" as const },
  { name: "Seguros", type: "fixed" as const },
  { name: "Productos", type: "variable" as const },
  { name: "Insumos", type: "variable" as const },
  { name: "Marketing", type: "variable" as const },
  { name: "Mantenimiento", type: "variable" as const },
  { name: "Otros", type: "variable" as const },
];

const paymentMethods = ["Efectivo", "Transferencia", "Débito", "Crédito"];

const categoryColors: Record<string, string> = {
  "Alquiler": "bg-warning/10 text-warning border-warning/20",
  "Salarios": "bg-success/10 text-success border-success/20",
  "Servicios": "bg-info/10 text-info border-info/20",
  "Internet/Teléfono": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Seguros": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Productos": "bg-primary/10 text-primary border-primary/20",
  "Insumos": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "Marketing": "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "Mantenimiento": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "Otros": "bg-muted text-muted-foreground border-border",
};

type ExpenseTypeFilter = "all" | "fixed" | "variable";

export default function ExpensesPage() {
  const { data: expenses = [], refetch: refetchExpenses } = useExpenses();
  const createExpense = useCreateExpense();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ExpenseTypeFilter>("all");

  const {
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    filtered: dateFilteredExpenses,
    label: dateRangeLabel,
    dayCount,
  } = useDateRangeFilter(expenses, (e) => e.date);

  // Filtrar por tipo
  const filteredExpenses = useMemo(() => {
    if (typeFilter === "all") return dateFilteredExpenses;
    return dateFilteredExpenses.filter(e => e.type === typeFilter);
  }, [dateFilteredExpenses, typeFilter]);

  const fixedExpenses = dateFilteredExpenses.filter(e => e.type === "fixed");
  const variableExpenses = dateFilteredExpenses.filter(e => e.type === "variable");

  const totalFixed = fixedExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalVariable = variableExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalExpenses = totalFixed + totalVariable;

  const {
    page: currentPage,
    setPage: setCurrentPage,
    totalPages,
    pageItems: paginatedExpenses,
    rangeStart,
    rangeEnd,
  } = usePagination(
    filteredExpenses,
    ITEMS_PER_PAGE,
    `${dateFilter}-${typeFilter}-${customDateRange.from}-${customDateRange.to}`,
  );

  // Datos para el gráfico de categorías
  const expensesByCategory = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--success))",
      "hsl(var(--info))",
      "hsl(var(--warning))",
      "hsl(38, 92%, 50%)",
      "hsl(280, 65%, 60%)",
      "hsl(180, 65%, 45%)",
      "hsl(330, 65%, 55%)",
    ];

    return Object.entries(categoryTotals)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Gastos</h1>
            <p className="text-muted-foreground mt-1">
              Control de gastos fijos y variables del negocio
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="w-4 h-4 mr-2" />
              Historial
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar CSV
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

        <DateRangeFilterBar
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          label={dateRangeLabel}
          countLabel={`${filteredExpenses.length} gastos`}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-soft bg-gradient-to-br from-destructive/10 to-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Total Gastos</p>
                <p className="text-3xl font-bold text-destructive">${totalExpenses.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-warning" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {fixedExpenses.length} items
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Gastos Fijos</p>
                <p className="text-3xl font-bold text-warning">${totalFixed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalExpenses > 0 ? Math.round((totalFixed / totalExpenses) * 100) : 0}% del total
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Repeat className="w-6 h-6 text-info" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {variableExpenses.length} items
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Gastos Variables</p>
                <p className="text-3xl font-bold text-info">${totalVariable.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalExpenses > 0 ? Math.round((totalVariable / totalExpenses) * 100) : 0}% del total
                </p>
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
                <p className="text-2xl md:text-3xl font-bold">
                  ${Math.round(totalExpenses / dayCount).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Comparativa: Fijos vs Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <div className="w-full max-w-md space-y-6">
                  {/* Barra de gastos fijos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-warning" />
                        <span className="font-medium">Gastos Fijos</span>
                      </div>
                      <span className="font-bold text-warning">${totalFixed.toLocaleString()}</span>
                    </div>
                    <div className="h-8 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-warning to-warning/70 rounded-full transition-all duration-500"
                        style={{ width: `${totalExpenses > 0 ? (totalFixed / totalExpenses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Barra de gastos variables */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-info" />
                        <span className="font-medium">Gastos Variables</span>
                      </div>
                      <span className="font-bold text-info">${totalVariable.toLocaleString()}</span>
                    </div>
                    <div className="h-8 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-info to-info/70 rounded-full transition-all duration-500"
                        style={{ width: `${totalExpenses > 0 ? (totalVariable / totalExpenses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Leyenda */}
                  <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 rounded-lg bg-warning/10">
                        <p className="text-muted-foreground">Fijos</p>
                        <p className="text-xl font-bold text-warning">
                          {totalExpenses > 0 ? Math.round((totalFixed / totalExpenses) * 100) : 0}%
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-info/10">
                        <p className="text-muted-foreground">Variables</p>
                        <p className="text-xl font-bold text-info">
                          {totalExpenses > 0 ? Math.round((totalVariable / totalExpenses) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
              <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
                {expensesByCategory.slice(0, 6).map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span className="font-medium">${cat.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Table with Tabs */}
        <Card className="border shadow-soft">
          <CardHeader>
            <Tabs defaultValue="all" className="w-full" onValueChange={(v) => setTypeFilter(v as ExpenseTypeFilter)}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-lg">Registro de Gastos</CardTitle>
                <TabsList className="grid w-full sm:w-auto grid-cols-3">
                  <TabsTrigger value="all" className="gap-2">
                    Todos
                    <Badge variant="secondary" className="ml-1">{dateFilteredExpenses.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="fixed" className="gap-2">
                    <Lock className="w-3 h-3" />
                    Fijos
                    <Badge variant="secondary" className="ml-1 bg-warning/20 text-warning">{fixedExpenses.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="variable" className="gap-2">
                    <Repeat className="w-3 h-3" />
                    Variables
                    <Badge variant="secondary" className="ml-1 bg-info/20 text-info">{variableExpenses.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpenses.map((expense, index) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}.
                        </span>
                        {expense.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "gap-1",
                          expense.type === "fixed" 
                            ? "bg-warning/10 text-warning border-warning/20" 
                            : "bg-info/10 text-info border-info/20"
                        )}
                      >
                        {expense.type === "fixed" ? (
                          <>
                            <Lock className="w-3 h-3" />
                            Fijo
                          </>
                        ) : (
                          <>
                            <Repeat className="w-3 h-3" />
                            Variable
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={categoryColors[expense.category]}>
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{expense.date}</TableCell>
                    <TableCell className="hidden md:table-cell">{expense.paymentMethod}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      -${expense.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <PaginationControls
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              total={filteredExpenses.length}
              itemLabel="gastos"
            />
          </CardContent>
        </Card>

        <EntityFormDialog<typeof expenseSchema>
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title="Agregar Nuevo Gasto"
          schema={expenseSchema}
          defaultValues={{ description: "", category: "", amount: "" as unknown as number, paymentMethod: "", type: "variable" }}
          onSubmit={async (values) => {
            await createExpense.mutateAsync(values);
            toast.success("Gasto registrado");
          }}
          submitLabel="Guardar Gasto"
          className="sm:max-w-[500px]"
        >
          {(form) => (
            <>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Productos capilares" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const category = categories.find((c) => c.name === value);
                        form.setValue("type", category?.type ?? "variable");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Gastos Fijos</div>
                        {categories.filter(c => c.type === "fixed").map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            <div className="flex items-center gap-2">
                              <Lock className="w-3 h-3 text-warning" />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Gastos Variables</div>
                        {categories.filter(c => c.type === "variable").map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            <div className="flex items-center gap-2">
                              <Repeat className="w-3 h-3 text-info" />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value && (
                      <p className="text-xs text-muted-foreground">
                        Tipo: {form.watch("type") === "fixed" ? "Gasto Fijo" : "Gasto Variable"}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </EntityFormDialog>

        <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} type="expenses" onImported={() => refetchExpenses()} />
        <ImportHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} type="expenses" />
      </div>
    </DashboardLayout>
  );
}