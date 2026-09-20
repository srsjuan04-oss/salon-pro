import { History, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCustomerNotes } from "@/hooks/useCustomers";
import type { Client } from "@/data/clients";

interface ClientHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  cancellation: "Cancelación",
  cancelacion: "Cancelación",
  chat_summary: "Resumen de chat",
  appointment_created: "Cita agendada",
  appointment_rescheduled: "Cita reagendada",
};

export function ClientHistoryDialog({ open, onOpenChange, client }: ClientHistoryDialogProps) {
  const { data: notes = [], isLoading } = useCustomerNotes(client?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Historial de Citas - {client?.name}
          </DialogTitle>
        </DialogHeader>

        {client && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
              <img src={client.avatar} alt={client.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-border" />
              <div className="flex-1">
                <p className="font-semibold">{client.name}</p>
                <p className="text-sm text-muted-foreground">ID: {client.identificationNumber}</p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Conversaciones y notas
              </p>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando notas...</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay notas de conversaciones para este cliente</p>
              ) : (
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 rounded-lg border bg-secondary/30">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {NOTE_TYPE_LABELS[note.note_type] ?? "Nota"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.occurred_at).toLocaleString("es-ES", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-line">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">Canal: {note.source}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
