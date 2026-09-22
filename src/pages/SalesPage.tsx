import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Plus,
  Upload,
  History,
  Package,
  Truck,
  PackageCheck,
} from "lucide-react";
import { CsvImportDialog } from "@/components/financial/CsvImportDialog";
import { ImportHistoryDialog } from "@/components/financial/ImportHistoryDialog";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useCreateSale,
  useMarkSaleAsPaid,
  useSales,
  useUpdateFulfillmentStatus,
  type FulfillmentStatus,
  type Sale,
} from "@/hooks/useSalesEntries";
import { reportError } from "@/lib/errors";
import { saleSchema } from "@/lib/schemas/sale";
import { useDateRangeFilter } from "@/hooks/useDateRangeFilter";
import { usePagination } from "@/hooks/usePagination";
import { DateRangeFilterBar } from "@/components/shared/DateRangeFilterBar";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";

const ITEMS_PER_PAGE = 10;

const services = [
  { name: "Corte de cabello", price: 250 },
  { name: "Corte + Tinte", price: 850 },
  { name: "Corte + Barba", price: 450 },
  { name: "Manicure", price: 350 },
  { name: "Pedicure", price: 400 },
  { name: "Tratamiento Keratina", price: 1200 },
  { name: "Coloración", price: 600 },
  { name: "Fade", price: 200 },
];

const paymentMethods = ["Efectivo", "Tarjeta", "Transferencia"];

export default function SalesPage() {
  const { data: sales = [], refetch: refetchSales } = useSales();
  const createSale = useCreateSale();
  const markSaleAsPaid = useMarkSaleAsPaid();
  const updateFulfillmentStatus = useUpdateFulfillmentStatus();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const {
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    filtered: dateFilteredSales,
    label: dateRangeLabel,
  } = useDateRangeFilter(sales, (s) => s.date);

  const today = new Date();

  const paidSales = dateFilteredSales.filter(s => s.status === "paid");
  const pendingSales = dateFilteredSales.filter(s => s.status === "pending");
  
  const totalPaid = paidSales.reduce((acc, s) => acc + s.amount, 0);
  const totalPending = pendingSales.reduce((acc, s) => acc + s.amount, 0);
  const totalSales = totalPaid + totalPending;

  // Ingresos mensuales (últimos 6 meses, sobre todas las ventas cargadas)
  const monthlyData = useMemo(() => {
    const months: { key: string; name: string; pagadas: number; pendientes: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i);
      months.push({
        key: format(d, "yyyy-MM"),
        name: format(d, "MMM", { locale: es }),
        pagadas: 0,
        pendientes: 0,
      });
    }
    sales.forEach((s) => {
      const m = months.find((x) => x.key === (s.date ?? "").slice(0, 7));
      if (!m) return;
      if (s.status === "paid") m.pagadas += s.amount;
      else m.pendientes += s.amount;
    });
    return months.map(({ name, pagadas, pendientes }) => ({ name, pagadas, pendientes }));
  }, [sales]);

  // Ingresos por servicio (según el filtro de fecha activo)
  const serviceData = useMemo(() => {
    const totals = new Map<string, number>();
    dateFilteredSales.forEach((s) => {
      totals.set(s.service, (totals.get(s.service) ?? 0) + s.amount);
    });
    return Array.from(totals, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [dateFilteredSales]);



  const markAsPaid = (saleId: string, method: string) => {
    markSaleAsPaid.mutate(
      { saleId, method },
      { onError: (error) => reportError(error) },
    );
  };

  const changeFulfillmentStatus = (saleId: string, status: FulfillmentStatus) => {
    updateFulfillmentStatus.mutate(
      { saleId, status },
      { onError: (error) => reportError(error, "No se pudo actualizar el estado del pedido") },
    );
  };

  const filteredSales = activeTab === "all"
    ? dateFilteredSales
    : activeTab === "paid"
      ? paidSales
      : pendingSales;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Ventas</h1>
            <p className="text-muted-foreground mt-1">
              Control de ingresos por servicios prestados
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
            <Button className="gradient-gold shadow-gold gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Nueva Venta
            </Button>
          </div>
        </div>

        <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} type="sales" onImported={() => refetchSales()} />
        <ImportHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} type="sales" />

        <DateRangeFilterBar
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          label={dateRangeLabel}
          countLabel={`${dateFilteredSales.length} ventas`}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border shadow-soft p-5 gradient-gold">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-primary-foreground/80">Total Ventas</p>
                <p className="text-2xl font-bold text-primary-foreground">${totalSales.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas Pagadas</p>
                <p className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{paidSales.length} transacciones</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas Pendientes</p>
                <p className="text-2xl font-bold text-warning">${totalPending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{pendingSales.length} por cobrar</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                <p className="text-2xl font-bold">${sales.length > 0 ? Math.round(totalSales / sales.length).toLocaleString() : 0}</p>
                <p className="text-xs text-muted-foreground">{sales.length} servicios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="bg-card rounded-2xl border shadow-soft p-6">
            <h3 className="text-lg font-semibold mb-4">Ingresos Mensuales</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorPagadas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPendientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      `$${value.toLocaleString()}`, 
                      name === "pagadas" ? "Pagadas" : "Pendientes"
                    ]}
                  />
                  <Area type="monotone" dataKey="pagadas" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#colorPagadas)" />
                  <Area type="monotone" dataKey="pendientes" stroke="hsl(var(--warning))" strokeWidth={2} fill="url(#colorPendientes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">Pagadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-sm text-muted-foreground">Pendientes</span>
              </div>
            </div>
          </div>

          {/* By Service */}
          <div className="bg-card rounded-2xl border shadow-soft p-6">
            <h3 className="text-lg font-semibold mb-4">Ingresos por Servicio</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Ingresos"]}
                  />
                  <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sales Table with Tabs */}
        <div className="bg-card rounded-2xl border shadow-soft p-6">
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold">Registro de Ventas</h3>
              <TabsList className="grid w-full sm:w-auto grid-cols-3">
                <TabsTrigger value="all" className="gap-2">
                  Todas
                  <Badge variant="secondary" className="ml-1">{sales.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="paid" className="gap-2">
                  Pagadas
                  <Badge variant="secondary" className="ml-1 bg-success/20 text-success">{paidSales.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  Pendientes
                  <Badge variant="secondary" className="ml-1 bg-warning/20 text-warning">{pendingSales.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <SalesTable sales={filteredSales} onMarkAsPaid={markAsPaid} onChangeFulfillmentStatus={changeFulfillmentStatus} />
            </TabsContent>
            <TabsContent value="paid" className="mt-0">
              <SalesTable sales={filteredSales} onMarkAsPaid={markAsPaid} onChangeFulfillmentStatus={changeFulfillmentStatus} />
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              <SalesTable sales={filteredSales} onMarkAsPaid={markAsPaid} onChangeFulfillmentStatus={changeFulfillmentStatus} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <EntityFormDialog<typeof saleSchema>
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Registrar Nueva Venta"
        schema={saleSchema}
        defaultValues={{ client: "", service: "", amount: "" as unknown as number, paymentMethod: "" }}
        onSubmit={async (values) => {
          await createSale.mutateAsync(values);
          toast.success("Venta registrada");
        }}
        submitLabel="Registrar Venta"
        className="sm:max-w-[500px]"
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const service = services.find((s) => s.name === value);
                      form.setValue("amount", (service?.price ?? "") as unknown as number);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar servicio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.name} value={service.name}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{service.name}</span>
                            <span className="text-muted-foreground">${service.price}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <p className="text-xs text-muted-foreground">El precio se ajusta automáticamente al seleccionar servicio</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método (opcional si pendiente)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-warning" />
                          Dejar como pendiente
                        </div>
                      </SelectItem>
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
    </DashboardLayout>
  );
}

