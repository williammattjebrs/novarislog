// Relatórios gerenciais: resultado, operação, custos e títulos por empresa e período.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useConfig, useCteDocuments, useEmpresas, useExpenses, useInvoices, useMotoristas, useOrders, useOrdensColeta, useVeiculos } from "@/lib/mock-store";
import { buildCteProfit } from "@/lib/cte-profit";
import { CteProfitTable } from "@/components/CteProfitTable";
import { useEmpresaFiltro, filtrarOcs, filtrarFin } from "@/lib/empresa-filter";
import { fmtBRL, type OrdemColeta } from "@/lib/mock-data";
import { isEmitida } from "@/lib/oc-model";
import { exportCsv, printReport } from "@/lib/export-utils";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [
    { title: "Relatórios gerenciais | Novaris TMS" },
    { name: "description", content: "Faturamento, custo e margem por empresa, cliente e rota; operação, custos de transporte e títulos em aberto." },
    { property: "og:title", content: "Relatórios gerenciais | Novaris TMS" },
    { property: "og:description", content: "Indicadores gerenciais do grupo por empresa e período." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RoleGate path="/relatorios"><AppShell><Page /></AppShell></RoleGate>,
});

type Tab = "performance" | "cte" | "resultado" | "abc" | "operacao" | "custos" | "titulos" | "ocorrencias";
type Linha = { chave: string; receita: number; custo: number; ocs: number };
const mes = (iso?: string) => (iso ?? "").slice(0, 7);
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

