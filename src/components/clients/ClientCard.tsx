import {
  Calendar,
  CreditCard,
  Edit,
  Eye,
  Hash,
  History,
  Mail,
  MessageSquare,
  Phone,
  Star,
  Clock,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityCard } from "@/components/shared/EntityCard";
import { calculateOverdueDays, getOverdueStatus, type Client } from "@/data/clients";
import type { PipelineStage } from "@/hooks/useCustomers";
import { cn } from "@/lib/utils";

interface ClientCardProps {
  client: Client;
  pipelineStages: PipelineStage[];
  onStageChange: (clientId: string, stageId: string) => void;
  onViewHistory: (client: Client) => void;
  onViewProfile: (client: Client) => void;
  onEdit: (client: Client) => void;
  onRegisterPayment: (client: Client) => void;
}

export function ClientCard({
  client,
  pipelineStages,
  onStageChange,
  onViewHistory,
  onViewProfile,
  onEdit,
  onRegisterPayment,
}: ClientCardProps) {
  return (
    <EntityCard
      avatar={
        <div className="relative">
          <img src={client.avatar} alt={client.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-border" />
          {client.vip && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-gold flex items-center justify-center shadow-gold">
              <Star className="w-3 h-3 text-primary-foreground fill-current" />
            </div>
          )}
        </div>
      }
      title={client.name}
      subtitle={`${client.visits} visitas`}
      badge={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <History className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            <DropdownMenuItem onClick={() => onViewHistory(client)} className="gap-2 cursor-pointer">
              <History className="w-4 h-4" />
              Ver Historial
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewProfile(client)} className="gap-2 cursor-pointer">
              <Eye className="w-4 h-4" />
              Ver Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(client)} className="gap-2 cursor-pointer">
              <Edit className="w-4 h-4" />
              Editar Cliente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hash className="w-4 h-4" />
          <span>ID: {client.identificationNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4" />
          {client.phone}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          Última visita: {client.lastVisit}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {client.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mb-4">
        <Select value={client.pipelineStageId ?? undefined} onValueChange={(stageId) => onStageChange(client.id, stageId)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Sin etapa" />
          </SelectTrigger>
          <SelectContent>
            {pipelineStages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {client.balance > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Saldo Pendiente</span>
            </div>
            <span className="text-lg font-bold text-destructive">${client.balance.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tiempo de mora</span>
            </div>
            {(() => {
              const overdueDays = calculateOverdueDays(client.balanceDueDate);
              const status = getOverdueStatus(overdueDays);
              return (
                <Badge variant="outline" className={cn("text-xs", status.color)}>
                  {status.label}
                </Badge>
              );
            })()}
          </div>
          <Button
            size="sm"
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onRegisterPayment(client)}
          >
            <CreditCard className="w-4 h-4" />
            Registrar Pago
          </Button>
        </div>
      )}

      <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Total gastado</p>
          <p className="text-lg font-bold text-primary">${client.totalSpent.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="gap-1" onClick={() => onViewHistory(client)}>
            <MessageSquare className="w-4 h-4" />
            Resumen IA
          </Button>
          <Button variant="outline" size="sm">
            Agendar Cita
          </Button>
        </div>
      </div>
    </EntityCard>
  );
}
