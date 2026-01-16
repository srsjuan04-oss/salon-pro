export interface Client {
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
  balance: number;
  balanceDueDate?: string;
  identificationNumber: string; // Número de identificación (cédula, DNI, etc.)
}

export const initialClients: Client[] = [
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
    tags: ["Coloración", "Tratamientos"],
    balance: 0,
    identificationNumber: "1234567890",
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
    tags: ["Manicure", "Pedicure"],
    balance: 850,
    balanceDueDate: "2025-12-20",
    identificationNumber: "2345678901",
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
    tags: ["Corte", "Keratina"],
    balance: 1200,
    balanceDueDate: "2026-01-05",
    identificationNumber: "3456789012",
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
    tags: ["Corte"],
    balance: 2500,
    balanceDueDate: "2025-11-15",
    identificationNumber: "4567890123",
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
    tags: ["Coloración", "Extensiones"],
    balance: 0,
    identificationNumber: "5678901234",
  },
];

// Helper functions
export const calculateOverdueDays = (dueDate?: string): number => {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export const getOverdueStatus = (days: number): { label: string; color: string } => {
  if (days === 0) return { label: "Al corriente", color: "bg-green-500/10 text-green-600 border-green-500/20" };
  if (days <= 15) return { label: `${days} días`, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" };
  if (days <= 30) return { label: `${days} días`, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" };
  return { label: `${days} días`, color: "bg-destructive/10 text-destructive border-destructive/20" };
};
