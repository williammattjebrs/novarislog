// Tabela de rentabilidade: uma linha por CT-e, detalhe com rateio por peso das NFs.
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { fmtBRL } from "@/lib/mock-data";
import type { CteLinha } from "@/lib/cte-profit";

export function CteProfitTable({ linhas, detalhesVisiveis = false }: { linhas: CteLinha[]; detalhesVisiveis?: boolean }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const tot = linhas.reduce((t, l) => ({ r: t.r + l.receita, c: t.c + l.custo }), { r: 0, c: 0 });
  return (
    <div className="panel overflow-x-auto">
      <div className="p-3 border-b border-border text-xs text-muted-foreground">
        Receita = valor do CT-e. Custo da OC (motorista/frota) rateado pelo peso de cada NF sobre o total. {linhas.length} CT-e · receita {fmtBRL(tot.r)} · custo {fmtBRL(tot.c)} · margem {fmtBRL(tot.r - tot.c)}{tot.r ? ` (${(((tot.r - tot.c) / tot.r) * 100).toFixed(1)}%)` : ""}
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground text-left">
          <tr className="border-b border-border"><th className="p-2 w-6" /><th className="p-2">CT-e</th><th className="p-2">Data</th><th className="p-2">Cliente</th><th className="p-2">Rota</th><th className="p-2 text-right">NFs</th><th className="p-2 text-right">Peso</th><th className="p-2 text-right">Receita</th><th className="p-2 text-right">Custo</th><th className="p-2 text-right">Margem</th></tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <Fragment key={l.chave}>
              <tr className="border-b border-border hover:bg-elevated cursor-pointer" onClick={() => setAberto(aberto === l.chave ? null : l.chave)}>
                <td className="p-2">{aberto === l.chave ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                <td className="p-2 num text-primary">{l.numero}</td><td className="p-2 text-xs">{l.data}</td><td className="p-2 text-xs">{l.cliente}</td><td className="p-2 text-xs">{l.rota}</td>
                <td className="p-2 text-right num">{l.nfs.length}</td><td className="p-2 text-right num text-xs">{l.peso.toLocaleString("pt-BR")} kg</td>
                <td className="p-2 text-right num">{fmtBRL(l.receita)}</td>
                <td className="p-2 text-right num text-accent">{fmtBRL(l.custo)}{l.custoPendente && <span className="block text-[10px] text-warning">custo pendente</span>}</td>
                <td className={`p-2 text-right num ${l.margem >= 0 ? "text-success" : "text-danger"}`}>{fmtBRL(l.margem)} <span className="text-xs">· {l.margemPct.toFixed(1)}%</span></td>
              </tr>
               {(detalhesVisiveis || aberto === l.chave) && (
                <tr className="border-b border-border bg-elevated/40"><td colSpan={10} className="p-3">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground text-left"><tr><th className="p-1">NF</th><th className="p-1">OC</th><th className="p-1 text-right">Peso</th><th className="p-1 text-right">% do peso</th><th className="p-1 text-right">Frete rateado</th><th className="p-1 text-right">Custo rateado</th><th className="p-1 text-right">Margem</th></tr></thead>
                    <tbody>{l.nfs.map((n) => (
                      <tr key={n.orderId} className="border-t border-border"><td className="p-1 num">{n.nf}</td><td className="p-1">{n.ocId ?? "—"}</td><td className="p-1 text-right num">{n.peso.toLocaleString("pt-BR")} kg</td><td className="p-1 text-right num">{(n.pct * 100).toFixed(1)}%</td><td className="p-1 text-right num">{fmtBRL(n.receita)}</td><td className="p-1 text-right num">{fmtBRL(n.custo)}</td><td className="p-1 text-right num">{fmtBRL(n.receita - n.custo)}</td></tr>
                    ))}</tbody>
                  </table>
                </td></tr>
              )}
            </Fragment>
          ))}
          {!linhas.length && <tr><td colSpan={10} className="p-6 text-center text-xs text-muted-foreground">Nenhum CT-e vinculado no período.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
