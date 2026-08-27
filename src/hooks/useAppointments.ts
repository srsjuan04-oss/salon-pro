import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

// Best-effort push to the org's connected Google Calendar. Never throws: a sync
// failure (not connected, expired grant, Google API error) must not block the
// appointment flow — it's a soft background effect.
function syncAppointmentToGoogle(appointmentId: string) {
  supabase.functions
    .invoke("sync-appointment-to-google", { body: { appointment_id: appointmentId } })
    .catch((e) => console.warn("Google Calendar sync failed", e));
}

export type Appointment = Tables<"appointments"> & {
  customer: Tables<"customers"> | null;
  barber: Tables<"barbers"> | null;
  service: Tables<"services"> | null;
};

export function useAppointments(date?: string) {
  return useQuery({
    queryKey: ["appointments", date],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          customer:customers(*),
          barber:barbers(*),
          service:services(*)
        `)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (date) {
        query = query.eq("appointment_date", date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Appointment[];
    },
  });
}

export function useBarbers() {
  return useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: {
      customer_id: string;
      barber_id: string;
      service_id: string;
      appointment_date: string;
      start_time: string;
      end_time: string;
      notes?: string;
      status?: string;
      source?: string;
    }) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert(appointment as any)
        .select(`
          *,
          customer:customers(*),
          barber:barbers(*),
          service:services(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      syncAppointmentToGoogle(data.id);
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      status?: string;
      appointment_date?: string;
      start_time?: string;
      end_time?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      syncAppointmentToGoogle(data.id);
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: {
      name: string;
      phone: string;
      email?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customer as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
