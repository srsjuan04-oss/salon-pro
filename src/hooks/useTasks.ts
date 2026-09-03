import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Task {
  id: string;
  customer_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  assigned_to: string | null;
  status: "pending" | "done" | "cancelled";
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  customers?: { name: string } | null;
}

export function useTasks(customerId?: string) {
  return useQuery({
    queryKey: ["tasks", customerId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("tasks" as any)
        .select("*, customers(name)")
        .order("due_at", { ascending: true, nullsFirst: false });
      if (customerId) query = query.eq("customer_id", customerId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as Task[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: { title: string; description?: string; due_at?: string | null; customer_id?: string | null }) => {
      const { data, error } = await supabase
        .from("tasks" as any)
        .insert(task as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Task["status"] }) => {
      const { error } = await supabase
        .from("tasks" as any)
        .update({ status, completed_at: status === "done" ? new Date().toISOString() : null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
