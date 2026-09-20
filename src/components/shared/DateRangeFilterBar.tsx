import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateFilterOption, DateRange } from "@/hooks/useDateRangeFilter";

interface DateRangeFilterBarProps {
  dateFilter: DateFilterOption;
  onDateFilterChange: (filter: DateFilterOption) => void;
  customDateRange: DateRange;
  onCustomDateRangeChange: (range: DateRange) => void;
  label: string;
  countLabel: string;
}

/**
 * Barra de filtro hoy/ayer/15 días/30 días/personalizado, hoy duplicada a
 * mano (misma estructura, mismos textos) en SalesPage y ExpensesPage.
 * El estado y la lógica de filtrado viven en useDateRangeFilter; este
 * componente es puramente presentacional.
 */
export function DateRangeFilterBar({
  dateFilter,
  onDateFilterChange,
  customDateRange,
  onCustomDateRangeChange,
  label,
  countLabel,
}: DateRangeFilterBarProps) {
  return (
    <div className="bg-card rounded-2xl border shadow-soft p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={dateFilter === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => onDateFilterChange("today")}
            className={dateFilter === "today" ? "gradient-gold shadow-gold" : ""}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Hoy
          </Button>
          <Button
            variant={dateFilter === "yesterday" ? "default" : "outline"}
            size="sm"
            onClick={() => onDateFilterChange("yesterday")}
            className={dateFilter === "yesterday" ? "gradient-gold shadow-gold" : ""}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Ayer
          </Button>
          <Button
            variant={dateFilter === "15days" ? "default" : "outline"}
            size="sm"
            onClick={() => onDateFilterChange("15days")}
            className={dateFilter === "15days" ? "gradient-gold shadow-gold" : ""}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            15 días
          </Button>
          <Button
            variant={dateFilter === "30days" ? "default" : "outline"}
            size="sm"
            onClick={() => onDateFilterChange("30days")}
            className={dateFilter === "30days" ? "gradient-gold shadow-gold" : ""}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            30 días
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => onDateFilterChange("custom")}
                className={dateFilter === "custom" ? "gradient-gold shadow-gold" : ""}
              >
                <CalendarRange className="w-4 h-4 mr-2" />
                Personalizado
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: customDateRange.from, to: customDateRange.to }}
                onSelect={(range) => {
                  onCustomDateRangeChange({ from: range?.from, to: range?.to });
                  onDateFilterChange("custom");
                }}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="gap-1 py-1.5 px-3">
            <CalendarDays className="w-3.5 h-3.5" />
            {label}
          </Badge>
          <Badge variant="outline" className="py-1.5 px-3">
            {countLabel}
          </Badge>
        </div>
      </div>
    </div>
  );
}
