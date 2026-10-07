// Conciliação (baixa de recebimentos/pagamentos) + Balancete e DRE mensal.
import { useState } from "react";
import { CheckCircle2, Undo2 } from "lucide-react";
import { fmtBRL, monthKey, type Expense, type Invoice, type Order, type AppConfig } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { addPayment, paidAmount, reversePayment, type Movement } from "@/lib/reliability";
import { Button } from "@/components/ui/button";
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
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"receber" | "pagar">("receber");
  const [soAbertos, setSoAbertos] = useState(true);
  const [baixa, setBaixa] = useState<{ kind: "rec" | "pag"; key: string; valor: number } | null>(null);
  const [data, setData] = useState(today());
  const [valor, setValor] = useState(0);
  const [conta, setConta] = useState("");

  function abrir(kind: "rec" | "pag", key: string, v: number) { setBaixa({ kind, key, valor: v }); setValor(v); setData(today()); }
  async function confirmar() {
    if (!baixa || busy) return;
    setBusy(true); setError("");
    try {
      const movement: Movement = { id: crypto.randomUUID(), type: "baixa", value: valor, date: data, author: user?.email ?? "", reason: "Baixa manual", account: conta };
      if (baixa.kind === "rec") {
        const title = invoices.find(i => i.id === baixa.key);
        if (!title) throw new Error("Título não localizado pelo identificador.");
        const legacy = title.valorRecebido ?? (title.status === "paga" && !title.movements ? title.valor : 0);
        const movements = addPayment(title.valor, title.movements ?? [], legacy, movement);
        await setInvoices(invoices.map(i => i.id === title.id ? { ...i, movements, status: paidAmount(movements,legacy) >= i.valor ? "paga" : "aberta", recebidoEm: data, conta } : i));
      } else {
        const title = expenses.find(e => e.id === baixa.key);
        if (!title) throw new Error("Despesa não localizada.");
        const legacy = title.valorPago ?? (title.status === "paga" && !title.movements ? title.valor : 0);
        const movements = addPayment(title.valor, title.movements ?? [], legacy, movement);
        await updateExpense(title.id, { movements, status: paidAmount(movements,legacy) >= title.valor ? "paga" : "prevista", pagoEm: data, conta });
      }
      setBaixa(null);
    } catch(e) { setError(e instanceof Error ? e.message : "Falha na baixa."); }
    finally { setBusy(false); }
  }
  const received = (i: Inv) => paidAmount(i.movements, i.valorRecebido ?? (i.status === "paga" && !i.movements ? i.valor : 0));
  const paid = (e: Expense) => paidAmount(e.movements, e.valorPago ?? (e.status === "paga" && !e.movements ? e.valor : 0));
  async function estornar(kind: "rec"|"pag", id: string) {
    const title = kind === "rec" ? invoices.find(i => i.id === id) : expenses.find(e => e.id === id);
    if (!title) return;
    const last = [...(title.movements ?? [])].reverse().find(m => m.type === "baixa" && !title.movements?.some(x => x.reverses === m.id));
    if (!last) { setError("Baixa histórica: regularização manual necessária para preservar o histórico."); return; }
    const reason = prompt("Motivo do estorno");
    if (!reason) return;
    try {
      const movements = reversePayment(title.movements ?? [], last.id, user?.email ?? "", reason, today());
      if (kind === "rec") await setInvoices(invoices.map(i => i.id === id ? { ...i, movements, status: "aberta" } : i));
      else await updateExpense(id,{ movements, status:"prevista" });
    } catch(e) { setError(e instanceof Error ? e.message : "Falha no estorno."); }
  }

  const rec = invoices.filter((i) => !soAbertos || received(i) < i.valor);
  const pag = expenses.filter((e) => !soAbertos || paid(e) < e.valor);

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
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
              <tr key={i.id ?? i.numero} className="border-t border-border">
                <td className="px-4 py-2.5 num text-xs text-primary">{i.numero}</td>
                <td className="text-xs">{i.clienteNome}</td>
                <td className="text-xs num">{i.vencimento}</td>
                <td className="text-right num">{fmtBRL(i.valor)}</td>
                <td className="text-xs pl-4">Recebido {fmtBRL(received(i))} · saldo {fmtBRL(Math.max(0,i.valor-received(i)))}{i.movements?.map(m => <div key={m.id} className="text-muted-foreground">{m.type} · {fmtD(m.date)} · {fmtBRL(m.value)} · {m.author} · {m.reason}</div>)}</td>
                <td className="text-right pr-4"><div className="flex justify-end gap-2">
                  {received(i)<i.valor && i.id && <Button size="sm" variant="ghost" onClick={() => abrir("rec",i.id ?? "",i.valor-received(i))}>Receber</Button>}
                  {!!i.movements?.length && i.id && <Button size="icon" variant="ghost" aria-label="Estornar recebimento" title="Estornar última baixa" onClick={() => void estornar("rec",i.id ?? "")}><Undo2 className="h-3 w-3" /></Button>}
                </div></td>
              </tr>
            )) : pag.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-2.5 text-xs">{e.descricao}</td>
                <td className="text-xs">{e.fornecedor}</td>
                <td className="text-xs num">{e.vencimento}</td>
                <td className="text-right num">{fmtBRL(e.valor)}</td>
                <td className="text-xs pl-4">Pago {fmtBRL(paid(e))} · saldo {fmtBRL(Math.max(0,e.valor-paid(e)))}{e.movements?.map(m => <div key={m.id} className="text-muted-foreground">{m.type} · {fmtD(m.date)} · {fmtBRL(m.value)} · {m.author} · {m.reason}</div>)}</td>
                <td className="text-right pr-4"><div className="flex justify-end gap-2">
                  {paid(e)<e.valor && <Button size="sm" variant="ghost" onClick={() => abrir("pag",e.id,e.valor-paid(e))}>Pagar</Button>}
                  {!!e.movements?.length && <Button size="icon" variant="ghost" aria-label="Estornar pagamento" title="Estornar última baixa" onClick={() => void estornar("pag",e.id)}><Undo2 className="h-3 w-3" /></Button>}
                </div></td>
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
              <button disabled={busy} onClick={() => void confirmar()} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90">Confirmar</button>
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
  const receitaBruta = invoices.filter((i) => monthKey(i.competencia ?? i.emissao) === mes).reduce((s, i) => s + i.valor, 0);
  const ordensMes = orders.filter((o) => monthKey(o.criadoEm) === mes && o.costs?.execMode && !expenses.some(e => e.orderId === o.id));
  const custoTerceiros = ordensMes.filter((o) => o.costs.execMode === "terceiro").reduce((s, o) => s + calcOrderCost(o.costs, cfg.frota, o.cteValor ?? o.valorFrete).total, 0);
  const custoFrota = ordensMes.filter((o) => o.costs.execMode === "frota").reduce((s, o) => s + calcOrderCost(o.costs, cfg.frota, o.cteValor ?? o.valorFrete).total, 0);
  const despMes = expenses.filter((e) => monthKey(e.competencia ?? e.vencimento) === mes);
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
  const cash = (items: (Inv|Expense)[], pred: (m:string)=>boolean) => items.reduce((sum,t) => {
    const rec = 'numero' in t;
    const legacyDate = rec ? t.recebidoEm : t.pagoEm;
    const legacyValue = rec ? t.valorRecebido : t.valorPago;
    const legacy = legacyDate && pred(monthKey(legacyDate)) ? (legacyValue ?? (t.status==='paga' && !t.movements ? t.valor : 0)) : 0;
    return sum + legacy + (t.movements ?? []).filter(m => pred(monthKey(m.date))).reduce((v,m)=>v+(m.type==='estorno'?-m.value:m.value),0);
  },0);
  const recebido = (pred:(m:string)=>boolean) => cash(invoices,pred);
  const pago = (pred:(m:string)=>boolean) => cash(expenses,pred);
  const saldoInicial = recebido((m) => m < mes) - pago((m) => m < mes);
  const entradas = recebido((m) => m === mes);
  const saidas = pago((m) => m === mes);
  const saldoFinal = saldoInicial + entradas - saidas;
  const fimMes = mes;
  const aReceber = invoices.filter(i => monthKey(i.competencia ?? i.emissao)<=fimMes).reduce((sum,i)=>sum+Math.max(0,i.valor-cash([i],m=>m<=fimMes)),0);
  const aPagar = expenses.filter(e => monthKey(e.competencia ?? e.vencimento)<=fimMes).reduce((sum,e)=>sum+Math.max(0,e.valor-cash([e],m=>m<=fimMes)),0);

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
          <div className="font-display text-base mb-2">DRE gerencial — {mes.split("-").reverse().join("/")}</div>
          <Row l="Receita bruta de fretes" v={receitaBruta} strong />
          <Row l="(−) Custo frota própria" v={-custoFrota} indent />
          <Row l="(−) Custo terceiros (ordens)" v={-custoTerceiros} indent />
          <Row l="(−) Frete terceiros (despesas)" v={-despFreteTerc} indent />
          <Row l="= Lucro bruto" v={lucroBruto} strong tone={lucroBruto >= 0 ? "text-success" : "text-danger"} />
          {Object.entries(porGrupo).map(([g, v]) => <Row key={g} l={`(−) ${g}`} v={-v} indent />)}
          <Row l="(−) Total despesas operacionais" v={-totalDespOp} />
          <Row l="= Resultado do período" v={resultado} strong tone={resultado >= 0 ? "text-success" : "text-danger"} />
          <p className="text-[10px] text-muted-foreground mt-2">Relatório gerencial, não substitui contabilidade. Custos de frota podem ser estimados; ordens sem custo permanecem pendentes.</p>
        </div>
        <div className="panel p-4">
          <div className="font-display text-base mb-2">Resumo de caixa — {mes.split("-").reverse().join("/")}</div>
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
