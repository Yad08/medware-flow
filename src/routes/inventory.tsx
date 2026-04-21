import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Plus, Pencil, Trash2, AlertTriangle, Boxes } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase, type Item, type Pallet } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — MedWare Logistics" },
      { name: "description", content: "Manage incoming medical supplies, weights, hazmat flags, and pallet assignments." },
    ],
  }),
  component: InventoryPage,
});

type FormState = {
  id?: string;
  name: string;
  type: "box" | "unit";
  quantity: number;
  weight: number;
  is_hazmat: boolean;
  pallet_id: string | null;
};

const empty: FormState = { name: "", type: "box", quantity: 1, weight: 0, is_hazmat: false, pallet_id: null };

function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  const load = async () => {
    setLoading(true);
    const [i, p] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("pallets").select("*").order("created_at", { ascending: false }),
    ]);
    if (i.error) toast.error(i.error.message);
    setItems(i.data ?? []);
    setPallets(p.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const palletName = (id: string | null) => pallets.find((p) => p.id === id)?.name ?? "—";

  const onSubmit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.quantity < 1) return toast.error("Quantity must be at least 1");
    if (form.weight < 0) return toast.error("Weight cannot be negative");

    const payload = {
      name: form.name.trim(),
      type: form.type,
      quantity: form.quantity,
      weight: form.weight,
      is_hazmat: form.is_hazmat,
      pallet_id: form.pallet_id,
    };

    const res = form.id
      ? await supabase.from("items").update(payload).eq("id", form.id)
      : await supabase.from("items").insert(payload);

    if (res.error) return toast.error(res.error.message);
    toast.success(form.id ? "Item updated" : "Item added");
    setOpen(false);
    setForm(empty);
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Item deleted");
    load();
  };

  const onEdit = (item: Item) => {
    setForm({
      id: item.id,
      name: item.name,
      type: item.type as "box" | "unit",
      quantity: item.quantity,
      weight: Number(item.weight),
      is_hazmat: item.is_hazmat,
      pallet_id: item.pallet_id,
    });
    setOpen(true);
  };

  return (
    <AppShell
      title="Inventory"
      subtitle={`${items.length} items tracked`}
      actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Item
        </Button>
      }
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory yet"
          description="Add your first medical supply item to start building pallets and shipments."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Item</Button>}
        />
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Item</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                  <th className="text-right px-4 py-3 font-medium">Weight (kg)</th>
                  <th className="text-left px-4 py-3 font-medium">Pallet</th>
                  <th className="text-left px-4 py-3 font-medium">Flags</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{item.type}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(item.weight).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {item.pallet_id ? (
                        <Badge variant="secondary" className="font-normal"><Boxes className="h-3 w-3 mr-1" />{palletName(item.pallet_id)}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_hazmat && (
                        <Badge variant="outline" className="border-warning/40 text-warning-foreground bg-warning/10">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Hazmat
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Item name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Surgical Gloves" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "box" | "unit" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Weight per unit (kg)</Label>
                <Input type="number" step="0.01" min={0} value={form.weight} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Pallet</Label>
                <Select value={form.pallet_id ?? "none"} onValueChange={(v) => setForm({ ...form, pallet_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {pallets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Hazardous material</Label>
                <p className="text-xs text-muted-foreground">Flag for special handling</p>
              </div>
              <Switch checked={form.is_hazmat} onCheckedChange={(v) => setForm({ ...form, is_hazmat: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onSubmit}>{form.id ? "Save changes" : "Add item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
