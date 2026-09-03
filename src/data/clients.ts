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
  identificationNumber: string;
}

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
