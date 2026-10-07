import { useState } from "react";
import { MapPin, Mail, Copy } from "lucide-react";
import { DEFAULT_EMAIL_TEMPLATE, renderTemplate, stageLabel, type AppConfig, type Order, type TimelineEntry } from "@/lib/mock-data";

import { buildTrackingEmail, downloadTrackingEmail, copyTrackingEmail } from "@/lib/tracking-email";
import { TrackingEmailPreview } from "@/components/TrackingEmailPreview";
import { Button } from "@/components/ui/button";

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

  const draft = buildTrackingEmail([preview ?? order], order.clienteNome, renderTemplate(tpl.assunto, preview ?? order, stageLabel((preview ?? order).stage)), renderTemplate(tpl.corpo, preview ?? order, stageLabel((preview ?? order).stage)));
  function preparar() {
    try {
      downloadTrackingEmail(draft, email.trim());
      onUpdate({ emailCliente: email, timeline: [...order.timeline, entry(`Rascunho de rastreio preparado para ${email}; envio não confirmado`, "sistema")] });
      setFeedback("Abra o arquivo .eml no Outlook para revisar e enviar, ou copie a tabela e cole em uma nova mensagem.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Falha ao preparar e-mail."); }
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
        <div className="flex flex-wrap gap-2"><Button onClick={preparar}><Mail /> Preparar e-mail</Button><Button variant="outline" onClick={copiar}><Copy /> Copiar tabela</Button></div>
        {feedback && <p role="status" className="text-sm text-info">{feedback}</p>}
      </div>}
      <div className="text-[10px] text-muted-foreground">
        {tpl.autoEnvio ? "Envio automático ligado: ao salvar, a atualização é preparada para revisão." : "Envio automático desligado (configure em Configurações)."}
      </div>
    </div>
  );
}
