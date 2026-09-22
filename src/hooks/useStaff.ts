import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";

const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Centraliza las queries y mutations que StaffPage.tsx ya hacía con
 * react-query pero inline en la página en vez de en un hook de dominio,
 * a diferencia de useAppointments.ts/useCustomers.ts.
 */
export function useAllBarbers() {
  return useQuery({
    queryKey: ["barbers-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useStaffAppointments(range: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ["staff-appointments", fmtDate(range.from), fmtDate(range.to)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, barber_id, status, appointment_date, service:services(name, price)")
        .gte("appointment_date", fmtDate(range.from))
        .lte("appointment_date", fmtDate(range.to));
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useTodayStaffAppointments() {
  return useQuery({
    queryKey: ["staff-appointments-today", fmtDate(new Date())],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, barber_id, status")
        .eq("appointment_date", fmtDate(new Date()));
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; email: string | null; phone: string | null; specialty: string | null }) => {
      const { error } = await supabase.from("barbers").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-all"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export function useUpdateBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string; name: string; email: string | null; phone: string | null; specialty: string | null }) => {
      const { error } = await supabase.from("barbers").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-all"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export function useToggleBarberActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("barbers").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-all"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export interface CreateTeamAccessPayload {
  name: string;
  email: string;
  password: string;
  role: "admin" | "staff" | "barber";
}

/**
 * Llama al edge function create-team-account. Usado hoy por el dialog
 * "Crear acceso" de StaffPage (siempre con role: "barber") y por
 * TeamAccountsCard.tsx, que hasta ahora duplicaban esta misma llamada y el
 * parseo del error de la Edge Function cada uno por su lado.
 */
export function useCreateTeamAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTeamAccessPayload) => {
      const { data, error } = await supabase.functions.invoke("create-team-account", { body: payload });
      if (error) {
        throw new Error(await getErrorMessage(error));
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-all"] });
      queryClient.invalidateQueries({ queryKey: ["team-roles"] });
      queryClient.invalidateQueries({ queryKey: ["team-profiles"] });
    },
  });
}
