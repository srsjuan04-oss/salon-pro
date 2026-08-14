import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type PreferenceKey = "new_appointments" | "cancellations" | "reminders" | "daily_summary" | "whatsapp_messages";

interface Preferences {
  id: string | null;
  new_appointments: boolean;
  cancellations: boolean;
  reminders: boolean;
  daily_summary: boolean;
  whatsapp_messages: boolean;
}

const ITEMS: { key: PreferenceKey; title: string; desc: string }[] = [
  { key: "new_appointments", title: "Nuevas citas", desc: "Recibir notificación cuando un cliente agenda" },
  { key: "cancellations", title: "Cancelaciones", desc: "Alertas cuando se cancela una cita" },
  { key: "reminders", title: "Recordatorios", desc: "Enviar recordatorios automáticos a clientes" },
  { key: "daily_summary", title: "Resumen diario", desc: "Recibir resumen de ventas al final del día" },
  { key: "whatsapp_messages", title: "Mensajes WhatsApp", desc: "Notificar nuevos mensajes sin respuesta" },
];

const DEFAULTS: Preferences = {
  id: null,
  new_appointments: true,
  cancellations: true,
  reminders: true,
  daily_summary: false,
  whatsapp_messages: false,
};

export function NotificationPreferencesCard() {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .maybeSingle();
      if (data) setPrefs(data as unknown as Preferences);
      setLoading(false);
    })();
  }, []);

  const toggle = async (key: PreferenceKey, value: boolean) => {
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    setSavingKey(key);

    const payload = { ...prefs, [key]: value };
    delete (payload as any).id;

    const { data, error } = prefs.id
      ? await supabase.from("notification_preferences").update(payload).eq("id", prefs.id).select().single()
      : await supabase.from("notification_preferences").insert(payload).select().single();

    setSavingKey(null);

    if (error) {
      setPrefs(previous);
      toast.error(error.message);
    } else {
      setPrefs(data as unknown as Preferences);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border shadow-soft p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando preferencias…
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-4">
      <h3 className="text-lg font-semibold">Preferencias de Notificación</h3>

      {ITEMS.map((item) => (
        <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            {savingKey === item.key && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            <Switch
              checked={prefs[item.key]}
              onCheckedChange={(v) => toggle(item.key, v)}
              disabled={savingKey === item.key}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
