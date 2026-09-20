import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  itemLabel?: string;
  className?: string;
}

// Reproduce la ventana de hasta 5 botones numerados (con el número actual
// centrado cuando es posible) que hoy está duplicada byte-por-byte entre
// SalesPage y ExpensesPage.
function getPageWindow(page: number, totalPages: number): number[] {
  const windowSize = Math.min(5, totalPages);
  return Array.from({ length: windowSize }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  rangeStart,
  rangeEnd,
  total,
  itemLabel = "resultados",
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between mt-4 pt-4 border-t border-border", className)}>
      <p className="text-sm text-muted-foreground">
        Mostrando {rangeStart} - {rangeEnd} de {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1">
          {getPageWindow(page, totalPages).map((pageNum) => (
            <Button
              key={pageNum}
              variant={page === pageNum ? "default" : "outline"}
              size="sm"
              className={cn("w-8 h-8 p-0", page === pageNum && "gradient-gold shadow-gold")}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
