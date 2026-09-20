import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  description: string;
  category: string;
  date: string;
  amount: number;
  paymentMethod: string;
  type: "fixed" | "variable";
}

/**
 * Antes vivía como loadExpenses() inline en ExpensesPage.tsx con su propio
 * useState/useCallback/useEffect.
 */
export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id,
        description: e.description,
        category: e.category,
        date: e.expense_date,
        amount: Number(e.amount),
        paymentMethod: e.payment_method ?? "",
        type: e.type,
      }));
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: {
      description: string;
      category: string;
      amount: number;
      paymentMethod: string;
      type: "fixed" | "variable";
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({
        description: expense.description,
        category: expense.category,
        expense_date: format(new Date(), "yyyy-MM-dd"),
        amount: expense.amount,
        payment_method: expense.paymentMethod || null,
        type: expense.type,
        source: "manual",
        created_by: userData.user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
