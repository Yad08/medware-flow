import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layers, Plus, Trash2, Package, FileText, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase, type Item, type Pallet } from "@/lib/db";
import { toast } from "sonner";
import { palletSchema, flattenErrors } from "@/lib/validation";

export const Route = createFileRoute("/app/pallets")({
  head: () => ({
    meta: [
      { title: "Pallets — MedWare Logistics" },
      { name: "description", content: "Build, view and manage pallets that group inventory items for shipment." },
    ],
  }),
  component: PalletsPage,
});

function PalletsPage() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [p, i] = await Promise.all([
      supabase.from("pallets").select("*").order("created_at", { ascending: false }),
      supabase.from("items").select("*"),
    ]);
    setPallets(p.data ?? []);
    setItems(i.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("pallets-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "pallets" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const itemsForPallet = (pid: string) => items.filter((i) => i.pallet_id === pid);
  const hazmatForPallet = (pid: string) => itemsForPallet(pid).some((i) => i.is_hazmat);

  const create = async () => {
    const parsed = palletSchema.safeParse({ name });
    if (!parsed.success) {
      const e = flattenErrors<{ name: string }>(parsed.error);
      setNameError(e.name);
      return;
    }
    setNameError(undefined);
    setSubmitting(true);
    const { error } = await supabase.from("pallets").insert({ name: parsed.data.name });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Pallet created", { description: "Now assign items from the Inventory page." });
    setName("");
    setOpen(false);
  };

  const remove = async (id: string, palletName: string) => {
    const itemCount = itemsForPallet(id).length;
    const msg = itemCount > 0
      ? `"${palletName}" has ${itemCount} item(s). They will be unassigned. Continue?`
      : `Delete "${palletName}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("pallets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pallet deleted", { description: "Related reports were removed." });
  };

  const generateReport = async (p: Pallet) => {
    if (itemsForPallet(p.id).length === 0) {
      return toast.error("Pallet must contain at least 1 item to generate a report");
    }
    const { error } = await supabase.from("reports").insert({ type: "pallet", reference_id: p.id });
    if (error) return toast.error(error.message);
    toast.success("Pallet report generated");
  };

  return (
    <AppShell
      title="Pallets"
      subtitle={`${pallets.length} pallets · ${pallets.filter(p => itemsForPallet(p.id).length === 0).length} empty`}
      actions={<Button onClick={() => { setNameError(undefined); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> Create Pallet</Button>}
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : pallets.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No pallets yet"
          description="Create your first pallet to start grouping inventory items for shipment."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Create Pallet</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pallets.map((p) => {
            const palletItems = itemsForPallet(p.id);
            const hasHazmat = hazmatForPallet(p.id);
            const isEmpty = palletItems.length === 0;
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Pallet</div>
                    <div className="font-semibold text-base truncate">{p.name}</div>
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Items</div>
                    <div className="text-xl font-semibold tabular-nums">{palletItems.length}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Weight (kg)</div>
                    <div className="text-xl font-semibold tabular-nums">{Number(p.total_weight).toFixed(1)}</div>
                  </div>
                </div>

                {palletItems.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {palletItems.slice(0, 3).map((it) => (
                      <div key={it.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Package className="h-3 w-3 shrink-0" />
                        <span className="truncate">{it.name}</span>
                        {it.is_hazmat && <AlertTriangle className="h-3 w-3 text-warning-foreground shrink-0" />}
                        <span className="ml-auto tabular-nums">×{it.quantity}</span>
                      </div>
                    ))}
                    {palletItems.length > 3 && <div className="text-xs text-muted-foreground">+{palletItems.length - 3} more…</div>}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    {isEmpty ? (
                      <Badge variant="outline" className="text-warning-foreground border-warning/50 bg-warning/15">Empty</Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">Ready</Badge>
                    )}
                    {hasHazmat && (
                      <Badge variant="outline" className="border-warning/50 bg-warning/15 text-warning-foreground">
                        <AlertTriangle className="h-3 w-3 mr-1" />Hazmat
                      </Badge>
                    )}
                  </div>
                  <div className="inline-flex gap-1">
                    <Button asChild variant="ghost" size="icon" title="View report" disabled={isEmpty}>
                      <Link to="/reports/pallet/$id" params={{ id: p.id }} aria-disabled={isEmpty}><FileText className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => generateReport(p)} title="Generate report"><FileText className="h-4 w-4 text-primary" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id, p.name)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Pallet</DialogTitle>
            <DialogDescription>Give the pallet a unique label, then assign items to it from Inventory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Pallet name<span className="text-destructive ml-0.5">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pallet A-003" aria-invalid={!!nameError} />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            <p className="text-xs text-muted-foreground pt-1">Pallets must contain at least one item before they can be reported on or shipped.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={submitting}>{submitting ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
