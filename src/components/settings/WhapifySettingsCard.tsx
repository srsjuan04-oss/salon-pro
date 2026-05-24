import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, RefreshCw, Save, MessageSquare } from "lucide-react";
import { toast } from "sonner";

function maskToken(t: string | null | undefined) {
  if (!t) return "";
  const tail = t.slice(-4);
  return `${"•".repeat(Math.max(0, 12))}${tail}`;
}

export function WhapifySettingsCard() {
  const qc = useQueryClient();
  const [tokenInput, setTokenInput] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["whapify-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("whapify_settings").select("*").eq("singleton", true).maybeSingle();
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
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      if (d?.success) {
        toast.success(`Token guardado. ${d.flows_count} flows disponibles.`);
        setTokenInput("");
        qc.invalidateQueries({ queryKey: ["whapify-settings"] });
      } else {
        toast.error("Token inválido");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const validate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whapify-proxy", { body: { action: "validate" } });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast[d?.valid ? "success" : "error"](d?.valid ? "Conexión válida ✓" : "Token inválido");
      qc.invalidateQueries({ queryKey: ["whapify-settings"] });
    },
  });

  const syncFlows = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whapify-proxy", { body: { action: "sync_flows" } });
      if (error) throw error;
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
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("reminder_settings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminder-settings"] }),
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
              Configuración Whapify
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
          <Label>{hasToken ? "Actualizar token" : "Token de Whapify"}</Label>
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
          <p className="text-sm text-muted-foreground">Asigna un Flow de Whapify a cada recordatorio</p>
        </div>

        {!isActive && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
            Conecta Whapify primero para poder seleccionar flows.
          </div>
        )}

        <div className="space-y-3">
          {reminders.map((r) => {
            const configured = Boolean(r.whapify_flow_id);
            return (
              <div key={r.id} className="p-4 rounded-xl border bg-secondary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {r.minutes_before >= 60 ? `${r.minutes_before / 60} hora${r.minutes_before / 60 > 1 ? "s" : ""}` : `${r.minutes_before} minutos`} antes
                    </p>
                    <p className="text-xs text-muted-foreground">Canal: Whapify · Tipo: {r.reminder_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {configured ? (
                      <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Configurado</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><AlertCircle className="w-3 h-3" /> Sin flow</Badge>
                    )}
                    <Switch
                      checked={r.active}
                      disabled={!configured}
                      onCheckedChange={(v) => updateReminder.mutate({ id: r.id, patch: { active: v } })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Flow de Whapify</Label>
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
      </div>
    </div>
  );
}
