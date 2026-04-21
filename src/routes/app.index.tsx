import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Layers, Container as ContainerIcon, Activity, ArrowUpRight, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MedWare Logistics" },
      { name: "description", content: "Overview of inventory, pallets, shipments and recent activity for MSNI operations." },
    ],
  }),
  component: Dashboard,
});

type Stats = {
  itemsCount: number;
  totalUnits: number;
  palletsCount: number;
  containersReady: number;
  hazmatCount: number;
};

type ActivityEntry = { id: string; label: string; type: string; at: string };

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [items, pallets, containers, recentItems, recentPallets, recentContainers] = await Promise.all([
        supabase.from("items").select("quantity, is_hazmat"),
        supabase.from("pallets").select("id"),
        supabase.from("containers").select("id, status"),
        supabase.from("items").select("id, name, created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("pallets").select("id, name, created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("containers").select("id, name, created_at").order("created_at", { ascending: false }).limit(3),
      ]);

      const totalUnits = (items.data ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0);
      const hazmatCount = (items.data ?? []).filter((i) => i.is_hazmat).length;
      setStats({
        itemsCount: items.data?.length ?? 0,
        totalUnits,
        palletsCount: pallets.data?.length ?? 0,
        containersReady: (containers.data ?? []).filter((c) => c.status === "preparing").length,
        hazmatCount,
      });

      const merged: ActivityEntry[] = [
        ...(recentItems.data ?? []).map((r) => ({ id: r.id, label: `Item added: ${r.name}`, type: "item", at: r.created_at })),
        ...(recentPallets.data ?? []).map((r) => ({ id: r.id, label: `Pallet created: ${r.name}`, type: "pallet", at: r.created_at })),
        ...(recentContainers.data ?? []).map((r) => ({ id: r.id, label: `Container created: ${r.name}`, type: "container", at: r.created_at })),
      ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 6);
      setActivity(merged);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Inventory Items", value: stats?.itemsCount ?? 0, sub: `${stats?.totalUnits ?? 0} total units`, icon: Package, to: "/app/inventory" as const, accent: "bg-primary-soft text-primary" },
    { label: "Active Pallets", value: stats?.palletsCount ?? 0, sub: "Across all shipments", icon: Layers, to: "/app/pallets" as const, accent: "bg-accent text-accent-foreground" },
    { label: "Containers Preparing", value: stats?.containersReady ?? 0, sub: "Awaiting shipment", icon: ContainerIcon, to: "/app/shipments" as const, accent: "bg-primary-soft text-primary" },
    { label: "Hazmat Items", value: stats?.hazmatCount ?? 0, sub: "Flagged for handling", icon: AlertTriangle, to: "/app/inventory" as const, accent: "bg-warning/20 text-warning-foreground" },
  ];

  const greeting = user ? `Welcome back, ${user.display_name.split(" ")[0]}.` : "Operations overview";

  return (
    <AppShell title="Dashboard" subtitle={`${greeting} Medical Supplies Network Inc.`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Link to={c.to} className="block group">
              <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow">
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.accent}`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-semibold tracking-tight">{loading ? "—" : c.value}</div>
                  <div className="text-sm font-medium mt-1">{c.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Workflow</h2>
              <p className="text-xs text-muted-foreground">Items → Pallets → Containers → Reports</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Package, label: "Receive Items", desc: "Log incoming inventory" },
              { icon: Layers, label: "Build Pallets", desc: "Group items together" },
              { icon: ContainerIcon, label: "Load Containers", desc: "Up to 42 pallets each" },
              { icon: Activity, label: "Generate Reports", desc: "For shipping & audit" },
            ].map((s, i) => (
              <div key={s.label} className="relative p-4 rounded-lg border border-border bg-background">
                <div className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">{i + 1}</div>
                <s.icon className="h-5 w-5 text-primary mb-2" />
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-semibold mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={`${a.type}-${a.id}`} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
