import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { DayScheduleInput, useBarberSchedules, useSaveBarberSchedule, WEEKDAY_LABELS } from "@/hooks/useBarberSchedules";

interface BarberScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberId: string;
  barberName: string;
}

export function BarberScheduleDialog({ open, onOpenChange, barberId, barberName }: BarberScheduleDialogProps) {
  const { data: schedules, isLoading } = useBarberSchedules(barberId);
  const { data: generalSchedule } = useScheduleSettings();
  const saveSchedule = useSaveBarberSchedule();

  const [days, setDays] = useState<DayScheduleInput[] | null>(null);

  useEffect(() => {
    if (!open || isLoading) return;
    const fallbackStart = generalSchedule?.day_start ?? "10:00";
    const fallbackEnd = generalSchedule?.day_end ?? "20:00";
    const byWeekday = new Map((schedules ?? []).map((s) => [s.day_of_week, s]));
    setDays(
      Array.from({ length: 7 }, (_, weekday) => {
        const existing = byWeekday.get(weekday);
        return {
          day_of_week: weekday,
          is_available: existing?.is_available ?? true,
          start_time: existing?.start_time.slice(0, 5) ?? fallbackStart,
          end_time: existing?.end_time.slice(0, 5) ?? fallbackEnd,
        };
      }),
    );
    // Solo se re-sincroniza al abrir el dialog, no en cada refetch mientras
    // el usuario está editando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLoading]);

  const updateDay = (weekday: number, patch: Partial<DayScheduleInput>) => {
    setDays((prev) => prev?.map((d) => (d.day_of_week === weekday ? { ...d, ...patch } : d)) ?? prev);
  };

  const handleSave = async () => {
    if (!days) return;
    for (const d of days) {
      if (d.is_available && d.start_time >= d.end_time) {
        toast.error(`${WEEKDAY_LABELS[d.day_of_week]}: la hora de inicio debe ser antes que la de fin`);
        return;
      }
    }
    try {
      await saveSchedule.mutateAsync({ barberId, days });
      toast.success("Horario guardado");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el horario");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saveSchedule.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Horario de {barberName}</DialogTitle>
          <DialogDescription>
            Define los días y horas en que trabaja. Los días sin marcar quedan bloqueados para agendar.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !days ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {days.map((d) => (
              <div key={d.day_of_week} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                <Switch
                  checked={d.is_available}
                  onCheckedChange={(checked) => updateDay(d.day_of_week, { is_available: checked })}
                />
                <Label className="w-24 shrink-0 text-sm font-medium">{WEEKDAY_LABELS[d.day_of_week]}</Label>
                <Input
                  type="time"
                  step={60}
                  value={d.start_time}
                  disabled={!d.is_available}
                  onChange={(e) => updateDay(d.day_of_week, { start_time: e.target.value })}
                  className="w-full"
                />
                <span className="text-muted-foreground text-sm">a</span>
                <Input
                  type="time"
                  step={60}
                  value={d.end_time}
                  disabled={!d.is_available}
                  onChange={(e) => updateDay(d.day_of_week, { end_time: e.target.value })}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saveSchedule.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saveSchedule.isPending || !days}>
            {saveSchedule.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saveSchedule.isPending ? "Guardando..." : "Guardar horario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
