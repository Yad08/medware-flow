import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/db";
import { toast } from "sonner";

const TEMPLATE_HEADERS = [
  "Item Name",
  "Category",
  "Item Type",
  "Quantity",
  "Unit Weight (lbs)",
  "Condition",
  "Hazmat Flag",
  "Medical Specialty",
  "Description",
  "Donation Source",
  "Date Received",
  "Expiration Date",
  "Estimated Value",
] as const;

const SAMPLE_ROWS = [
  ["Surgical Gloves (Box of 100)", "Surgical Supplies", "box", 24, 2.5, "New", "No", "General Surgery", "Latex-free nitrile", "St. Mary's Hospital", "2025-09-15", "2027-09-15", 480],
  ["Portable Oxygen Concentrator", "Medical Equipment", "unit", 4, 18.0, "Refurbished", "No", "Pulmonology", "5L flow rate", "MedTech Corp", "2025-10-01", "", 6800],
  ["Isopropyl Alcohol 70% (1 gal)", "Surgical Supplies", "unit", 12, 7.4, "New", "Yes", "General", "Flammable liquid", "PharmaCo Donations", "2025-11-02", "2028-11-02", 240],
];

type ParsedRow = Record<string, unknown>;

type ValidatedRow = {
  rowNum: number;
  raw: ParsedRow;
  data: {
    name: string;
    type: "box" | "unit";
    quantity: number;
    weight: number;
    is_hazmat: boolean;
  };
  errors: string[];
  category?: string;
};

const LBS_TO_KG = 0.45359237;

function getField(row: ParsedRow, ...keys: string[]): string {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.trim().toLowerCase() === k.toLowerCase()) {
        const v = row[rk];
        if (v === undefined || v === null) return "";
        return String(v).trim();
      }
    }
  }
  return "";
}

function parseHazmat(v: string): boolean {
  const s = v.trim().toLowerCase();
  return ["yes", "y", "true", "1"].includes(s);
}

function parseDate(v: string): { ok: boolean; date?: Date } {
  if (!v) return { ok: true };
  const d = new Date(v);
  if (isNaN(d.getTime())) return { ok: false };
  return { ok: true, date: d };
}

function validateRow(row: ParsedRow, idx: number): ValidatedRow {
  const errors: string[] = [];
  const name = getField(row, "Item Name", "name");
  const category = getField(row, "Category");
  const typeRaw = getField(row, "Item Type", "type").toLowerCase();
  const qtyRaw = getField(row, "Quantity");
  const wtRaw = getField(row, "Unit Weight (lbs)", "Unit Weight", "weight");
  const hazRaw = getField(row, "Hazmat Flag", "hazmat");
  const expRaw = getField(row, "Expiration Date");

  if (!name) errors.push("Item Name is required");
  if (name.length > 100) errors.push("Item Name too long (max 100)");

  let type: "box" | "unit" = "unit";
  if (!typeRaw) {
    errors.push("Item Type is required (box or unit)");
  } else if (typeRaw !== "box" && typeRaw !== "unit") {
    errors.push(`Item Type must be "box" or "unit"`);
  } else {
    type = typeRaw as "box" | "unit";
  }

  const quantity = parseInt(qtyRaw, 10);
  if (!qtyRaw || isNaN(quantity)) errors.push("Quantity must be a number");
  else if (quantity <= 0) errors.push("Quantity must be greater than 0");
  else if (quantity > 100000) errors.push("Quantity too large");

  const weightLbs = parseFloat(wtRaw);
  if (!wtRaw || isNaN(weightLbs)) errors.push("Unit Weight must be a number");
  else if (weightLbs < 0) errors.push("Unit Weight must be 0 or greater");

  const weightKg = isNaN(weightLbs) ? 0 : Math.round(weightLbs * LBS_TO_KG * 100) / 100;

  const is_hazmat = parseHazmat(hazRaw);

  if (expRaw) {
    const d = parseDate(expRaw);
    if (!d.ok) errors.push("Expiration Date is invalid");
  }

  return {
    rowNum: idx + 2, // +2 because of header row + 1-index
    raw: row,
    data: {
      name,
      type,
      quantity: isNaN(quantity) ? 0 : quantity,
      weight: weightKg,
      is_hazmat,
    },
    category,
    errors,
  };
}

