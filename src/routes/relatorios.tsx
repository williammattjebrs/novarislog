// Relatórios gerenciais: resultado, operação, custos e títulos por empresa e período.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useConfig, useCteDocuments, useEmpresas, useExpenses, useInvoices, useLocaisOperacionais, useMotoristas, useOrders, useOrdensColeta, useVeiculos } from "@/lib/mock-store";
import { buildCteProfit } from "@/lib/cte-profit";
import { CteProfitTable } from "@/components/CteProfitTable";
import { Button } from "@/components/ui/button";
import { expensePaid, receivedAmount } from "@/lib/finance-summary";
import { useEmpresaFiltro, filtrarOcs, filtrarFin } from "@/lib/empresa-filter";
import { fmtBRL, OC_STATUS, type OrdemColeta } from "@/lib/mock-data";
import { isEmitida, localColetaDaNf } from "@/lib/oc-model";
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
const mes = (iso?: string) => (iso ?? "").slice(0, 7);
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");
const data = (iso?: string) => { if (!iso) return "—"; const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR"); };
const statusOc = (o: OrdemColeta) => OC_STATUS.find((s) => s.id === o.status)?.label ?? o.status;

function Page() {
  const [empresaF] = useEmpresaFiltro();
  const empresas = useEmpresas(); const ocs0 = useOrdensColeta(); const orders = useOrders(); const inv0 = useInvoices(); const exp0 = useExpenses(); const mot = useMotoristas(); const vei = useVeiculos();
  const hoje = new Date().toISOString().slice(0, 7);
  const [de, setDe] = useState(`${new Date().getFullYear()}-01`); const [ate, setAte] = useState(hoje);
  const [tab, setTab] = useState<Tab>("performance"); const [agr, setAgr] = useState<"empresa" | "cliente" | "rota" | "mes">("empresa");
  const noPeriodo = (iso?: string) => { const m = mes(iso); return !!m && m >= de && m <= ate; };
  const [fCli, setFCli] = useState(""); const [fRota, setFRota] = useState(""); const [fVei, setFVei] = useState(""); const [fMot, setFMot] = useState("");
  const [cfg] = useConfig(); const cteDocs = useCteDocuments();
  const locais = useLocaisOperacionais();
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
  const resultado = ocs.map((o) => ({ oc: o, chave: chave(o), receita: receitaOc(o), custo: o.custoMotorista ?? 0 })).sort((a, b) => b.receita - a.receita);
  const tot = resultado.reduce((t, l) => ({ receita: t.receita + l.receita, custo: t.custo + l.custo }), { receita: 0, custo: 0 });

  const ocIds = new Set(ocs.map((o) => o.id));
  const ctes = buildCteProfit(orders.list, ocs0.list, cteDocs.list, cfg).filter((l) => l.ocIds.some((id) => ocIds.has(id)));
  const notas = ocs.flatMap((oc) => oc.orderIds.flatMap((id) => { const nf = nfMap.get(id); return nf ? [{ oc, nf }] : []; }));
  const entregues = notas.filter(({ oc }) => oc.status === "entregue");
  const prazo = (oc: OrdemColeta, n: (typeof orders.list)[number]) => {
    const previsao = n.previsaoEntrega || oc.dataHoraEntrega;
    if (!previsao || (oc.status === "entregue" && !n.entregueEm)) return "Sem informação";
    const limite = Date.parse(previsao), real = n.entregueEm ? Date.parse(n.entregueEm) : Date.now();
    if (!Number.isFinite(limite) || !Number.isFinite(real)) return "Sem informação";
    return real > limite ? (oc.status === "entregue" ? "Entregue com atraso" : "Em atraso") : (oc.status === "entregue" ? "No prazo" : "A vencer");
  };
  const noPrazo = entregues.filter(({ oc, nf }) => prazo(oc, nf) === "No prazo").length;
  const abc = (() => { const grupos = new Map<string, number>(); resultado.forEach((l) => grupos.set(l.chave, (grupos.get(l.chave) ?? 0) + l.receita)); let ac = 0; const classes = new Map<string, { acum: number; classe: string }>(); [...grupos].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => { ac += v; const p = tot.receita ? ac / tot.receita : 0; classes.set(k, { acum: p, classe: p <= 0.8 ? "A" : p <= 0.95 ? "B" : "C" }); }); return [...resultado].sort((a, b) => (grupos.get(b.chave) ?? 0) - (grupos.get(a.chave) ?? 0) || a.chave.localeCompare(b.chave)).map((l) => ({ ...l, ...classes.get(l.chave) })); })();
  const [custoAgr, setCustoAgr] = useState<"tipo" | "motorista" | "veiculo">("tipo");
  const custos = [...resultado].sort((a, b) => { const grupo = (o: OrdemColeta) => custoAgr === "motorista" ? motOc(o) : custoAgr === "veiculo" ? placaOc(o) : o.contratacao ?? ""; return grupo(a.oc).localeCompare(grupo(b.oc)) || b.custo - a.custo; });

  const dHoje = new Date().toISOString().slice(0, 10);
  const titulos = [
    ...filtrarFin(empresaF, inv0.list).filter((i) => noPeriodo(i.competencia || i.emissao || i.vencimento) && (!fCli || i.clienteNome === fCli) && (!(fRota || fVei || fMot) || !!i.cteChave && ctes.some((c) => c.chave === i.cteChave))).map((i) => ({ tipo: "A receber", nome: i.numero, pessoa: i.clienteNome, venc: i.vencimento, valor: i.valor, baixado: receivedAmount(i), empresa: nomeEmpresa(i.empresaId), status: i.status, data: i.recebidoEm, movimentos: i.movements })),
    ...filtrarFin(empresaF, exp0.list).filter((e) => noPeriodo(e.competencia || e.vencimento) && (!(fCli || fRota || fVei || fMot) || !!e.ocId && ocIds.has(e.ocId) || !!e.orderId && notas.some(({ nf }) => nf.id === e.orderId))).map((e) => ({ tipo: "A pagar", nome: e.descricao, pessoa: e.fornecedor, venc: e.vencimento, valor: e.valor, baixado: expensePaid(e), empresa: nomeEmpresa(e.empresaId), status: e.status, data: e.pagoEm, movimentos: e.movements })),
  ].sort((a, b) => (a.venc ?? "").localeCompare(b.venc ?? ""));

  const ocorr = notas.flatMap(({ oc, nf }) => nf.timeline.filter((t) => t.tipo === "ocorrencia" && noPeriodo(t.quando)).map((t) => [data(t.quando), oc.numero, nf.clienteNome, nf.numeroNFe, rotaOc(oc), motOc(oc), placaOc(oc), t.autor, t.texto]));
  const nfNumeros = (o: OrdemColeta) => o.orderIds.map((id) => nfMap.get(id)?.numeroNFe ?? id).join(", ");
  const baseOc = (o: OrdemColeta) => [o.numero, nomeEmpresa(o.empresaId), cliOc(o), rotaOc(o), motOc(o), placaOc(o), nfNumeros(o)];

  function dados(): [string, string[], (string | number)[][]] {
    if (tab === "performance") return ["Performance de entrega · notas", ["OC", "Empresa", "Cliente", "NF", "Remetente", "Destinatário", "Rota", "Local de coleta", "Motorista", "Veículo", "Peso (kg)", "Volumes", "Valor NF", "Status OC", "Previsão", "Entrega realizada", "Prazo", "Ocorrências"], notas.map(({ oc, nf }) => [oc.numero, nomeEmpresa(oc.empresaId), nf.clienteNome, nf.numeroNFe, nf.remetente, nf.destinatario, `${nf.cidadeColeta}/${nf.ufColeta} → ${nf.cidadeEntrega}/${nf.ufEntrega}`, locais.list.find((l) => l.id === localColetaDaNf(oc, nf.id))?.nome || oc.localColeta || "—", motOc(oc), placaOc(oc), nf.peso.toLocaleString("pt-BR"), nf.volumes, nf.valorNF.toFixed(2), statusOc(oc), data(nf.previsaoEntrega || oc.dataHoraEntrega), data(nf.entregueEm), prazo(oc, nf), nf.timeline.filter((t) => t.tipo === "ocorrencia").map((t) => t.texto).join("; ") || "—"])];
    if (tab === "cte") return ["Rentabilidade por CT-e · rateio por NF", ["CT-e", "Data", "Cliente", "Rota", "NF", "OC", "Peso (kg)", "% peso", "Frete rateado", "Custo rateado", "Margem NF"], ctes.flatMap((l) => l.nfs.map((n) => [l.numero, l.data, l.cliente, l.rota, n.nf, ocs0.list.find((o) => o.id === n.ocId)?.numero ?? n.ocId ?? "—", n.peso.toLocaleString("pt-BR"), pct(n.peso, l.peso), n.receita.toFixed(2), n.custo.toFixed(2), (n.receita - n.custo).toFixed(2)]))];
    const headersOc = ["OC", "Empresa", "Cliente", "Rota", "Motorista", "Veículo", "NFs"];
    if (tab === "abc") return [`Curva ABC de receita por ${agr}`, ["Grupo", "Classe", ...headersOc, "Receita", "Custo", "% acumulado grupo", "Margem %"], abc.map((l) => [l.chave, l.classe ?? "—", ...baseOc(l.oc), l.receita.toFixed(2), l.custo.toFixed(2), `${((l.acum ?? 0) * 100).toFixed(1)}%`, pct(l.receita - l.custo, l.receita)])];
    if (tab === "resultado") return ["Faturamento x custo · ordens de coleta", ["Grupo", ...headersOc, "Emissão", "Status", "Receita", "Custo", "Margem", "Margem %"], resultado.map((l) => [l.chave, ...baseOc(l.oc), data(l.oc.emitidaEm), statusOc(l.oc), l.receita.toFixed(2), l.custo.toFixed(2), (l.receita - l.custo).toFixed(2), pct(l.receita - l.custo, l.receita)])];
    if (tab === "custos") return ["Custos de transporte · ordens de coleta", [...headersOc, "Contratação", "Custo", "Receita", "Custo/receita", "Observações"], custos.map((l) => [...baseOc(l.oc), l.oc.contratacao === "terceiro" ? "Terceiro" : l.oc.contratacao === "frota" ? "Frota própria" : "Não informado", l.custo.toFixed(2), l.receita.toFixed(2), pct(l.custo, l.receita), l.oc.custoObs || "—"])];
    if (tab === "titulos") return ["Recebimentos e pagamentos", ["Tipo", "Título", "Cliente/fornecedor", "Empresa", "Vencimento", "Valor", "Recebido/pago", "Saldo", "Situação", "Última baixa", "Histórico"], titulos.map((t) => [t.tipo, t.nome, t.pessoa, t.empresa, t.venc, t.valor.toFixed(2), t.baixado.toFixed(2), Math.max(0, t.valor - t.baixado).toFixed(2), t.status === "paga" ? "Liquidado" : t.venc < dHoje ? "Vencido" : "A vencer", data(t.data), t.movimentos?.map((m) => `${data(m.at)} · ${m.kind} · ${fmtBRL(m.amount)}`).join("; ") || "—"])];
    if (tab === "ocorrencias") return ["Ocorrências", ["Data", "OC", "Cliente", "NF", "Rota", "Motorista", "Veículo", "Autor", "Descrição"], ocorr];
    return ["Operação · ordens de coleta", [...headersOc, "Coleta prevista", "Entrega prevista", "Status", "Peso (kg)", "Volumes", "Observações"], ocs.map((o) => [...baseOc(o), data(o.previsaoColeta || o.dataHoraColeta), data(o.dataHoraEntrega), statusOc(o), o.orderIds.reduce((s, id) => s + (nfMap.get(id)?.peso ?? 0), 0).toLocaleString("pt-BR"), o.orderIds.reduce((s, id) => s + (nfMap.get(id)?.volumes ?? 0), 0), o.instrucoes || o.observacao || "—"])];
  }
  const sub = `${empresaF ? (empresaF === "__sem" ? "Sem empresa" : nomeEmpresa(empresaF)) : "Todas as empresas"} · ${de} a ${ate}`;
  const tabela = dados();
  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><h1 className="text-2xl font-display">Relatórios gerenciais</h1><p className="text-sm text-muted-foreground">{sub}</p></div>
        <label className="text-xs ml-auto">De<input aria-label="Mês inicial" type="month" className="input block" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="text-xs">Até<input aria-label="Mês final" type="month" className="input block" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <Button variant="outline" onClick={() => exportCsv(`relatorio-${tab}.csv`, tabela[1], tabela[2])}><Download /> Excel</Button>
        <Button variant="outline" onClick={() => printReport(tabela[0], sub, tabela[1], tabela[2])}><Printer /> PDF</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi l="Receita" v={fmtBRL(tot.receita)} /><Kpi l="Custo transporte" v={fmtBRL(tot.custo)} /><Kpi l="Margem" v={`${fmtBRL(tot.receita - tot.custo)} · ${pct(tot.receita - tot.custo, tot.receita)}`} /><Kpi l="OCs emitidas" v={String(ocs.length)} /><Kpi l="Entregas no prazo" v={pct(noPrazo, entregues.length)} />
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border">
        {([["performance", "Performance de entrega"], ["cte", "Rentabilidade por CT-e"], ["resultado", "Faturamento x custo"], ["abc", "Curva ABC"], ["operacao", "Operação"], ["custos", "Custos de transporte"], ["titulos", "Recebimentos e pagamentos"], ["ocorrencias", "Ocorrências"]] as const).map(([k, l]) => <Button variant="ghost" key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`rounded-none px-3 py-2 border-b-2 ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{l}</Button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {([["Cliente", fCli, setFCli, opc(cliOc)], ["Rota", fRota, setFRota, opc(rotaOc)], ["Veículo", fVei, setFVei, opc(placaOc)], ["Motorista", fMot, setFMot, opc(motOc)]] as const).map(([l, v, set, ops]) => (
          <select key={l} aria-label={`Filtrar ${l}`} className="input max-w-56" value={v} onChange={(e) => set(e.target.value)}><option value="">{l}: todos</option>{ops.map((o) => <option key={o} value={o}>{o}</option>)}</select>))}
      </div>
      {(tab === "resultado" || tab === "abc") && <select aria-label="Agrupar por" className="input max-w-48" value={agr} onChange={(e) => setAgr(e.target.value as typeof agr)}><option value="empresa">Por empresa</option><option value="cliente">Por cliente</option><option value="rota">Por rota</option><option value="mes">Por mês</option></select>}
      {tab === "custos" && <select aria-label="Agrupar custo por" className="input max-w-48" value={custoAgr} onChange={(e) => setCustoAgr(e.target.value as typeof custoAgr)}><option value="tipo">Terceiro x frota</option><option value="motorista">Por motorista</option><option value="veiculo">Por veículo</option></select>}
      <div className="text-xs text-muted-foreground">{tab === "cte" ? `${ctes.length} CT-es · ${tabela[2].length} NFs` : `${tabela[2].length} registros`}</div>
      {tab === "cte" ? <CteProfitTable linhas={ctes} detalhesVisiveis /> : <div className="overflow-auto border-y border-border">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left"><tr className="border-b border-border">{tabela[1].map((h) => <th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{tabela[2].map((r, i) => <tr key={i} className="border-b border-border">{r.map((c, j) => <td key={j} className="p-2 text-xs">{typeof c === "string" && /^-?\d+\.\d{2}$/.test(c) ? fmtBRL(Number(c)) : c}</td>)}</tr>)}
            {!tabela[2].length && <tr><td colSpan={tabela[1].length} className="p-6 text-center text-xs text-muted-foreground">Sem dados no período.</td></tr>}</tbody>
        </table>
      </div>}
    </div>
  );
}
function Kpi({ l, v }: { l: string; v: string }) { return <div className="panel p-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</div><div className="num text-lg mt-1">{v}</div></div>; }
