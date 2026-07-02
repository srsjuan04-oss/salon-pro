import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleSettingsCard } from "@/components/settings/ScheduleSettingsCard";
import { ServicesManager } from "@/components/settings/ServicesManager";
import { WhapifySettingsCard } from "@/components/settings/WhapifySettingsCard";
import {
  Building2,
  Bell,
  Calendar,
  CreditCard,
  Scissors,
  MessageSquare,
  Server,
  Save
} from "lucide-react";


export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las preferencias de tu salón
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-secondary/50 p-1">
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Scissors className="w-4 h-4" />
              Servicios
            </TabsTrigger>
            <TabsTrigger value="whapify" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Whapify
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Facturación
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whapify" className="space-y-6">
            <WhapifySettingsCard />
          </TabsContent>


          <TabsContent value="services" className="space-y-6">
            <ServicesManager />
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-6">
              <h3 className="text-lg font-semibold">Información del Negocio</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Salón</Label>
                  <Input defaultValue="SalonPro Beauty Studio" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input defaultValue="+52 55 1234 5678" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue="contacto@salonpro.com" />
                </div>
                <div className="space-y-2">
                  <Label>Sitio Web</Label>
                  <Input defaultValue="www.salonpro.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input defaultValue="Av. Principal #123, Col. Centro, Ciudad de México" />
              </div>

              <Button className="gradient-gold shadow-gold gap-2">
                <Save className="w-4 h-4" />
                Guardar Cambios
              </Button>
            </div>

            <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-6">
              <h3 className="text-lg font-semibold">Horario de Operación</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora de Apertura</Label>
                  <Input type="time" defaultValue="09:00" />
                </div>
                <div className="space-y-2">
                  <Label>Hora de Cierre</Label>
                  <Input type="time" defaultValue="20:00" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                <div>
                  <p className="font-medium">Abrir los Domingos</p>
                  <p className="text-sm text-muted-foreground">Permitir citas los domingos</p>
                </div>
                <Switch />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-4">
              <h3 className="text-lg font-semibold">Preferencias de Notificación</h3>
              
              {[
                { title: "Nuevas citas", desc: "Recibir notificación cuando un cliente agenda" },
                { title: "Cancelaciones", desc: "Alertas cuando se cancela una cita" },
                { title: "Recordatorios", desc: "Enviar recordatorios automáticos a clientes" },
                { title: "Resumen diario", desc: "Recibir resumen de ventas al final del día" },
                { title: "Mensajes WhatsApp", desc: "Notificar nuevos mensajes sin respuesta" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={i < 3} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <ScheduleSettingsCard />

            <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-6">
              <h3 className="text-lg font-semibold">Integraciones de Calendario</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-8 h-8" />
                    <div>
                      <p className="font-medium">Google Calendar</p>
                      <p className="text-sm text-muted-foreground">Sincroniza citas con Google</p>
                    </div>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-foreground flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-background" />
                    </div>
                    <div>
                      <p className="font-medium">Apple Calendar</p>
                      <p className="text-sm text-muted-foreground">Sincroniza con iCloud</p>
                    </div>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
              </div>
            </div>
          </TabsContent>


          <TabsContent value="billing" className="space-y-6">
            <div className="bg-card rounded-2xl border shadow-soft p-6 space-y-6">
              <h3 className="text-lg font-semibold">Plan Actual</h3>
              
              <div className="p-4 rounded-xl gradient-gold">
                <div className="flex items-center justify-between text-primary-foreground">
                  <div>
                    <p className="text-sm opacity-80">Plan Profesional</p>
                    <p className="text-2xl font-bold">$49/mes</p>
                  </div>
                  <Button variant="secondary">Cambiar Plan</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tasa de comisión del staff (%)</Label>
                <Input type="number" defaultValue="15" />
                <p className="text-xs text-muted-foreground">
                  Este porcentaje se aplicará automáticamente a las ventas
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
