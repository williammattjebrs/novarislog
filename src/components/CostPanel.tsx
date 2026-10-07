// Painel de custo por entrega — frota própria vs terceiro.
import { useState } from "react";
import type { OrderCosts } from "@/lib/mock-data";
import { fmtBRL } from "@/lib/mock-data";
import { useConfig } from "@/lib/mock-store";
import { useAuth } from "@/lib/auth";
import { calcOrderCost } from "@/lib/cost-calc";
import { Truck, Building2 } from "lucide-react";

export function CostPanel({ costs, valorFrete, onSave }: {
  const { user } = useAuth();
  const canSee = user?.role === "admin" || user?.role === "financeiro";
  costs: OrderCosts; valorFrete: number; onSave: (next: OrderCosts) => void;
}) {
  const [cfg] = useConfig();
  const [c, setC] = useState<OrderCosts>(costs);

  const calc = calcOrderCost(c, cfg.frota, valorFrete);
  const margem = valorFrete - calc.total;
  const margemPct = valorFrete > 0 ? (margem / valorFrete) * 100 : 0;

  function update<K extends keyof OrderCosts>(k: K, v: OrderCosts[K]) {
    setC((prev) => ({ ...prev, [k]: v }));
  }

  if (!canSee) return <div className="panel p-4 text-xs text-muted-foreground italic">Informações de custo restritas ao financeiro.</div>;
  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-base">Custo da entrega</div>
        <div className="flex gap-1 border border-border rounded-md p-0.5">
          <button
            onClick={() => update("execMode", "frota")}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${c.execMode === "frota" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          ><Truck className="h-3 w-3" /> Frota própria</button>
          <button
            onClick={() => update("execMode", "terceiro")}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${c.execMode === "terceiro" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          ><Building2 className="h-3 w-3" /> Terceiro</button>
        </div>
      </div>

      {c.execMode === "terceiro" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fornecedor">
            <input value={c.fornecedor ?? ""} onChange={(e) => update("fornecedor", e.target.value)} className="input" />
          </Field>
          <Field label="Valor pago (R$)">
            <input type="number" value={c.valorPagoTerceiro ?? 0} onChange={(e) => update("valorPagoTerceiro", Number(e.target.value))} className="input num" />
          </Field>
          <Field label="Observação" full>
            <input value={c.observacao ?? ""} onChange={(e) => update("observacao", e.target.value)} className="input" />
          </Field>
        </div>
      )}

      {c.execMode === "frota" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Km rodados">
            <input type="number" value={c.kmRodados ?? 0} onChange={(e) => update("kmRodados", Number(e.target.value))} className="input num" />
          </Field>
          <Field label={`Km/L (default ${cfg.frota.kmPorLitro})`}>
            <input type="number" step="0.1" value={c.kmPorLitro ?? ""} placeholder={String(cfg.frota.kmPorLitro)} onChange={(e) => update("kmPorLitro", Number(e.target.value) || undefined)} className="input num" />
          </Field>
          <Field label={`Preço diesel (default R$ ${cfg.frota.precoDiesel.toFixed(2)})`}>
            <input type="number" step="0.01" value={c.precoDiesel ?? ""} placeholder={String(cfg.frota.precoDiesel)} onChange={(e) => update("precoDiesel", Number(e.target.value) || undefined)} className="input num" />
          </Field>
          <Field label="Pedágio real (R$, opcional)">
            <input type="number" step="0.01" value={c.pedagio ?? ""} onChange={(e) => update("pedagio", Number(e.target.value) || undefined)} className="input num" />
          </Field>
          <Field label="Comissão motorista (R$, opcional)">
            <input type="number" step="0.01" value={c.comissaoMotorista ?? ""} placeholder={`auto ${cfg.frota.comissaoMotoristaPercent}%`} onChange={(e) => update("comissaoMotorista", Number(e.target.value) || undefined)} className="input num" />
          </Field>
          <Field label="Outros (manut. avulsa)">
            <input type="number" step="0.01" value={c.outros ?? ""} onChange={(e) => update("outros", Number(e.target.value) || undefined)} className="input num" />
          </Field>
        </div>
      )}

      {c.execMode && (
        <div className="border-t border-border pt-3 space-y-1.5">
          {calc.detalhes.map((d) => (
            <div key={d.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="num">{fmtBRL(d.valor)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span>Custo total</span>
            <span className="num text-accent">{fmtBRL(calc.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Margem</span>
            <span className={`num ${margem >= 0 ? "text-success" : "text-danger"}`}>{fmtBRL(margem)} · {margemPct.toFixed(1)}%</span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => onSave(c)} className="text-xs px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25">
          Salvar custos
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  if (!canSee) return <div className="panel p-4 text-xs text-muted-foreground italic">Informações de custo restritas ao financeiro.</div>;
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
