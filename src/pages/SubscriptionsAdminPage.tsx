import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, CheckCircle2, CreditCard, Loader2, XCircle } from "lucide-react";

interface PlatformSubscription {
  subscription_id: string;
  organization_id: string;
  organization_name: string;
  plan_code: string;
  plan_name: string;
  amount_in_cents: number;
  status: string;
  payment_source_type: string;
  next_charge_date: string | null;
  failed_attempts: number;
  updated_at: string;
}

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  active: { label: "Activa", className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  pending_payment: { label: "Pago pendiente", className: "bg-warning/10 text-warning border-warning/20", icon: AlertCircle },
  past_due: { label: "Cobro fallido", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  canceled: { label: "Cancelada", className: "bg-secondary text-secondary-foreground", icon: XCircle },
};

const PAYMENT_LABEL: Record<string, string> = {
  CARD: "Tarjeta",
  NEQUI: "Nequi",
  DAVIPLATA: "DaviPlata",
  BANCOLOMBIA_TRANSFER: "Bancolombia",
};

export default function SubscriptionsAdminPage() {
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["platform-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_subscriptions");
      if (error) throw error;
      return (data ?? []) as PlatformSubscription[];
    },
  });

  const summary = useMemo(() => {
    return {
      total: subscriptions.length,
      active: subscriptions.filter((s) => s.status === "active").length,
      pastDue: subscriptions.filter((s) => s.status === "past_due").length,
      mrr: subscriptions
        .filter((s) => s.status === "active")
        .reduce((sum, s) => sum + Number(s.amount_in_cents), 0) / 100,
    };
  }, [subscriptions]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Suscripciones</h1>
          <p className="text-muted-foreground mt-1">Facturación de CharlIA a sus clientes (Wompi)</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border shadow-soft p-4">
            <p className="text-sm text-muted-foreground">Suscripciones</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-card rounded-2xl border shadow-soft p-4">
            <p className="text-sm text-muted-foreground">Activas</p>
            <p className="text-2xl font-bold">{summary.active}</p>
          </div>
          <div className="bg-card rounded-2xl border shadow-soft p-4">
            <p className="text-sm text-muted-foreground">Con cobro fallido</p>
            <p className="text-2xl font-bold text-destructive">{summary.pastDue}</p>
          </div>
          <div className="bg-card rounded-2xl border shadow-soft p-4">
            <p className="text-sm text-muted-foreground">MRR (activas)</p>
            <p className="text-2xl font-bold">{currency.format(summary.mrr)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => {
              const statusInfo = STATUS_BADGE[sub.status] ?? STATUS_BADGE.canceled;
              return (
                <div
                  key={sub.subscription_id}
                  className="bg-card rounded-2xl border shadow-soft p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="font-semibold truncate">{sub.organization_name}</p>
                      <Badge className={`gap-1 text-xs ${statusInfo.className}`}>
                        <statusInfo.icon className="w-3 h-3" /> {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Plan {sub.plan_name} · {currency.format(Number(sub.amount_in_cents) / 100)}/mes
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 shrink-0">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> Medio
                      </p>
                      <p className="font-medium">{PAYMENT_LABEL[sub.payment_source_type] ?? sub.payment_source_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Próximo cobro</p>
                      <p className="font-medium">
                        {sub.next_charge_date ? new Date(sub.next_charge_date).toLocaleDateString("es-CO") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Intentos fallidos</p>
                      <p className={`font-medium ${sub.failed_attempts > 0 ? "text-destructive" : ""}`}>{sub.failed_attempts}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {subscriptions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Todavía no hay suscripciones registradas.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
