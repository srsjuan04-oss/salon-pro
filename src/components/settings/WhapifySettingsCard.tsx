import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, RefreshCw, Save, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { functionErrorMessage } from "@/lib/edge-functions";

const REMINDER_UNITS = { minutes: 1, hours: 60, days: 1440 } as const;
type ReminderUnit = keyof typeof REMINDER_UNITS;

/** "1 día", "3 horas", "90 minutos": la unidad más grande que divida exacto. */
function formatReminderOffset(minutes: number) {
  if (minutes % 1440 === 0) return `${minutes / 1440} día${minutes / 1440 > 1 ? "s" : ""}`;
  if (minutes % 60 === 0) return `${minutes / 60} hora${minutes / 60 > 1 ? "s" : ""}`;
  return `${minutes} minuto${minutes > 1 ? "s" : ""}`;
}

function maskToken(t: string | null | undefined) {
  if (!t) return "";
  const tail = t.slice(-4);
  return `${"•".repeat(Math.max(0, 12))}${tail}`;
}

interface ChatCharliaTemplate {
  id: string;
  name: string;
  language: string;
}

/** Trae y asigna la plantilla real de Meta desde Chat CharlIA, usando la URL del webhook ya guardada. */
function ChatCharliaTemplatePicker({ webhookUrl }: { webhookUrl: string }) {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["chat-charlia-templates", webhookUrl],
    queryFn: async () => {
      const res = await fetch(`${webhookUrl}/templates`);
      if (!res.ok) throw new Error("No se pudieron cargar las plantillas");
      return (await res.json()) as { templates: ChatCharliaTemplate[]; currentTemplateId: string | null };
    },
  });

  const assignTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(webhookUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) throw new Error("No se pudo asignar la plantilla");
    },
    onSuccess: () => {
      toast.success("Plantilla asignada");
      qc.invalidateQueries({ queryKey: ["chat-charlia-templates", webhookUrl] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Cargando plantillas de Chat CharlIA…</p>;
  if (isError) return <p className="text-xs text-destructive">No se pudieron cargar las plantillas. Revisa la URL del webhook.</p>;

  const templates = data?.templates ?? [];

  return (
    <div className="space-y-1">
      <Label className="text-xs">Plantilla de Meta (Chat CharlIA)</Label>
      <Select
        value={data?.currentTemplateId ?? ""}
        onValueChange={(v) => assignTemplate.mutate(v)}
        disabled={templates.length === 0 || assignTemplate.isPending}
      >
        <SelectTrigger>
          <SelectValue placeholder={templates.length ? "Selecciona una plantilla" : "No hay plantillas aprobadas todavía"} />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} ({t.language})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function WhapifySettingsCard() {
  const qc = useQueryClient();
  const [tokenInput, setTokenInput] = useState("");
  const [webhookDrafts, setWebhookDrafts] = useState<Record<string, string>>({});
  const [newAmount, setNewAmount] = useState("24");
  const [newUnit, setNewUnit] = useState<ReminderUnit>("hours");

  const { data: settings } = useQuery({
    queryKey: ["whapify-settings"],
    queryFn: async () => {
      // Una fila por organización; la RLS ("org read") ya limita a la del usuario.
      const { data, error } = await supabase.from("whapify_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: flows = [] } = useQuery({
    queryKey: ["whapify-flows"],
    queryFn: async () => {
      const { data } = await supabase.from("whapify_flows").select("*").order("flow_name");
      return data ?? [];
    },
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminder-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("reminder_settings").select("*").order("minutes_before", { ascending: false });
      return data ?? [];
    },
  });

  const saveToken = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whapify-proxy", {
        body: { action: "save_token", token: tokenInput.trim() },
      });
      // Token rechazado por Gestor de WhatsApp: la función responde 400 con success=false.
      if (error && (error as { context?: Response }).context?.status === 400) {
        const body = await (error as { context: Response }).context.json().catch(() => null);
        if (body && body.success === false) return body;
      }
      if (error) throw new Error(await functionErrorMessage(error, "No se pudo guardar el token."));
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["whapify-settings"] });
      if (d?.success) {
        toast.success(`Token guardado. ${d.flows_count} flows disponibles.`);
        setTokenInput("");
      } else {
        toast.error("Gestor de WhatsApp rechazó el token. Revisa que lo copiaste completo desde tu cuenta.");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const validate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whapify-proxy", { body: { action: "validate" } });
      if (error) throw new Error(await functionErrorMessage(error, "No se pudo validar la conexión."));
      return data;
    },
    onSuccess: (d: any) => {
      toast[d?.valid ? "success" : "error"](d?.valid ? "Conexión válida ✓" : "Token inválido");
      qc.invalidateQueries({ queryKey: ["whapify-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncFlows = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whapify-proxy", { body: { action: "sync_flows" } });
      if (error) throw new Error(await functionErrorMessage(error, "No se pudieron consultar los flows."));
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`${d?.count ?? 0} flows sincronizados`);
      qc.invalidateQueries({ queryKey: ["whapify-flows"] });
      qc.invalidateQueries({ queryKey: ["whapify-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { active?: boolean; whapify_flow_id?: string | null; webhook_url?: string | null } }) => {
      const { error } = await supabase.from("reminder_settings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminder-settings"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const createReminder = useMutation({
    mutationFn: async () => {
      const minutes = Math.round(Number(newAmount) * REMINDER_UNITS[newUnit]);
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 43200) {
        throw new Error("Elige un tiempo entre 1 minuto y 30 días.");
      }
      if (reminders.some((r) => r.minutes_before === minutes)) {
        throw new Error(`Ya tienes un recordatorio ${formatReminderOffset(minutes)} antes.`);
      }
      // organization_id lo pone el trigger set_org_id. Queda inactivo hasta que se le
      // asigne un destino (webhook o flow), igual que los recordatorios por defecto.
      const { error } = await supabase
        .from("reminder_settings")
        .insert({ reminder_type: `${minutes}_min`, minutes_before: minutes, active: false } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recordatorio creado. Asígnale un destino y actívalo.");
      qc.invalidateQueries({ queryKey: ["reminder-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminder_settings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recordatorio eliminado");
      qc.invalidateQueries({ queryKey: ["reminder-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hasToken = Boolean(settings?.whapify_token);
  const isActive = Boolean(settings?.is_active);

  return (
    <div className="space-y-6">
      {/* Connection */}
      <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Configuración Gestor de WhatsApp
            </h3>
            <p className="text-sm text-muted-foreground">Conecta tu cuenta para enviar recordatorios automáticos</p>
          </div>
          {hasToken && (
            <Badge variant={isActive ? "default" : "destructive"} className="gap-1">
              {isActive ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {isActive ? "Conectado" : "Inválido"}
            </Badge>
          )}
        </div>

        {hasToken && (
          <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Token actual</p>
              <p className="font-mono text-sm">{maskToken(settings?.whapify_token)}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {settings?.last_validated_at && <p>Validado: {new Date(settings.last_validated_at).toLocaleString()}</p>}
              {settings?.last_synced_at && <p>Sincronizado: {new Date(settings.last_synced_at).toLocaleString()}</p>}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>{hasToken ? "Actualizar token" : "Token de Gestor de WhatsApp"}</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Pega tu token aquí"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <Button onClick={() => saveToken.mutate()} disabled={!tokenInput.trim() || saveToken.isPending} className="gap-2">
              <Save className="w-4 h-4" /> Guardar
            </Button>
          </div>
        </div>

        {hasToken && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => validate.mutate()} disabled={validate.isPending}>
              Validar conexión
            </Button>
            <Button variant="outline" onClick={() => syncFlows.mutate()} disabled={!isActive || syncFlows.isPending} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${syncFlows.isPending ? "animate-spin" : ""}`} /> Consultar Flows ({flows.length})
            </Button>
          </div>
        )}
      </div>

      {/* Reminder settings */}
      <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Recordatorios automáticos</h3>
          <p className="text-sm text-muted-foreground">Asigna un Flow de Gestor de WhatsApp a cada recordatorio</p>
        </div>

        {!isActive && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
            Para usar un Flow de Gestor de WhatsApp, primero conecta un token válido arriba. Si envías los
            recordatorios por Chat CharlIA (webhook), no necesitas Gestor de WhatsApp.
          </div>
        )}

        <div className="space-y-3">
          {reminders.map((r) => {
            const configured = Boolean(r.whapify_flow_id) || Boolean(r.webhook_url);
            const webhookDraft = webhookDrafts[r.id] ?? r.webhook_url ?? "";
            return (
              <div key={r.id} className="p-4 rounded-xl border bg-secondary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{formatReminderOffset(r.minutes_before)} antes de la cita</p>
                    <p className="text-xs text-muted-foreground">
                      Canal: {r.webhook_url ? "Chat CharlIA" : "Gestor de WhatsApp"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {configured ? (
                      <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Configurado</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><AlertCircle className="w-3 h-3" /> Sin destino</Badge>
                    )}
                    <Switch
                      checked={r.active}
                      disabled={!configured}
                      onCheckedChange={(v) => updateReminder.mutate({ id: r.id, patch: { active: v } })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar recordatorio"
                      disabled={deleteReminder.isPending}
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el recordatorio de ${formatReminderOffset(r.minutes_before)} antes?`)) {
                          deleteReminder.mutate(r.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Webhook de Chat CharlIA (recomendado — plantillas reales de Meta)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://.../api/webhooks/appointment-reminder/…"
                      value={webhookDraft}
                      onChange={(e) => setWebhookDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    />
                    <Button
                      variant="outline"
                      onClick={() => updateReminder.mutate({ id: r.id, patch: { webhook_url: webhookDraft.trim() || null } })}
                      disabled={updateReminder.isPending}
                    >
                      Guardar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si se configura, este recordatorio se envía por Chat CharlIA en vez de Gestor de WhatsApp.
                  </p>
                </div>

                {r.webhook_url && <ChatCharliaTemplatePicker webhookUrl={r.webhook_url} />}

                <div className="space-y-1">
                  <Label className="text-xs">Flow de Gestor de WhatsApp (alternativa)</Label>
                  <Select
                    value={r.whapify_flow_id ?? ""}
                    onValueChange={(v) => updateReminder.mutate({ id: r.id, patch: { whapify_flow_id: v || null } })}
                    disabled={flows.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={flows.length ? "Selecciona un flow" : "Sincroniza flows primero"} />
                    </SelectTrigger>
                    <SelectContent>
                      {flows.map((f) => (
                        <SelectItem key={f.flow_id} value={f.flow_id}>
                          {f.flow_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-xl border border-dashed space-y-2">
          <Label className="text-xs">Nuevo recordatorio</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              className="w-24"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
            />
            <Select value={newUnit} onValueChange={(v) => setNewUnit(v as ReminderUnit)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">minutos</SelectItem>
                <SelectItem value="hours">horas</SelectItem>
                <SelectItem value="days">días</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">antes de la cita</span>
            <Button
              onClick={() => createReminder.mutate()}
              disabled={!newAmount || createReminder.isPending}
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Agregar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
