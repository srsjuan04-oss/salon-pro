import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Conversation = Tables<"whatsapp_conversations"> & {
  customer: Tables<"customers"> | null;
  messages: Tables<"whatsapp_messages">[];
};

export function useWhatsAppConversations() {
  return useQuery({
    queryKey: ["whatsapp-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select(`
          *,
          customer:customers(*),
          messages:whatsapp_messages(*)
        `)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      message,
      conversationId,
    }: {
      phoneNumber: string;
      message: string;
      conversationId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          phone_number: phoneNumber,
          message,
          conversation_id: conversationId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    },
  });
}
