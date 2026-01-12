import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  Calendar,
  MoreVertical,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  visits: number;
  lastVisit: string;
  totalSpent: number;
  vip: boolean;
  tags: string[];
}

const clients: Client[] = [
  {
    id: "1",
    name: "María García",
    email: "maria.garcia@email.com",
    phone: "+52 55 1234 5678",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    visits: 24,
    lastVisit: "Hace 3 días",
    totalSpent: 4850,
    vip: true,
    tags: ["Coloración", "Tratamientos"]
  },
  {
    id: "2",
    name: "Laura Martínez",
    email: "laura.m@email.com",
    phone: "+52 55 2345 6789",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    visits: 12,
    lastVisit: "Hace 1 semana",
    totalSpent: 2300,
    vip: false,
    tags: ["Manicure", "Pedicure"]
  },
  {
    id: "3",
    name: "Sofia Hernández",
    email: "sofia.h@email.com",
    phone: "+52 55 3456 7890",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    visits: 18,
    lastVisit: "Hoy",
    totalSpent: 3600,
    vip: true,
    tags: ["Corte", "Keratina"]
  },
  {
    id: "4",
    name: "Elena Pérez",
    email: "elena.p@email.com",
    phone: "+52 55 4567 8901",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    visits: 8,
    lastVisit: "Hace 2 semanas",
    totalSpent: 1200,
    vip: false,
    tags: ["Corte"]
  },
  {
    id: "5",
    name: "Rosa Mendoza",
    email: "rosa.m@email.com",
    phone: "+52 55 5678 9012",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150",
    visits: 32,
    lastVisit: "Ayer",
    totalSpent: 6200,
    vip: true,
    tags: ["Coloración", "Extensiones"]
  },
];

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tu base de clientes • {clients.length} clientes totales
            </p>
          </div>
          <Button className="gradient-gold shadow-gold gap-2">
            <UserPlus className="w-4 h-4" />
            Agregar Cliente
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-2xl border shadow-soft p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Todos</Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Star className="w-3 h-3 text-primary" />
                VIP
              </Button>
              <Button variant="outline" size="sm">Recientes</Button>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client, index) => (
            <div
              key={client.id}
              className={cn(
                "bg-card rounded-2xl border shadow-soft p-5 transition-all duration-300",
                "hover:shadow-medium hover:-translate-y-1 cursor-pointer",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={client.avatar}
                      alt={client.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
                    />
                    {client.vip && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                        <Star className="w-3 h-3 text-primary-foreground fill-current" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">{client.visits} visitas</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 mb-4">
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

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total gastado</p>
                  <p className="text-lg font-bold text-primary">${client.totalSpent.toLocaleString()}</p>
                </div>
                <Button variant="outline" size="sm">Agendar Cita</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
