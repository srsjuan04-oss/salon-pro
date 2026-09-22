import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type BarberSchedule = Tables<"barber_schedules">;

export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export interface EffectiveDaySchedule {
  isWorking: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

/**
 * Un barbero sin filas en barber_schedules no tiene horario propio
 * configurado: usa el horario general del salón (schedule_settings) todos
 * los días, igual que el comportamiento antes de esta feature.
 */
export function getEffectiveDaySchedule(
  schedules: BarberSchedule[] | undefined,
  barberId: string,
  weekday: number,
  fallback: { start: string; end: string },
): EffectiveDaySchedule {
  const rows = (schedules ?? []).filter((s) => s.barber_id === barberId);
  if (rows.length === 0) {
    return { isWorking: true, start: fallback.start, end: fallback.end };
  }
  const day = rows.find((s) => s.day_of_week === weekday);
  if (!day) {
    return { isWorking: true, start: fallback.start, end: fallback.end };
  }
  return {
    isWorking: day.is_available,
    start: day.start_time.slice(0, 5),
    end: day.end_time.slice(0, 5),
  };
}

export function useBarberSchedules(barberId?: string) {
  return useQuery({
    queryKey: ["barber-schedules", barberId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("barber_schedules").select("*");
      if (barberId) query = query.eq("barber_id", barberId);
      const { data, error } = await query;
      if (error) throw error;
      return data as BarberSchedule[];
    },
  });
}

export interface DayScheduleInput {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

export function useSaveBarberSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ barberId, days }: { barberId: string; days: DayScheduleInput[] }) => {
      const { error } = await supabase
        .from("barber_schedules")
        .upsert(
          days.map((d) => ({ barber_id: barberId, ...d })) as any,
          { onConflict: "barber_id,day_of_week" },
        );
      if (error) throw error;
    },
    onSuccess: (_data, { barberId }) => {
      queryClient.invalidateQueries({ queryKey: ["barber-schedules", barberId] });
      queryClient.invalidateQueries({ queryKey: ["barber-schedules", "all"] });
    },
  });
}
