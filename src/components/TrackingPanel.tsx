import { useState } from "react";
import { MapPin, Mail, Copy } from "lucide-react";
import { DEFAULT_EMAIL_TEMPLATE, renderTemplate, stageLabel, type AppConfig, type Order, type TimelineEntry } from "@/lib/mock-data";

import { buildTrackingEmail, copyTrackingEmail, enrichTrackingOrders } from "@/lib/tracking-email";
import { useOrdensColeta } from "@/lib/mock-store";
import { TrackingEmailPreview } from "@/components/TrackingEmailPreview";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { sendTrackingUpdate } from "@/lib/tracking-send.functions";
import { readTrackingGroup, trackingPayload } from "@/lib/tracking-groups";

const SITUACOES = [
  "Aguardando coleta", "Coletado", "Em trânsito", "Em transferência (CD)", "Saiu para entrega",
  "Entregue", "Destinatário ausente", "Avaria", "Retido em fiscalização", "Devolução",
];

// Apontamento manual do rastreio (quando não há integração) + envio de e-mail ao cliente.
export function TrackingPanel({
  order, cfg, autor, onUpdate,
}: {
  order: Order;
  cfg: AppConfig;
  autor: string;
  onUpdate: (patch: Partial<Order>) => void;
}) {
  const [situacao, setSituacao] = useState(order.rastreio?.situacao ?? SITUACOES[0]);
  const [local, setLocal] = useState(order.rastreio?.local ?? "");
  const [email, setEmail] = useState(order.emailCliente ?? "");
  const [preview, setPreview] = useState<Order | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const send = useServerFn(sendTrackingUpdate);
  const tpl = cfg.emailTemplate ?? DEFAULT_EMAIL_TEMPLATE;

  function entry(texto: string, tipo: TimelineEntry["tipo"] = "status"): TimelineEntry {
    return { quando: new Date().toISOString(), autor, tipo, texto };
  }

  function salvar() {
    const rastreio = { situacao, local, atualizadoEm: new Date().toISOString(), fonte: "manual" as const };
    const tl = [...order.timeline, entry(`Rastreio manual: ${situacao}${local ? ` — ${local}` : ""}`)];
    const next = { ...order, rastreio };
    if (tpl.autoEnvio && email && tpl.estagiosAuto.includes(order.stage)) tl.push(entry(`E-mail automático de rastreio preparado para ${email}`, "sistema"));
    onUpdate({ rastreio, emailCliente: email, timeline: tl, atualizadoEm: new Date().toISOString() });
    if (tpl.autoEnvio && email && tpl.estagiosAuto.includes(order.stage)) abrirEmail(next);
  }

  function abrirEmail(o: Order = order) {
    if (!email) { alert("Informe o e-mail do cliente."); return; }
    setPreview(o);
    setFeedback("");
  }

  const ocs = useOrdensColeta();
  const draft = buildTrackingEmail(enrichTrackingOrders([preview ?? order], ocs.list), order.clienteNome, renderTemplate(tpl.assunto, preview ?? order, stageLabel((preview ?? order).stage)), renderTemplate(tpl.corpo, preview ?? order, stageLabel((preview ?? order).stage)));
  async function preparar() {
    if (busy) return;
    setBusy(true);
    try {
      const group = readTrackingGroup(order.clienteNome);
      const recipients = group.emails.length ? group.emails : [email.trim()];
      await send({ data: { cliente: order.clienteNome, destinatarios: recipients, ordens: trackingPayload([preview ?? order]) } });
      onUpdate({ emailCliente: email, timeline: [...order.timeline, entry(`Atualização de rastreio aceita pela Microsoft para envio a ${recipients.join("; ")}`, "sistema")] });
      setFeedback("Atualização aceita pela Microsoft para envio ao grupo do cliente.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Falha ao preparar e-mail."); }
    finally { setBusy(false); }
  }
  async function copiar() {
    try { await copyTrackingEmail(draft); setFeedback("Tabela copiada. Cole no corpo da mensagem e confirme o envio no seu e-mail."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Falha ao copiar tabela."); }
  }

  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <div className="font-display">Rastreio manual</div>
        {order.rastreio && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            atualizado {new Date(order.rastreio.atualizadoEm).toLocaleString("pt-BR")}
          </span>
        )}
      </div>
      <label className="block">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Situação atual</div>
        <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className="input">
          {SITUACOES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="block">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Local / observação</div>
        <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Registro/SP, km 420" className="input" />
      </label>
      <label className="block">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">E-mail do cliente</div>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@empresa.com.br" className="input" />
      </label>
      <div className="flex gap-2">
        <button onClick={salvar} className="flex-1 text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90">Salvar situação</button>
        <button
          onClick={() => {
            abrirEmail();
          }}
          className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated inline-flex items-center gap-1"
        ><Mail className="h-3.5 w-3.5" /> Enviar e-mail</button>
      </div>
      {preview && <div className="space-y-3 border-t border-border pt-3">
        <TrackingEmailPreview email={draft} />
        <div className="flex flex-wrap gap-2"><Button onClick={preparar} disabled={busy}><Mail />{busy ? "Enviando…" : "Enviar atualização"}</Button><Button variant="outline" onClick={copiar}><Copy /> Copiar tabela</Button></div>
        {feedback && <p role="status" className="text-sm text-info">{feedback}</p>}
      </div>}
      <div className="text-[10px] text-muted-foreground">
        {tpl.autoEnvio ? "Envio automático ligado: ao salvar, a atualização é preparada para revisão." : "Envio automático desligado (configure em Configurações)."}
      </div>
    </div>
  );
}
