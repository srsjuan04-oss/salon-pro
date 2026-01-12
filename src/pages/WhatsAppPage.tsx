import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  MessageCircle, 
  Bot, 
  Clock,
  Send,
  CheckCheck,
  Settings,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const conversations = [
  {
    id: "1",
    name: "María García",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    lastMessage: "Perfecto, te espero mañana a las 10am",
    time: "Hace 5 min",
    unread: 0,
    isAI: false,
  },
  {
    id: "2",
    name: "Laura Martínez",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    lastMessage: "¿Tienen disponibilidad para manicure?",
    time: "Hace 15 min",
    unread: 2,
    isAI: true,
  },
  {
    id: "3",
    name: "Carlos Mendez",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    lastMessage: "Quiero agendar un corte de cabello",
    time: "Hace 30 min",
    unread: 0,
    isAI: true,
  },
  {
    id: "4",
    name: "Sofia Hernández",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    lastMessage: "Gracias por confirmar mi cita",
    time: "Hace 1 hora",
    unread: 0,
    isAI: false,
  },
];

const aiResponses = [
  { trigger: "Horarios", response: "Nuestro horario es de Lunes a Sábado de 9:00 AM a 8:00 PM" },
  { trigger: "Precios", response: "Te comparto nuestra lista de precios actualizada..." },
  { trigger: "Agendar", response: "¡Claro! ¿Para qué servicio y fecha te gustaría agendar?" },
  { trigger: "Ubicación", response: "Estamos ubicados en Av. Principal #123, Col. Centro" },
];

export default function WhatsAppPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">WhatsApp</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona conversaciones y automatiza respuestas con IA
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 border border-success/20">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-success">Conectado</span>
            </div>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-2 bg-card rounded-2xl border shadow-soft overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Conversaciones Recientes</h3>
            </div>
            
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="p-4 hover:bg-secondary/30 cursor-pointer transition-colors flex items-center gap-4"
                >
                  <div className="relative">
                    <img
                      src={conv.avatar}
                      alt={conv.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {conv.isAI && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-info flex items-center justify-center">
                        <Bot className="w-3 h-3 text-info-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{conv.name}</h4>
                      <span className="text-xs text-muted-foreground">{conv.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {conv.lastMessage}
                      </p>
                      {conv.unread > 0 ? (
                        <Badge className="gradient-gold text-primary-foreground">
                          {conv.unread}
                        </Badge>
                      ) : (
                        <CheckCheck className="w-4 h-4 text-info" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Settings */}
          <div className="space-y-4">
            {/* AI Status Card */}
            <div className="bg-card rounded-2xl border shadow-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Asistente IA</h3>
                    <p className="text-xs text-muted-foreground">Respuestas automáticas</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mensajes hoy</span>
                  <span className="font-semibold">47</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Respondidos por IA</span>
                  <span className="font-semibold text-info">32</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Citas agendadas</span>
                  <span className="font-semibold text-success">8</span>
                </div>
              </div>
            </div>

            {/* Quick Responses */}
            <div className="bg-card rounded-2xl border shadow-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Respuestas Rápidas</h3>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Zap className="w-3 h-3" />
                  Editar
                </Button>
              </div>
              
              <div className="space-y-3">
                {aiResponses.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-medium">{item.trigger}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.response}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule Settings */}
            <div className="bg-card rounded-2xl border shadow-soft p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Horario IA</h3>
                  <p className="text-xs text-muted-foreground">Fuera de horario laboral</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                <span className="text-sm">Activar fuera de horario</span>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
