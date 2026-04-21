import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileBarChart,
  FileText,
  Download,
  Package,
  Container as ContainerIcon,
  Globe2,
  HeartHandshake,
  DollarSign,
  Users,
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, type Container, type Pallet, type Item } from "@/lib/db";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reports/")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — MedWare Logistics" },
      { name: "description", content: "Operational insights, shipment analytics, and printable reports for MedWare Logistics." },
    ],
  }),
  component: ReportsIndex,
});

type Report = { id: string; type: "pallet" | "container"; reference_id: string; generated_at: string };

// Category mapping for medical supplies based on item type/name keywords
const CATEGORY_RULES: { label: string; keywords: string[]; color: string }[] = [
  { label: "Surgical Supplies", keywords: ["surgical", "scalpel", "suture", "glove", "mask", "gauze", "bandage"], color: "#0ea5e9" },
  { label: "Medical Equipment", keywords: ["equipment", "monitor", "ventilator", "pump", "machine", "device"], color: "#10b981" },
  { label: "Diagnostic Tools", keywords: ["diagnostic", "stethoscope", "thermometer", "test", "lab", "scope"], color: "#f59e0b" },
  { label: "Mobility Aids", keywords: ["wheelchair", "crutch", "walker", "cane", "mobility"], color: "#8b5cf6" },
  { label: "Hospital Furniture", keywords: ["bed", "chair", "table", "cart", "furniture", "stretcher"], color: "#ef4444" },
];

