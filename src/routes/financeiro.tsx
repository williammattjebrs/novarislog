// Módulo 5 — Financeiro completo.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Plus, AlertTriangle, Search, Download, Printer, FileWarning } from "lucide-react";
import { useInvoices, useExpenses, useExpenseGroups, useOrders, useConfig, newId } from "@/lib/mock-store";
import { exportCsv, printReport } from "@/lib/export-utils";
import { calcOrderCost } from "@/lib/cost-calc";
import { Conciliacao, DreBalancete } from "@/components/FinanceReports";
import { QuickBaixa } from "@/components/QuickBaixa";
import { useEmpresaFiltro, filtrarFin } from "@/lib/empresa-filter";
import { fmtBRL, statusTone, toneClass, type Expense, type ExpenseType, type ExpenseArea } from "@/lib/mock-data";

import { financeSummary, costKnown } from "@/lib/finance-summary";
import { financialState } from "@/lib/reliability";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro | Novaris" },
      { name: "description", content: "Receitas, despesas fixas/variáveis, fluxo de caixa, rentabilidade por cliente e por área." },
      { property: "og:title", content: "Financeiro | Novaris" },
      { property: "og:description", content: "Receitas, despesas fixas/variáveis, fluxo de caixa, rentabilidade por cliente e por área." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate path="/financeiro">
      <FinanceiroPage />
    </RoleGate>
  ),
});

