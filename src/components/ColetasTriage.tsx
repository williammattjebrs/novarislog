import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, FileCheck2, AlertTriangle, RefreshCw } from "lucide-react";
import { fmtBRL, type Order } from "@/lib/mock-data";
import { refreshShared } from "@/lib/shared-db";
import { getInboxConfig, syncInbox, listPendingXml, markXmlImported } from "@/lib/email-inbox.functions";

type EmailImportResult = { nfe: number; cte: number; dup: number; fail: number; chaves: string[]; cteAguardando?: number } | null;

// Caixa de e-mail (IMAP) + sugestão de CT-e + fila de tratamento do time.
export function ColetasTriage({
  orders, onSelect, onEmitirSugerido, onImportEmail,
}: {
  orders: Order[];
  onSelect: (id: string) => void;
  onEmitirSugerido: (o: Order) => void;
  onImportEmail: (xmls: { chave: string; tipo: "nfe" | "cte"; xml: string }[]) => Promise<EmailImportResult>;
}) {
  const qc = useQueryClient();
  const fetchCfg = useServerFn(getInboxConfig);
  const sync = useServerFn(syncInbox);
  const pending = useServerFn(listPendingXml);
  const mark = useServerFn(markXmlImported);
  const { data: inbox } = useQuery({ queryKey: ["inbox-config"], queryFn: () => fetchCfg(), retry: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const busyRef = useRef(false);

  const sugeridos = orders.filter((o) => o.valorFrete > 0 && !o.cteValor && !["cte_ok", "em_viagem", "entregue"].includes(o.stage));
  const tratamento = orders.filter((o) => !o.valorFrete || o.stage === "aguarda_vinculacao" || o.stage === "cte_divergente");

  async function buscar(silencioso = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await refreshShared();
      const r = await sync();
      const lista = await pending();
      let resumo = r.mensagem;
      if (lista.length) {
        const imp = await onImportEmail(lista);
        if (imp) {
          await mark({ data: { chaves: imp.chaves } });
          resumo += ` → ${imp.nfe} NF-e e ${imp.cte} CT-e lançados${imp.dup ? ` · ${imp.dup} já existiam` : ""}${imp.cteAguardando ? ` · ${imp.cteAguardando} CT-e aguardando a NF-e correspondente` : ""}`;
        } else {
          resumo += " → XMLs aguardando: cadastre um cliente para lançar.";
        }
      }
      setMsg(resumo);
      qc.invalidateQueries({ queryKey: ["inbox-config"] });
    } catch (e) {
      if (!silencioso) setMsg(e instanceof Error ? e.message : "Falha ao buscar XML do e-mail.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-primary" />
          <div className="font-display">Captação por e-mail</div>
        </div>
        {inbox?.host ? (
          <div className="text-xs space-y-1">
            <div className="num">{inbox.usuario} · {inbox.pasta}</div>
            <div className="text-muted-foreground">Últimos {inbox.diasRetroativos} dia(s) · a cada {inbox.intervaloMin} min</div>
            <div className={inbox.ativo ? "text-success" : "text-warning"}>
              {inbox.ativo ? "● Captação configurada · automação de produção pendente" : "○ Leitura automática desligada"}
            </div>
            {inbox.ultimaSync && (
              <div className="text-muted-foreground">Última leitura: {new Date(inbox.ultimaSync).toLocaleString("pt-BR")}</div>
            )}
            <button
              onClick={() => buscar(false)}
              disabled={busy}
              className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} /> {busy ? "Buscando…" : "Buscar XML agora"}
            </button>
            {(msg || inbox.ultimoStatus) && (
              <div className={`text-[11px] ${(msg ?? inbox.ultimoStatus ?? "").startsWith("Erro") ? "text-danger" : "text-muted-foreground"}`}>
                {msg ?? inbox.ultimoStatus}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma caixa configurada. Informe os dados IMAP em Configurações para buscar os XML automaticamente.</p>
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
