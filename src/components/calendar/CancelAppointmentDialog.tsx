import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CANCEL_REASONS = [
  "Cliente canceló",
  "Cliente no asistió",
  "Reprogramación solicitada",
  "Barbero no disponible",
  "Error al agendar",
  "Otro",
];

interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function CancelAppointmentDialog({ open, onOpenChange, onConfirm }: CancelAppointmentDialogProps) {
  const [preset, setPreset] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPreset("");
      setDetail("");
    }
  }, [open]);

  const handleConfirm = async () => {
    const reason = preset === "Otro" || !preset ? detail.trim() : preset;
    if (!reason) {
      toast.error("Indica el motivo de la cancelación");
      return;
    }
    setSubmitting(true);
    try {
      const fullReason = preset && preset !== "Otro" && detail.trim() ? `${preset} — ${detail.trim()}` : reason;
      await onConfirm(fullReason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Motivo de la cancelación</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Detalle {preset === "Otro" || !preset ? "(obligatorio)" : "(opcional)"}</Label>
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Describe brevemente el motivo..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Volver
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            Confirmar cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