function FinanceiroPage() {
  const invoices0 = useInvoices();
  const expenses0 = useExpenses();
  const [empresaF] = useEmpresaFiltro();
  const invoices = { ...invoices0, list: filtrarFin(empresaF, invoices0.list) };
  const expenses = { ...expenses0, list: filtrarFin(empresaF, expenses0.list) };
  const [baixa, setBaixa] = useState<null | { kind: "rec"; id: string } | { kind: "pag"; id: string }>(null);
  const expGroups = useExpenseGroups();
  const [novoGrupo, setNovoGrupo] = useState("");
  const orders = useOrders();
  const [cfg] = useConfig();
  const [tab, setTab] = useState<"receitas" | "despesas" | "conciliacao" | "dre" | "rentabilidade" | "divergencias">("receitas");
  const [showNew, setShowNew] = useState(false);

  const summary=financeSummary(new Date().toISOString().slice(0,7),invoices.list,expenses.list,orders.list,cfg.frota);
  const totalReceita=summary.faturada, totalDespesa=summary.custo, emAtraso=summary.vencida, receber=summary.aberta;
  const divergencias=orders.list.filter(o=>financialState(o)==="divergente" || (o.cteChave && financialState(o)==="pendente"));
  const porTipo = expenses.list.reduce<Record<ExpenseType, number>>(
    (acc, e) => { acc[e.tipo] = (acc[e.tipo] ?? 0) + e.valor; return acc; },
    { fixa: 0, variavel: 0, frete_terceiros: 0, administrativa: 0 },
  );

  // Rentabilidade por ordem
  const orderMargin = orders.list.map((o) => {
    const custo = calcOrderCost(o.costs, cfg.frota, o.valorFrete).total;
    return { pendente:!costKnown(o), id: o.id, cliente: o.clienteNome, receita: o.cteValor ?? o.valorFrete, custo, margem: (o.cteValor ?? o.valorFrete) - custo };
  });
  const porCliente = orderMargin.reduce<Record<string, { rec: number; custo: number }>>((acc, o) => {
    acc[o.cliente] = acc[o.cliente] ?? { rec: 0, custo: 0 };
    acc[o.cliente].rec += o.receita;
    acc[o.cliente].custo += o.custo;
    return acc;
  }, {});

  const [busca, setBusca] = useState("");
  const qt = busca.trim().toLowerCase();
  const receitasF = qt
    ? invoices.list.filter((i) => `${i.numero} ${i.clienteNome} ${i.tipo} ${i.status}`.toLowerCase().includes(qt))
    : invoices.list;
  const despesasF = qt
    ? expenses.list.filter((e) => `${e.descricao} ${e.tipo} ${e.area} ${e.fornecedor} ${e.status}`.toLowerCase().includes(qt))
    : expenses.list;

  function tabExport(): [string, string[], (string | number)[][]] {
    if (tab === "receitas")
      return ["Receitas", ["Nº", "Cliente", "Tipo", "Emissão", "Vencimento", "Valor (R$)", "Status"],
        receitasF.map((i) => [i.numero, i.clienteNome, i.tipo, i.emissao, i.vencimento, i.valor, i.status])];
    if (tab === "despesas")
      return ["Despesas", ["Descrição", "Grupo", "Tipo", "Área", "Fornecedor", "Valor (R$)", "Vencimento", "Status"],
        despesasF.map((e) => [e.descricao, e.grupo ?? "", e.tipo, e.area, e.fornecedor, e.valor, e.vencimento, e.status])];
    if (tab === "divergencias")
      return ["Divergências CT-e", ["Ordem", "Cliente", "Valor Ordem (R$)", "Valor CT-e (R$)", "Diferença (R$)", "Divergência (%)"],
        divergencias.map((o) => [o.id, o.clienteNome, o.valorFrete, o.cteValor ?? 0, (o.cteValor ?? 0) - o.valorFrete, o.divergenciaPercent ?? 0])];
    return ["Rentabilidade por cliente", ["Cliente", "Receita (R$)", "Custo (R$)", "Margem (R$)"],
      Object.entries(porCliente).map(([cli, v]) => [cli, v.rec, v.custo, v.rec - v.custo])];
  }
  function exportTabExcel() {
    const [nome, headers, rows] = tabExport();
    exportCsv(`financeiro-${nome.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }
  function exportTabPdf() {
    const [nome, headers, rows] = tabExport();
    printReport(`Financeiro — ${nome}`, `gerado em ${new Date().toLocaleDateString("pt-BR")}`, headers, rows);
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        {summary.custosPendentes>0 && <p role="status" className="text-warning text-sm">Resultado provisório: {summary.custosPendentes} ordens sem custo informado.</p>}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 5</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-1">Receita, despesas, divergências e rentabilidade em tempo real.</p>
          </div>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-3 py-2 text-sm hover:bg-primary/20">
            <Plus className="h-4 w-4" /> Nova despesa
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi icon={TrendingUp} tone="text-success" label="Receita total" v={fmtBRL(totalReceita)} />
          <Kpi icon={TrendingDown} tone="text-danger" label="Despesa total" v={fmtBRL(totalDespesa)} />
          <Kpi icon={Wallet} tone="text-primary" label="A receber" v={fmtBRL(receber)} />
          <Kpi icon={AlertTriangle} tone="text-danger" label="Vencido" v={fmtBRL(emAtraso)} />
          <Kpi icon={FileWarning} tone={divergencias.length ? "text-danger" : "text-success"} label="Divergências CT-e" v={String(divergencias.length)} />
        </div>

        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {([
            ["receitas", "Receitas"],
            ["despesas", "Despesas"],
            ["conciliacao", "Conciliação"],
            ["dre", "Balancete & DRE"],
            ["rentabilidade", "Rentabilidade"],
            ["divergencias", `Divergências CT-e (${divergencias.length})`],
          ] as const).map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >{l}</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar na aba atual" className="input pl-7 text-sm" />
          </div>
          <button onClick={exportTabExcel} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportTabPdf} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated">
            <Printer className="h-4 w-4" /> PDF
          </button>
        </div>

        {tab === "receitas" && (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Nº</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-left font-normal">Tipo</th>
                  <th className="text-left font-normal">Emissão</th>
                  <th className="text-left font-normal">Vencimento</th>
                  <th className="text-right font-normal">Valor</th>
                  <th className="text-left font-normal pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {receitasF.map((i) => (
                  <tr key={i.numero} className="border-t border-border cursor-pointer hover:bg-elevated/50" title="Clique para informar recebimento" onClick={() => i.id && setBaixa({ kind: "rec", id: i.id })}>
                    <td className="px-4 py-2.5 num text-primary text-xs">{i.numero}</td>
                    <td className="text-xs">{i.clienteNome}</td>
                    <td className="text-xs">{i.tipo}</td>
                    <td className="num text-xs">{i.emissao}</td>
                    <td className="num text-xs">{i.vencimento}</td>
                    <td className="text-right num">{fmtBRL(i.valor)}</td>
                    <td className="pr-4"><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(i.status))}`}>{i.status}</span></td>
                  </tr>
                ))}
                {receitasF.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">Sem receitas. Emissão automática ocorre quando um CT-e é importado em <b>Coletas</b>.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "despesas" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Fixas" v={fmtBRL(porTipo.fixa)} />
              <MiniStat label="Variáveis" v={fmtBRL(porTipo.variavel)} />
              <MiniStat label="Frete terceiros" v={fmtBRL(porTipo.frete_terceiros)} />
              <MiniStat label="Administrativas" v={fmtBRL(porTipo.administrativa)} />
            </div>
            <div className="panel p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Grupos de despesa</div>
              <div className="flex flex-wrap gap-2 items-center">
                {expGroups.list.map((g) => {
                  const tot = expenses.list.filter((e) => e.grupo === g.nome).reduce((s, e) => s + e.valor, 0);
                  return (
                    <span key={g.id} className="inline-flex items-center gap-2 text-xs border border-border rounded px-2 py-1">
                      {g.nome} <span className="num text-muted-foreground">{fmtBRL(tot)}</span>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir o grupo "${g.nome}"?`)) expGroups.set(expGroups.list.filter((x) => x.id !== g.id));
                        }}
                        className="text-muted-foreground hover:text-danger"
                      >×</button>
                    </span>
                  );
                })}
                <input value={novoGrupo} onChange={(e) => setNovoGrupo(e.target.value)} placeholder="Novo grupo (ex.: Marketing)" className="input max-w-[220px] py-1 text-xs" />
                <button
                  onClick={() => {
                    const n = novoGrupo.trim();
                    if (!n || expGroups.list.some((g) => g.nome.toLowerCase() === n.toLowerCase())) return;
                    expGroups.set([...expGroups.list, { id: newId("EG"), nome: n }]);
                    setNovoGrupo("");
                  }}
                  className="text-xs px-2 py-1 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25"
                >+ Criar grupo</button>
              </div>
            </div>
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-normal px-4 py-2.5">Descrição</th>
                    <th className="text-left font-normal">Grupo</th>
                    <th className="text-left font-normal">Tipo</th>
                    <th className="text-left font-normal">Área</th>
                    <th className="text-left font-normal">Fornecedor</th>
                    <th className="text-right font-normal">Valor</th>
                    <th className="text-left font-normal">Vencimento</th>
                    <th className="text-left font-normal pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {despesasF.map((e) => (
                    <tr key={e.id} className="border-t border-border cursor-pointer hover:bg-elevated/50" title="Clique para informar pagamento" onClick={() => setBaixa({ kind: "pag", id: e.id })}>
                      <td className="px-4 py-2.5 text-xs">{e.descricao}</td>
                      <td className="text-xs">{e.grupo ?? "—"}</td>
                      <td className="text-xs">{e.tipo.replace("_", " ")}</td>
                      <td className="text-xs">{e.area}</td>
                      <td className="text-xs">{e.fornecedor}</td>
                      <td className="text-right num">{fmtBRL(e.valor)}</td>
                      <td className="num text-xs">{e.vencimento}</td>
                      <td className="pr-4"><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(e.status))}`}>{e.status}</span></td>
                    </tr>
                  ))}
                  {despesasF.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">Nenhuma despesa cadastrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {baixa && (() => {
          const t = baixa.kind === "rec" ? invoices0.list.find((x) => x.id === baixa.id) : expenses0.list.find((x) => x.id === baixa.id);
          if (!t) return null;
          return <QuickBaixa titulo={baixa.kind === "rec" ? { kind: "rec", t: t as typeof invoices0.list[number] } : { kind: "pag", t: t as Expense }} onClose={() => setBaixa(null)}
            onSave={async (movements, status, data) => {
              if (baixa.kind === "rec") await invoices0.set(invoices0.list.map((i) => (i.id === baixa.id ? { ...i, movements, status: status as "paga" | "aberta", recebidoEm: data } : i)));
              else await expenses0.update(baixa.id, { movements, status: status as "paga" | "prevista", pagoEm: data });
            }} />;
        })()}

        {tab === "conciliacao" && (
          <Conciliacao invoices={invoices.list} setInvoices={invoices.set} expenses={expenses.list} updateExpense={expenses.update} />
        )}

        {tab === "dre" && (
          <DreBalancete invoices={invoices.list} expenses={expenses.list} orders={orders.list} cfg={cfg} />
        )}

        {tab === "rentabilidade" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="panel p-4">
              <div className="font-display text-base mb-3">Por cliente</div>
              <div className="space-y-2">
                {Object.entries(porCliente).map(([cli, v]) => {
                  const margem = v.rec - v.custo;
                  const pct = v.rec > 0 ? (margem / v.rec) * 100 : 0;
                  return (
                    <div key={cli} className="flex justify-between text-sm border-b border-border pb-2">
                      <span>{cli}</span>
                      <div className="text-right">
                        <div className="num">{fmtBRL(v.rec)} <span className="text-muted-foreground text-xs">rec.</span></div>
                        <div className={`num text-xs ${margem >= 0 ? "text-success" : "text-danger"}`}>
                          margem {fmtBRL(margem)} · {pct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(porCliente).length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">Sem ordens ainda.</div>
                )}
              </div>
            </div>
            <div className="panel p-4">
              <div className="font-display text-base mb-3">Ordem × Custo × Margem</div>
              <div className="space-y-1.5 text-xs">
                {orderMargin.slice(0, 20).map((o) => (
                  <div key={o.id} className="grid grid-cols-4 gap-2 border-b border-border pb-1.5">
                    <span className="num text-primary truncate">{o.id.slice(0, 10)}</span>
                    <span className="num text-right">{fmtBRL(o.receita)}</span>
                    <span className="num text-right text-accent">{o.pendente ? "Pendente" : fmtBRL(o.custo)}</span>
                    <span className={`num text-right ${o.margem >= 0 ? "text-success" : "text-danger"}`}>{o.pendente ? "Pendente" : fmtBRL(o.margem)}</span>
                  </div>
                ))}
                {orderMargin.length === 0 && <div className="text-muted-foreground text-center py-6">Sem dados.</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "divergencias" && (
          <div className="panel overflow-x-auto">
            <div className="p-4 border-b border-border text-sm">
              Ordens onde o valor do CT-e diverge da ordem de coleta acima da tolerância (±{cfg.toleranciaDivergenciaPercent}%).
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Ordem</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-right font-normal">Ordem</th>
                  <th className="text-right font-normal">CT-e</th>
                  <th className="text-right font-normal">Diff</th>
                  <th className="text-right font-normal pr-4">%</th>
                </tr>
              </thead>
              <tbody>
                {divergencias.map((o) => {
                  const diff = (o.cteValor ?? 0) - o.valorFrete;
                  return (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-4 py-2.5 num text-primary text-xs">{o.id.slice(0, 12)}</td>
                      <td className="text-xs">{o.clienteNome}</td>
                      <td className="text-right num text-xs">{fmtBRL(o.valorFrete)}</td>
                      <td className="text-right num text-xs">{fmtBRL(o.cteValor ?? 0)}</td>
                      <td className={`text-right num text-xs ${diff > 0 ? "text-accent" : "text-info"}`}>{fmtBRL(diff)}</td>
                      <td className="text-right num text-xs text-danger pr-4">{o.divergenciaPercent?.toFixed(2)}%</td>
                    </tr>
                  );
                })}
                {divergencias.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">Nenhuma divergência acima da tolerância.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewExpenseModal onClose={() => setShowNew(false)} onSave={(e) => { expenses.add(e); setShowNew(false); }} />
      )}
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, v, tone }: { icon: typeof Wallet; label: string; v: string; tone: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="num text-2xl mt-2">{v}</div>
    </div>
  );
}

function MiniStat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="num text-base mt-1">{v}</div>
    </div>
  );
}

function NewExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (e: Expense) => void }) {
  const expGroups = useExpenseGroups();
  const [grupo, setGrupo] = useState("");
  const [desc, setDesc] = useState("");
  const [tipo, setTipo] = useState<ExpenseType>("fixa");
  const [area, setArea] = useState<ExpenseArea>("operacao");
  const [fornecedor, setFornecedor] = useState("");
  const [valor, setValor] = useState(0);
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-lg mb-3">Nova despesa</div>
        <div className="space-y-3">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" className="input" />
          <div className="grid grid-cols-2 gap-3">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as ExpenseType)} className="input">
              <option value="fixa">Fixa</option>
              <option value="variavel">Variável</option>
              <option value="frete_terceiros">Frete terceiros</option>
              <option value="administrativa">Administrativa</option>
            </select>
            <select value={area} onChange={(e) => setArea(e.target.value as ExpenseArea)} className="input">
              <option value="operacao">Operação</option>
              <option value="frota">Frota</option>
              <option value="administrativa">Administrativa</option>
              <option value="comercial">Comercial</option>
            </select>
          </div>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="input">
            <option value="">Grupo de despesa…</option>
            {expGroups.list.map((g) => <option key={g.id} value={g.nome}>{g.nome}</option>)}
          </select>
          <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Fornecedor" className="input" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} placeholder="Valor" className="input num" />
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="input" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">Cancelar</button>
          <button
            onClick={() => onSave({
              id: newId("DES"), descricao: desc, tipo, area, fornecedor, valor,
              vencimento: new Date(vencimento).toLocaleDateString("pt-BR"),
              status: "prevista", recorrente: tipo === "fixa", grupo: grupo || undefined,
            })}
            className="text-sm px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25"
          >Salvar</button>
        </div>
      </div>
    </div>
  );
}
