import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const TIMEZONES = [
  { value: "America/Bogota", label: "Bogotá, Lima, Quito (GMT-5)" },
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Guatemala", label: "Guatemala, El Salvador (GMT-6)" },
  { value: "America/Santiago", label: "Santiago de Chile (GMT-4/-3)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "America/Caracas", label: "Caracas (GMT-4)" },
  { value: "America/La_Paz", label: "La Paz (GMT-4)" },
  { value: "America/Montevideo", label: "Montevideo (GMT-3)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1/+2)" },
];

const CURRENCIES = [
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "USD", label: "Dólar estadounidense (USD)" },
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "CLP", label: "Peso chileno (CLP)" },
  { value: "PEN", label: "Sol peruano (PEN)" },
  { value: "GTQ", label: "Quetzal guatemalteco (GTQ)" },
  { value: "BOB", label: "Boliviano (BOB)" },
  { value: "UYU", label: "Peso uruguayo (UYU)" },
  { value: "BRL", label: "Real brasileño (BRL)" },
  { value: "EUR", label: "Euro (EUR)" },
];

export function ScheduleSettingsCard() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [dayStart, setDayStart] = useState("10:00");
  const [dayEnd, setDayEnd] = useState("20:00");
  const [slot, setSlot] = useState(40);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("America/Bogota");
  const [savingTz, setSavingTz] = useState(false);
  const [currency, setCurrency] = useState("COP");
  const [savingCurrency, setSavingCurrency] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: org }] = await Promise.all([
        supabase
          .from("schedule_settings")
          .select("id, day_start, day_end, slot_minutes")
          .limit(1)
          .maybeSingle(),
        supabase.from("organizations").select("id, timezone, currency").limit(1).maybeSingle(),
      ]);
      if (data) {
        setId(data.id);
        setDayStart(data.day_start.slice(0, 5));
        setDayEnd(data.day_end.slice(0, 5));
        setSlot(data.slot_minutes);
      }
      if (org) {
        setOrgId(org.id);
        setTimezone(org.timezone ?? "America/Bogota");
        setCurrency(org.currency ?? "COP");
      }
      setLoading(false);
    })();
  }, []);

  const saveTimezone = async (value: string) => {
    if (!orgId) return;
    setTimezone(value);
    setSavingTz(true);
    const { error } = await supabase
      .from("organizations")
      .update({ timezone: value })
      .eq("id", orgId);
    setSavingTz(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Zona horaria actualizada. Los recordatorios de WhatsApp la usarán.");
    }
  };

  const saveCurrency = async (value: string) => {
    if (!orgId) return;
    setCurrency(value);
    setSavingCurrency(true);
    const { error } = await supabase
      .from("organizations")
      .update({ currency: value })
      .eq("id", orgId);
    setSavingCurrency(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Moneda actualizada. El asistente de IA la usará al hablar de precios.");
    }
  };

  const save = async () => {
    if (slot <= 0 || slot > 240) {
      toast.error("El bloque debe estar entre 1 y 240 minutos");
      return;
    }
    if (dayStart >= dayEnd) {
      toast.error("La hora de inicio debe ser menor que la de fin");
      return;
    }
    setSaving(true);
    const payload = { day_start: dayStart, day_end: dayEnd, slot_minutes: slot };
    const { error } = id
      ? await supabase.from("schedule_settings").update(payload).eq("id", id)
      : await supabase.from("schedule_settings").insert(payload as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["schedule_settings"] });
      toast.success("Configuración guardada. El calendario y el bot ya la usan.");
    }
  };

  const slots = (() => {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const s = toMin(dayStart), e = toMin(dayEnd);
    const arr: string[] = [];
    for (let t = s; t + slot <= e; t += slot) arr.push(fmt(t));
    return arr;
  })();

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border shadow-soft p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando configuración…
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Bloques de la agenda</h3>
        <p className="text-sm text-muted-foreground">
          El bot de WhatsApp y la disponibilidad del MCP usan estos valores.
        </p>
      </div>

      <div className="space-y-2 max-w-sm">
        <Label className="flex items-center gap-2">
          Zona horaria
          {savingTz && <Loader2 className="w-3 h-3 animate-spin" />}
        </Label>
        <Select value={timezone} onValueChange={saveTimezone} disabled={!orgId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Se usa para calcular a qué hora se envían los recordatorios de citas por WhatsApp.
        </p>
      </div>

      <div className="space-y-2 max-w-sm">
        <Label className="flex items-center gap-2">
          Moneda
          {savingCurrency && <Loader2 className="w-3 h-3 animate-spin" />}
        </Label>
        <Select value={currency} onValueChange={saveCurrency} disabled={!orgId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          El asistente de IA la menciona al hablar de precios de servicios con los clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Hora de inicio</Label>
          <Input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Hora de fin</Label>
          <Input type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Duración del bloque (min)</Label>
          <Input
            type="number"
            min={5}
            max={240}
            step={5}
            value={slot}
            onChange={(e) => setSlot(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="rounded-xl bg-secondary/50 p-4 space-y-2">
        <p className="text-sm font-medium">
          Vista previa — {slots.length} bloques de {slot} min
        </p>
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <span
              key={s}
              className="px-2 py-1 rounded-md bg-background border text-xs font-mono"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gradient-gold shadow-gold gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar configuración
      </Button>
    </div>
  );
}
