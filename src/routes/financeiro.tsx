import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, PieChart } from "lucide-react";
import {
  invoices,
  expenses,
  clients,
  cashflowSeries,
  statusTone,
  toneClass,
  type ExpenseType,
  type ExpenseArea,
} from "@/lib/mock-data";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro | CargoHub" },
      { name: "description", content: "Controle financeiro completo: receita de fretes, despesas fixas, variáveis, subcontratação, fluxo de caixa e rentabilidade por área e cliente." },
    ],
  }),
  component: FinanceiroPage,
});

type Tab = "visao" | "receitas" | "despesas" | "fluxo" | "resultado";

function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("visao");

  const receitaMes = invoices.reduce((s, i) => s + i.valor, 0);
  const despesaMes = expenses.reduce((s, e) => s + e.valor, 0);
  const aReceber = invoices.filter(i => i.status === "aberta" || i.status === "emitida").reduce((s, i) => s + i.valor, 0);
  const vencidas = invoices.filter(i => i.status === "vencida").reduce((s, i) => s + i.valor, 0);
  const margem = receitaMes - despesaMes;
  const margemPct = (margem / receitaMes) * 100;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 5</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" /> Financeiro
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Receitas de frete, despesas por natureza, fluxo de caixa e rentabilidade em tempo real</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <BigKpi l="Receita do mês" v={`R$ ${(receitaMes/1000).toFixed(0)}k`} icon={TrendingUp} tone="success" delta="+8.2%" up />
          <BigKpi l="Despesa do mês" v={`R$ ${(despesaMes/1000).toFixed(0)}k`} icon={TrendingDown} tone="danger" delta="+4.1%" up={false} />
          <BigKpi l="Margem" v={`R$ ${(margem/1000).toFixed(0)}k`} icon={DollarSign} tone={margem>0?"success":"danger"} delta={`${margemPct.toFixed(1)}%`} up={margem>0} />
          <BigKpi l="A receber" v={`R$ ${(aReceber/1000).toFixed(0)}k`} icon={Wallet} tone="cyan" delta={`${invoices.filter(i=>i.status!=="paga"&&i.status!=="vencida").length} títulos`} />
          <BigKpi l="Vencidas" v={`R$ ${(vencidas/1000).toFixed(0)}k`} icon={PieChart} tone="danger" delta="cobrança" />
        </div>

        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {([
            ["visao","Visão geral"],
            ["receitas","Receitas · Fretes"],
            ["despesas","Despesas"],
            ["fluxo","Fluxo de caixa"],
            ["resultado","Resultado por área/cliente"],
          ] as [Tab,string][]).map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${tab===t?"border-primary text-primary":"border-transparent text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === "visao" && <VisaoGeral />}
        {tab === "receitas" && <Receitas />}
        {tab === "despesas" && <Despesas />}
        {tab === "fluxo" && <FluxoCaixa />}
        {tab === "resultado" && <Resultado />}
      </div>
    </AppShell>
  );
}

function BigKpi({ l, v, icon: Icon, tone, delta, up }: { l: string; v: string; icon: typeof Wallet; tone: "success" | "danger" | "cyan"; delta: string; up?: boolean }) {
  const color = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-primary";
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`num text-2xl md:text-3xl mt-2 ${color}`}>{v}</div>
      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
        {up === true && <ArrowUpRight className="h-3 w-3 text-success" />}
        {up === false && <ArrowDownRight className="h-3 w-3 text-danger" />}
        {delta}
      </div>
    </div>
  );
}

