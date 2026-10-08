// Relatórios gerenciais: resultado, operação, custos e títulos por empresa e período.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useEmpresas, useExpenses, useInvoices, useMotoristas, useOrders, useOrdensColeta, useVeiculos } from "@/lib/mock-store";
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

type Tab = "resultado" | "operacao" | "custos" | "titulos" | "ocorrencias";
type Linha = { chave: string; receita: number; custo: number; ocs: number };
const mes = (iso?: string) => (iso ?? "").slice(0, 7);
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

function Page() {
  const [empresaF] = useEmpresaFiltro();
  const empresas = useEmpresas(); const ocs0 = useOrdensColeta(); const orders = useOrders(); const inv0 = useInvoices(); const exp0 = useExpenses(); const mot = useMotoristas(); const vei = useVeiculos();
  const hoje = new Date().toISOString().slice(0, 7);
  const [de, setDe] = useState(`${new Date().getFullYear()}-01`); const [ate, setAte] = useState(hoje);
  const [tab, setTab] = useState<Tab>("resultado"); const [agr, setAgr] = useState<"empresa" | "cliente" | "rota" | "mes">("empresa");
  const noPeriodo = (iso?: string) => { const m = mes(iso); return !!m && m >= de && m <= ate; };
  const ocs = filtrarOcs(empresaF, ocs0.list).filter((o) => isEmitida(o) && noPeriodo(o.emitidaEm ?? o.criadoEm));
  const nfMap = useMemo(() => new Map(orders.list.map((n) => [n.id, n])), [orders.list]);
  const receitaOc = (o: OrdemColeta) => o.orderIds.reduce((s, id) => { const n = nfMap.get(id); return s + (n ? n.cteValor ?? n.valorFrete ?? 0 : 0); }, 0);
  const nomeEmpresa = (id?: string) => empresas.list.find((e) => e.id === id)?.nome ?? "Sem empresa";

  const chave = (o: OrdemColeta) => agr === "empresa" ? nomeEmpresa(o.empresaId) : agr === "cliente" ? (o.contratanteNome || o.clienteColetaNome || o.clienteNome) : agr === "rota" ? `${o.cidadeColeta}/${o.ufColeta} → ${o.cidadeEntrega}/${o.ufEntrega}` : mes(o.emitidaEm ?? o.criadoEm);
  const resultado = [...ocs.reduce((m, o) => { const k = chave(o); const l = m.get(k) ?? { chave: k, receita: 0, custo: 0, ocs: 0 }; l.receita += receitaOc(o); l.custo += o.custoMotorista ?? 0; l.ocs++; return m.set(k, l); }, new Map<string, Linha>()).values()].sort((a, b) => b.receita - a.receita);
  const tot = resultado.reduce((t, l) => ({ receita: t.receita + l.receita, custo: t.custo + l.custo, ocs: t.ocs + l.ocs }), { receita: 0, custo: 0, ocs: 0 });

  const nfsOc = ocs.flatMap((o) => o.orderIds.map((id) => nfMap.get(id)).filter(Boolean)) as NonNullable<ReturnType<typeof nfMap.get>>[];
  const entregues = nfsOc.filter((n) => n.stage === "entregue");
  const noPrazo = entregues.filter((n) => !n.previsaoEntrega || !n.entregueEm || Date.parse(n.entregueEm) <= Date.parse(n.previsaoEntrega)).length;
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
        {([["resultado", "Faturamento x custo"], ["operacao", "Operação"], ["custos", "Custos de transporte"], ["titulos", "Recebimentos e pagamentos"], ["ocorrencias", "Ocorrências"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm border-b-2 ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{l}</button>)}
      </div>
      {tab === "resultado" && <select aria-label="Agrupar por" className="input max-w-48" value={agr} onChange={(e) => setAgr(e.target.value as typeof agr)}><option value="empresa">Por empresa</option><option value="cliente">Por cliente</option><option value="rota">Por rota</option><option value="mes">Por mês</option></select>}
      {tab === "custos" && <select aria-label="Agrupar custo por" className="input max-w-48" value={custoAgr} onChange={(e) => setCustoAgr(e.target.value as typeof custoAgr)}><option value="tipo">Terceiro x frota</option><option value="motorista">Por motorista</option><option value="veiculo">Por veículo</option></select>}
      {tab === "ocorrencias" && ocorrCat.length > 0 && <div className="flex flex-wrap gap-2 text-xs">{ocorrCat.map(([c, n]) => <span key={c} className="border border-border rounded px-2 py-1">{c} · <b>{n}</b></span>)}</div>}
      <div className="panel overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left"><tr className="border-b border-border">{tabela[1].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{tabela[2].map((r, i) => <tr key={i} className="border-b border-border">{r.map((c, j) => <td key={j} className="p-2 text-xs">{typeof c === "string" && /^-?\d+\.\d{2}$/.test(c) ? fmtBRL(Number(c)) : c}</td>)}</tr>)}
            {!tabela[2].length && <tr><td colSpan={tabela[1].length} className="p-6 text-center text-xs text-muted-foreground">Sem dados no período.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
function Kpi({ l, v }: { l: string; v: string }) { return <div className="panel p-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</div><div className="num text-lg mt-1">{v}</div></div>; }
