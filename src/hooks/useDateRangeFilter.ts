import { useMemo, useState } from "react";
import { endOfDay, format, isWithinInterval, parseISO, startOfDay, subDays } from "date-fns";
import { es } from "date-fns/locale";

export type DateFilterOption = "today" | "yesterday" | "15days" | "30days" | "custom";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

/**
 * Centraliza el filtro de fechas (hoy/ayer/15 días/30 días/personalizado)
 * hoy reimplementado de forma casi idéntica en SalesPage, ExpensesPage y
 * StaffPage. `getDate` recibe cada item y devuelve su fecha (ISO string o
 * Date) para poder filtrar arreglos de distintas formas.
 */
export function useDateRangeFilter<T>(items: T[], getDate: (item: T) => string | Date) {
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("30days");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const today = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const raw = getDate(item);
      const date = typeof raw === "string" ? parseISO(raw) : raw;

      switch (dateFilter) {
        case "today":
          return format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
        case "yesterday":
          return format(date, "yyyy-MM-dd") === format(subDays(today, 1), "yyyy-MM-dd");
        case "15days":
          return isWithinInterval(date, { start: startOfDay(subDays(today, 14)), end: endOfDay(today) });
        case "30days":
          return isWithinInterval(date, { start: startOfDay(subDays(today, 29)), end: endOfDay(today) });
        case "custom":
          if (customDateRange.from && customDateRange.to) {
            return isWithinInterval(date, {
              start: startOfDay(customDateRange.from),
              end: endOfDay(customDateRange.to),
            });
          }
          return true;
        default:
          return true;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, dateFilter, customDateRange, today]);

  const label = useMemo(() => {
    switch (dateFilter) {
      case "today":
        return format(today, "d 'de' MMMM, yyyy", { locale: es });
      case "yesterday":
        return format(subDays(today, 1), "d 'de' MMMM, yyyy", { locale: es });
      case "15days":
        return `${format(subDays(today, 14), "d MMM", { locale: es })} - ${format(today, "d MMM, yyyy", { locale: es })}`;
      case "30days":
        return `${format(subDays(today, 29), "d MMM", { locale: es })} - ${format(today, "d MMM, yyyy", { locale: es })}`;
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          return `${format(customDateRange.from, "d MMM", { locale: es })} - ${format(customDateRange.to, "d MMM, yyyy", { locale: es })}`;
        }
        return "Seleccionar fechas";
      default:
        return "";
    }
  }, [dateFilter, customDateRange, today]);

  // Número de días que cubre el rango activo — útil para promedios diarios.
  const dayCount = dateFilter === "today" || dateFilter === "yesterday" ? 1 : dateFilter === "15days" ? 15 : 30;

  return { dateFilter, setDateFilter, customDateRange, setCustomDateRange, filtered, label, dayCount };
}
