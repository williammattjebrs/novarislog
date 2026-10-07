// Conciliação (baixa de recebimentos/pagamentos) + Balancete e DRE mensal.
import { useState } from "react";
import { CheckCircle2, Undo2 } from "lucide-react";
import { fmtBRL, monthKey, type Expense, type Invoice, type Order, type AppConfig } from "@/lib/mock-data";
import { calcOrderCost } from "@/lib/cost-calc";

type Inv = Invoice & { id?: string };
const today = () => new Date().toISOString().slice(0, 10);
const fmtD = (iso?: string) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-BR") : "—");

export function Conciliacao({ invoices, setInvoices, expenses, updateExpense }: {
  invoices: Inv[];
  setInvoices: (next: Inv[]) => void;
  expenses: Expense[];
  updateExpense: (id: string, patch: Partial<Expense>) => void;
}) {
  const [view, setView] = useState<"receber" | "pagar">("receber");
  const [soAbertos, setSoAbertos] = useState(true);
  const [baixa, setBaixa] = useState<{ kind: "rec" | "pag"; key: string; valor: number } | null>(null);
  const [data, setData] = useState(today());
  const [valor, setValor] = useState(0);
  const [conta, setConta] = useState("");

  function abrir(kind: "rec" | "pag", key: string, v: number) { setBaixa({ kind, key, valor: v }); setValor(v); setData(today()); }
  function confirmar() {
    if (!baixa) return;
    if (baixa.kind === "rec") {
      setInvoices(invoices.map((i) => i.numero === baixa.key ? { ...i, status: "paga", recebidoEm: data, valorRecebido: valor, conta } : i));
    } else {
      updateExpense(baixa.key, { status: "paga", pagoEm: data, valorPago: valor, conta });
    }
    setBaixa(null);
  }
  function estornarRec(n: string) {
    setInvoices(invoices.map((i) => i.numero === n ? { ...i, status: "aberta", recebidoEm: undefined, valorRecebido: undefined } : i));
  }

  const rec = invoices.filter((i) => !soAbertos || i.status !== "paga");
  const pag = expenses.filter((e) => !soAbertos || e.status !== "paga");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 border border-border rounded-md p-0.5">
          <button onClick={() => setView("receber")} className={`text-xs px-3 py-1 rounded ${view === "receber" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>A receber (clientes)</button>
          <button onClick={() => setView("pagar")} className={`text-xs px-3 py-1 rounded ${view === "pagar" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>A pagar (despesas)</button>
        </div>
        <label className="text-xs inline-flex items-center gap-2 ml-2"><input type="checkbox" checked={soAbertos} onChange={(e) => setSoAbertos(e.target.checked)} /> Só em aberto</label>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-normal px-4 py-2.5">{view === "receber" ? "Documento" : "Descrição"}</th>
              <th className="text-left font-normal">{view === "receber" ? "Cliente" : "Fornecedor"}</th>
              <th className="text-left font-normal">Vencimento</th>
              <th className="text-right font-normal">Valor</th>
              <th className="text-left font-normal pl-4">Baixa</th>
              <th className="text-right font-normal pr-4">Ação</th>
            </tr>
          </thead>
          <tbody>
            {view === "receber" ? rec.map((i) => (
              <tr key={i.numero} className="border-t border-border">
                <td className="px-4 py-2.5 num text-xs text-primary">{i.numero}</td>
                <td className="text-xs">{i.clienteNome}</td>
                <td className="text-xs num">{i.vencimento}</td>
                <td className="text-right num">{fmtBRL(i.valor)}</td>
                <td className="text-xs pl-4">{i.status === "paga" ? <span className="text-success">Recebido {fmtD(i.recebidoEm)} · {fmtBRL(i.valorRecebido ?? i.valor)}{i.conta ? ` · ${i.conta}` : ""}</span> : <span className="text-muted-foreground">em aberto</span>}</td>
                <td className="text-right pr-4">
                  {i.status === "paga"
                    ? <button onClick={() => estornarRec(i.numero)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Undo2 className="h-3 w-3" />Estornar</button>
                    : <button onClick={() => abrir("rec", i.numero, i.valor)} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Informar recebimento</button>}
                </td>
              </tr>
            )) : pag.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-2.5 text-xs">{e.descricao}</td>
                <td className="text-xs">{e.fornecedor}</td>
                <td className="text-xs num">{e.vencimento}</td>
                <td className="text-right num">{fmtBRL(e.valor)}</td>
                <td className="text-xs pl-4">{e.status === "paga" ? <span className="text-success">Pago {fmtD(e.pagoEm)} · {fmtBRL(e.valorPago ?? e.valor)}{e.conta ? ` · ${e.conta}` : ""}</span> : <span className="text-muted-foreground">em aberto</span>}</td>
                <td className="text-right pr-4">
                  {e.status === "paga"
                    ? <button onClick={() => updateExpense(e.id, { status: "prevista", pagoEm: undefined, valorPago: undefined })} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Undo2 className="h-3 w-3" />Estornar</button>
                    : <button onClick={() => abrir("pag", e.id, e.valor)} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Informar pagamento</button>}
                </td>
              </tr>
            ))}
            {(view === "receber" ? rec : pag).length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">Nada pendente de conciliação.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {baixa && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setBaixa(null)}>
          <div className="panel w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-lg">{baixa.kind === "rec" ? "Informar recebimento" : "Informar pagamento"}</div>
            <div className="text-xs text-muted-foreground">Valor previsto: {fmtBRL(baixa.valor)}</div>
            <label className="block"><div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Data</div>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" /></label>
            <label className="block"><div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Valor efetivo (R$)</div>
              <input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} className="input num" /></label>
            <label className="block"><div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Conta / banco</div>
              <input value={conta} onChange={(e) => setConta(e.target.value)} placeholder="Ex.: Itaú CC" className="input" /></label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBaixa(null)} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">Cancelar</button>
              <button onClick={confirmar} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DreBalancete({ invoices, expenses, orders, cfg }: {
  invoices: Inv[]; expenses: Expense[]; orders: Order[]; cfg: AppConfig;
}) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  // ---------- DRE (competência) ----------
  const receitaBruta = invoices.filter((i) => monthKey(i.emissao) === mes).reduce((s, i) => s + i.valor, 0);
  const ordensMes = orders.filter((o) => monthKey(o.criadoEm) === mes && o.costs?.execMode);
  const custoTerceiros = ordensMes.filter((o) => o.costs.execMode === "terceiro").reduce((s, o) => s + calcOrderCost(o.costs, cfg.frota, o.cteValor ?? o.valorFrete).total, 0);
  const custoFrota = ordensMes.filter((o) => o.costs.execMode === "frota").reduce((s, o) => s + calcOrderCost(o.costs, cfg.frota, o.cteValor ?? o.valorFrete).total, 0);
  const despMes = expenses.filter((e) => monthKey(e.vencimento) === mes);
  const despFreteTerc = despMes.filter((e) => e.tipo === "frete_terceiros").reduce((s, e) => s + e.valor, 0);
  const custoServicos = custoTerceiros + custoFrota + despFreteTerc;
  const lucroBruto = receitaBruta - custoServicos;
  const porGrupo = despMes.filter((e) => e.tipo !== "frete_terceiros").reduce<Record<string, number>>((acc, e) => {
    const g = e.grupo || (e.tipo === "fixa" ? "Fixas" : e.tipo === "administrativa" ? "Administrativo" : "Outras");
    acc[g] = (acc[g] ?? 0) + e.valor; return acc;
  }, {});
  const totalDespOp = Object.values(porGrupo).reduce((s, v) => s + v, 0);
  const resultado = lucroBruto - totalDespOp;
  const pct = (v: number) => (receitaBruta > 0 ? `${((v / receitaBruta) * 100).toFixed(1)}%` : "—");

  // ---------- Balancete (caixa) ----------
  const recebido = (pred: (m: string) => boolean) => invoices.filter((i) => i.status === "paga" && i.recebidoEm && pred(i.recebidoEm.slice(0, 7))).reduce((s, i) => s + (i.valorRecebido ?? i.valor), 0);
  const pago = (pred: (m: string) => boolean) => expenses.filter((e) => e.status === "paga" && e.pagoEm && pred(e.pagoEm.slice(0, 7))).reduce((s, e) => s + (e.valorPago ?? e.valor), 0);
  const saldoInicial = recebido((m) => m < mes) - pago((m) => m < mes);
  const entradas = recebido((m) => m === mes);
  const saidas = pago((m) => m === mes);
  const saldoFinal = saldoInicial + entradas - saidas;
  const fimMes = mes;
  const aReceber = invoices.filter((i) => monthKey(i.emissao) <= fimMes && (i.status !== "paga" || (i.recebidoEm ?? "").slice(0, 7) > fimMes)).reduce((s, i) => s + i.valor, 0);
  const aPagar = expenses.filter((e) => monthKey(e.vencimento) <= fimMes && (e.status !== "paga" || (e.pagoEm ?? "").slice(0, 7) > fimMes)).reduce((s, e) => s + e.valor, 0);

  const Row = ({ l, v, strong, indent, tone }: { l: string; v: number; strong?: boolean; indent?: boolean; tone?: string }) => (
    <div className={`flex justify-between py-1.5 text-sm border-b border-border ${strong ? "font-semibold" : ""}`}>
      <span className={indent ? "pl-4 text-muted-foreground" : ""}>{l}</span>
      <span className={`num ${tone ?? ""}`}>{fmtBRL(v)} <span className="text-[10px] text-muted-foreground w-12 inline-block text-right">{pct(v)}</span></span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Competência</span>
        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="input max-w-[180px]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-4">
          <div className="font-display text-base mb-2">DRE — {mes.split("-").reverse().join("/")}</div>
          <Row l="Receita bruta de fretes" v={receitaBruta} strong />
          <Row l="(−) Custo frota própria" v={-custoFrota} indent />
          <Row l="(−) Custo terceiros (ordens)" v={-custoTerceiros} indent />
          <Row l="(−) Frete terceiros (despesas)" v={-despFreteTerc} indent />
          <Row l="= Lucro bruto" v={lucroBruto} strong tone={lucroBruto >= 0 ? "text-success" : "text-danger"} />
          {Object.entries(porGrupo).map(([g, v]) => <Row key={g} l={`(−) ${g}`} v={-v} indent />)}
          <Row l="(−) Total despesas operacionais" v={-totalDespOp} />
          <Row l="= Resultado do período" v={resultado} strong tone={resultado >= 0 ? "text-success" : "text-danger"} />
          <p className="text-[10px] text-muted-foreground mt-2">Regime de competência: receitas pela emissão, custos pela data da ordem, despesas pelo vencimento.</p>
        </div>
        <div className="panel p-4">
          <div className="font-display text-base mb-2">Balancete — {mes.split("-").reverse().join("/")}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">Caixa / bancos</div>
          <Bal l="Saldo inicial" v={saldoInicial} />
          <Bal l="(+) Recebimentos de clientes" v={entradas} tone="text-success" />
          <Bal l="(−) Pagamentos" v={-saidas} tone="text-danger" />
          <Bal l="= Saldo final" v={saldoFinal} strong />
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-4">Ativo</div>
          <Bal l="Caixa / bancos" v={saldoFinal} />
          <Bal l="Contas a receber de clientes" v={aReceber} />
          <Bal l="Total do ativo" v={saldoFinal + aReceber} strong />
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-4">Passivo</div>
          <Bal l="Contas a pagar" v={aPagar} />
          <Bal l="Patrimônio (ativo − passivo)" v={saldoFinal + aReceber - aPagar} strong />
          <p className="text-[10px] text-muted-foreground mt-2">Caixa considera apenas o que foi conciliado (recebido/pago) na aba Conciliação.</p>
        </div>
      </div>
    </div>
  );
}

function Bal({ l, v, strong, tone }: { l: string; v: number; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm border-b border-border ${strong ? "font-semibold" : ""}`}>
      <span>{l}</span><span className={`num ${tone ?? ""}`}>{fmtBRL(v)}</span>
    </div>
  );
}
