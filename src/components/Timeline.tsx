// Linha do tempo de eventos de um registro.
import type { TimelineEntry } from "@/lib/mock-data";
import { fmtDate } from "@/lib/mock-data";
import { Clock, StickyNote, RefreshCcw, Paperclip, AlertOctagon, DollarSign, Cpu } from "lucide-react";

const ICON: Record<TimelineEntry["tipo"], typeof Clock> = {
  status: RefreshCcw,
  observacao: StickyNote,
  previsao: Clock,
  anexo: Paperclip,
  ocorrencia: AlertOctagon,
  custo: DollarSign,
  sistema: Cpu,
};

const TONE: Record<TimelineEntry["tipo"], string> = {
  status: "text-primary bg-primary/10 border-primary/30",
  observacao: "text-muted-foreground bg-muted/40 border-border",
  previsao: "text-info bg-info/10 border-info/30",
  anexo: "text-muted-foreground bg-muted/40 border-border",
  ocorrencia: "text-danger bg-danger/10 border-danger/30",
  custo: "text-accent bg-accent/10 border-accent/30",
  sistema: "text-muted-foreground bg-muted/40 border-border",
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return <div className="text-xs text-muted-foreground">Nenhum evento ainda.</div>;
  const sorted = [...entries].sort((a, b) => b.quando.localeCompare(a.quando));
  return (
    <ol className="space-y-2.5 relative pl-5">
      <span className="absolute left-2 top-2 bottom-2 w-px bg-border" aria-hidden />
      {sorted.map((e, i) => {
        const Icon = ICON[e.tipo];
        return (
          <li key={i} className="relative">
            <span className={`absolute -left-5 top-0.5 h-4 w-4 rounded-full grid place-items-center border ${TONE[e.tipo]}`}>
              <Icon className="h-2.5 w-2.5" />
            </span>
            <div className="text-xs text-muted-foreground">
              <span className="num">{fmtDate(e.quando)}</span> · {e.autor}
            </div>
            <div className="text-sm">{e.texto}</div>
          </li>
        );
      })}
    </ol>
  );
}
