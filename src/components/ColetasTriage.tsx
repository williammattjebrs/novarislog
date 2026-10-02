import { Link } from "@tanstack/react-router";
import { Mail, FileCheck2, AlertTriangle } from "lucide-react";
import { fmtBRL, DEFAULT_EMAIL_INBOX, type Order, type AppConfig } from "@/lib/mock-data";

// Caixa de e-mail (preparada) + sugestão de CT-e + fila de tratamento do time.
export function ColetasTriage({
  orders, cfg, onSelect, onEmitirSugerido,
}: {
  orders: Order[];
  cfg: AppConfig;
  onSelect: (id: string) => void;
  onEmitirSugerido: (o: Order) => void;
}) {
  const inbox = cfg.emailInbox ?? DEFAULT_EMAIL_INBOX;
  const sugeridos = orders.filter((o) => o.valorFrete > 0 && !o.cteValor && !["cte_ok", "em_viagem", "entregue"].includes(o.stage));
  const tratamento = orders.filter((o) => !o.valorFrete || o.stage === "aguarda_vinculacao" || o.stage === "cte_divergente");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-primary" />
          <div className="font-display">Captação por e-mail</div>
        </div>
        {inbox.endereco ? (
          <div className="text-xs space-y-1">
            <div className="num">{inbox.endereco}</div>
            <div className="text-muted-foreground">Filtro: {inbox.filtro} · a cada {inbox.intervaloMin} min</div>
            <div className={inbox.ativo ? "text-success" : "text-warning"}>
              {inbox.ativo ? "● Leitura automática ligada (aguardando autorização da conta)" : "○ Leitura automática desligada"}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma caixa configurada. Os XML recebidos no e-mail empresarial entrarão aqui automaticamente.</p>
        )}
        <Link to="/configuracoes" className="text-xs text-primary hover:underline mt-2 inline-block">configurar e-mail →</Link>
      </div>

      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileCheck2 className="h-4 w-4 text-success" />
          <div className="font-display">CT-e sugerido pela tabela</div>
          <span className="ml-auto num text-success">{sugeridos.length}</span>
        </div>
        <div className="space-y-1.5 max-h-40 overflow-auto">
          {sugeridos.slice(0, 8).map((o) => (
            <div key={o.id} className="flex items-center gap-2 text-xs">
              <button onClick={() => onSelect(o.id)} className="flex-1 text-left truncate hover:text-primary">
                NF {o.numeroNFe} · {o.cidadeEntrega}/{o.ufEntrega}
              </button>
              <span className="num">{fmtBRL(o.valorFrete)}</span>
              <button onClick={() => onEmitirSugerido(o)} className="px-2 py-0.5 rounded border border-success/40 text-success hover:bg-success/10">emitir</button>
            </div>
          ))}
          {sugeridos.length === 0 && <div className="text-xs text-muted-foreground">Nada pendente.</div>}
        </div>
      </div>

      <div className="panel p-4 border-warning/40">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <div className="font-display">Tratamento do time</div>
          <span className="ml-auto num text-warning">{tratamento.length}</span>
        </div>
        <div className="space-y-1.5 max-h-40 overflow-auto">
          {tratamento.slice(0, 8).map((o) => (
            <button key={o.id} onClick={() => onSelect(o.id)} className="w-full flex items-center gap-2 text-xs text-left hover:text-primary">
              <span className="flex-1 truncate">NF {o.numeroNFe} · {o.clienteNome}</span>
              <span className={o.stage === "cte_divergente" ? "text-danger" : "text-warning"}>
                {o.stage === "cte_divergente" ? "CT-e divergente" : "sem tabela"}
              </span>
            </button>
          ))}
          {tratamento.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma pendência.</div>}
        </div>
      </div>
    </div>
  );
}
