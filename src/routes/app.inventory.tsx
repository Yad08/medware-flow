import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Plus, Pencil, Trash2, AlertTriangle, Boxes, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { InventoryImport } from "@/components/InventoryImport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase, type Item, type Pallet } from "@/lib/db";
import { toast } from "sonner";
import { itemSchema, flattenErrors, type FieldErrors } from "@/lib/validation";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/inventory")({
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
  const { can } = useAuth();
  const canCreate = can("items.create");
  const canEdit = can("items.edit");
  const canDelete = can("items.delete");

  const [items, setItems] = useState<Item[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<FieldErrors<FormState>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [i, p] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("pallets").select("*").order("created_at", { ascending: false }),
    ]);
    if (i.error) toast.error(i.error.message);
    setItems(i.data ?? []);
    setPallets(p.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("inventory-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "pallets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const palletName = (id: string | null) => pallets.find((p) => p.id === id)?.name ?? "—";

  const onSubmit = async () => {
    const parsed = itemSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenErrors<FormState>(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setSubmitting(true);
    const payload = parsed.data;
    const res = form.id
      ? await supabase.from("items").update(payload).eq("id", form.id)
      : await supabase.from("items").insert(payload);
    setSubmitting(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(form.id ? "Item updated" : "Item added", {
      description: `${payload.name} · ${payload.quantity} × ${payload.weight} kg`,
    });
    setOpen(false);
    setForm(empty);
  };

  const onDelete = async (id: string, name: string) => {
    if (!canDelete) return toast.error("Only employees can delete items");
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Item deleted");
  };

  const onEdit = (item: Item) => {
    setErrors({});
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

  const openCreate = () => { setErrors({}); setForm(empty); setOpen(true); };

  return (
    <AppShell
      title="Inventory"
      subtitle={`${items.length} items tracked · ${items.filter(i => i.is_hazmat).length} hazmat`}
      actions={canCreate ? <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Add Item</Button> : undefined}
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory yet"
          description="Add your first medical supply item to start building pallets and shipments."
          action={canCreate ? <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Add Item</Button> : undefined}
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
                        <Badge variant="outline" className="border-warning/50 text-warning-foreground bg-warning/15">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Hazmat
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        {canEdit && <Button variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => onDelete(item.id, item.name)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>}
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
            <DialogDescription>Track a medical supply item with its quantity, weight and handling flags.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Item name" required error={errors.name}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Surgical Gloves" aria-invalid={!!errors.name} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" required>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "box" | "unit" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quantity" required error={errors.quantity}>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} aria-invalid={!!errors.quantity} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight per unit (kg)" required error={errors.weight}>
                <Input type="number" step="0.01" min={0} value={form.weight} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })} aria-invalid={!!errors.weight} />
              </Field>
              <Field label="Pallet">
                <Select value={form.pallet_id ?? "none"} onValueChange={(v) => setForm({ ...form, pallet_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {pallets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
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
            <Button onClick={onSubmit} disabled={submitting}>{submitting ? "Saving…" : form.id ? "Save changes" : "Add item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
