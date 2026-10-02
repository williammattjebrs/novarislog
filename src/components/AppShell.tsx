import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, PackageSearch, Radar,  Wallet, Settings,
  Radio, Bell, Search, LogOut,
} from "lucide-react";
import { useAuth, ROLE_LABEL, canAccess, type Role } from "@/lib/auth";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const NAV: NavItem[] = [
  { to: "/", label: "Torre de controle", icon: LayoutDashboard, exact: true },
  { to: "/clientes", label: "Clientes & CRM", icon: Users },
  { to: "/coletas", label: "Coletas & Ordens", icon: PackageSearch },
  { to: "/monitoramento", label: "Monitoramento", icon: Radar },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const role: Role = user?.role ?? "operacao";

  const items = NAV.filter((i) => user && canAccess(role, i.to));

  return (
    <div className="min-h-screen text-foreground flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="relative h-9 w-9 rounded-md bg-primary/10 border border-primary/30 grid place-items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_16px] shadow-primary" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold tracking-wide">NOVARIS</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">TMS</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Núcleo</div>
          {items.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary border border-primary/30"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
                ].join(" ")}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className="flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 rounded-md px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/40 grid place-items-center text-xs font-semibold text-accent">
                {user.nome.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{user.nome}</div>
                <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</div>
              </div>
              <button onClick={logout} className="text-muted-foreground hover:text-danger" title="Sair">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 md:px-6 sticky top-0 z-20">
          <div className="md:hidden font-display font-semibold">NOVARIS</div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-success" />
            <span>Perfil: <span className="text-foreground font-medium">{user ? ROLE_LABEL[role] : "—"}</span></span>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-1.5 min-w-[280px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input className="bg-transparent outline-none text-sm placeholder:text-muted-foreground w-full" placeholder="Buscar pedido, placa, CTe, cliente…" />
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1">⌘K</kbd>
          </div>
          <button className="relative h-9 w-9 grid place-items-center rounded-md border border-border bg-panel hover:bg-elevated">
            <Bell className="h-4 w-4" />
          </button>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
