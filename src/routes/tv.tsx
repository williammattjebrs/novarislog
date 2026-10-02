// Painel de indicadores para TV — tela cheia, sem menu, atualização automática.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useOrders, useConfig } from "@/lib/mock-store";
import { fmtBRL, stageLabel, type Order } from "@/lib/mock-data";
import { calcOrderCost } from "@/lib/cost-calc";
import logo from "@/assets/novaris-logo.png.asset.json";

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
  component: TvPage,
});

const TRANSITO = ["coleta_agendada", "em_coleta", "coletado", "aguardando_cte", "cte_ok", "cte_divergente", "em_viagem"];
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtK = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

function TvPage() {
  const orders = useOrders();
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
    const receita = doMes.reduce((s, o) => s + receitaOf(o), 0);
    const custo = doMes.reduce((s, o) => s + custoOf(o), 0);
    const resultado = receita - custo;

    const entregues = list.filter((o) => o.stage === "entregue");
    const comPrev = entregues.filter((o) => o.previsaoEntrega);
    const noPrazo = comPrev.filter((o) => new Date(o.atualizadoEm) <= new Date(o.previsaoEntrega! + (o.previsaoEntrega!.length <= 10 ? "T23:59:59" : ""))).length;
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
      receita, custo, resultado, margem: pct(resultado, receita), ticket: doMes.length ? receita / doMes.length : 0,
      otd: pct(noPrazo, comPrev.length), noPrazo, comPrevN: comPrev.length, entregues: entregues.length,
      transito, atrasadas, ocorr, pend, diverg, aguardCte, total: list.length, mesN: doMes.length, peso,
      custoKg: peso ? custo / peso : 0, frota, terc, topClientes, porEtapa,
    };
  }, [orders.list, cfg]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <img src={logo.url} alt="Novaris" className="h-12 w-auto" />
        <div className="text-center">
          <div className="font-display text-3xl">Indicadores de Transporte</div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mês corrente · atualização automática</div>
        </div>
        <div className="text-right num">
          <div className="text-3xl">{now ? now.toLocaleTimeString("pt-BR") : "--:--:--"}</div>
          <div className="text-xs text-muted-foreground">{now ? now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : ""}</div>
        </div>
      </header>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Big l="Faturamento (mês)" v={fmtBRL(k.receita)} s={`${k.mesN} ordens · ticket ${fmtBRL(k.ticket)}`} />
        <Big l="Custo operacional" v={fmtBRL(k.custo)} s={`R$ ${k.custoKg.toFixed(2)}/kg · ${fmtK(k.peso)} kg`} />
        <Big l="Resultado" v={fmtBRL(k.resultado)} s={`Margem ${fmtPct(k.margem)}`} tone={k.resultado >= 0 ? "text-success" : "text-danger"} />
        <Big l="Entregas no prazo (OTD)" v={k.comPrevN ? fmtPct(k.otd) : "—"} s={`${k.noPrazo} de ${k.comPrevN} com previsão · ${k.entregues} entregues`} tone={k.otd >= 95 ? "text-success" : k.otd >= 85 ? "text-warning" : "text-danger"} />
      </section>

      <section className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        <Mid l="Em trânsito" v={k.transito.length} tone="text-primary" />
        <Mid l="Atrasadas" v={k.atrasadas.length} tone={k.atrasadas.length ? "text-danger" : "text-success"} />
        <Mid l="Ocorrências" v={k.ocorr.length} tone={k.ocorr.length ? "text-danger" : "text-success"} />
        <Mid l="Aguardando CT-e" v={k.aguardCte.length} tone="text-warning" />
        <Mid l="CT-e divergente" v={k.diverg.length} tone={k.diverg.length ? "text-danger" : "text-success"} />
        <Mid l="Sem tabela (tratar)" v={k.pend.length} tone={k.pend.length ? "text-warning" : "text-success"} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1">
        <div className="panel p-5">
          <Title>Resultado por cliente</Title>
          {k.topClientes.length === 0 && <Empty />}
          <div className="space-y-3">
            {k.topClientes.map(([n, x]) => {
              const m = pct(x.r - x.c, x.r);
              return (
                <div key={n}>
                  <div className="flex justify-between text-sm"><span className="truncate">{n}</span><span className="num">{fmtBRL(x.r)}</span></div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 flex-1 bg-elevated rounded overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, pct(x.r, k.receita))}%` }} /></div>
                    <span className={`num text-xs w-14 text-right ${m >= 0 ? "text-success" : "text-danger"}`}>{fmtPct(m)}</span>
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
          {[...k.atrasadas, ...k.ocorr].length === 0 && <div className="text-success text-sm">Nenhuma carga atrasada ou com ocorrência.</div>}
          <div className="space-y-2">
            {[...k.ocorr, ...k.atrasadas].slice(0, 8).map((o) => (
              <div key={o.id} className="border-l-2 border-danger pl-3 py-1">
                <div className="text-sm flex justify-between"><span className="truncate">{o.clienteNome}</span><span className="num text-xs text-muted-foreground">NF {o.numeroNFe}</span></div>
                <div className="text-xs text-muted-foreground">{o.cidadeColeta}/{o.ufColeta} → {o.cidadeEntrega}/{o.ufEntrega} · {stageLabel(o.stage)}{o.previsaoEntrega ? ` · prev. ${new Date(o.previsaoEntrega).toLocaleDateString("pt-BR")}` : ""}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Big({ l, v, s, tone = "text-foreground" }: { l: string; v: string; s: string; tone?: string }) {
  return <div className="panel p-5"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{l}</div><div className={`num text-4xl xl:text-5xl mt-2 ${tone}`}>{v}</div><div className="text-xs text-muted-foreground mt-2">{s}</div></div>;
}
function Mid({ l, v, tone }: { l: string; v: number; tone: string }) {
  return <div className="panel p-4 text-center"><div className={`num text-4xl ${tone}`}>{v}</div><div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{l}</div></div>;
}
function Title({ children }: { children: React.ReactNode }) { return <div className="font-display text-lg mb-4">{children}</div>; }
function Empty() { return <div className="text-sm text-muted-foreground">Sem dados ainda.</div>; }