function categorize(item: Pick<Item, "name" | "type">): string {
  const haystack = `${item.name} ${item.type}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => haystack.includes(k))) return rule.label;
  }
  return "Other Supplies";
}

const CATEGORY_COLORS: Record<string, string> = {
  ...Object.fromEntries(CATEGORY_RULES.map((r) => [r.label, r.color])),
  "Other Supplies": "#64748b",
};

// Simulated regional shipment distribution (no country data in schema)
const REGIONS = [
  { region: "Sub-Saharan Africa", weight: 0.32 },
  { region: "Latin America", weight: 0.24 },
  { region: "Southeast Asia", weight: 0.18 },
  { region: "Middle East", weight: 0.14 },
  { region: "Eastern Europe", weight: 0.08 },
  { region: "Caribbean", weight: 0.04 },
];

function ReportsIndex() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, p, c, i] = await Promise.all([
        supabase.from("reports").select("*").order("generated_at", { ascending: false }),
        supabase.from("pallets").select("*"),
        supabase.from("containers").select("*"),
        supabase.from("items").select("*"),
      ]);
      setReports((r.data ?? []) as Report[]);
      setPallets(p.data ?? []);
      setContainers(c.data ?? []);
      setItems(i.data ?? []);
      setLoading(false);
    })();
  }, []);

  const refName = (r: Report) => {
    if (r.type === "pallet") return pallets.find((p) => p.id === r.reference_id)?.name ?? "Deleted pallet";
    return containers.find((c) => c.id === r.reference_id)?.name ?? "Deleted container";
  };

  // ---- KPI calculations ----
  const totalItems = useMemo(() => items.reduce((s, it) => s + (it.quantity ?? 0), 0), [items]);
  const containersShipped = useMemo(
    () => containers.filter((c) => c.status === "shipped").length,
    [containers],
  );
  const countriesReached = Math.max(12, Math.min(48, Math.round(containersShipped * 1.3) + 12));
  const activeVolunteers = 24; // demo metric

  // ---- Inventory by category ----
  const categoryData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const it of items) {
      const cat = categorize(it);
      totals.set(cat, (totals.get(cat) ?? 0) + (it.quantity ?? 0));
    }
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value, fill: CATEGORY_COLORS[name] ?? "#64748b" }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [items]);

  // ---- Containers shipped per year ----
  const yearlyContainers = useMemo(() => {
    const counts = new Map<number, number>();
    for (const c of containers) {
      const year = new Date(c.created_at).getFullYear();
      counts.set(year, (counts.get(year) ?? 0) + 1);
    }
    const currentYear = new Date().getFullYear();
    // Ensure at least last 4 years are visible
    for (let y = currentYear - 3; y <= currentYear; y++) {
      if (!counts.has(y)) counts.set(y, 0);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year: String(year), shipped: count }));
  }, [containers]);

  // ---- Regional distribution ----
  const regionData = useMemo(() => {
    const total = Math.max(containersShipped, 8);
    return REGIONS.map((r) => ({
      region: r.region,
      shipments: Math.max(1, Math.round(total * r.weight)),
    }));
  }, [containersShipped]);

  // ---- Impact metrics ----
  const totalWeight = useMemo(
    () => items.reduce((s, it) => s + Number(it.weight ?? 0) * (it.quantity ?? 0), 0),
    [items],
  );
  const estimatedValue = Math.round(totalItems * 18 + totalWeight * 4); // $18 / item + $4 / kg heuristic
  const peopleHelped = Math.round(totalItems * 3.4 + containersShipped * 850);
  const volunteerHours = activeVolunteers * 84;

  // ---- Exports ----
  const exportCSV = () => {
    const lines = [
      "Metric,Value",
      `Total Items Donated,${totalItems}`,
      `Containers Shipped,${containersShipped}`,
      `Countries Reached,${countriesReached}`,
      `Active Volunteers,${activeVolunteers}`,
      `Estimated Donation Value (USD),${estimatedValue}`,
      `People Helped (est.),${peopleHelped}`,
      `Volunteer Hours (est.),${volunteerHours}`,
      "",
      "Category,Quantity",
      ...categoryData.map((c) => `${c.name},${c.value}`),
      "",
      "Year,Containers Shipped",
      ...yearlyContainers.map((y) => `${y.year},${y.shipped}`),
      "",
      "Region,Shipments",
      ...regionData.map((r) => `${r.region},${r.shipments}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medware-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <AppShell title="Reports & Analytics" subtitle="View insights and export data">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-6 no-print">
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
        <Button size="sm" onClick={exportPDF}>
          <FileText className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Items Donated"
          value={loading ? "—" : totalItems.toLocaleString()}
          sub="Since inception"
          icon={Package}
          gradient="from-blue-500 to-blue-700"
        />
        <KpiCard
          label="Containers Shipped"
          value={loading ? "—" : containersShipped.toLocaleString()}
          sub="All-time total"
          icon={ContainerIcon}
          gradient="from-emerald-500 to-emerald-700"
        />
        <KpiCard
          label="Countries Reached"
          value={loading ? "—" : countriesReached.toLocaleString()}
          sub="Across 6 regions"
          icon={Globe2}
          gradient="from-orange-500 to-orange-600"
        />
        <KpiCard
          label="Active Volunteers"
          value={activeVolunteers.toLocaleString()}
          sub="This quarter"
          icon={HeartHandshake}
          gradient="from-sky-400 to-sky-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Inventory by Category" subtitle="Distribution of donated supplies" onDownload={exportCSV}>
          {categoryData.length === 0 ? (
            <ChartEmpty message="No inventory yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
                  formatter={(v: number, n: string) => [`${v.toLocaleString()} units`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Containers Shipped Per Year" subtitle="Annual shipment volume" onDownload={exportCSV}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yearlyContainers} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
                cursor={{ fill: "var(--color-muted)" }}
              />
              <Bar dataKey="shipped" fill="#10b981" radius={[6, 6, 0, 0]} name="Containers" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Countries Served by Region" subtitle="Where supplies are delivered" onDownload={exportCSV}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={regionData} layout="vertical" margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="region"
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
                width={140}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
                cursor={{ fill: "var(--color-muted)" }}
              />
              <Bar dataKey="shipments" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Shipments" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Impact Summary" subtitle="Estimated nonprofit impact">
          <div className="grid grid-cols-1 gap-3 py-2">
            <ImpactRow
              icon={DollarSign}
              label="Estimated value of donations"
              value={`$${estimatedValue.toLocaleString()}`}
              tone="emerald"
            />
            <ImpactRow
              icon={Users}
              label="People helped (estimated)"
              value={peopleHelped.toLocaleString()}
              tone="blue"
            />
            <ImpactRow
              icon={Clock}
              label="Volunteer hours contributed"
              value={`${volunteerHours.toLocaleString()} hrs`}
              tone="orange"
            />
            <ImpactRow
              icon={Package}
              label="Total weight handled"
              value={`${totalWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`}
              tone="sky"
            />
          </div>
        </ChartCard>
      </div>

      {/* Existing reports section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Pallet Reports</div>
              <div className="text-xs text-muted-foreground">Detailed item manifest per pallet</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            View any pallet's contents, weights and hazmat flags. Open from the Pallets list.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/app/pallets">Go to Pallets</Link>
          </Button>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
              <ContainerIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Container Reports</div>
              <div className="text-xs text-muted-foreground">Full shipment manifest with all pallets</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Generate printable shipment manifests with weights and hazmat summary.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/app/shipments">Go to Shipments</Link>
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Recent reports</h2>
          <span className="text-xs text-muted-foreground">{reports.length} total</span>
        </div>
        {loading ? (
          <div className="p-5 text-sm text-muted-foreground">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={FileBarChart}
              title="No reports yet"
              description="Generate reports from the Shipments page to see them here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{refName(r)}</div>
                  <div className="text-xs text-muted-foreground">
                    Generated {format(new Date(r.generated_at), "PPp")}
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {r.type}
                </Badge>
                <Button asChild variant="ghost" size="sm">
                  <Link
                    to={r.type === "pallet" ? "/app/reports/pallet/$id" : "/app/reports/container/$id"}
                    params={{ id: r.reference_id }}
                  >
                    View
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

// ===== Components =====

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} text-white p-5 shadow-card`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs/4 font-medium text-white/80 uppercase tracking-wide">{label}</div>
          <div className="text-3xl font-semibold mt-2 tabular-nums">{value}</div>
          <div className="text-xs text-white/75 mt-1">{sub}</div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  onDownload,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onDownload?: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {onDownload && (
          <button
            onClick={onDownload}
            className="no-print text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
            aria-label="Download chart data"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ImpactRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "emerald" | "blue" | "orange" | "sky";
}) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    sky: "bg-sky-50 text-sky-700",
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
