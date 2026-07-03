import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ImportType = "sales" | "expenses";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
  onImported?: () => void;
}

const TEMPLATES: Record<ImportType, { headers: string[]; example: string[]; fileName: string }> = {
  sales: {
    headers: ["cliente", "servicio", "monto", "estilista", "fecha", "hora", "metodo_pago", "estado"],
    example: ["María García", "Corte + Barba", "35000", "Miguel Ángel", "2026-07-03", "10:00", "Efectivo", "paid"],
    fileName: "plantilla_ventas.csv",
  },
  expenses: {
    headers: ["descripcion", "categoria", "fecha", "monto", "metodo_pago", "tipo"],
    example: ["Alquiler del local", "Alquiler", "2026-07-01", "850000", "Transferencia", "fixed"],
    fileName: "plantilla_gastos.csv",
  },
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 0 && r.some(v => v.trim() !== ""));
}

export function CsvImportDialog({ open, onOpenChange, type, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tpl = TEMPLATES[type];

  const downloadTemplate = () => {
    const csv = tpl.headers.join(",") + "\n" + tpl.example.map(v => `"${v}"`).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tpl.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) { toast.error("Selecciona un archivo CSV"); return; }
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error("El archivo está vacío o no tiene datos");
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const dataRows = rows.slice(1);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data: importRow, error: importErr } = await supabase
        .from("financial_imports")
        .insert({ import_type: type, file_name: file.name, status: "processing", created_by: userId })
        .select().single();
      if (importErr) throw importErr;

      let imported = 0, failed = 0;
      const errors: string[] = [];

      if (type === "expenses") {
        const records = dataRows.map((r, idx) => {
          try {
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { row[h] = (r[i] ?? "").trim(); });
            const rec = {
              description: row["descripcion"] || row["description"] || "",
              category: row["categoria"] || row["category"] || "Otros",
              expense_date: row["fecha"] || row["date"],
              amount: parseFloat((row["monto"] || row["amount"] || "0").replace(/[^0-9.-]/g, "")),
              payment_method: row["metodo_pago"] || row["payment_method"] || null,
              type: (row["tipo"] || row["type"] || "variable").toLowerCase() === "fixed" ? "fixed" : "variable",
              source: "import",
              import_id: importRow.id,
              created_by: userId,
            };
            if (!rec.description || !rec.expense_date || !rec.amount) throw new Error(`Fila ${idx + 2}: faltan campos obligatorios`);
            return rec;
          } catch (e: any) {
            errors.push(e.message);
            return null;
          }
        }).filter(Boolean) as any[];
        failed = dataRows.length - records.length;
        if (records.length > 0) {
          const { error } = await supabase.from("expenses").insert(records as any);
          if (error) throw error;
          imported = records.length;
        }
      } else {
        const records = dataRows.map((r, idx) => {
          try {
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { row[h] = (r[i] ?? "").trim(); });
            const rec = {
              client_name: row["cliente"] || row["client"] || "",
              service_name: row["servicio"] || row["service"] || "",
              amount: parseFloat((row["monto"] || row["amount"] || "0").replace(/[^0-9.-]/g, "")),
              stylist_name: row["estilista"] || row["stylist"] || null,
              sale_date: row["fecha"] || row["date"],
              sale_time: row["hora"] || row["time"] || null,
              payment_method: row["metodo_pago"] || row["payment_method"] || null,
              status: ((row["estado"] || row["status"] || "paid").toLowerCase() === "pending") ? "pending" : "paid",
              source: "import",
              import_id: importRow.id,
              created_by: userId,
            };
            if (!rec.client_name || !rec.service_name || !rec.sale_date || !rec.amount) throw new Error(`Fila ${idx + 2}: faltan campos obligatorios`);
            return rec;
          } catch (e: any) {
            errors.push(e.message);
            return null;
          }
        }).filter(Boolean) as any[];
        failed = dataRows.length - records.length;
        if (records.length > 0) {
          const { error } = await supabase.from("sales_entries").insert(records as any);
          if (error) throw error;
          imported = records.length;
        }
      }

      await supabase.from("financial_imports").update({
        rows_imported: imported,
        rows_failed: failed,
        status: failed > 0 && imported === 0 ? "failed" : "completed",
        error_message: errors.length ? errors.slice(0, 5).join(" | ") : null,
      }).eq("id", importRow.id);

      toast.success(`Importadas ${imported} filas${failed ? `, ${failed} con error` : ""}`);
      onImported?.();
      onOpenChange(false);
      setFile(null);
    } catch (e: any) {
      toast.error(e.message || "Error al importar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar {type === "sales" ? "ventas" : "gastos"} desde CSV</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala con tus datos y súbela aquí.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
            <Download className="w-4 h-4" /> Descargar plantilla CSV
          </Button>

          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" className="w-full gap-2" onClick={() => inputRef.current?.click()}>
              <FileText className="w-4 h-4" />
              {file ? file.name : "Seleccionar archivo CSV"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">
            <p className="font-medium mb-1">Columnas esperadas:</p>
            <code className="text-xs">{tpl.headers.join(", ")}</code>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!file || loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
