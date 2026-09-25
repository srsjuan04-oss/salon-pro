import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useWompiPaymentMethod, WompiPaymentMethodFields } from "@/components/billing/WompiPaymentMethodFields";
import { functionErrorMessage } from "@/lib/edge-functions";

interface Props {
  /** El negocio tiene un cobro vencido (o la suscripción cancelada): se cobra al guardar. */
  chargeNow: boolean;
  amountLabel: string;
  triggerLabel: string;
}

export function UpdatePaymentMethodDialog({ chargeNow, amountLabel, triggerLabel }: Props) {
  const qc = useQueryClient();
  const pm = useWompiPaymentMethod("/settings");
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const missing = pm.missingMessage();
    if (missing) return setError(missing);

    setProcessing(true);
    try {
      const paymentMethod = await pm.tokenize();
      const { data: result, error: fnError } = await supabase.functions.invoke("wompi-update-payment-method", {
        body: paymentMethod,
      });
      if (fnError) throw new Error(await functionErrorMessage(fnError, "No se pudo actualizar el medio de pago."));
      if (result?.error) throw new Error(result.error);

      qc.invalidateQueries({ queryKey: ["my-subscription"] });

      if (result.status === "APPROVED") {
        toast.success("Pago aprobado. Tu acceso quedó restablecido.");
        setOpen(false);
        // El bloqueo de acceso se calcula al cargar la sesión (useAuth).
        setTimeout(() => window.location.reload(), 1500);
      } else if (result.pending || result.status === "PENDING") {
        toast.info(
          result.pending
            ? "Medio de pago actualizado. Ya hay un cobro en proceso; el acceso se restablece en cuanto se apruebe."
            : "Tu pago está en proceso. El acceso se restablece automáticamente en cuanto se apruebe."
        );
        setOpen(false);
      } else if (result.charged) {
        setError(
          `El pago fue rechazado${result.reason ? `: ${result.reason}` : ""}. Revisa los fondos o intenta con otro medio de pago.`
        );
      } else {
        toast.success("Medio de pago actualizado. Los próximos cobros se harán con él.");
        setOpen(false);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !processing && setOpen(o)}>
      <DialogTrigger asChild>
        <Button className={chargeNow ? "gradient-gold shadow-gold" : undefined} variant={chargeNow ? "default" : "outline"}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{chargeNow ? "Pagar y reactivar" : "Actualizar medio de pago"}</DialogTitle>
          <DialogDescription>
            {chargeNow
              ? `Al guardar se cobrará de inmediato la mensualidad de ${amountLabel} (más la implementación, si todavía no la has pagado) y tu acceso se restablece en cuanto se apruebe.`
              : "No se cobra nada ahora. Los próximos cobros de tu plan se harán con este medio de pago."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <WompiPaymentMethodFields pm={pm} />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="submit" className="w-full gradient-gold shadow-gold" disabled={!pm.isComplete || processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {processing ? "Procesando..." : chargeNow ? `Pagar ${amountLabel}` : "Guardar medio de pago"}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              Transacción cifrada y procesada de forma segura por Wompi
            </p>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
