import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Package, Layers, Container as ContainerIcon, FileBarChart, Search, Boxes } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/pallets", label: "Pallets", icon: Layers },
  { to: "/shipments", label: "Shipments", icon: ContainerIcon },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

export function AppShell({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar no-print">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sidebar-foreground">MedWare</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">Logistics</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as "/"}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="rounded-lg bg-primary-soft p-3 text-xs">
            <div className="font-medium text-primary">MSNI Operations</div>
            <div className="text-muted-foreground mt-0.5">Medical Supplies Network Inc.</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-8 no-print">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-sm text-muted-foreground w-64">
              <Search className="h-4 w-4" />
              <span>Search…</span>
            </div>
            <div className="flex items-center gap-2.5 pl-3 border-l border-border">
              <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">EM</div>
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-medium">Employee</div>
                <div className="text-[11px] text-muted-foreground">Full access</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">
          {actions && <div className="mb-6 flex flex-wrap gap-2 justify-end no-print">{actions}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
