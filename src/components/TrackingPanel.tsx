import { useState } from "react";
import { MapPin, Mail } from "lucide-react";
import { DEFAULT_EMAIL_TEMPLATE, renderTemplate, stageLabel, type AppConfig, type Order, type TimelineEntry } from "@/lib/mock-data";

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
  const tpl = cfg.emailTemplate ?? DEFAULT_EMAIL_TEMPLATE;

  function entry(texto: string, tipo: TimelineEntry["tipo"] = "status"): TimelineEntry {
    return { quando: new Date().toISOString(), autor, tipo, texto };
  }

  function salvar() {
    const rastreio = { situacao, local, atualizadoEm: new Date().toISOString(), fonte: "manual" as const };
    const tl = [...order.timeline, entry(`Rastreio manual: ${situacao}${local ? ` — ${local}` : ""}`)];
    const next = { ...order, rastreio };
    if (tpl.autoEnvio && email) tl.push(entry(`E-mail automático de rastreio preparado para ${email}`, "sistema"));
    onUpdate({ rastreio, emailCliente: email, timeline: tl, atualizadoEm: new Date().toISOString() });
    if (tpl.autoEnvio && email) abrirEmail(next);
  }

  function abrirEmail(o: Order = order) {
    if (!email) { alert("Informe o e-mail do cliente."); return; }
    const assunto = renderTemplate(tpl.assunto, o, stageLabel(o.stage));
    const corpo = renderTemplate(tpl.corpo, o, stageLabel(o.stage));
    window.open(`mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`);
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
            onUpdate({ emailCliente: email, timeline: [...order.timeline, entry(`E-mail de rastreio enviado para ${email}`, "sistema")] });
          }}
          className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated inline-flex items-center gap-1"
        ><Mail className="h-3.5 w-3.5" /> Enviar e-mail</button>
      </div>
      <div className="text-[10px] text-muted-foreground">
        {tpl.autoEnvio ? "Envio automático ligado: ao salvar, o e-mail é disparado." : "Envio automático desligado (configure em Configurações)."}
      </div>
    </div>
  );
}
