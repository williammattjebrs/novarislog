// Envio de atualização de rastreio em lote: escolhe o cliente e as notas.
import { useMemo, useState } from "react";
import { Mail, X, Copy } from "lucide-react";
import { type Order, type TimelineEntry } from "@/lib/mock-data";

import { Button } from "@/components/ui/button";
import { TrackingEmailPreview } from "@/components/TrackingEmailPreview";
import { buildTrackingEmail, copyTrackingEmail, downloadTrackingEmail } from "@/lib/tracking-email";

export function BulkClientUpdate({ orders, autor, onClose, onSent }: {
  orders: Order[];
  autor: string;
  onClose: () => void;
  onSent: (ids: string[], entry: TimelineEntry, email: string) => void;
}) {
  const clientes = useMemo(() => Array.from(new Set(orders.map((o) => o.clienteNome))).sort(), [orders]);
  const [cliente, setCliente] = useState(clientes[0] ?? "");
  const [soAbertas, setSoAbertas] = useState(true);
  const lista = orders.filter((o) => o.clienteNome === cliente && (!soAbertas || o.stage !== "entregue"));
  const [marcadas, setMarcadas] = useState<Set<string> | null>(null);
  const sel = marcadas ?? new Set(lista.map((o) => o.id));
  const [email, setEmail] = useState("");
  const emailSugerido = lista.find((o) => o.emailCliente)?.emailCliente ?? "";

  function trocarCliente(c: string) { setCliente(c); setMarcadas(null); setEmail(""); }
  function toggle(id: string) {
    const n = new Set(sel); if (n.has(id)) n.delete(id); else n.add(id); setMarcadas(n);
  }

  const escolhidas = lista.filter((o) => sel.has(o.id));
  const draft = buildTrackingEmail(escolhidas, cliente);
  const [feedback, setFeedback] = useState("");
  function enviar() {
    const destino = (email || emailSugerido).trim();
    if (!escolhidas.length) { setFeedback("Selecione ao menos uma nota."); return; }
    try {
      downloadTrackingEmail(draft, destino);
      onSent(escolhidas.map((o) => o.id), {
        quando: new Date().toISOString(), autor, tipo: "sistema",
        texto: `Rascunho de atualização consolidada preparado para ${destino} (${escolhidas.length} notas); envio não confirmado`,
      }, destino);
      setFeedback("E-mail baixado. Abra o arquivo .eml no Outlook para revisar e enviar, ou copie a tabela e cole no corpo de uma nova mensagem.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Não foi possível preparar o e-mail."); }
  }
  async function copiar() {
    try { await copyTrackingEmail(draft); setFeedback("Tabela copiada. Cole no corpo de uma nova mensagem de e-mail e confirme o envio."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Não foi possível copiar a tabela."); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel w-full max-w-5xl p-5 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-lg">Enviar atualização ao cliente</div>
          <Button variant="ghost" size="icon" aria-label="Fechar atualização" onClick={onClose}><X /></Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <select aria-label="Cliente da atualização" value={cliente} onChange={(e) => trocarCliente(e.target.value)} className="input">
            {clientes.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input aria-label="E-mail do cliente" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={emailSugerido || "e-mail do cliente"} className="input" />
        </div>
        <div className="flex items-center justify-between text-xs mb-2">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={soAbertas} onChange={(e) => { setSoAbertas(e.target.checked); setMarcadas(null); }} /> Só notas não entregues</label>
          <div className="flex gap-3">
            <button onClick={() => setMarcadas(new Set(lista.map((o) => o.id)))} className="text-primary hover:underline">Marcar todas</button>
            <button onClick={() => setMarcadas(new Set())} className="text-muted-foreground hover:underline">Desmarcar</button>
          </div>
        </div>
        <div className="overflow-y-auto border border-border rounded-md max-h-40 shrink-0">
          {lista.map((o) => (
            <label key={o.id} className="flex items-center gap-3 px-3 py-2 border-b border-border text-xs cursor-pointer hover:bg-elevated/50">
              <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} />
              <span className="num w-20">NF {o.numeroNFe}</span>
              <span className="flex-1">{o.cidadeEntrega}/{o.ufEntrega}</span>
              <span className="text-muted-foreground">{o.rastreio?.situacao ?? stageLabel(o.stage)}</span>
            </label>
          ))}
          {lista.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">Nenhuma nota para este cliente.</div>}
        </div>
        <div className="mt-4 overflow-y-auto min-h-0"><TrackingEmailPreview email={draft} /></div>
        {feedback && <p role="status" className="text-sm text-info mt-3">{feedback}</p>}
        <div className="flex flex-wrap gap-3 items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">{lista.filter((o) => sel.has(o.id)).length} de {lista.length} selecionadas</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copiar} disabled={!escolhidas.length}><Copy /> Copiar tabela</Button>
            <Button onClick={enviar} disabled={!escolhidas.length}><Mail /> Preparar e-mail</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
