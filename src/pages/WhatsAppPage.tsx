import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw } from "lucide-react";
import { useWhatsAppConversations, Conversation } from "@/hooks/useWhatsAppConversations";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { WhatsAppStats } from "@/components/whatsapp/WhatsAppStats";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function WhatsAppPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { data: conversations, isLoading, refetch } = useWhatsAppConversations();
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
          queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">WhatsApp</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona conversaciones y automatiza respuestas con IA
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 border border-success/20">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-success">Conectado</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1 bg-card rounded-2xl border shadow-soft overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Conversaciones</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {conversations?.length || 0} total
              </p>
            </div>
            <ConversationList
              conversations={conversations || []}
              selectedId={selectedConversation?.id || null}
              onSelect={setSelectedConversation}
              isLoading={isLoading}
            />
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2 bg-card rounded-2xl border shadow-soft overflow-hidden h-[600px]">
            <ChatWindow conversation={selectedConversation} />
          </div>

          {/* Stats Sidebar */}
          <div className="lg:col-span-1">
            <WhatsAppStats conversations={conversations || []} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
