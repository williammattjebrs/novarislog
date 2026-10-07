import { fmtBRL } from "@/lib/mock-data";
import { AlertTriangle } from "lucide-react";

export function DivergenceBadge({ percent, tolerancia }: { percent: number; tolerancia: number }) {
  const abs = Math.abs(percent);
  const over = abs > tolerancia;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${
        over
          ? "text-danger bg-danger/10 border-danger/40"
          : "text-success bg-success/10 border-success/30"
      }`}
      title={`Tolerância configurada: ±${tolerancia}%`}
    >
      {over && <AlertTriangle className="h-3 w-3" />}
      {percent > 0 ? "+" : ""}{percent.toFixed(2)}%
    </span>
  );
}

export function DivergenceLine({ ordemValor, cteValor, tolerancia }: {
  ordemValor: number; cteValor: number; tolerancia: number;
}) {
  if(!(ordemValor>0 && cteValor>0))return <p className="text-xs text-warning">Aguarda conferência de valor</p>;
  const diff = cteValor - ordemValor;
  const pct = ordemValor > 0 ? (diff / ordemValor) * 100 : 0;
  return (
    <div className="text-xs space-y-1">
      <div className="flex justify-between"><span className="text-muted-foreground">Valor ordem</span><span className="num">{fmtBRL(ordemValor)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Valor CT-e</span><span className="num">{fmtBRL(cteValor)}</span></div>
      <div className="flex justify-between items-center pt-1 border-t border-border">
        <span className="text-muted-foreground">Diferença</span>
        <span className="flex items-center gap-2">
          <span className={`num ${diff === 0 ? "" : diff > 0 ? "text-accent" : "text-info"}`}>{fmtBRL(diff)}</span>
          <DivergenceBadge percent={pct} tolerancia={tolerancia} />
        </span>
      </div>
    </div>
  );
}
