import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "sales" | "expenses";
}

export function ImportHistoryDialog({ open, onOpenChange, type }: Props) {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("financial_imports")
      .select("*")
      .eq("import_type", type)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setRows(data ?? []));
  }, [open, type]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de importaciones — {type === "sales" ? "Ventas" : "Gastos"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin importaciones registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead className="text-right">Importadas</TableHead>
                  <TableHead className="text-right">Fallidas</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{format(new Date(r.created_at), "d MMM yyyy HH:mm", { locale: es })}</TableCell>
                    <TableCell className="text-sm">{r.file_name || "—"}</TableCell>
                    <TableCell className="text-right font-medium text-success">{r.rows_imported}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{r.rows_failed}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
