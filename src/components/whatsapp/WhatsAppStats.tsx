import { Bot, Clock, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Conversation } from "@/hooks/useWhatsAppConversations";

interface WhatsAppStatsProps {
  conversations: Conversation[];
}

const quickResponses = [
  { trigger: "Horarios", response: "Nuestro horario es de Lunes a Sábado de 9:00 AM a 8:00 PM" },
  { trigger: "Precios", response: "Te comparto nuestra lista de precios actualizada..." },
  { trigger: "Agendar", response: "¡Claro! ¿Para qué servicio y fecha te gustaría agendar?" },
  { trigger: "Ubicación", response: "Estamos ubicados en Av. Principal #123, Col. Centro" },
];

export function WhatsAppStats({ conversations }: WhatsAppStatsProps) {
  const totalMessages = conversations.reduce(
    (acc, conv) => acc + (conv.messages?.length || 0),
    0
  );

  const outboundMessages = conversations.reduce(
    (acc, conv) =>
      acc + (conv.messages?.filter((m) => m.direction === "outbound").length || 0),
    0
  );

  const activeConversations = conversations.filter(
    (c) => c.status === "active"
  ).length;

  return (
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
            <span className="text-sm">Conversaciones activas</span>
            <span className="font-semibold">{activeConversations}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Total mensajes</span>
            <span className="font-semibold text-info">{totalMessages}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Mensajes enviados</span>
            <span className="font-semibold text-success">{outboundMessages}</span>
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
          {quickResponses.map((item, index) => (
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
  );
}
