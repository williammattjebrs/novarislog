// Envio de atualização de rastreio em lote: escolhe o cliente e as notas.
import { useEffect, useMemo, useState } from "react";
import { Mail, X, Copy } from "lucide-react";
import { stageLabel, type Order, type TimelineEntry } from "@/lib/mock-data";

import { Button } from "@/components/ui/button";
import { TrackingEmailPreview } from "@/components/TrackingEmailPreview";
import { buildTrackingEmail, copyTrackingEmail } from "@/lib/tracking-email";

import { useServerFn } from "@tanstack/react-start";
import { sendTrackingUpdate } from "@/lib/tracking-send.functions";
import { readTrackingGroup, saveTrackingGroup, trackingPayload } from "@/lib/tracking-groups";

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

  const send = useServerFn(sendTrackingUpdate);
  const [automatic, setAutomatic] = useState(false);
  const [intervalMin, setIntervalMin] = useState(60);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const group = readTrackingGroup(cliente); setEmail(group.emails.join("; ")); setAutomatic(group.automatic); setIntervalMin(group.intervalMin); }, [cliente]);
  function recipients() {
    const emails = Array.from(new Set((email || emailSugerido).split(/[;,\s]+/).map((v) => v.trim().toLowerCase()).filter(Boolean)));
    if (!emails.length || emails.length > 30 || emails.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) throw new Error("Informe de 1 a 30 e-mails válidos, separados por ponto e vírgula.");
    return emails;
  }
  async function saveGroup() {
    try { const old = readTrackingGroup(cliente); await saveTrackingGroup(cliente, { emails: recipients(), automatic, intervalMin, lastSent: old.lastSent }); setFeedback("Grupo salvo. Envio periódico aguarda ativação de produção."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Falha ao salvar grupo."); }
  }
  function trocarCliente(c: string) { setCliente(c); setMarcadas(null); setEmail(""); }
  function toggle(id: string) {
    const n = new Set(sel); if (n.has(id)) n.delete(id); else n.add(id); setMarcadas(n);
  }

  const escolhidas = lista.filter((o) => sel.has(o.id));
  const draft = buildTrackingEmail(escolhidas, cliente);
  const [feedback, setFeedback] = useState("");
  async function enviar() {
    if (!escolhidas.length || busy) return;
    setBusy(true); setFeedback("");
    try {
      const emails = recipients();
      await send({ data: { cliente, destinatarios: emails, ordens: trackingPayload(escolhidas) } });
      await saveTrackingGroup(cliente, { emails, automatic, intervalMin, lastSent: new Date().toISOString() });
      onSent(escolhidas.map((o) => o.id), { quando: new Date().toISOString(), autor, tipo: "sistema", texto: `Atualização em tabela aceita pela Microsoft para envio a ${emails.join("; ")} (${escolhidas.length} notas)` }, emails[0] ?? "");
      setFeedback("Atualização aceita pela Microsoft para envio ao grupo. Confira a caixa de enviados para acompanhar.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Falha no envio."); }
    finally { setBusy(false); }
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
          <input aria-label="E-mail do cliente" type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={emailSugerido || "email1@empresa.com; email2@empresa.com"} className="input" />
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
          <label className="flex items-center gap-2"><input type="checkbox" checked={automatic} onChange={(e) => setAutomatic(e.target.checked)} /> Envio automático</label>
          <label className="flex items-center gap-2">A cada <select aria-label="Intervalo de envio" value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))} className="input w-auto"><option value={15}>15 minutos</option><option value={30}>30 minutos</option><option value={60}>1 hora</option><option value={120}>2 horas</option><option value={240}>4 horas</option><option value={1440}>24 horas</option></select></label>
          <Button variant="outline" size="sm" onClick={saveGroup}>Salvar grupo</Button>
          <span className="text-muted-foreground">Automático com Monitoramento aberto; envia notas não entregues.</span>
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
            <Button onClick={enviar} disabled={!escolhidas.length || busy}><Mail /> {busy ? "Enviando…" : "Enviar atualização"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
