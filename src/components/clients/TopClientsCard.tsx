import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Client } from "@/data/clients";

interface TopClientsCardProps {
  clients: Client[];
}

export function TopClientsCard({ clients }: TopClientsCardProps) {
  const topClients = [...clients]
    .filter((c) => c.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  if (topClients.length === 0) return null;

  return (
    <Card className="bg-card rounded-2xl border shadow-soft">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/10">
              <Trophy className="w-5 h-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg">Mejores Clientes</CardTitle>
              <p className="text-sm text-muted-foreground">Top {topClients.length} por facturación</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topClients.map((client, index) => (
            <div
              key={client.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  index === 0
                    ? "bg-yellow-500/20 text-yellow-600"
                    : index === 1
                      ? "bg-gray-400/20 text-gray-500"
                      : index === 2
                        ? "bg-orange-400/20 text-orange-500"
                        : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </div>
              <img src={client.avatar} alt={client.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-border" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{client.name}</p>
                <p className="text-xs text-muted-foreground">{client.visits} visitas</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-success">${client.totalSpent.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
