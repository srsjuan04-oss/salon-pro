import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScheduleSettings {
  day_start: string; // "HH:MM"
  day_end: string;   // "HH:MM"
  slot_minutes: number;
}

const DEFAULTS: ScheduleSettings = {
  day_start: "10:00",
  day_end: "20:00",
  slot_minutes: 40,
};

export function useScheduleSettings() {
  return useQuery({
    queryKey: ["schedule_settings"],
    queryFn: async (): Promise<ScheduleSettings> => {
      const { data } = await supabase
        .from("schedule_settings")
        .select("day_start, day_end, slot_minutes")
        .limit(1)
        .maybeSingle();
      if (!data) return DEFAULTS;
      return {
        day_start: data.day_start.slice(0, 5),
        day_end: data.day_end.slice(0, 5),
        slot_minutes: data.slot_minutes,
      };
    },
    staleTime: 60_000,
  });
}