const FULFILLMENT_OPTIONS: { value: FulfillmentStatus; label: string; icon: typeof Package; className: string }[] = [
  { value: "preparing", label: "En preparación", icon: Package, className: "bg-secondary text-secondary-foreground" },
  { value: "out_for_delivery", label: "En reparto", icon: Truck, className: "bg-info/10 text-info border-info/20" },
  { value: "delivered", label: "Entregado", icon: PackageCheck, className: "bg-success/10 text-success border-success/20" },
];

interface SalesTableProps {
  sales: Sale[];
  onMarkAsPaid: (id: string, method: string) => void;
  onChangeFulfillmentStatus: (id: string, status: FulfillmentStatus) => void;
}

function SalesTable({ sales, onMarkAsPaid, onChangeFulfillmentStatus }: SalesTableProps) {
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("");

  const {
    page: currentPage,
    setPage: setCurrentPage,
    totalPages,
    pageItems: paginatedSales,
    rangeStart,
    rangeEnd,
  } = usePagination(sales, ITEMS_PER_PAGE);

  const handleConfirmPayment = () => {
    if (paymentDialog && selectedMethod) {
      onMarkAsPaid(paymentDialog, selectedMethod);
      setPaymentDialog(null);
      setSelectedMethod("");
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead className="hidden md:table-cell">Staff</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.map((sale, index) => (
              <TableRow key={sale.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                </TableCell>
                <TableCell className="font-medium">{sale.client}</TableCell>
                <TableCell className="text-muted-foreground">{sale.service}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">{sale.stylist}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                  <div>{sale.date}</div>
                  <div className="text-xs">{sale.time}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5 items-start">
                    {sale.status === "paid" ? (
                      <Badge className="bg-success/10 text-success border-success/20 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Pagado
                      </Badge>
                    ) : (
                      <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Pendiente
                      </Badge>
                    )}
                    {sale.fulfillmentStatus && (
                      <Select
                        value={sale.fulfillmentStatus}
                        onValueChange={(value) => onChangeFulfillmentStatus(sale.id, value as FulfillmentStatus)}
                      >
                        <SelectTrigger className="h-7 w-auto gap-1 text-xs border-none bg-transparent p-0 focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FULFILLMENT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-1.5">
                                <opt.icon className="w-3.5 h-3.5" />
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-semibold",
                    sale.status === "paid" ? "text-success" : "text-warning"
                  )}
                >
                  ${sale.amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {sale.status === "pending" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setPaymentDialog(sale.id)}
                    >
                      <CreditCard className="w-3 h-3" />
                      Cobrar
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="font-normal">
                      {sale.method}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={sales.length}
        itemLabel="ventas"
      />

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={(open) => !open && setPaymentDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
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
            <Button type="button" variant="outline" onClick={() => setPaymentDialog(null)}>
              Cancelar
            </Button>
            <Button
              className="gradient-gold shadow-gold"
              onClick={handleConfirmPayment}
              disabled={!selectedMethod}
            >
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}