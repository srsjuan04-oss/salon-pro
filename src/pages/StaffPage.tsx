import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Star,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  phone: string;
  sales: number;
  target: number;
  commission: number;
  commissionRate: number;
  appointmentsToday: number;
  rating: number;
  status: "available" | "busy" | "break";
  specialties: string[];
}

const staff: StaffMember[] = [
  {
    id: "1",
    name: "Ana López",
    role: "Estilista Senior",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
    email: "ana.lopez@salon.com",
    phone: "+52 55 1111 2222",
    sales: 4850,
    target: 5000,
    commission: 727.50,
    commissionRate: 15,
    appointmentsToday: 6,
    rating: 4.9,
    status: "busy",
    specialties: ["Coloración", "Corte", "Tratamientos"]
  },
  {
    id: "2",
    name: "Miguel Santos",
    role: "Barbero",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    email: "miguel.s@salon.com",
    phone: "+52 55 2222 3333",
    sales: 3200,
    target: 4000,
    commission: 480.00,
    commissionRate: 15,
    appointmentsToday: 8,
    rating: 4.7,
    status: "available",
    specialties: ["Corte masculino", "Barba", "Fade"]
  },
  {
    id: "3",
    name: "Carmen Ruiz",
    role: "Manicurista",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    email: "carmen.r@salon.com",
    phone: "+52 55 3333 4444",
    sales: 2100,
    target: 2500,
    commission: 315.00,
    commissionRate: 15,
    appointmentsToday: 5,
    rating: 4.8,
    status: "break",
    specialties: ["Manicure", "Pedicure", "Nail Art"]
  },
  {
    id: "4",
    name: "Diego Fernández",
    role: "Estilista",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    email: "diego.f@salon.com",
    phone: "+52 55 4444 5555",
    sales: 2800,
    target: 3500,
    commission: 420.00,
    commissionRate: 15,
    appointmentsToday: 4,
    rating: 4.6,
    status: "available",
    specialties: ["Corte", "Peinados", "Extensiones"]
  },
];

const statusStyles = {
  available: { color: "bg-success", label: "Disponible" },
  busy: { color: "bg-primary", label: "Ocupado" },
  break: { color: "bg-muted-foreground", label: "Descanso" },
};

export default function StaffPage() {
  const totalSales = staff.reduce((acc, s) => acc + s.sales, 0);
  const totalCommissions = staff.reduce((acc, s) => acc + s.commission, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Staff</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tu equipo y sus comisiones
            </p>
          </div>
          <Button className="gradient-gold shadow-gold gap-2">
            <UserPlus className="w-4 h-4" />
            Agregar Miembro
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas Totales</p>
                <p className="text-2xl font-bold">${totalSales.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comisiones a Pagar</p>
                <p className="text-2xl font-bold">${totalCommissions.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border shadow-soft p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Citas Hoy</p>
                <p className="text-2xl font-bold">
                  {staff.reduce((acc, s) => acc + s.appointmentsToday, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {staff.map((member, index) => {
            const progress = (member.sales / member.target) * 100;
            return (
              <div
                key={member.id}
                className={cn(
                  "bg-card rounded-2xl border shadow-soft p-6 transition-all duration-300",
                  "hover:shadow-medium animate-slide-up"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
                      />
                      <span 
                        className={cn(
                          "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card",
                          statusStyles[member.status].color
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                        <span className="text-sm font-medium">{member.rating}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {statusStyles[member.status].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {member.specialties.map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ventas este mes</span>
                    <span className="font-semibold">${member.sales.toLocaleString()}</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progreso hacia meta</span>
                      <span className="text-primary font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Meta: ${member.target.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Comisión ({member.commissionRate}%)</p>
                      <p className="text-lg font-bold text-success">${member.commission.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Citas hoy</p>
                      <p className="text-lg font-bold">{member.appointmentsToday}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
