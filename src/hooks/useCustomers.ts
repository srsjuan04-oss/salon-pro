import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/data/clients";

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

export interface CustomerPayment {
  id: string;
  customer_id: string;
  amount: number;
  method: string;
  note: string | null;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  note_type: string;
  source: string;
  occurred_at: string;
}

/**
 * Lista de clientes con sus métricas derivadas (visitas, total gastado,
 * última visita, tags de servicios) calculadas a partir de sus citas no
 * canceladas. Antes vivía como loadClients() inline en ClientsPage.tsx.
 */
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<Client[]> => {
      const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("id, name, email, phone, created_at, identification_number, balance, balance_due_date, pipeline_stage_id")
        .order("created_at", { ascending: false });
      if (customersError) throw customersError;

      const { data: appts, error: apptsError } = await supabase
        .from("appointments")
        .select("customer_id, appointment_date, status, service_id, services(name, price)");
      if (apptsError) throw apptsError;

      const apptsByCustomer = new Map<string, any[]>();
      (appts ?? []).forEach((a: any) => {
        const arr = apptsByCustomer.get(a.customer_id) ?? [];
        arr.push(a);
        apptsByCustomer.set(a.customer_id, arr);
      });

      return (customers ?? []).map((c: any): Client => {
        const list = apptsByCustomer.get(c.id) ?? [];
        const valid = list.filter((a) => a.status !== "cancelled");
        const totalSpent = valid.reduce((s, a) => s + (Number(a.services?.price) || 0), 0);
        const dates = valid.map((a) => a.appointment_date).sort().reverse();
        const last = dates[0];
        const tags = Array.from(new Set(valid.map((a: any) => a.services?.name).filter(Boolean))).slice(0, 3) as string[];
        return {
          id: c.id,
          name: c.name,
          email: c.email ?? "",
          phone: c.phone ?? "",
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
          visits: valid.length,
          lastVisit: last
            ? new Date(last).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
            : "Sin visitas",
          totalSpent,
          vip: valid.length >= 10,
          tags,
          balance: Number(c.balance) || 0,
          balanceDueDate: c.balance_due_date ?? undefined,
          identificationNumber: c.identification_number ?? "",
          pipelineStageId: c.pipeline_stage_id,
          createdAt: c.created_at,
        };
      });
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email: string; phone: string; identificationNumber?: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: input.name,
          email: input.email,
          phone: input.phone,
          identification_number: input.identificationNumber || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function usePipelineStages() {
  return useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id, name, position")
        .order("position");
      if (error) throw error;
      return data as PipelineStage[];
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      email?: string | null;
      phone?: string;
      identification_number?: string | null;
      pipeline_stage_id?: string | null;
      source?: string | null;
      balance_due_date?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useCustomerPayments(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-payments", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_payments")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomerPayment[];
    },
  });
}

export function useRegisterPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, amount, method, note }: { customerId: string; amount: number; method: string; note?: string }) => {
      const { data, error } = await supabase.rpc("register_customer_payment", {
        p_customer_id: customerId,
        p_amount: amount,
        p_method: method,
        p_note: note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["customer-payments", vars.customerId] });
    },
  });
}

export function useCustomerNotes(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-notes", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_notes" as any)
        .select("*")
        .eq("customer_id", customerId!)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as CustomerNote[];
    },
  });
}

export function useAddCustomerNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, content }: { customerId: string; content: string }) => {
      const { error } = await supabase.from("customer_notes" as any).insert({
        customer_id: customerId,
        content,
        note_type: "manual",
        source: "staff",
      } as any);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer-notes", vars.customerId] });
    },
  });
}