function VisaoGeral() {
  const byType: Record<ExpenseType, number> = { fixa: 0, variavel: 0, frete_terceiros: 0, administrativa: 0 };
  expenses.forEach(e => { byType[e.tipo] += e.valor; });
  const total = Object.values(byType).reduce((a,b) => a+b, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel p-4">
        <div className="font-display text-lg mb-3">Despesas por natureza</div>
        <div className="space-y-3">
          {(Object.entries(byType) as [ExpenseType, number][]).map(([k, v]) => {
            const pct = (v / total) * 100;
            const label = { fixa: "Fixas", variavel: "Variáveis", frete_terceiros: "Frete terceiros", administrativa: "Administrativas" }[k];
            return (
              <div key={k}>
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="num">R$ {(v/1000).toFixed(0)}k <span className="text-muted-foreground text-xs">({pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-1.5 mt-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="panel p-4">
        <div className="font-display text-lg mb-3">Fluxo semanal</div>
        <CashflowChart />
      </div>
    </div>
  );
}

function Receitas() {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left font-normal px-4 py-2.5">Documento</th>
            <th className="text-left font-normal">Cliente</th>
            <th className="text-left font-normal">Tipo</th>
            <th className="text-left font-normal">Emissão</th>
            <th className="text-left font-normal">Vencimento</th>
            <th className="text-right font-normal">Valor</th>
            <th className="text-left font-normal pl-4 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.numero} className="border-t border-border hover:bg-elevated/50">
              <td className="px-4 py-3 num text-primary text-xs">{i.numero}</td>
              <td className="font-medium">{i.cliente}</td>
              <td className="text-xs text-muted-foreground">{i.tipo}</td>
              <td className="num text-xs">{i.emissao}</td>
              <td className={`num text-xs ${i.status==="vencida"?"text-danger":""}`}>{i.vencimento}</td>
              <td className="text-right num">R$ {i.valor.toLocaleString("pt-BR")}</td>
              <td className="pl-4 pr-4"><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(i.status))}`}>{i.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Despesas() {
  const [tipo, setTipo] = useState<ExpenseType | "todas">("todas");
  const list = tipo === "todas" ? expenses : expenses.filter(e => e.tipo === tipo);
  const labels: Record<ExpenseType, string> = { fixa: "Fixas", variavel: "Variáveis", frete_terceiros: "Frete terceiros", administrativa: "Administrativas" };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTipo("todas")} className={`px-3 py-1.5 text-xs rounded-md border ${tipo==="todas"?"border-primary/50 bg-primary/10 text-primary":"border-border"}`}>Todas</button>
        {(Object.keys(labels) as ExpenseType[]).map(k => (
          <button key={k} onClick={() => setTipo(k)} className={`px-3 py-1.5 text-xs rounded-md border ${tipo===k?"border-primary/50 bg-primary/10 text-primary":"border-border"}`}>
            {labels[k]}
          </button>
        ))}
        <div className="flex-1" />
        <button className="px-3 py-1.5 text-xs rounded-md border border-primary/40 bg-primary/10 text-primary">+ Nova despesa</button>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-normal px-4 py-2.5">Descrição</th>
              <th className="text-left font-normal">Tipo</th>
              <th className="text-left font-normal">Área</th>
              <th className="text-left font-normal">Fornecedor</th>
              <th className="text-left font-normal">Vencimento</th>
              <th className="text-right font-normal">Valor</th>
              <th className="text-left font-normal pl-4 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-t border-border hover:bg-elevated/50">
                <td className="px-4 py-3">
                  <div className="font-medium">{e.descricao}</div>
                  {e.recorrente && <div className="text-[10px] text-muted-foreground">recorrente</div>}
                </td>
                <td className="text-xs">{labels[e.tipo]}</td>
                <td className="text-xs capitalize">{e.area}</td>
                <td className="text-xs">{e.fornecedor}</td>
                <td className={`num text-xs ${e.status==="vencida"?"text-danger":""}`}>{e.vencimento}</td>
                <td className="text-right num">R$ {e.valor.toLocaleString("pt-BR")}</td>
                <td className="pl-4 pr-4"><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(e.status))}`}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashflowChart() {
  const w = 500, h = 180, pad = 20;
  const maxV = Math.max(...cashflowSeries.flatMap(s => [s.receita, s.despesa]));
  const step = (w - pad*2) / (cashflowSeries.length - 1);
  const y = (v: number) => h - pad - (v / maxV) * (h - pad*2);

  const receitaPts = cashflowSeries.map((s, i) => `${pad + i*step},${y(s.receita)}`).join(" ");
  const despesaPts = cashflowSeries.map((s, i) => `${pad + i*step},${y(s.despesa)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
        <polyline points={receitaPts} fill="none" stroke="var(--success)" strokeWidth="2" />
        <polyline points={despesaPts} fill="none" stroke="var(--danger)" strokeWidth="2" strokeDasharray="4 4" />
        {cashflowSeries.map((s, i) => (
          <text key={s.semana} x={pad + i*step} y={h-4} textAnchor="middle" fontSize="9" fill="oklch(0.6 0.02 260)">{s.semana}</text>
        ))}
      </svg>
      <div className="flex items-center gap-4 text-xs mt-2">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-success" /> Receita</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-danger" /> Despesa</span>
      </div>
    </div>
  );
}

function FluxoCaixa() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="panel p-4 lg:col-span-2">
        <div className="font-display text-lg mb-3">Receita vs. Despesa por semana</div>
        <CashflowChart />
      </div>
      <div className="panel p-4">
        <div className="font-display text-lg mb-3">Saldos</div>
        <table className="w-full text-sm">
          <tbody>
            {cashflowSeries.map(s => {
              const saldo = s.receita - s.despesa;
              return (
                <tr key={s.semana} className="border-t border-border first:border-0">
                  <td className="py-2 num">{s.semana}</td>
                  <td className="text-right num text-success">+{(s.receita/1000).toFixed(0)}k</td>
                  <td className="text-right num text-danger">-{(s.despesa/1000).toFixed(0)}k</td>
                  <td className={`text-right num font-medium ${saldo>0?"text-success":"text-danger"}`}>{(saldo/1000).toFixed(0)}k</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Resultado() {
  const areas: ExpenseArea[] = ["operacao", "armazem", "frota", "administrativa", "comercial"];
  const receitaTotal = invoices.reduce((s, i) => s + i.valor, 0);

  // Aloca receita proporcional simulada por área
  const receitaPorArea: Record<ExpenseArea, number> = {
    operacao: receitaTotal * 0.55,
    armazem: receitaTotal * 0.25,
    frota: receitaTotal * 0.12,
    administrativa: receitaTotal * 0.04,
    comercial: receitaTotal * 0.04,
  };

  const clientesAtivos = clients.filter(c => c.faturamentoMes > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel p-4">
        <div className="font-display text-lg mb-3">Resultado por área</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-normal py-2">Área</th>
              <th className="text-right font-normal">Receita</th>
              <th className="text-right font-normal">Despesa</th>
              <th className="text-right font-normal">Margem</th>
            </tr>
          </thead>
          <tbody>
            {areas.map(a => {
              const desp = expenses.filter(e => e.area === a).reduce((s, e) => s + e.valor, 0);
              const rec = receitaPorArea[a];
              const mrg = rec - desp;
              return (
                <tr key={a} className="border-t border-border">
                  <td className="py-2.5 capitalize">{a}</td>
                  <td className="text-right num text-success">R$ {(rec/1000).toFixed(0)}k</td>
                  <td className="text-right num text-danger">R$ {(desp/1000).toFixed(0)}k</td>
                  <td className={`text-right num font-medium ${mrg>0?"text-success":"text-danger"}`}>R$ {(mrg/1000).toFixed(0)}k</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel p-4">
        <div className="font-display text-lg mb-3">Rentabilidade por cliente</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-normal py-2">Cliente</th>
              <th className="text-right font-normal">Receita</th>
              <th className="text-right font-normal">Custo est.</th>
              <th className="text-right font-normal">Margem</th>
            </tr>
          </thead>
          <tbody>
            {clientesAtivos.map(c => {
              const custo = c.faturamentoMes * 0.72; // 28% margem base simulada
              const mrg = c.faturamentoMes - custo;
              const pct = (mrg / c.faturamentoMes) * 100;
              return (
                <tr key={c.cnpj} className="border-t border-border">
                  <td className="py-2.5 font-medium">{c.nome}</td>
                  <td className="text-right num">R$ {(c.faturamentoMes/1000).toFixed(0)}k</td>
                  <td className="text-right num text-danger">R$ {(custo/1000).toFixed(0)}k</td>
                  <td className={`text-right num font-medium ${pct>20?"text-success":pct>10?"text-accent":"text-danger"}`}>{pct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
