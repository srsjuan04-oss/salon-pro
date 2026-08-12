import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addMonths, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const daysOfWeek = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

export function MiniCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [busyDays, setBusyDays] = useState<number[]>([]);
  const today = new Date();

  useEffect(() => {
    const load = async () => {
      const from = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const to = format(endOfMonth(currentDate), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_date")
        .gte("appointment_date", from)
        .lte("appointment_date", to)
        .neq("status", "cancelled");
      if (error) {
        setBusyDays([]);
        return;
      }
      const days = Array.from(
        new Set((data ?? []).map((a) => Number(String(a.appointment_date).slice(8, 10))))
      );
      setBusyDays(days);
    };
    load();
  }, [currentDate]);

  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (number | null)[] = [];
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirstDay; i++) result.push(null);
    for (let i = 1; i <= daysInMonth; i++) result.push(i);
    return result;
  }, [currentDate]);

  const monthLabel = format(currentDate, "LLLL yyyy", { locale: es });

  return (
    <div className="bg-card rounded-2xl border shadow-soft p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold capitalize">{monthLabel}</h3>
        <div className="flex gap-1">
          <button
            aria-label="Mes anterior"
            onClick={() => setCurrentDate((d) => addMonths(d, -1))}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            aria-label="Mes siguiente"
            onClick={() => setCurrentDate((d) => addMonths(d, 1))}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isToday =
            day !== null &&
            isSameDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), today);
          const isBusy = day !== null && busyDays.includes(day);
          return (
            <div
              key={index}
              onClick={() => day && navigate("/calendar")}
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg text-sm relative cursor-pointer transition-colors",
                day === null && "invisible",
                isToday && "gradient-gold text-primary-foreground font-medium shadow-gold",
                !isToday && day && "hover:bg-secondary",
                isBusy && !isToday && "font-medium"
              )}
            >
              {day}
              {isBusy && !isToday && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Días con citas
        </div>
      </div>
    </div>
  );
}
