import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Send, Trash2, RefreshCw, Bell, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useWhatsAppTemplates, useCreateTemplate, useDeleteTemplate, useSyncTemplateToMeta } from "@/hooks/useWhatsAppTemplates";
import { useNotificationFlows, useCreateFlow, useDeleteFlow, useToggleFlow } from "@/hooks/useNotificationFlows";

const TRIGGER_OPTIONS = [
  { value: "-1440", label: "1 día antes", minutes: -1440 },
  { value: "-60", label: "1 hora antes", minutes: -60 },
  { value: "-30", label: "30 minutos antes", minutes: -30 },
  { value: "60", label: "1 hora después", minutes: 60 },
];

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "UTILITY",
    body_text: "",
    header_type: "NONE",
    header_content: "",
    footer_text: "",
  });

  // Flow form state
  const [flowForm, setFlowForm] = useState({
    name: "",
    trigger_minutes: "-60",
    custom_message: "",
  });

  const { data: templates, isLoading: templatesLoading } = useWhatsAppTemplates();
  const { data: flows, isLoading: flowsLoading } = useNotificationFlows();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const syncTemplate = useSyncTemplateToMeta();
  const createFlow = useCreateFlow();
  const deleteFlow = useDeleteFlow();
  const toggleFlow = useToggleFlow();

  const handleCreateTemplate = async () => {
    if (!templateForm.name || !templateForm.body_text) {
      toast.error("Nombre y mensaje son requeridos");
      return;
    }

    try {
      await createTemplate.mutateAsync({
        name: templateForm.name,
        category: templateForm.category,
        language: "es_MX",
        body_text: templateForm.body_text,
        header_type: templateForm.header_type !== "NONE" ? templateForm.header_type : null,
        header_content: templateForm.header_content || null,
        footer_text: templateForm.footer_text || null,
        buttons: null,
      });
      toast.success("Plantilla creada");
      setTemplateDialogOpen(false);
      setTemplateForm({ name: "", category: "UTILITY", body_text: "", header_type: "NONE", header_content: "", footer_text: "" });
    } catch (error) {
      toast.error("Error al crear plantilla");
    }
  };

  const handleSyncTemplate = async (templateId: string) => {
    try {
      await syncTemplate.mutateAsync(templateId);
      toast.success("Plantilla enviada a Meta para aprobación");
    } catch (error: any) {
      toast.error(error.message || "Error al sincronizar con Meta");
    }
  };

  const handleCreateFlow = async () => {
    if (!flowForm.name || !flowForm.custom_message) {
      toast.error("Nombre y mensaje son requeridos");
      return;
    }

    try {
      await createFlow.mutateAsync({
        name: flowForm.name,
        trigger_type: parseInt(flowForm.trigger_minutes) < 0 ? "before_appointment" : "after_appointment",
        trigger_minutes: parseInt(flowForm.trigger_minutes),
        template_id: null,
        custom_message: flowForm.custom_message,
        is_active: true,
      });
      toast.success("Flujo de notificación creado");
      setFlowDialogOpen(false);
      setFlowForm({ name: "", trigger_minutes: "-60", custom_message: "" });
    } catch (error) {
      toast.error("Error al crear flujo");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Aprobada</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      case "rejected":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Rechazada</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Borrador</Badge>;
    }
  };

  const getTriggerLabel = (minutes: number) => {
    const option = TRIGGER_OPTIONS.find(o => o.minutes === minutes);
    return option?.label || `${Math.abs(minutes)} min ${minutes < 0 ? "antes" : "después"}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Automatización WhatsApp</h1>
          <p className="text-muted-foreground">Gestiona plantillas y flujos de notificación</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Plantillas
            </TabsTrigger>
            <TabsTrigger value="flows" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Flujos
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Crea plantillas de mensajes para sincronizar con Meta WhatsApp Business
              </p>
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Plantilla
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Crear Plantilla</DialogTitle>
                    <DialogDescription>
                      Las plantillas deben ser aprobadas por Meta antes de usarse
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="recordatorio_cita"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select
                        value={templateForm.category}
                        onValueChange={(v) => setTemplateForm({ ...templateForm, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTILITY">Utilidad</SelectItem>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="AUTHENTICATION">Autenticación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mensaje</Label>
                      <Textarea
                        value={templateForm.body_text}
                        onChange={(e) => setTemplateForm({ ...templateForm, body_text: e.target.value })}
                        placeholder="Hola {{cliente}}, te recordamos tu cita el {{fecha}} a las {{hora}} con {{barbero}}."
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables: {"{{cliente}}"}, {"{{fecha}}"}, {"{{hora}}"}, {"{{barbero}}"}, {"{{servicio}}"}, {"{{precio}}"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Pie de mensaje (opcional)</Label>
                      <Input
                        value={templateForm.footer_text}
                        onChange={(e) => setTemplateForm({ ...templateForm, footer_text: e.target.value })}
                        placeholder="CharlIA Barbería"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>
                      {createTemplate.isPending ? "Creando..." : "Crear Plantilla"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {templatesLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay plantillas creadas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {templates?.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(template.meta_status)}
                        </div>
                      </div>
                      <CardDescription>
                        {template.category} • {template.language}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm bg-muted p-3 rounded-md mb-4 whitespace-pre-wrap">
                        {template.body_text}
                      </p>
                      {template.meta_rejection_reason && (
                        <p className="text-sm text-red-500 mb-4">
                          Motivo de rechazo: {template.meta_rejection_reason}
                        </p>
                      )}
                      <div className="flex gap-2">
                        {template.meta_status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => handleSyncTemplate(template.id)}
                            disabled={syncTemplate.isPending}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Enviar a Meta
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            deleteTemplate.mutate(template.id);
                            toast.success("Plantilla eliminada");
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Flows Tab */}
          <TabsContent value="flows" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Configura notificaciones automáticas antes y después de las citas
              </p>
              <Dialog open={flowDialogOpen} onOpenChange={setFlowDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Flujo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Crear Flujo de Notificación</DialogTitle>
                    <DialogDescription>
                      Define cuándo y qué mensaje enviar automáticamente
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre del flujo</Label>
                      <Input
                        value={flowForm.name}
                        onChange={(e) => setFlowForm({ ...flowForm, name: e.target.value })}
                        placeholder="Recordatorio 1 hora antes"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cuándo enviar</Label>
                      <Select
                        value={flowForm.trigger_minutes}
                        onValueChange={(v) => setFlowForm({ ...flowForm, trigger_minutes: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mensaje</Label>
                      <Textarea
                        value={flowForm.custom_message}
                        onChange={(e) => setFlowForm({ ...flowForm, custom_message: e.target.value })}
                        placeholder="Hola {{cliente}}, te recordamos que tienes una cita hoy a las {{hora}} con {{barbero}}. ¡Te esperamos! 💈"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables: {"{{cliente}}"}, {"{{fecha}}"}, {"{{hora}}"}, {"{{barbero}}"}, {"{{servicio}}"}, {"{{precio}}"}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setFlowDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateFlow} disabled={createFlow.isPending}>
                      {createFlow.isPending ? "Creando..." : "Crear Flujo"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {flowsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : flows?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay flujos de notificación</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {flows?.map((flow) => (
                  <Card key={flow.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">{flow.name}</CardTitle>
                          <Badge variant={flow.is_active ? "default" : "secondary"}>
                            {flow.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <Switch
                          checked={flow.is_active}
                          onCheckedChange={(checked) => {
                            toggleFlow.mutate({ id: flow.id, is_active: checked });
                            toast.success(checked ? "Flujo activado" : "Flujo desactivado");
                          }}
                        />
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {getTriggerLabel(flow.trigger_minutes)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm bg-muted p-3 rounded-md mb-4 whitespace-pre-wrap">
                        {flow.template?.body_text || flow.custom_message}
                      </p>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          deleteFlow.mutate(flow.id);
                          toast.success("Flujo eliminado");
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card className="border-dashed">
              <CardContent className="py-6">
                <h4 className="font-medium mb-2">⚙️ Configurar CRON Job</h4>
                <p className="text-sm text-muted-foreground">
                  Para que los flujos se ejecuten automáticamente, necesitas configurar un cron job que llame a la función <code className="bg-muted px-1 rounded">process-notifications</code> cada minuto.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
