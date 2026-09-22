import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface MySubscription {
  plan_code: string;
  plan_name: string;
  amount_in_cents: number;
  status: string;
  next_charge_date: string | null;
  cancel_at_period_end: boolean;
}

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const STATUS_INFO: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  trialing: { label: "Prueba gratis", className: "bg-info/10 text-info border-info/20", icon: Clock },
  active: { label: "Activa", className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  pending_payment: { label: "Pago pendiente", className: "bg-warning/10 text-warning border-warning/20", icon: AlertCircle },
  past_due: { label: "Cobro fallido", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  canceled: { label: "Cancelada", className: "bg-secondary text-secondary-foreground", icon: XCircle },
};

export function MySubscriptionCard() {
  const qc = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_subscription");
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : null) as MySubscription | null;
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { data: orgId } = await supabase.rpc("current_org_id");
      const { error } = await supabase.rpc("cancel_organization_subscription", { p_organization_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tu suscripción no se renovará. Sigues con acceso hasta la fecha de tu próximo cobro.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo cancelar la suscripción"),
  });

  const reactivate = useMutation({
    mutationFn: async () => {
      const { data: orgId } = await supabase.rpc("current_org_id");
      const { error } = await supabase.rpc("reactivate_organization_subscription", { p_organization_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tu suscripción se reactivó y seguirá renovándose normalmente.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo reactivar la suscripción"),
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border shadow-soft p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-3">
        <h3 className="text-lg font-semibold">Mi plan</h3>
        <p className="text-sm text-muted-foreground">
          Todavía no tienes una suscripción de pago activa. Contacta a soporte si crees que esto es un error.
        </p>
      </div>
    );
  }

  const statusInfo = STATUS_INFO[subscription.status] ?? STATUS_INFO.canceled;
  const canCancel = ["trialing", "active", "past_due"].includes(subscription.status);

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-6">
      <h3 className="text-lg font-semibold">Mi plan</h3>

      <div className="p-4 rounded-xl gradient-gold">
        <div className="flex items-center justify-between text-primary-foreground gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{subscription.plan_name}</p>
              <Badge className={`gap-1 text-xs ${statusInfo.className}`}>
                <statusInfo.icon className="w-3 h-3" /> {statusInfo.label}
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-1">{currency.format(subscription.amount_in_cents / 100)}/mes</p>
          </div>
        </div>
      </div>

      {subscription.cancel_at_period_end && subscription.next_charge_date && (
        <p className="text-sm text-warning">
          Tu suscripción se cancelará el {subscription.next_charge_date} y perderás acceso ese día. Puedes reactivarla antes de esa fecha.
        </p>
      )}
      {!subscription.cancel_at_period_end && subscription.status === "trialing" && subscription.next_charge_date && (
        <p className="text-sm text-muted-foreground">
          Tu prueba gratis termina el {subscription.next_charge_date}. Ese día se hará el primer cobro automático.
        </p>
      )}
      {!subscription.cancel_at_period_end && subscription.status === "active" && subscription.next_charge_date && (
        <p className="text-sm text-muted-foreground">Próximo cobro: {subscription.next_charge_date}</p>
      )}

      <div className="flex gap-2">
        {canCancel && !subscription.cancel_at_period_end && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                Cancelar suscripción
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar tu suscripción?</AlertDialogTitle>
                <AlertDialogDescription>
                  No se te cobrará de nuevo. Conservas acceso hasta{" "}
                  {subscription.next_charge_date ?? "el fin de tu periodo actual"}; ese día se suspenderá el servicio.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={() => cancel.mutate()} className="bg-destructive hover:bg-destructive/90">
                  Sí, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {subscription.cancel_at_period_end && (
          <Button variant="outline" onClick={() => reactivate.mutate()} disabled={reactivate.isPending}>
            {reactivate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Reactivar suscripción
          </Button>
        )}
      </div>
    </div>
  );
}
