import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileBarChart, FileText, Layers, Container as ContainerIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, type Container, type Pallet } from "@/lib/db";
import { format } from "date-fns";

export const Route = createFileRoute("/app/reports/")({
  head: () => ({
    meta: [
      { title: "Reports — MedWare Logistics" },
      { name: "description", content: "View and print pallet and container reports for shipping and audit." },
    ],
  }),
  component: ReportsIndex,
});

type Report = { id: string; type: "pallet" | "container"; reference_id: string; generated_at: string };

function ReportsIndex() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, p, c] = await Promise.all([
        supabase.from("reports").select("*").order("generated_at", { ascending: false }),
        supabase.from("pallets").select("*"),
        supabase.from("containers").select("*"),
      ]);
      setReports((r.data ?? []) as Report[]);
      setPallets(p.data ?? []);
      setContainers(c.data ?? []);
      setLoading(false);
    })();
  }, []);

  const refName = (r: Report) => {
    if (r.type === "pallet") return pallets.find((p) => p.id === r.reference_id)?.name ?? "Deleted pallet";
    return containers.find((c) => c.id === r.reference_id)?.name ?? "Deleted container";
  };

  return (
    <AppShell title="Reports" subtitle={`${reports.length} generated reports`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Pallet Reports</div>
              <div className="text-xs text-muted-foreground">Detailed item manifest per pallet</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">View any pallet's contents, weights and hazmat flags. Open from the Pallets list.</p>
          <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/pallets">Go to Pallets</Link></Button>
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
          <p className="text-sm text-muted-foreground mt-3">Generate printable shipment manifests with weights and hazmat summary.</p>
          <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/shipments">Go to Shipments</Link></Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Recent reports</h2>
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
                  <div className="text-xs text-muted-foreground">Generated {format(new Date(r.generated_at), "PPp")}</div>
                </div>
                <Badge variant="secondary" className="capitalize">{r.type}</Badge>
                <Button asChild variant="ghost" size="sm">
                  <Link to={r.type === "pallet" ? "/reports/pallet/$id" : "/reports/container/$id"} params={{ id: r.reference_id }}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
