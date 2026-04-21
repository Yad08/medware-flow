import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Container as ContainerIcon, Plus, Trash2, FileText, Send, Layers, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase, type Container, type Pallet, type Item } from "@/lib/db";
import { toast } from "sonner";
import { containerSchema, flattenErrors } from "@/lib/validation";

export const Route = createFileRoute("/app/shipments")({
  head: () => ({
    meta: [
      { title: "Shipments — MedWare Logistics" },
      { name: "description", content: "Manage shipping containers, assign pallets and track preparation status." },
    ],
  }),
  component: ShipmentsPage,
});

function ShipmentsPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [links, setLinks] = useState<{ pallet_id: string; container_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [assignTo, setAssignTo] = useState<Container | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [c, p, l, i] = await Promise.all([
      supabase.from("containers").select("*").order("created_at", { ascending: false }),
      supabase.from("pallets").select("*"),
      supabase.from("pallet_container").select("pallet_id, container_id"),
      supabase.from("items").select("id, pallet_id"),
    ]);
    setContainers(c.data ?? []);
    setPallets(p.data ?? []);
    setLinks(l.data ?? []);
    setItems((i.data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("shipments-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "containers" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "pallet_container" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "pallets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const palletsInContainer = (cid: string) => links.filter((l) => l.container_id === cid).map((l) => l.pallet_id);
  const palletItemCount = (pid: string) => items.filter((i) => i.pallet_id === pid).length;
  const palletIsEmpty = (pid: string) => palletItemCount(pid) === 0;

  const create = async () => {
    const parsed = containerSchema.safeParse({ name });
    if (!parsed.success) {
      setNameError(flattenErrors<{ name: string }>(parsed.error).name);
      return;
    }
    setNameError(undefined);
    setSubmitting(true);
    const { error } = await supabase.from("containers").insert({ name: parsed.data.name });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Container created");
    setName("");
    setOpenCreate(false);
  };

  const remove = async (id: string, cname: string) => {
    if (!confirm(`Delete "${cname}"? Pallet assignments and reports will be removed.`)) return;
    const { error } = await supabase.from("containers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Container deleted");
  };

  const ship = async (c: Container) => {
    const ids = palletsInContainer(c.id);
    if (ids.length < 1) return toast.error("Container must have at least 1 pallet to ship");
    if (ids.length > 42) return toast.error("Container exceeds the 42-pallet limit");
    const empties = ids.filter(palletIsEmpty);
    if (empties.length > 0) return toast.error(`${empties.length} pallet(s) in this container are empty. Add items before shipping.`);
    const { error } = await supabase.from("containers").update({ status: "shipped" }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(`${c.name} marked as shipped`, { description: `${ids.length} pallet(s) loaded` });
  };

  const generateReport = async (c: Container) => {
    if (palletsInContainer(c.id).length === 0) return toast.error("Container has no pallets — nothing to report");
    const { error } = await supabase.from("reports").insert({ type: "container", reference_id: c.id });
    if (error) return toast.error(error.message);
    toast.success("Container report generated");
  };

  const openAssign = (c: Container) => {
    setAssignTo(c);
    setSelected(new Set(palletsInContainer(c.id)));
  };

  const saveAssign = async () => {
    if (!assignTo) return;
    if (selected.size > 42) return toast.error("Max 42 pallets per container");
    if (selected.size < 1) return toast.error("Select at least 1 pallet");
    const current = new Set(palletsInContainer(assignTo.id));
    const toAdd = [...selected].filter((p) => !current.has(p));
    const toRemove = [...current].filter((p) => !selected.has(p));

    if (toRemove.length) {
      const { error } = await supabase.from("pallet_container").delete()
        .eq("container_id", assignTo.id).in("pallet_id", toRemove);
      if (error) return toast.error(error.message);
    }
    if (toAdd.length) {
      const { error } = await supabase.from("pallet_container").insert(
        toAdd.map((pid) => ({ pallet_id: pid, container_id: assignTo.id }))
      );
      if (error) return toast.error(error.message);
    }
    toast.success("Pallets updated", { description: `${selected.size} pallet(s) assigned` });
    setAssignTo(null);
  };

  return (
    <AppShell
      title="Shipments"
      subtitle={`${containers.length} containers · ${containers.filter(c => c.status === "shipped").length} shipped`}
      actions={<Button onClick={() => { setNameError(undefined); setOpenCreate(true); }}><Plus className="h-4 w-4 mr-1.5" /> Create Container</Button>}
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : containers.length === 0 ? (
        <EmptyState
          icon={ContainerIcon}
          title="No containers yet"
          description="Create a container to start assigning pallets and preparing for shipment."
          action={<Button onClick={() => setOpenCreate(true)}><Plus className="h-4 w-4 mr-1.5" /> Create Container</Button>}
        />
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Container</th>
                  <th className="text-left px-4 py-3 font-medium">Pallets</th>
                  <th className="text-left px-4 py-3 font-medium">Capacity</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {containers.map((c) => {
                  const ids = palletsInContainer(c.id);
                  const count = ids.length;
                  const pct = Math.round((count / 42) * 100);
                  const hasEmpties = ids.some(palletIsEmpty);
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="tabular-nums">{count}</span>
                          <span className="text-muted-foreground text-xs">/ 42</span>
                          {hasEmpties && (
                            <span title="Contains empty pallets" className="inline-flex">
                              <AlertTriangle className="h-3.5 w-3.5 text-warning-foreground" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 w-48">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.status === "shipped" ? (
                          <Badge className="bg-success text-success-foreground hover:bg-success">Shipped</Badge>
                        ) : (
                          <Badge variant="secondary">Preparing</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          {c.status === "preparing" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openAssign(c)}>Assign</Button>
                              <Button variant="ghost" size="sm" onClick={() => ship(c)}><Send className="h-4 w-4 mr-1" />Ship</Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => generateReport(c)} title="Generate report"><FileText className="h-4 w-4" /></Button>
                          <Button asChild variant="ghost" size="icon" title="View report">
                            <Link to="/reports/container/$id" params={{ id: c.id }}><FileText className="h-4 w-4 text-primary" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(c.id, c.name)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Container</DialogTitle>
            <DialogDescription>Each container can hold between 1 and 42 pallets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Container name<span className="text-destructive ml-0.5">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Container CTR-1002" aria-invalid={!!nameError} />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={create} disabled={submitting}>{submitting ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign pallets */}
      <Dialog open={!!assignTo} onOpenChange={(v) => !v && setAssignTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Pallets — {assignTo?.name}</DialogTitle>
            <DialogDescription>Select between 1 and 42 pallets to load into this container. Empty pallets are disabled.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2 py-2">
            {pallets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pallets available. Create one first.</p>
            ) : (
              pallets.map((p) => {
                const checked = selected.has(p.id);
                const empty = palletIsEmpty(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border border-border ${empty ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40 cursor-pointer"}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={empty}
                      onCheckedChange={(v) => {
                        const ns = new Set(selected);
                        if (v) ns.add(p.id); else ns.delete(p.id);
                        setSelected(ns);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Number(p.total_weight).toFixed(1)} kg · {palletItemCount(p.id)} item(s)
                        {empty && " · empty"}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <div className="text-xs text-muted-foreground">{selected.size} / 42 selected</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTo(null)}>Cancel</Button>
            <Button onClick={saveAssign} disabled={selected.size === 0}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
