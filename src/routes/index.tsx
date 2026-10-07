import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { BrazilMap } from "@/components/BrazilMap";
import { useOrders, useInvoices, useExpenses } from "@/lib/mock-store";
import { useAuth, ROLE_LABEL } from "@/lib/auth";
import { fmtBRL, stageLabel, statusTone, toneClass } from "@/lib/mock-data";
import {
  PackageCheck, Timer, AlertTriangle, DollarSign, Radio, ArrowRight,
} from "lucide-react";

import { financialAccess } from "@/lib/permissions";
import { financeSummary } from "@/lib/finance-summary";
import { useConfig } from "@/lib/mock-store";
import { monthKey } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Torre de Controle | Novaris" },
      { name: "description", content: "Visão consolidada em tempo real de entregas, ocorrências, receita e ordens ativas." },
      { property: "og:title", content: "Torre de Controle | Novaris" },
      { property: "og:description", content: "Visão consolidada em tempo real de entregas, ocorrências, receita e ordens ativas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate path="/">
      <Dashboard />
    </RoleGate>
  ),
});

function Dashboard() {
  const { user } = useAuth();
  const canSeeFinance = financialAccess(user);
  const month = new Date().toISOString().slice(0,7);
  const orders = useOrders();
  const invoices = useInvoices();
  const expenses = useExpenses();
  const [cfg]=useConfig();
  const summary=financeSummary(month,invoices.list,expenses.list,orders.list,cfg.frota);

  const ativos = orders.list.filter((o) => !["entregue"].includes(o.stage));
  const entregues = orders.list.filter((o) => o.stage === "entregue");
  const ocorrencias = orders.list.filter((o) => o.stage === "ocorrencia" || o.stage === "cte_divergente");
  const receitaMes = invoices.list.filter(i => monthKey(i.competencia ?? i.emissao) === month).reduce((s, i) => s + i.valor, 0);
  const despesaMes = summary.custo;

  const kpis = [
    { l: "Entregas ativas", v: String(ativos.length), icon: PackageCheck, tone: "text-primary" },
    { l: "Entregas concluídas", v: String(entregues.length), icon: Timer, tone: "text-success" },
    { l: "Ocorrências/divergências", v: String(ocorrencias.length), icon: AlertTriangle, tone: "text-danger" },
    ...(canSeeFinance ? [{ l: "Receita faturada (mês)", v: fmtBRL(receitaMes), icon: DollarSign, tone: "text-success" }] : []),
  ];

  return (
    <AppShell>
      <div className="relative">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="relative p-4 md:p-6 space-y-6">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Torre de controle · tempo real</div>
              <h1 className="mt-1 text-2xl md:text-3xl font-semibold">
                Olá, {user?.nome ?? "operador"}.{" "}
                <span className="text-muted-foreground">{ativos.length} ordens ativas agora.</span>
              </h1>
              <div className="text-xs text-muted-foreground mt-1">Perfil: {user ? ROLE_LABEL[user.role] : "—"}</div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Radio className="h-3.5 w-3.5 text-success" />
              <span>feed tempo real</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.l} className="panel p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.l}</div>
                    <Icon className={`h-4 w-4 ${k.tone}`} />
                  </div>
                  <div className="mt-3 num text-3xl">{k.v}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="panel lg:col-span-2 p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Mapa do Brasil</div>
                  <div className="font-display text-lg">Destinos das entregas · não indica GPS</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> em viagem</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> pendente</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" /> ocorrência</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> entregue</span>
                </div>
              </div>
              <BrazilMap orders={orders.list} />
              {orders.list.length === 0 && (
                <div className="p-4 text-xs text-muted-foreground border-t border-border">
                  Nenhuma ordem cadastrada. Vá em <Link to="/coletas" className="text-primary hover:underline">Coletas & Ordens</Link> para importar XMLs e criar as primeiras ordens.
                </div>
              )}
            </div>

            <div className="panel p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Precisam de ação</div>
                  <div className="font-display text-lg">Ocorrências</div>
                </div>
                <span className="num text-xs text-danger bg-danger/10 border border-danger/30 rounded px-2 py-0.5">{ocorrencias.length}</span>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {ocorrencias.slice(0, 6).map((o) => (
                  <li key={o.id} className="py-2.5 flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-danger" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{o.id} · {o.clienteNome}</div>
                      <div className="text-xs text-muted-foreground truncate">{stageLabel(o.stage)} · {o.cidadeEntrega}/{o.ufEntrega}</div>
                    </div>
                    <Link to="/monitoramento" className="text-xs text-primary hover:underline">tratar</Link>
                  </li>
                ))}
                {ocorrencias.length === 0 && (
                  <li className="py-8 text-center text-xs text-muted-foreground">Nenhuma ocorrência em aberto.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Últimas ordens</div>
                <div className="font-display text-lg">Fluxo geral</div>
              </div>
              <Link to="/coletas" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-normal py-2">Ordem</th>
                    <th className="text-left font-normal">Cliente</th>
                    <th className="text-left font-normal">Rota</th>
                    {canSeeFinance && <th className="text-right font-normal">Valor</th>}
                    <th className="text-left font-normal">Estágio</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.list.slice(0, 8).map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="py-2.5 num text-primary">{o.id}</td>
                      <td>{o.clienteNome}</td>
                      <td className="text-muted-foreground text-xs">{o.cidadeColeta}/{o.ufColeta} → {o.cidadeEntrega}/{o.ufEntrega}</td>
                      {canSeeFinance && <td className="text-right num text-xs">{fmtBRL(o.valorFrete)}</td>}
                      <td>
                        <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(o.stage))}`}>
                          {stageLabel(o.stage)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orders.list.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">Nenhuma ordem ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {canSeeFinance && <div className="mt-4 text-xs text-muted-foreground flex gap-4">
              <span>Custos e despesas (mês): <span className="num text-foreground">{fmtBRL(despesaMes)}</span></span>
              <span>Resultado gerencial: <span className={`num ${receitaMes - despesaMes >= 0 ? "text-success" : "text-danger"}`}>{fmtBRL(receitaMes - despesaMes)}</span></span>
            </div>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