export function InventoryImport({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ total: number; success: number; failed: number } | null>(null);

  const reset = () => {
    setRows([]);
    setFileName("");
    setSummary(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS as unknown as string[], ...SAMPLE_ROWS]);
    ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
    XLSX.writeFile(wb, "MedWare-Inventory-Template.xlsx");
    toast.success("Template downloaded", { description: "MedWare-Inventory-Template.xlsx" });
  };

  const processRows = (parsed: ParsedRow[]) => {
    const cleaned = parsed.filter((r) =>
      Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== "")
    );
    if (cleaned.length === 0) {
      toast.error("No data rows found in file");
      return;
    }
    setRows(cleaned.map(validateRow));
    setSummary(null);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setSummary(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "csv") {
        Papa.parse<ParsedRow>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => processRows(res.data),
          error: (err) => toast.error(`Failed to parse CSV: ${err.message}`),
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: "", raw: false });
        processRows(json);
      } else {
        toast.error("Unsupported file type. Please upload .csv or .xlsx");
      }
    } catch (e) {
      toast.error(`Failed to read file: ${(e as Error).message}`);
    }
  };

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  const onConfirmImport = async () => {
    if (validRows.length === 0) return toast.error("No valid rows to import");
    setImporting(true);
    const payload = validRows.map((r) => r.data);
    const { error } = await supabase.from("items").insert(payload);
    setImporting(false);
    if (error) {
      toast.error("Import failed", { description: error.message });
      setSummary({ total: rows.length, success: 0, failed: rows.length });
      return;
    }
    toast.success(`Imported ${validRows.length} items`, {
      description: invalidRows.length > 0 ? `${invalidRows.length} rows skipped` : undefined,
    });
    setSummary({ total: rows.length, success: validRows.length, failed: invalidRows.length });
    setRows([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Import Inventory
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel spreadsheet of donated supplies. Download the template for the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Top actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1.5" /> Download Template
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1.5" /> Choose File
            </Button>
            {fileName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="truncate max-w-[240px]">{fileName}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reset} aria-label="Clear">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Summary banner */}
          {summary && (
            <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <div className="flex-1">
                <div className="font-medium">Import complete</div>
                <div className="text-sm text-muted-foreground">
                  {summary.success} of {summary.total} rows imported · {summary.failed} skipped
                </div>
              </div>
              <Button variant="outline" onClick={reset}>Import another</Button>
            </div>
          )}

          {/* Stats */}
          {rows.length > 0 && !summary && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{rows.length} total rows</Badge>
              <Badge className="bg-success/15 text-success-foreground border-success/30 hover:bg-success/15">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {validRows.length} valid
              </Badge>
              {invalidRows.length > 0 && (
                <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">
                  <AlertCircle className="h-3 w-3 mr-1" /> {invalidRows.length} invalid
                </Badge>
              )}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && !summary && (
            <ScrollArea className="flex-1 border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Row</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Item</th>
                    <th className="text-left px-3 py-2 font-medium">Category</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-right px-3 py-2 font-medium">Qty</th>
                    <th className="text-right px-3 py-2 font-medium">Weight (kg)</th>
                    <th className="text-left px-3 py-2 font-medium">Hazmat</th>
                    <th className="text-left px-3 py-2 font-medium">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => {
                    const bad = r.errors.length > 0;
                    return (
                      <tr key={r.rowNum} className={bad ? "bg-destructive/5" : ""}>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.rowNum}</td>
                        <td className="px-3 py-2">
                          {bad ? (
                            <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">
                              <AlertCircle className="h-3 w-3 mr-1" /> Invalid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-success/40 text-success-foreground bg-success/15">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Valid
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">{r.data.name || <span className="text-muted-foreground italic">—</span>}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.category || "—"}</td>
                        <td className="px-3 py-2 capitalize">{r.data.type}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.data.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.data.weight.toFixed(2)}</td>
                        <td className="px-3 py-2">{r.data.is_hazmat ? "Yes" : "No"}</td>
                        <td className="px-3 py-2 text-destructive">
                          {r.errors.length > 0 ? r.errors.join("; ") : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          )}

          {rows.length === 0 && !summary && (
            <div className="flex-1 border border-dashed border-border rounded-lg flex flex-col items-center justify-center p-10 text-center">
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <div className="font-medium">No file selected</div>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Upload a .csv or .xlsx file with columns: Item Name, Category, Item Type, Quantity, Unit Weight (lbs).
                Optional fields like Hazmat Flag, Expiration Date, and Donation Source are also supported.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {summary ? "Close" : "Cancel"}
          </Button>
          {rows.length > 0 && !summary && (
            <Button onClick={onConfirmImport} disabled={importing || validRows.length === 0}>
              {importing ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importing…</>
              ) : (
                <>Import {validRows.length} {validRows.length === 1 ? "item" : "items"}</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
