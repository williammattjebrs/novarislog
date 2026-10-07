// Lançamento rápido de custo da entrega (terceiro ou frota) direto na tela de Coletas.
import { useState } from "react";
import { Truck, Building2, Check } from "lucide-react";
import type { Order, OrderCosts } from "@/lib/mock-data";
import { fmtBRL } from "@/lib/mock-data";
import { useConfig } from "@/lib/mock-store";
import { calcOrderCost } from "@/lib/cost-calc";

export function QuickCost({ order, onUpdate }: { order: Order; onUpdate: (patch: Partial<Order>) => void }) {
  const [cfg] = useConfig();
  const [c, setC] = useState<OrderCosts>({ ...order.costs, execMode: order.costs?.execMode || "terceiro" });
  const [saved, setSaved] = useState(false);
  const receita = order.cteValor ?? order.valorFrete;
  const custo = calcOrderCost(c, cfg.frota, receita).total;
  const margem = receita - custo;
  const pct = receita > 0 ? (margem / receita) * 100 : 0;
  const set = (patch: Partial<OrderCosts>) => { setC((p) => ({ ...p, ...patch })); setSaved(false); };

  function salvar() {
    onUpdate({
      costs: c,
      timeline: [...order.timeline, {
        quando: new Date().toISOString(), autor: "sistema", tipo: "custo",
        texto: `Custo lançado: ${fmtBRL(custo)} (${c.execMode === "frota" ? "frota própria" : `terceiro${c.fornecedor ? ` · ${c.fornecedor}` : ""}`})`,
      }],
    });
    setSaved(true);
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Custo do transporte</div>
        <div className="flex gap-1 border border-border rounded p-0.5">
          <button onClick={() => set({ execMode: "terceiro" })} className={`text-[11px] px-2 py-0.5 rounded inline-flex items-center gap-1 ${c.execMode === "terceiro" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}><Building2 className="h-3 w-3" />Terceiro</button>
          <button onClick={() => set({ execMode: "frota" })} className={`text-[11px] px-2 py-0.5 rounded inline-flex items-center gap-1 ${c.execMode === "frota" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}><Truck className="h-3 w-3" />Frota</button>
        </div>
      </div>
      {c.execMode === "terceiro" ? (
        <div className="grid grid-cols-2 gap-2">
          <input value={c.fornecedor ?? ""} onChange={(e) => set({ fornecedor: e.target.value })} placeholder="Transportadora" className="input text-xs" />
          <input type="number" step="0.01" value={c.valorPagoTerceiro ?? ""} onChange={(e) => set({ valorPagoTerceiro: Number(e.target.value) || undefined })} onKeyDown={(e) => e.key === "Enter" && salvar()} placeholder="Valor pago R$" className="input num text-xs" autoFocus />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={c.kmRodados ?? ""} onChange={(e) => set({ kmRodados: Number(e.target.value) || undefined })} placeholder="Km rodados" className="input num text-xs" />
          <input type="number" step="0.01" value={c.pedagio ?? ""} onChange={(e) => set({ pedagio: Number(e.target.value) || undefined })} placeholder="Pedágio real (opc.)" className="input num text-xs" />
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span>Custo <b className="num text-accent">{fmtBRL(custo)}</b> · Margem <b className={`num ${margem >= 0 ? "text-success" : "text-danger"}`}>{fmtBRL(margem)} ({pct.toFixed(1)}%)</b></span>
        <button onClick={salvar} className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
          {saved ? <><Check className="h-3 w-3" />Salvo</> : "Salvar custo"}
        </button>
      </div>
    </div>
  );
}
