import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationFlow {
  id: string;
  name: string;
  trigger_type: string;
  trigger_minutes: number;
  template_id: string | null;
  custom_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  template?: {
    name: string;
    body_text: string;
  } | null;
}

export function useNotificationFlows() {
  return useQuery({
    queryKey: ["notification-flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_flows")
        .select(`
          *,
          template:whatsapp_templates(name, body_text)
        `)
        .order("trigger_minutes", { ascending: true });

      if (error) throw error;
      return data as NotificationFlow[];
    },
  });
}

export function useCreateFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flow: Omit<NotificationFlow, "id" | "created_at" | "updated_at" | "template">) => {
      const { data, error } = await supabase
        .from("notification_flows")
        .insert(flow as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-flows"] });
    },
  });
}

export function useUpdateFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, template: _t, ...updates }: Partial<NotificationFlow> & { id: string }) => {
      const { data, error } = await supabase
        .from("notification_flows")
        .update(updates)
        .eq("id", id)
        .select()
        .single();


      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-flows"] });
    },
  });
}

export function useDeleteFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_flows")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-flows"] });
    },
  });
}

export function useToggleFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("notification_flows")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-flows"] });
    },
  });
}
