import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  PackageSearch,
  Truck,
  Warehouse,
  Building2,
  Radio,
  Bell,
  Search,
  ChevronDown,
} from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: string;
};

const navItems: NavItem[] = [
  { to: "/", label: "Torre de controle", icon: LayoutDashboard, exact: true },
  { to: "/operacao", label: "Operação", icon: PackageSearch, badge: "18" },
  { to: "/frota", label: "Frota & Motoristas", icon: Truck },
  { to: "/armazem", label: "Armazém & Estoque", icon: Warehouse },
  { to: "/comercial", label: "Comercial & Financeiro", icon: Building2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="relative h-9 w-9 rounded-md bg-primary/10 border border-primary/30 grid place-items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_16px] shadow-primary" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold tracking-wide">CARGOHUB</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              ops · v2.4
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Núcleo
          </div>
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as string}
                className={[
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary border border-primary/30"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-4 w-4",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  ].join(" ")}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="num text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="px-2 pt-6 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Monitoramento
          </div>
          <div className="mx-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sinal ao vivo</span>
              <span className="flex items-center gap-1.5 text-[11px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Online
              </span>
            </div>
            <div className="mt-2 num text-2xl">42<span className="text-muted-foreground text-sm"> veíc.</span></div>
            <div className="text-[11px] text-muted-foreground">rastreando agora</div>
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-sidebar-accent cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/40 grid place-items-center text-xs font-semibold text-accent">
              MO
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">Marina Okabe</div>
              <div className="text-[11px] text-muted-foreground">Admin · CD Guarulhos</div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 md:px-6 sticky top-0 z-20">
          <div className="md:hidden font-display font-semibold">CARGOHUB</div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-success" />
            <span>Turno: <span className="text-foreground font-medium">Diurno</span></span>
            <span className="text-border">·</span>
            <span>CD ativo: <span className="text-foreground font-medium">Guarulhos</span></span>
            <span className="text-border">·</span>
            <span>SLA D: <span className="num text-success">97.4%</span></span>
          </div>

          <div className="flex-1" />

          <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-1.5 min-w-[280px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="bg-transparent outline-none text-sm placeholder:text-muted-foreground w-full"
              placeholder="Buscar pedido, placa, CTe, cliente…"
            />
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1">⌘K</kbd>
          </div>

          <button className="relative h-9 w-9 grid place-items-center rounded-md border border-border bg-panel hover:bg-elevated">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent shadow-[0_0_10px] shadow-accent" />
          </button>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
