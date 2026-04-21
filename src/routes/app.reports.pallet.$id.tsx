import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, type Item, type Pallet } from "@/lib/db";
import { format } from "date-fns";

export const Route = createFileRoute("/app/reports/pallet/$id")({
  head: () => ({
    meta: [
      { title: "Pallet Report — MedWare Logistics" },
      { name: "description", content: "Printable pallet manifest with item details and weights." },
    ],
  }),
  component: PalletReport,
});

function PalletReport() {
  const { id } = Route.useParams();
  const [pallet, setPallet] = useState<Pallet | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const [p, i] = await Promise.all([
        supabase.from("pallets").select("*").eq("id", id).maybeSingle(),
        supabase.from("items").select("*").eq("pallet_id", id),
      ]);
      setPallet(p.data);
      setItems(i.data ?? []);
    })();
  }, [id]);

  if (!pallet) return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">Pallet not found or still loading…</p>
        <Button asChild variant="outline" size="sm"><Link to="/reports"><ArrowLeft className="h-4 w-4 mr-1.5" />Back to reports</Link></Button>
      </div>
    </div>
  );

  const totalWeight = items.reduce((s, i) => s + Number(i.weight) * i.quantity, 0);
  const hazmatCount = items.filter((i) => i.is_hazmat).length;

  return (
    <div className="min-h-screen bg-background py-8 px-4 print-page">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <Button asChild variant="ghost" size="sm"><Link to="/reports"><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Link></Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-card print-container">
          <div className="flex items-start justify-between border-b border-border pb-4 mb-6">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">MedWare Logistics</div>
              <h1 className="text-2xl font-semibold mt-1">Pallet Report</h1>
              <p className="text-sm text-muted-foreground">Medical Supplies Network Inc.</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Generated</div>
              <div className="font-medium text-foreground">{format(new Date(), "PPp")}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stat label="Pallet" value={pallet.name} />
            <Stat label="Total Items" value={String(items.length)} />
            <Stat label="Total Weight" value={`${totalWeight.toFixed(2)} kg`} />
          </div>

          {hazmatCount > 0 && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-warning/10 border border-warning/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
              <span><strong>{hazmatCount}</strong> hazardous material item(s) — special handling required.</span>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium text-right">Qty</th>
                <th className="py-2 font-medium text-right">Unit Wt</th>
                <th className="py-2 font-medium text-right">Subtotal</th>
                <th className="py-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2.5">{it.name}</td>
                  <td className="py-2.5 capitalize text-muted-foreground">{it.type}</td>
                  <td className="py-2.5 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">{Number(it.weight).toFixed(2)}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium">{(Number(it.weight) * it.quantity).toFixed(2)}</td>
                  <td className="py-2.5">{it.is_hazmat && <Badge variant="outline" className="border-warning/40 bg-warning/10">Hazmat</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">This pallet contains no items.</p>}

          <div className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground">
            Pallet ID: <span className="font-mono">{pallet.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-semibold mt-0.5">{value}</div>
    </div>
  );
}