function Page() {
  const [empresaF] = useEmpresaFiltro();
  const empresas = useEmpresas(); const ocs0 = useOrdensColeta(); const orders = useOrders(); const inv0 = useInvoices(); const exp0 = useExpenses(); const mot = useMotoristas(); const vei = useVeiculos();
  const hoje = new Date().toISOString().slice(0, 7);
  const [de, setDe] = useState(`${new Date().getFullYear()}-01`); const [ate, setAte] = useState(hoje);
  const [tab, setTab] = useState<Tab>("performance"); const [agr, setAgr] = useState<"empresa" | "cliente" | "rota" | "mes">("empresa");
  const noPeriodo = (iso?: string) => { const m = mes(iso); return !!m && m >= de && m <= ate; };
  const [fCli, setFCli] = useState(""); const [fRota, setFRota] = useState(""); const [fVei, setFVei] = useState(""); const [fMot, setFMot] = useState("");
  const [perfAgr, setPerfAgr] = useState<"cliente" | "rota" | "veiculo" | "motorista" | "mes">("cliente");
  const [cfg] = useConfig(); const cteDocs = useCteDocuments();
  const cliOc = (o: OrdemColeta) => o.contratanteNome || o.clienteColetaNome || o.clienteNome || "—";
  const rotaOc = (o: OrdemColeta) => `${o.cidadeColeta}/${o.ufColeta} → ${o.cidadeEntrega}/${o.ufEntrega}`;
  const placaOc = (o: OrdemColeta) => vei.list.find((v) => v.id === o.veiculoId)?.placa ?? "—";
  const motOc = (o: OrdemColeta) => mot.list.find((m) => m.id === o.motoristaId)?.nome ?? "—";
  const ocsBase = filtrarOcs(empresaF, ocs0.list).filter((o) => isEmitida(o) && noPeriodo(o.emitidaEm ?? o.criadoEm));
  const opc = (fn: (o: OrdemColeta) => string) => [...new Set(ocsBase.map(fn))].sort();
  const ocs = ocsBase.filter((o) => (!fCli || cliOc(o) === fCli) && (!fRota || rotaOc(o) === fRota) && (!fVei || placaOc(o) === fVei) && (!fMot || motOc(o) === fMot));
  const nfMap = useMemo(() => new Map(orders.list.map((n) => [n.id, n])), [orders.list]);
  const receitaOc = (o: OrdemColeta) => o.orderIds.reduce((s, id) => { const n = nfMap.get(id); return s + (n ? n.cteValor ?? n.valorFrete ?? 0 : 0); }, 0);
  const nomeEmpresa = (id?: string) => empresas.list.find((e) => e.id === id)?.nome ?? "Sem empresa";

  const chave = (o: OrdemColeta) => agr === "empresa" ? nomeEmpresa(o.empresaId) : agr === "cliente" ? (o.contratanteNome || o.clienteColetaNome || o.clienteNome) : agr === "rota" ? `${o.cidadeColeta}/${o.ufColeta} → ${o.cidadeEntrega}/${o.ufEntrega}` : mes(o.emitidaEm ?? o.criadoEm);
  const resultado = [...ocs.reduce((m, o) => { const k = chave(o); const l = m.get(k) ?? { chave: k, receita: 0, custo: 0, ocs: 0 }; l.receita += receitaOc(o); l.custo += o.custoMotorista ?? 0; l.ocs++; return m.set(k, l); }, new Map<string, Linha>()).values()].sort((a, b) => b.receita - a.receita);
  const tot = resultado.reduce((t, l) => ({ receita: t.receita + l.receita, custo: t.custo + l.custo, ocs: t.ocs + l.ocs }), { receita: 0, custo: 0, ocs: 0 });

  const ocIds = new Set(ocs.map((o) => o.id));
  const ctes = buildCteProfit(orders.list, ocs0.list, cteDocs.list, cfg).filter((l) => l.ocIds.some((id) => ocIds.has(id)));
  const nfsOc = ocs.flatMap((o) => o.orderIds.map((id) => nfMap.get(id)).filter(Boolean)) as NonNullable<ReturnType<typeof nfMap.get>>[];
  const entregues = nfsOc.filter((n) => n.stage === "entregue");
  const noPrazo = entregues.filter((n) => !n.previsaoEntrega || !n.entregueEm || Date.parse(n.entregueEm) <= Date.parse(n.previsaoEntrega)).length;
  const atrasoH = (n: { previsaoEntrega?: string; entregueEm?: string }) => n.previsaoEntrega && n.entregueEm ? (Date.parse(n.entregueEm) - Date.parse(n.previsaoEntrega)) / 36e5 : 0;
  const chavePerf = (o: OrdemColeta) => perfAgr === "cliente" ? cliOc(o) : perfAgr === "rota" ? rotaOc(o) : perfAgr === "veiculo" ? placaOc(o) : perfAgr === "motorista" ? motOc(o) : mes(o.emitidaEm ?? o.criadoEm);
  type P = { k: string; nfs: number; ent: number; prazo: number; atraso: number; somaAtraso: number; lead: number; leadN: number; transito: number; ocorr: number };
  const perf = [...ocs.reduce((m, o) => { const k = chavePerf(o); const p = m.get(k) ?? { k, nfs: 0, ent: 0, prazo: 0, atraso: 0, somaAtraso: 0, lead: 0, leadN: 0, transito: 0, ocorr: 0 };
    for (const id of o.orderIds) { const n = nfMap.get(id); if (!n) continue; p.nfs++;
      if (n.stage === "ocorrencia" || n.timeline.some((t) => t.tipo === "ocorrencia")) p.ocorr++;
      if (n.stage === "entregue") { p.ent++; const a = atrasoH(n); if (a > 0) { p.atraso++; p.somaAtraso += a; } else p.prazo++;
        if (n.entregueEm && o.emitidaEm) { p.lead += (Date.parse(n.entregueEm) - Date.parse(o.emitidaEm)) / 864e5; p.leadN++; } }
      else if (["em_viagem", "coletado", "aguardando_cte", "cte_ok", "cte_divergente", "em_coleta"].includes(n.stage)) p.transito++; }
    return m.set(k, p); }, new Map<string, P>()).values()].sort((a, b) => b.nfs - a.nfs);
  const abc = (() => { const r = [...resultado].sort((a, b) => b.receita - a.receita); let ac = 0; return r.map((l) => { ac += l.receita; const p = tot.receita ? ac / tot.receita : 0; return { ...l, acum: p, classe: p <= 0.8 ? "A" : p <= 0.95 ? "B" : "C" }; }); })();
  const porStatus = (s: string[]) => ocs.filter((o) => s.includes(o.status)).length;

  const custoPor = (fn: (o: OrdemColeta) => string) => [...ocs.reduce((m, o) => { const k = fn(o); const l = m.get(k) ?? { chave: k, receita: 0, custo: 0, ocs: 0 }; l.custo += o.custoMotorista ?? 0; l.receita += receitaOc(o); l.ocs++; return m.set(k, l); }, new Map<string, Linha>()).values()].sort((a, b) => b.custo - a.custo);
  const [custoAgr, setCustoAgr] = useState<"tipo" | "motorista" | "veiculo">("tipo");
  const custos = custoPor((o) => custoAgr === "tipo" ? (o.contratacao === "terceiro" ? "Terceiro" : o.contratacao === "frota" ? "Frota própria" : "Não informado") : custoAgr === "motorista" ? (mot.list.find((m) => m.id === o.motoristaId)?.nome ?? "—") : (vei.list.find((v) => v.id === o.veiculoId)?.placa ?? "—"));

  const dHoje = new Date().toISOString().slice(0, 10);
  const titulos = [
    ...filtrarFin(empresaF, inv0.list).filter((i) => i.status !== "paga").map((i) => ({ tipo: "A receber", nome: `${i.numero} · ${i.clienteNome}`, venc: i.vencimento, valor: i.valor, empresa: nomeEmpresa(i.empresaId) })),
    ...filtrarFin(empresaF, exp0.list).filter((e) => e.status !== "paga").map((e) => ({ tipo: "A pagar", nome: `${e.descricao} · ${e.fornecedor}`, venc: e.vencimento, valor: e.valor, empresa: nomeEmpresa(e.empresaId) })),
  ].sort((a, b) => (a.venc ?? "").localeCompare(b.venc ?? ""));

  const ocorr = nfsOc.flatMap((n) => n.timeline.filter((t) => t.tipo === "ocorrencia" && noPeriodo(t.quando)).map((t) => ({ cliente: n.clienteNome, nf: n.numeroNFe, cat: (t as { categoria?: string }).categoria ?? t.texto.split(/[:·]/)[0].slice(0, 40), quando: t.quando, texto: t.texto })));
  const ocorrCat = [...ocorr.reduce((m, o) => m.set(o.cat, (m.get(o.cat) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);

  function dados(): [string, string[], (string | number)[][]] {
    if (tab === "performance") return [`Performance de entrega por ${perfAgr}`, ["Grupo", "NFs", "Entregues", "No prazo", "Atrasadas", "% no prazo", "Atraso médio (h)", "Lead time médio (dias)", "Em trânsito", "Com ocorrência"], perf.map((p) => [p.k, p.nfs, p.ent, p.prazo, p.atraso, pct(p.prazo, p.ent), p.atraso ? (p.somaAtraso / p.atraso).toFixed(1) + "h" : "—", p.leadN ? (p.lead / p.leadN).toFixed(1) + "d" : "—", p.transito, p.ocorr])];
    if (tab === "cte") return ["Rentabilidade por CT-e", ["CT-e", "Data", "Cliente", "Rota", "NFs", "Peso kg", "Receita", "Custo", "Margem", "Margem %"], ctes.map((l) => [l.numero, l.data, l.cliente, l.rota, l.nfs.length, l.peso, l.receita.toFixed(2), l.custo.toFixed(2), l.margem.toFixed(2), `${l.margemPct.toFixed(1)}%`])];
    if (tab === "abc") return [`Curva ABC de receita por ${agr}`, ["Grupo", "Classe", "OCs", "Receita", "% acumulado", "Margem %"], abc.map((l) => [l.chave, l.classe, l.ocs, l.receita.toFixed(2), `${(l.acum * 100).toFixed(1)}%`, pct(l.receita - l.custo, l.receita)])];
    if (tab === "resultado") return [`Resultado por ${agr}`, ["Grupo", "OCs", "Receita", "Custo", "Margem", "Margem %"], resultado.map((l) => [l.chave, l.ocs, l.receita.toFixed(2), l.custo.toFixed(2), (l.receita - l.custo).toFixed(2), pct(l.receita - l.custo, l.receita)])];
    if (tab === "custos") return [`Custo por ${custoAgr}`, ["Grupo", "OCs", "Custo", "Receita", "Custo/receita"], custos.map((l) => [l.chave, l.ocs, l.custo.toFixed(2), l.receita.toFixed(2), pct(l.custo, l.receita)])];
    if (tab === "titulos") return ["Títulos em aberto", ["Tipo", "Título", "Empresa", "Vencimento", "Valor", "Situação"], titulos.map((t) => [t.tipo, t.nome, t.empresa, t.venc, t.valor.toFixed(2), t.venc < dHoje ? "Vencido" : "A vencer"])];
    if (tab === "ocorrencias") return ["Ocorrências", ["Data", "Cliente", "NF", "Categoria", "Descrição"], ocorr.map((o) => [o.quando.slice(0, 10), o.cliente, o.nf, o.cat, o.texto])];
    return ["Operação", ["Indicador", "Valor"], [["OCs emitidas", ocs.length], ["Em coleta/programadas", porStatus(["emitida", "em_coleta"])], ["Coletadas", porStatus(["coletada"])], ["Em viagem", porStatus(["em_viagem"])], ["Entregues", porStatus(["entregue"])], ["Com ocorrência", porStatus(["ocorrencia"])], ["NFs transportadas", nfsOc.length], ["Entregas no prazo", pct(noPrazo, entregues.length)]]];
  }
  const sub = `${empresaF ? (empresaF === "__sem" ? "Sem empresa" : nomeEmpresa(empresaF)) : "Todas as empresas"} · ${de} a ${ate}`;
  const tabela = dados();
  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><h1 className="text-2xl font-display">Relatórios gerenciais</h1><p className="text-sm text-muted-foreground">{sub} · use o filtro de empresa no topo para ver uma empresa ou o grupo todo.</p></div>
        <label className="text-xs ml-auto">De<input aria-label="Mês inicial" type="month" className="input block" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="text-xs">Até<input aria-label="Mês final" type="month" className="input block" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <button onClick={() => exportCsv(`relatorio-${tab}.csv`, tabela[1], tabela[2])} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated"><Download className="h-4 w-4" /> Excel</button>
        <button onClick={() => printReport(tabela[0], sub, tabela[1], tabela[2])} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated"><Printer className="h-4 w-4" /> PDF</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi l="Receita" v={fmtBRL(tot.receita)} /><Kpi l="Custo transporte" v={fmtBRL(tot.custo)} /><Kpi l="Margem" v={`${fmtBRL(tot.receita - tot.custo)} · ${pct(tot.receita - tot.custo, tot.receita)}`} /><Kpi l="OCs emitidas" v={String(ocs.length)} /><Kpi l="Entregas no prazo" v={pct(noPrazo, entregues.length)} />
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border">
        {([["performance", "Performance de entrega"], ["cte", "Rentabilidade por CT-e"], ["resultado", "Faturamento x custo"], ["abc", "Curva ABC"], ["operacao", "Operação"], ["custos", "Custos de transporte"], ["titulos", "Recebimentos e pagamentos"], ["ocorrencias", "Ocorrências"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm border-b-2 ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{l}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {([["Cliente", fCli, setFCli, opc(cliOc)], ["Rota", fRota, setFRota, opc(rotaOc)], ["Veículo", fVei, setFVei, opc(placaOc)], ["Motorista", fMot, setFMot, opc(motOc)]] as const).map(([l, v, set, ops]) => (
          <select key={l} aria-label={`Filtrar ${l}`} className="input max-w-56" value={v} onChange={(e) => set(e.target.value)}><option value="">{l}: todos</option>{ops.map((o) => <option key={o} value={o}>{o}</option>)}</select>))}
        {tab === "performance" && <select aria-label="Agrupar performance por" className="input max-w-48" value={perfAgr} onChange={(e) => setPerfAgr(e.target.value as typeof perfAgr)}><option value="cliente">Por cliente</option><option value="rota">Por rota</option><option value="veiculo">Por veículo</option><option value="motorista">Por motorista</option><option value="mes">Por mês</option></select>}
      </div>
      {(tab === "resultado" || tab === "abc") && <select aria-label="Agrupar por" className="input max-w-48" value={agr} onChange={(e) => setAgr(e.target.value as typeof agr)}><option value="empresa">Por empresa</option><option value="cliente">Por cliente</option><option value="rota">Por rota</option><option value="mes">Por mês</option></select>}
      {tab === "custos" && <select aria-label="Agrupar custo por" className="input max-w-48" value={custoAgr} onChange={(e) => setCustoAgr(e.target.value as typeof custoAgr)}><option value="tipo">Terceiro x frota</option><option value="motorista">Por motorista</option><option value="veiculo">Por veículo</option></select>}
      {tab === "ocorrencias" && ocorrCat.length > 0 && <div className="flex flex-wrap gap-2 text-xs">{ocorrCat.map(([c, n]) => <span key={c} className="border border-border rounded px-2 py-1">{c} · <b>{n}</b></span>)}</div>}
      {tab === "cte" ? <CteProfitTable linhas={ctes} /> : <div className="panel overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left"><tr className="border-b border-border">{tabela[1].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{tabela[2].map((r, i) => <tr key={i} className="border-b border-border">{r.map((c, j) => <td key={j} className="p-2 text-xs">{typeof c === "string" && /^-?\d+\.\d{2}$/.test(c) ? fmtBRL(Number(c)) : c}</td>)}</tr>)}
            {!tabela[2].length && <tr><td colSpan={tabela[1].length} className="p-6 text-center text-xs text-muted-foreground">Sem dados no período.</td></tr>}</tbody>
        </table>
      </div>}
    </div>
  );
}
function Kpi({ l, v }: { l: string; v: string }) { return <div className="panel p-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</div><div className="num text-lg mt-1">{v}</div></div>; }
