import { Bot, CheckCheck, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useWhatsAppConversations";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-1">Sin conversaciones</h3>
        <p className="text-sm text-muted-foreground">
          Las conversaciones aparecerán aquí cuando recibas mensajes
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="divide-y divide-border">
        {conversations.map((conv) => {
          const unreadCount = conv.messages?.filter(
            (m) => m.direction === "inbound" && m.status !== "read"
          ).length || 0;
          
          const timeAgo = conv.last_message_at
            ? formatDistanceToNow(new Date(conv.last_message_at), {
                addSuffix: true,
                locale: es,
              })
            : "";

          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                "p-4 hover:bg-secondary/30 cursor-pointer transition-colors flex items-center gap-4",
                selectedId === conv.id && "bg-secondary/50"
              )}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-lg font-semibold text-primary">
                  {conv.customer?.name?.charAt(0)?.toUpperCase() || conv.phone_number.slice(-2)}
                </div>
                {conv.status === "active" && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium truncate">
                    {conv.customer?.name || conv.phone_number}
                  </h4>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {timeAgo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground truncate flex-1">
                    {conv.last_message || "Nueva conversación"}
                  </p>
                  {unreadCount > 0 ? (
                    <Badge className="gradient-gold text-primary-foreground">
                      {unreadCount}
                    </Badge>
                  ) : (
                    <CheckCheck className="w-4 h-4 text-info flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
