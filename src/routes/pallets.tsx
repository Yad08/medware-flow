import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layers, Plus, Trash2, Package } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase, type Item, type Pallet } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/pallets")({
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

  const load = async () => {
    setLoading(true);
    const [p, i] = await Promise.all([
      supabase.from("pallets").select("*").order("created_at", { ascending: false }),
      supabase.from("items").select("*"),
    ]);
    setPallets(p.data ?? []);
    setItems(i.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const itemsForPallet = (pid: string) => items.filter((i) => i.pallet_id === pid);

  const create = async () => {
    if (!name.trim()) return toast.error("Pallet name required");
    const { error } = await supabase.from("pallets").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    toast.success("Pallet created");
    setName("");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const itemCount = itemsForPallet(id).length;
    if (itemCount > 0 && !confirm(`This pallet has ${itemCount} item(s). They will be unassigned. Continue?`)) return;
    if (itemCount === 0 && !confirm("Delete this pallet?")) return;
    const { error } = await supabase.from("pallets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pallet deleted");
    load();
  };

  return (
    <AppShell
      title="Pallets"
      subtitle={`${pallets.length} pallets · grouped inventory`}
      actions={
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Create Pallet</Button>
      }
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
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Pallet</div>
                    <div className="font-semibold text-base">{p.name}</div>
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
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
                        <Package className="h-3 w-3" />
                        <span className="truncate">{it.name}</span>
                        <span className="ml-auto tabular-nums">×{it.quantity}</span>
                      </div>
                    ))}
                    {palletItems.length > 3 && <div className="text-xs text-muted-foreground">+{palletItems.length - 3} more…</div>}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  {palletItems.length === 0 ? (
                    <Badge variant="outline" className="text-warning-foreground border-warning/40 bg-warning/10">Empty</Badge>
                  ) : (
                    <Badge variant="secondary" className="font-normal">Ready</Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Pallet name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pallet A-003" />
            <p className="text-xs text-muted-foreground">You can assign items to this pallet from the Inventory page.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
