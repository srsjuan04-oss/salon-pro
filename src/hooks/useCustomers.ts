import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
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

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, color")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("tags")
        .insert({ name } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useCustomerTags(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-tags", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_tags")
        .select("tag_id, tags(id, name, color)")
        .eq("customer_id", customerId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.tags as Tag);
    },
  });
}

export function useSetCustomerTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, tagId, add }: { customerId: string; tagId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from("customer_tags").insert({ customer_id: customerId, tag_id: tagId } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customer_tags")
          .delete()
          .eq("customer_id", customerId)
          .eq("tag_id", tagId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer-tags", vars.customerId] });
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
