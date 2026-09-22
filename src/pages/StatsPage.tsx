import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBotStats, downloadInactiveCustomersCsv } from "@/hooks/useBotStats";
import {
  MessageCircle,
  Calendar,
  DollarSign,
  XCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Download,
  Loader2,
  Clock,
} from "lucide-react";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof MessageCircle;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-card rounded-2xl border shadow-soft p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        <p className="text-sm">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function ComingSoonCard({ icon: Icon, label }: { icon: typeof MessageCircle; label: string }) {
  return (
    <div className="bg-card rounded-2xl border shadow-soft p-5 opacity-60">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        <p className="text-sm">{label}</p>
      </div>
      <Badge variant="outline" className="text-xs">Próximamente</Badge>
    </div>
  );
}

export default function StatsPage() {
  const { data, isLoading } = useBotStats();

  if (isLoading || !data) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Estadísticas</h1>
          <p className="text-muted-foreground mt-1">Desempeño de tu bot de WhatsApp con CharlIA</p>
        </div>

        <div className="bg-card rounded-2xl border shadow-soft p-6 gradient-gold">
          <p className="text-sm text-primary-foreground/80">Este mes</p>
          <p className="text-3xl font-bold text-primary-foreground mt-1">
            CharlIA generó {currency.format(data.month.ventasGeneradas)}
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Hoy</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={MessageCircle} label="Conversaciones" value={String(data.today.conversaciones)} hint="Aproximado, basado en resúmenes del bot" />
            <StatCard icon={Calendar} label="Citas generadas" value={String(data.today.citasGeneradas)} />
            <StatCard icon={DollarSign} label="Ventas potenciales" value={currency.format(data.today.ventasPotenciales)} />
            <StatCard
              icon={TrendingUp}
              label="Conversión"
              value={data.today.conversionRate !== null ? `${data.today.conversionRate.toFixed(1)} %` : "—"}
              hint="Citas generadas ÷ conversaciones"
            />
            <ComingSoonCard icon={Sparkles} label="Interesados en reservar" />
            <ComingSoonCard icon={Clock} label="No terminaron de reservar" />
            <ComingSoonCard icon={RefreshCw} label="Citas reprogramadas" />
            <StatCard icon={XCircle} label="Cancelaciones" value={String(data.today.cancelaciones)} />
            <StatCard icon={Sparkles} label="Clientes recuperados" value={String(data.today.clientesRecuperados)} hint="Inactivos 30+ días que volvieron hoy" />
          </div>
        </div>

        <div className="bg-card rounded-2xl border shadow-soft">
          <div className="p-5 flex items-center justify-between gap-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Clientes que no han vuelto</h2>
              <p className="text-sm text-muted-foreground">30+ días sin agendar — descarga la base para campañas en Reto WPP</p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              disabled={data.inactiveCustomers.length === 0}
              onClick={() => downloadInactiveCustomersCsv(data.inactiveCustomers)}
            >
              <Download className="w-4 h-4" /> Descargar CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Última visita</TableHead>
                  <TableHead className="text-right">Días inactivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inactiveCustomers.slice(0, 100).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{c.email ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.lastVisit}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-warning border-warning/20">{c.daysInactive} días</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.inactiveCustomers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">Todos tus clientes están activos 🎉</div>
            )}
            {data.inactiveCustomers.length > 100 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Mostrando los primeros 100 de {data.inactiveCustomers.length} — el CSV descarga la lista completa.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
