import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { useClients, useFreightTables, useOrders, useQuotations, useRouteRates, useConfig } from "@/lib/mock-store";
import { identifyClient, compareCte, financialState } from "@/lib/reliability";
import { findFreightTable, findQuotation, calcFreight } from "@/lib/cost-calc";
import { fmtBRL, type Order } from "@/lib/mock-data";
import { commitLists } from "@/lib/shared-db";
import { useAuth } from "@/lib/auth";
import { financialAccess } from "@/lib/permissions";
export function RegularizationPreview() {
  const orders = useOrders(), clients = useClients(), tables = useFreightTables(), quotes = useQuotations();
  const [cfg] = useConfig();
  const { user } = useAuth();
  const [open,setOpen] = useState(false), [selected,setSelected] = useState<string[]>([]), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [chosen,setChosen] = useState<Record<string,string>>({});
  const rows = useMemo(() => orders.list.filter(o => !o.clienteId || !o.origemValor || (o.cteChave && financialState(o)==="pendente")).map(o => {
    const identified = identifyClient(clients.list,o.remetenteCnpj ?? "");
    const client = chosen[o.id] ? clients.list.find(c => c.id === chosen[o.id]) : clients.list.find(c=>c.id===o.clienteId) ?? identified.client;
    const args = { clienteId:client?.id ?? "",ufColeta:o.ufColeta,cidadeColeta:o.cidadeColeta,ufEntrega:o.ufEntrega,cidadeEntrega:o.cidadeEntrega };
    const quote = client ? findQuotation(quotes.list,args) : null;
    const table = !quote && client ? findFreightTable(tables.list,args) : null;
    const calc = table ? calcFreight(table,{peso:o.peso,valorNF:o.valorNF}) : null;
    const preserve = o.valorFrete>0 && !!o.origemValor;
    const proposed = preserve ? o.valorFrete : quote?.valorCalculado ?? (!calc?.error ? calc?.total : undefined);
    return { order:o,client,ambiguous:identified.ambiguous,proposed,origin:preserve ? o.origemValor : quote ? "cotacao" as const : table && !calc?.error ? "tabela" as const : "" as const,ref:preserve ? o.refValor : quote?.id ?? table?.id,reason:preserve ? `Preço existente preservado (${o.refValor ?? o.origemValor})` : calc?.error ?? (proposed ? quote ? `Cotação ${quote.id} · ${o.cidadeColeta}/${o.ufColeta} → ${o.cidadeEntrega}/${o.ufEntrega}` : `Tabela ${table?.id} · ${o.cidadeColeta}/${o.ufColeta} → ${o.cidadeEntrega}/${o.ufEntrega}` : identified.ambiguous ? "Selecione o cliente: CNPJ ambíguo" : "Sem tabela/cotação válida; pendência mantida") };
  }),[orders.list,clients.list,tables.list,quotes.list,chosen]);
  async function apply() {
    setBusy(true); setError("");
    try {
      const now=new Date().toISOString();
      const next=orders.list.map(o=>{
        const r=rows.find(r=>r.order.id===o.id && selected.includes(o.id));
        if(!r || !r.client)return o;
        const base=r.proposed ?? o.valorFrete;
        const comparison=o.cteChave ? compareCte(r.origin ? base : 0,o.cteValor ?? 0,cfg.toleranciaDivergenciaPercent) : o.conferencia;
        return { ...o,clienteId:r.client.id,clienteNome:r.client.nome,valorFrete:base,origemValor:r.origin,refValor:r.ref,conferencia:comparison,divergenciaPercent:comparison?.percent,stage:o.stage==="aguarda_vinculacao" && base>0 ? "valorizada" as const : o.stage,timeline:[...o.timeline,{quando:now,autor:user?.email ?? "",tipo:"sistema" as const,texto:`Regularização confirmada: ${r.reason}; cliente ${r.client.nome}; ${fmtBRL(o.valorFrete)} → ${fmtBRL(base)}`}],atualizadoEm:now };
      });
      await commitLists({orders:next},"Regularização histórica após prévia e confirmação explícita");
      setSelected([]);setOpen(false);
    }catch(e){setError(e instanceof Error?e.message:"Falha na regularização.");}finally{setBusy(false);}
  }
  if(!financialAccess(user))return null;
  return <section className="space-y-3"><Button variant="outline" onClick={()=>setOpen(!open)}>Revisar pendências históricas ({rows.length})</Button>{open && <div className="border border-border rounded-md p-4 space-y-3"><h2 className="font-semibold">Prévia de regularização</h2><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th>Selecionar</th><th>NF</th><th>Cliente proposto</th><th>Atual</th><th>Proposto</th><th>Motivo</th></tr></thead><tbody>{rows.map(r=><tr key={r.order.id} className="border-t border-border"><td className="p-2"><input type="checkbox" aria-label={`Regularizar NF ${r.order.numeroNFe}`} disabled={!r.client} checked={selected.includes(r.order.id)} onChange={e=>setSelected(e.target.checked?[...selected,r.order.id]:selected.filter(id=>id!==r.order.id))}/></td><td>{r.order.numeroNFe}</td><td><select aria-label={`Cliente NF ${r.order.numeroNFe}`} className="input" value={r.client?.id ?? ""} onChange={e=>setChosen({...chosen,[r.order.id]:e.target.value})}><option value="">Selecione</option>{clients.list.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></td><td>{fmtBRL(r.order.valorFrete)}</td><td>{r.proposed===undefined?"Pendente":fmtBRL(r.proposed)}</td><td className="p-2">{r.reason}{r.order.cteChave && financialState(r.order)==="pendente" && <div className="text-warning">CT-e aguarda conferência de valor</div>}</td></tr>)}</tbody></table></div>{error && <p role="alert" className="text-danger text-sm">{error}</p>}<Button disabled={busy || !selected.length} onClick={()=>void apply()}>Confirmar regularização de {selected.length} notas</Button></div>}</section>;
}