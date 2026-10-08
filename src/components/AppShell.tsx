import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, PackageSearch, Radar, Wallet, Settings, UserCog,
  Radio, Bell, Search, LogOut, BookOpen, Route as RouteIcon, Truck, Menu, X, MapPin, Upload, Building2, BarChart3,
} from "lucide-react";
import logo from "@/assets/novaris-logo.png.asset.json";
import simbolo from "@/assets/novaris-simbolo.png.asset.json";
import { useAuth, ROLE_LABEL, canAccess, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useClients, useOrders, useOrdensColeta, useEmpresas } from "@/lib/mock-store";
import { useEmpresaFiltro } from "@/lib/empresa-filter";
import { ocAtivaDaNf, isEmitida } from "@/lib/oc-model";
import { SyncStatus } from "./SyncStatus";
import { financialState } from "@/lib/reliability";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const NAV: NavItem[] = [
  { to: "/", label: "Torre de controle", icon: LayoutDashboard, exact: true },
  { to: "/clientes", label: "Clientes & CRM", icon: Users },
  { to: "/importacao", label: "Importação", icon: Upload },
  { to: "/ordens-coleta", label: "Ordens de coleta", icon: PackageSearch },
  { to: "/rotas", label: "Acompanhamento de Coleta", icon: RouteIcon },
  { to: "/locais-operacionais", label: "Locais operacionais", icon: MapPin },
  { to: "/motoristas", label: "Motoristas & Veículos", icon: Truck },
  { to: "/monitoramento", label: "Monitoramento", icon: Radar },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/relatorios", label: "Relatórios gerenciais", icon: BarChart3 },
  { to: "/empresas", label: "Empresas do grupo", icon: Building2 },
  { to: "/tv", label: "Indicadores (TV)", icon: Radio },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/usuarios", label: "Usuários & acessos", icon: UserCog },
  { to: "/manual", label: "Manual de uso", icon: BookOpen },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const orders = useOrders();
  const clients = useClients();
  const ocs = useOrdensColeta();
  const role: Role = user?.role ?? "operacao";
  const empresas = useEmpresas();
  const [empresaF, setEmpresaF] = useEmpresaFiltro();

  const items = NAV.filter((i) => user && canAccess(role, i.to, user?.modulos));
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const results = query ? [
    ...orders.list.filter(o => [o.id,o.numeroNFe,o.cteNumero,o.cteChave,...(o.cteChaves ?? []),o.clienteNome,o.placa].join(" ").toLocaleLowerCase("pt-BR").includes(query)).map(o => ({ id: o.id, label: `NF ${o.numeroNFe} · ${o.clienteNome}`, to: canAccess(role,"/rotas",user?.modulos) ? "/rotas" : "/monitoramento", record: o.id })),
    ...clients.list.filter(c => [c.nome,...c.cnpjs.map(x => x.cnpj)].join(" ").toLowerCase().includes(query)).map(c => ({ id:c.id,label:c.nome,to:"/clientes",record:c.id })),
    ...ocs.list.filter(o => [o.id,o.numero,o.clienteNome,o.clienteColetaNome,o.clienteDescargaNome,o.localColeta,o.localEntrega].join(" ").toLowerCase().includes(query)).map(o => ({ id:o.id,label:`${o.numero} · ${o.clienteColetaNome ?? o.clienteNome}`,to:canAccess(role,"/ordens-coleta",user?.modulos) || !isEmitida(o) ? "/ordens-coleta" : "/monitoramento",record:o.id })),
  ].filter(r => canAccess(role,r.to,user?.modulos)).slice(0,12) : [];
  const notices = orders.list.map(o => ({ order:o, label: !o.clienteId ? "Cliente não vinculado" : !o.valorFrete || !o.origemValor ? "Frete pendente" : !ocAtivaDaNf(ocs.list, o.id) ? "Sem OC" : !ocs.list.some(oc => oc.orderIds.includes(o.id) && isEmitida(oc)) ? "OC não emitida" : !o.cteChave ? "Documento pendente" : financialState(o)==="pendente" ? "Conferência pendente" : o.stage!=="entregue" && o.previsaoEntrega && Date.parse(o.previsaoEntrega)<Date.now() ? "Entrega atrasada" : !o.costs?.execMode ? "Custo pendente" : "" })).filter(x => x.label);

  return (
    <div className="min-h-screen text-foreground flex">
      <aside className={`${mobileOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} md:static md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground`}>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-sidebar-border">
          <img src={logo.url} alt="Novaris — Operador Logístico Integrado" className="h-10 w-auto" />
          <Button className="md:hidden" size="icon" variant="ghost" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></Button>
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
              <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-danger" title="Sair" aria-label="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 md:px-6 sticky top-0 z-20">
          <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
          <img src={simbolo.url} alt="Novaris" className="md:hidden h-8 w-8 rounded" />
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-success" />
            <span>Perfil: <span className="text-foreground font-medium">{user ? ROLE_LABEL[role] : "—"}</span></span>
          </div>
          <select aria-label="Filtrar por empresa" title="Empresa do grupo" value={empresaF} onChange={(e) => setEmpresaF(e.target.value)} className="ml-2 max-w-48 bg-panel border border-border rounded-md px-2 py-1.5 text-xs">
            <option value="">Empresa: todas</option>
            {empresas.list.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            <option value="__sem">Sem empresa vinculada</option>
          </select>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" asChild title="Manual de uso">
            <Link to="/manual" search={{ modulo: "torre" }} aria-label="Manual de uso"><BookOpen className="h-4 w-4" /></Link>
          </Button>
          <div className="relative flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-1.5 w-full max-w-sm min-w-0">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input aria-label="Busca global" value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none text-sm placeholder:text-muted-foreground w-full min-w-0" placeholder="NF, CT-e, cliente, placa, OC…" />
            {query && <div className="absolute top-full right-0 mt-2 w-full max-h-80 overflow-auto bg-panel border border-border rounded-md shadow-lg z-50">{results.length ? results.map(r => <Link key={r.id} to={r.to} search={{ registro: r.record }} onClick={() => setSearch("")} className="block p-3 text-xs hover:bg-elevated">{r.label}</Link>) : <p className="p-3 text-xs text-muted-foreground">Nenhum registro autorizado encontrado.</p>}</div>}
          </div>
          <Button variant="outline" size="icon" className="relative shrink-0" title="Central de pendências" aria-label="Central de pendências" onClick={() => setNoticeOpen(!noticeOpen)}>
            <Bell className="h-4 w-4" />
          </Button>
          {noticeOpen && <div className="absolute top-16 right-4 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-auto border border-border bg-panel rounded-md shadow-lg"><h2 className="p-3 font-semibold">Pendências ({notices.length})</h2>{notices.slice(0,30).map(n => <Link key={n.order.id} to={canAccess(role,"/rotas",user?.modulos) ? "/rotas" : "/monitoramento"} search={{registro:n.order.id}} className="block border-t border-border p-3 text-xs" onClick={() => setNoticeOpen(false)}>{n.label} · NF {n.order.numeroNFe}<div className="text-muted-foreground">{n.order.clienteNome}</div></Link>)}{!notices.length && <p className="p-3 text-xs text-muted-foreground">Nenhuma pendência disponível.</p>}</div>}
        </header>
        <div className="px-4 md:px-6 border-b border-border"><SyncStatus /></div>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
