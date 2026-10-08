// Painel de indicadores para TV — tela cheia, sem menu, atualização automática.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useOrders, useConfig, useInvoices, useExpenses, useOrdensColeta } from "@/lib/mock-store";
import { isEmitida } from "@/lib/oc-model";
import { useAuth } from "@/lib/auth";
import { RoleGate } from "@/components/RoleGate";
import { financeSummary } from "@/lib/finance-summary";
import { financialAccess } from "@/lib/permissions";
import { fmtBRL, stageLabel, type Order } from "@/lib/mock-data";
import { calcOrderCost } from "@/lib/cost-calc";
import logo from "@/assets/novaris-logo.png.asset.json";
import { BrazilMap } from "@/components/BrazilMap";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

const tipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)" };

export const Route = createFileRoute("/tv")({
  head: () => ({
    meta: [
      { title: "Indicadores ao vivo | Novaris" },
      { name: "description", content: "Painel de indicadores de transporte da Novaris para exibição em TV." },
      { property: "og:title", content: "Indicadores ao vivo | Novaris" },
      { property: "og:description", content: "Resultado financeiro, entregas no prazo e cargas em trânsito em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RoleGate path="/tv"><TvPage /></RoleGate>,
});

const TRANSITO = ["coleta_agendada", "em_coleta", "coletado", "aguardando_cte", "cte_ok", "cte_divergente", "em_viagem"];
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtK = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

function TvPage() {
  const orders = useOrders();
  const ocs = useOrdensColeta();
  const invoices=useInvoices(), expenses=useExpenses();
  const { user } = useAuth();
  const canSeeFinance = financialAccess(user);
  const [cfg] = useConfig();
  const [now, setNow] = useState<Date | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    setNow(new Date());
    const a = setInterval(() => setNow(new Date()), 1000);
    const b = setInterval(() => tick((t) => t + 1), 30000); // recarrega dados
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  const k = useMemo(() => {
    const list: Order[] = orders.list;
    const mesIni = new Date(); mesIni.setDate(1); mesIni.setHours(0, 0, 0, 0);
    const doMes = list.filter((o) => new Date(o.criadoEm) >= mesIni);
    const receitaOf = (o: Order) => o.cteValor ?? o.valorFrete ?? 0;
    const custoOf = (o: Order) => calcOrderCost(o.costs, cfg.frota, o.valorFrete).total;
    const summary=financeSummary(new Date().toISOString().slice(0,7),invoices.list,expenses.list,list,cfg.frota);
    const receita=summary.faturada, custo=summary.custo;
    const resultado = receita - custo;

    const entregues = list.filter((o) => o.stage === "entregue");
    const comPrev = entregues.filter((o) => o.previsaoEntrega && o.entregueEm);
    const noPrazo = comPrev.filter((o) => !!o.entregueEm && !!o.previsaoEntrega && new Date(o.entregueEm) <= new Date(o.previsaoEntrega + (o.previsaoEntrega.length <= 10 ? "T23:59:59" : ""))).length;
    const transito = list.filter((o) => TRANSITO.includes(o.stage));
    const atrasadas = transito.filter((o) => o.previsaoEntrega && new Date(o.previsaoEntrega) < new Date());
    const ocorr = list.filter((o) => o.stage === "ocorrencia");
    const pend = list.filter((o) => o.stage === "aguarda_vinculacao");
    const diverg = list.filter((o) => o.stage === "cte_divergente");
    const aguardCte = list.filter((o) => o.stage === "aguardando_cte");
    const peso = doMes.reduce((s, o) => s + (o.peso || 0), 0);
    const frota = doMes.filter((o) => o.costs.execMode === "frota").length;
    const terc = doMes.filter((o) => o.costs.execMode === "terceiro").length;

    const porCliente = new Map<string, { r: number; c: number; n: number }>();
    doMes.forEach((o) => {
      const x = porCliente.get(o.clienteNome || "—") ?? { r: 0, c: 0, n: 0 };
      x.r += receitaOf(o); x.c += custoOf(o); x.n++;
      porCliente.set(o.clienteNome || "—", x);
    });
    const topClientes = [...porCliente.entries()].sort((a, b) => b[1].r - a[1].r).slice(0, 6);

    const porEtapa = new Map<string, number>();
    list.forEach((o) => porEtapa.set(o.stage, (porEtapa.get(o.stage) ?? 0) + 1));

    return {
      custosPendentes:summary.custosPendentes, receita, custo, resultado, margem: pct(resultado, receita), ticket: doMes.length ? receita / doMes.length : 0,
      otd: pct(noPrazo, comPrev.length), noPrazo, comPrevN: comPrev.length, entregues: entregues.length,
      transito, atrasadas, ocorr, pend, diverg, aguardCte, total: list.length, mesN: doMes.length, peso,
      custoKg: peso ? custo / peso : 0, frota, terc, topClientes, porEtapa,
    };
  }, [orders.list, cfg, invoices.list, expenses.list]);

  const ch = useMemo(() => {
    const list: Order[] = orders.list;
    const dias: { d: string; key: string; receita: number; custo: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      dias.push({ d: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), key: dt.toDateString(), receita: 0, custo: 0 });
    }
    const ufMap = new Map<string, number>();
    let middle = 0, last = 0, sem = 0;
    list.forEach((o) => {
      const day = dias.find((x) => x.key === new Date(o.criadoEm).toDateString());
      if (day) { day.receita += o.cteValor ?? o.valorFrete ?? 0; day.custo += calcOrderCost(o.costs, cfg.frota, o.valorFrete).total; }
      if (o.ufEntrega) ufMap.set(o.ufEntrega, (ufMap.get(o.ufEntrega) ?? 0) + 1);
      if (o.transportType === "middle") middle++; else if (o.transportType === "last") last++; else sem++;
    });
    const atrasoEntregue = k.comPrevN - k.noPrazo;
    return {
      dias,
      ufs: [...ufMap.entries()].map(([uf, n]) => ({ uf, n })).sort((a, b) => b.n - a.n).slice(0, 8),
      otd: [
        { n: "No prazo", v: k.noPrazo, c: "var(--success)" },
        { n: "Entregue atrasado", v: atrasoEntregue, c: "var(--danger)" },
        { n: "Em trânsito atrasado", v: k.atrasadas.length, c: "var(--warning)" },
      ].filter((x) => x.v > 0).concat(k.comPrevN + k.atrasadas.length === 0 ? [{ n: "Sem dados", v: 1, c: "var(--border)" }] : []),
      tipo: [
        { n: "Middle mile", v: middle, c: "var(--primary)" },
        { n: "Last mile", v: last, c: "var(--success)" },
        { n: "Não definido", v: sem, c: "var(--muted-foreground)" },
      ].filter((x) => x.v > 0).concat(list.length === 0 ? [{ n: "Sem dados", v: 1, c: "var(--border)" }] : []),
    };
  }, [orders.list, cfg, k]);

  if (!now) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <img src={logo.url} alt="Novaris" className="h-12 w-auto" />
        <div className="text-center">
          <h1 className="font-display text-3xl">Indicadores de Transporte</h1>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mês corrente · atualização automática</div>
        </div>
        <div className="text-right num">
          <div className="text-3xl">{now ? now.toLocaleTimeString("pt-BR") : "--:--:--"}</div>
          <div className="text-xs text-muted-foreground">{now ? now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : ""}</div>
        </div>
      </header>

      {canSeeFinance && k.custosPendentes>0 && <p className="text-warning text-sm">Resultado provisório · {k.custosPendentes} ordens sem custo</p>}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {canSeeFinance ? <Big l="Faturamento (mês)" v={fmtBRL(k.receita)} s={`${k.mesN} ordens · ticket ${fmtBRL(k.ticket)}`} /> : <Big l="Operação (mês)" v={`${k.mesN} ordens`} s={`Ticket médio oculto`} />}
        {canSeeFinance ? <Big l="Custo operacional" v={fmtBRL(k.custo)} s={`R$ ${k.custoKg.toFixed(2)}/kg · ${fmtK(k.peso)} kg`} /> : <Big l="Peso movimentado" v={`${fmtK(k.peso)} kg`} s="Custos ocultos" />}
        {canSeeFinance && <Big l="Resultado" v={fmtBRL(k.resultado)} s={`Margem ${fmtPct(k.margem)}`} tone={k.resultado >= 0 ? "text-success" : "text-danger"} />}
        <Big l="Entregas no prazo (OTD)" v={k.comPrevN ? fmtPct(k.otd) : "—"} s={`${k.noPrazo} de ${k.comPrevN} com previsão · ${k.entregues} entregues`} tone={k.otd >= 95 ? "text-success" : k.otd >= 85 ? "text-warning" : "text-danger"} />
      </section>

      <section className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        <Mid l="OCs em execução" v={ocs.list.filter((o) => isEmitida(o) && o.status !== "entregue").length} tone="text-primary" />
        <Mid l="NFs em trânsito" v={k.transito.length} tone="text-primary" />
        <Mid l="Atrasadas" v={k.atrasadas.length} tone={k.atrasadas.length ? "text-danger" : "text-success"} />
        <Mid l="Ocorrências" v={k.ocorr.length} tone={k.ocorr.length ? "text-danger" : "text-success"} />
        <Mid l="Aguardando CT-e" v={k.aguardCte.length} tone="text-warning" />
        <Mid l="CT-e divergente" v={k.diverg.length} tone={k.diverg.length ? "text-danger" : "text-success"} />
        <Mid l="Sem tabela (tratar)" v={k.pend.length} tone={k.pend.length ? "text-warning" : "text-success"} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {canSeeFinance && <div className="panel p-5 xl:col-span-2">
          <Title>Faturamento x Custo — últimos 30 dias</Title>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={ch.dias}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tipStyle} formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <Area type="monotone" dataKey="receita" name="Faturamento" stroke="var(--primary)" fill="url(#gR)" strokeWidth={2} />
                {canSeeFinance && <Area type="monotone" dataKey="custo" name="Custo" stroke="var(--danger)" fill="transparent" strokeWidth={2} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>}
        <div className="panel p-5">
          <Title>Pontualidade das entregas</Title>
          <div className="h-64 relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={ch.otd} dataKey="v" nameKey="n" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {ch.otd.map((x) => <Cell key={x.n} fill={x.c} />)}
                </Pie>
                <Tooltip contentStyle={tipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none pb-8"><div className="num text-3xl">{k.comPrevN ? fmtPct(k.otd) : "—"}</div></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="panel overflow-hidden xl:col-span-2">
          <div className="p-5 pb-3"><Title>Destinos das entregas · sem GPS</Title></div>
          <BrazilMap orders={orders.list} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="panel p-5 flex-1">
            <Title>Destinos por UF</Title>
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={ch.ufs} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="uf" stroke="var(--muted-foreground)" fontSize={11} width={30} />
                  <Tooltip contentStyle={tipStyle} />
                  <Bar dataKey="n" name="Ordens" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel p-5 flex-1">
            <Title>Tipo de operação</Title>
            <div className="h-44">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={ch.tipo} dataKey="v" nameKey="n" outerRadius={65}>
                    {ch.tipo.map((x) => <Cell key={x.n} fill={x.c} />)}
                  </Pie>
                  <Tooltip contentStyle={tipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1">
        <div className="panel p-5">
          <Title>{canSeeFinance ? "Resultado por cliente" : "Volume por cliente"}</Title>
          {k.topClientes.length === 0 && <Empty />}
          <div className="space-y-3">
            {k.topClientes.map(([n, x]) => {
              const m = pct(x.r - x.c, x.r);
              return (
                <div key={n}>
                  <div className="flex justify-between text-sm"><span className="truncate">{n}</span><span className="num">{canSeeFinance ? fmtBRL(x.r) : `${x.n} ordens`}</span></div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 flex-1 bg-elevated rounded overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, pct(x.r, k.receita))}%` }} /></div>
                    {canSeeFinance && <span className={`num text-xs w-14 text-right ${m >= 0 ? "text-success" : "text-danger"}`}>{fmtPct(m)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel p-5">
          <Title>Ordens por etapa</Title>
          {k.total === 0 && <Empty />}
          <div className="space-y-2">
            {[...k.porEtapa.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => (
              <div key={s} className="flex items-center gap-3 text-sm">
                <span className="w-36 truncate text-muted-foreground">{stageLabel(s as any)}</span>
                <div className="h-3 flex-1 bg-elevated rounded overflow-hidden"><div className="h-full bg-primary/80" style={{ width: `${pct(n, k.total)}%` }} /></div>
                <span className="num w-8 text-right">{n}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded bg-elevated/50 p-3"><div className="num text-2xl">{k.frota}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Frota própria</div></div>
            <div className="rounded bg-elevated/50 p-3"><div className="num text-2xl">{k.terc}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Terceiros</div></div>
          </div>
        </div>

        <div className="panel p-5">
          <Title>Atenção agora</Title>
          {[...k.ocorr, ...k.atrasadas, ...k.diverg].length === 0 && <div className="text-success text-sm">Nenhuma carga atrasada, com ocorrência ou divergência.</div>}
          <div className="space-y-2">
            {[...k.ocorr, ...k.atrasadas, ...k.diverg].slice(0, 8).map((o) => {
              const tone = o.stage === "cte_divergente" ? "border-warning" : "border-danger";
              const extra = o.stage === "cte_divergente" && o.cteValor != null
                ? ` · CT-e ${fmtBRL(o.cteValor)} vs ordem ${fmtBRL(o.valorFrete)}`
                : "";
              return (
                <div key={o.id} className={`border-l-2 ${tone} pl-3 py-1`}>
                  <div className="text-sm flex justify-between"><span className="truncate">{o.clienteNome}</span><span className="num text-xs text-muted-foreground">NF {o.numeroNFe}</span></div>
                  <div className="text-xs text-muted-foreground">{o.cidadeColeta}/{o.ufColeta} → {o.cidadeEntrega}/{o.ufEntrega} · {stageLabel(o.stage)}{extra}{o.previsaoEntrega ? ` · prev. ${new Date(o.previsaoEntrega).toLocaleDateString("pt-BR")}` : ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Big({ l, v, s, tone = "text-foreground" }: { l: string; v: string; s: string; tone?: string }) {
  return <div className="panel p-4 min-w-0"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{l}</div><div className={`num text-2xl mt-2 break-words ${tone}`}>{v}</div><div className="text-xs text-muted-foreground mt-2">{s}</div></div>;
}
function Mid({ l, v, tone }: { l: string; v: number; tone: string }) {
  return <div className="panel p-4 text-center"><div className={`num text-4xl ${tone}`}>{v}</div><div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{l}</div></div>;
}
function Title({ children }: { children: React.ReactNode }) { return <div className="font-display text-lg mb-4">{children}</div>; }
function Empty() { return <div className="text-sm text-muted-foreground">Sem dados ainda.</div>; }
