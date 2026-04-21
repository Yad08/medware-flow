import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer, ArrowLeft, AlertTriangle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, type Item, type Pallet, type Container } from "@/lib/db";
import { format } from "date-fns";

export const Route = createFileRoute("/reports/container/$id")({
  head: () => ({
    meta: [
      { title: "Container Report — MedWare Logistics" },
      { name: "description", content: "Printable shipment manifest with all pallets and item summaries." },
    ],
  }),
  component: ContainerReport,
});

function ContainerReport() {
  const { id } = Route.useParams();
  const [container, setContainer] = useState<Container | null>(null);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const c = await supabase.from("containers").select("*").eq("id", id).maybeSingle();
      setContainer(c.data);

      const links = await supabase.from("pallet_container").select("pallet_id").eq("container_id", id);
      const palletIds = (links.data ?? []).map((l) => l.pallet_id);

      if (palletIds.length) {
        const [p, i] = await Promise.all([
          supabase.from("pallets").select("*").in("id", palletIds),
          supabase.from("items").select("*").in("pallet_id", palletIds),
        ]);
        setPallets(p.data ?? []);
        setItems(i.data ?? []);
      }
    })();
  }, [id]);

  if (!container) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const totalWeight = items.reduce((s, i) => s + Number(i.weight) * i.quantity, 0);
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const hazmatCount = items.filter((i) => i.is_hazmat).length;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <Button asChild variant="ghost" size="sm"><Link to="/reports"><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Link></Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-card">
          <div className="flex items-start justify-between border-b border-border pb-4 mb-6">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">MedWare Logistics</div>
              <h1 className="text-2xl font-semibold mt-1">Container Manifest</h1>
              <p className="text-sm text-muted-foreground">Medical Supplies Network Inc.</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Generated</div>
              <div className="font-medium text-foreground">{format(new Date(), "PPp")}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat label="Container" value={container.name} />
            <Stat label="Status" value={container.status} />
            <Stat label="Pallets" value={`${pallets.length} / 42`} />
            <Stat label="Total Weight" value={`${totalWeight.toFixed(2)} kg`} />
          </div>

          {hazmatCount > 0 && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-warning/10 border border-warning/30 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span><strong>{hazmatCount}</strong> hazardous material item(s) across {pallets.length} pallet(s).</span>
            </div>
          )}

          <h2 className="font-semibold mb-3 mt-6">Pallets ({pallets.length})</h2>
          <div className="space-y-4">
            {pallets.map((p) => {
              const pItems = items.filter((i) => i.pallet_id === p.id);
              const pWeight = pItems.reduce((s, i) => s + Number(i.weight) * i.quantity, 0);
              return (
                <div key={p.id} className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pItems.length} items · {pWeight.toFixed(2)} kg
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {pItems.map((it) => (
                        <tr key={it.id}>
                          <td className="px-4 py-2">{it.name}</td>
                          <td className="px-4 py-2 text-muted-foreground capitalize text-xs">{it.type}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">×{it.quantity}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">{(Number(it.weight) * it.quantity).toFixed(2)} kg</td>
                          <td className="px-4 py-2 w-20">{it.is_hazmat && <Badge variant="outline" className="border-warning/40 bg-warning/10 text-xs">Hazmat</Badge>}</td>
                        </tr>
                      ))}
                      {pItems.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-3 text-xs text-muted-foreground text-center">Empty pallet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {pallets.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No pallets assigned to this container.</p>}

          <div className="mt-8 pt-4 border-t border-border grid grid-cols-3 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">Total units</div><div className="font-semibold tabular-nums">{totalUnits}</div></div>
            <div><div className="text-xs text-muted-foreground">Total weight</div><div className="font-semibold tabular-nums">{totalWeight.toFixed(2)} kg</div></div>
            <div><div className="text-xs text-muted-foreground">Hazmat items</div><div className="font-semibold tabular-nums">{hazmatCount}</div></div>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">Container ID: <span className="font-mono">{container.id}</span></div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-semibold mt-0.5 capitalize">{value}</div>
    </div>
  );
}
