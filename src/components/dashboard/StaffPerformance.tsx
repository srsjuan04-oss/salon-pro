import { Progress } from "@/components/ui/progress";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  sales: number;
  target: number;
  commission: number;
}

const staffData: StaffMember[] = [
  {
    id: "1",
    name: "Ana López",
    role: "Estilista Senior",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100",
    sales: 4850,
    target: 5000,
    commission: 727.50
  },
  {
    id: "2",
    name: "Miguel Santos",
    role: "Barbero",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    sales: 3200,
    target: 4000,
    commission: 480.00
  },
  {
    id: "3",
    name: "Carmen Ruiz",
    role: "Manicurista",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100",
    sales: 2100,
    target: 2500,
    commission: 315.00
  },
];

export function StaffPerformance() {
  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Rendimiento del Staff</h3>
          <p className="text-sm text-muted-foreground">Ventas y comisiones de este mes</p>
        </div>
        <button className="text-sm text-primary font-medium hover:underline">
          Ver detalles
        </button>
      </div>
      
      <div className="space-y-5">
        {staffData.map((staff, index) => {
          const progress = (staff.sales / staff.target) * 100;
          return (
            <div 
              key={staff.id}
              className="space-y-3"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={staff.avatar} 
                  alt={staff.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                />
                <div className="flex-1">
                  <p className="font-medium">{staff.name}</p>
                  <p className="text-xs text-muted-foreground">{staff.role}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">${staff.sales.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Comisión: ${staff.commission.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress.toFixed(0)}% del objetivo</span>
                  <span>Meta: ${staff.target.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
