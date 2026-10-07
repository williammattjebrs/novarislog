// Módulo 3 — Monitoramento ponta a ponta.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useEffect, useRef, useState, useMemo } from "react";
import { Filter, MessageSquare, X, Truck, Search, Mail } from "lucide-react";
import { BulkClientUpdate } from "@/components/BulkClientUpdate";
import { useOrders, useConfig } from "@/lib/mock-store";
import { fmtBRL, stageLabel, statusTone, toneClass, type Order } from "@/lib/mock-data";
import { Timeline } from "@/components/Timeline";
import { CostPanel } from "@/components/CostPanel";
import { DivergenceBadge } from "@/components/DivergenceBadge";
import { RecordActions } from "@/components/RecordActions";
import { ORDER_STAGES, type OrderStage } from "@/lib/mock-data";
import { TrackingPanel } from "@/components/TrackingPanel";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/monitoramento")({
  head: () => ({
    meta: [
      { title: "Monitoramento | Novaris" },
      { name: "description", content: "Torre de controle ponta a ponta: rastreamento, ocorrências, follow-up e custos por entrega." },
      { property: "og:title", content: "Monitoramento | Novaris" },
      { property: "og:description", content: "Torre de controle ponta a ponta: rastreamento, ocorrências, follow-up e custos por entrega." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate path="/monitoramento">
      <MonitoramentoPage />
    </RoleGate>
  ),
});

import { useServerFn } from "@tanstack/react-start";
import { sendTrackingUpdate } from "@/lib/tracking-send.functions";
import { readTrackingGroup, saveTrackingGroup, trackingPayload } from "@/lib/tracking-groups";

function MonitoramentoPage() {
  const orders = useOrders();
  const [cfg] = useConfig();
  const { user } = useAuth();
  const [uf, setUf] = useState("");
  const [cliente, setCliente] = useState("");
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [followFor, setFollowFor] = useState<Order | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const sendTracking = useServerFn(sendTrackingUpdate);
  const currentOrders = useRef(orders.list);
  currentOrders.current = orders.list;
  const autoBusy = useRef(false);
  const [autoStatus, setAutoStatus] = useState("");
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (autoBusy.current) return;
      autoBusy.current = true;
      try {
        const names = Array.from(new Set(currentOrders.current.map((o) => o.clienteNome)));
        for (const name of names) {
          const group = readTrackingGroup(name);
          if (!group.automatic || !group.emails.length || (group.lastSent && Date.now() - Date.parse(group.lastSent) < group.intervalMin * 60000)) continue;
          const list = currentOrders.current.filter((o) => o.clienteNome === name && o.stage !== "entregue");
          if (!list.length) continue;
          // A cross-tab Web Lock prevents duplicate sends from two open monitoring tabs.
          if (!navigator.locks) { setAutoStatus("Envio automático indisponível neste navegador; use o envio manual."); break; }
          await navigator.locks.request(`novaris-tracking:${name}`, { ifAvailable: true }, async (lock) => {
            if (!lock) return;
            const latest = readTrackingGroup(name);
            if (latest.lastSent && Date.now() - Date.parse(latest.lastSent) < latest.intervalMin * 60000) return;
            await sendTracking({ data: { cliente: name, destinatarios: latest.emails, ordens: trackingPayload(list) } });
            saveTrackingGroup(name, { ...latest, lastSent: new Date().toISOString() });
            setAutoStatus(`Atualização automática de ${name} aceita pela Microsoft.`);
          });
        }
      } catch (error) { setAutoStatus(error instanceof Error ? error.message : "Falha no envio automático."); }
      finally { autoBusy.current = false; }
    }, 60000);
    return () => window.clearInterval(timer);
  }, [sendTracking]);

  const clientes = useMemo(() => Array.from(new Set(orders.list.map((o) => o.clienteNome))), [orders.list]);

  const q = busca.trim().toLowerCase();
  const filtered = orders.list.filter((o) =>
    (!uf || o.ufEntrega === uf) &&
    (!cliente || o.clienteNome === cliente) &&
    (!q ||
      [o.id, o.clienteNome, String(o.numeroNFe), o.destinatario ?? "", `${o.cidadeColeta}/${o.ufColeta}`, `${o.cidadeEntrega}/${o.ufEntrega}`]
        .join(" ")
        .toLowerCase()
        .includes(q)),
  );

  const criticas = filtered.filter((o) => o.stage === "ocorrencia" || o.stage === "cte_divergente");

  const sel = selected ? orders.list.find((o) => o.id === selected) : null;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 3</div>
          <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Monitoramento ponta a ponta</h1>
          <p className="text-sm text-muted-foreground mt-1">Timeline, previsão × real, follow-up e custos por entrega.</p>
        </div>

        <div className="panel p-3 flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={cliente} onChange={(e) => setCliente(e.target.value)} className="input max-w-[200px]">
            <option value="">Todos os clientes</option>
            {clientes.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} placeholder="UF destino" maxLength={2} className="input max-w-[100px] num" />
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por ordem, cliente, NF, destino" className="input pl-7" />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} entregas · {criticas.length} críticas</span>
          <button onClick={() => setBulkOpen(true)} className="ml-auto text-xs px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> Atualizar cliente
          </button>
        </div>

        {criticas.length > 0 && (
          <div className="panel p-4 border-danger/40">
            <div className="font-display text-base text-danger mb-3">Follow-up urgente</div>
            <div className="space-y-2">
              {criticas.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="num text-primary">{o.id.slice(0, 12)}</span> · {o.clienteNome} · {o.cidadeEntrega}/{o.ufEntrega} ·{" "}
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(o.stage))}`}>{stageLabel(o.stage)}</span>
                  </div>
                  <button onClick={() => setFollowFor(o)} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> disparar follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`panel overflow-x-auto ${sel ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Ordem</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-left font-normal">Destino</th>
                  <th className="text-right font-normal">Frete</th>
                  <th className="text-right font-normal">CT-e</th>
                  <th className="text-left font-normal">Previsão</th>
                  <th className="text-left font-normal">Estágio</th>
                  <th className="text-right font-normal pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o.id)} className={`border-t border-border hover:bg-elevated/50 cursor-pointer ${sel?.id === o.id ? "bg-elevated/60" : ""}`}>
                    <td className="px-4 py-3 num text-primary text-xs">{o.id.slice(0, 12)}</td>
                    <td className="text-xs">{o.clienteNome}</td>
                    <td className="text-xs">{o.cidadeEntrega}/{o.ufEntrega}{o.rastreio && <div className="text-[10px] text-muted-foreground">{o.rastreio.situacao}</div>}</td>
                    <td className="text-right num text-xs">{fmtBRL(o.valorFrete)}</td>
                    <td className="text-right num text-xs">
                      {o.cteValor ? (
                        <div className="flex flex-col items-end">
                          <span>{fmtBRL(o.cteValor)}</span>
                          {o.divergenciaPercent != null && <DivergenceBadge percent={o.divergenciaPercent} tolerancia={cfg.toleranciaDivergenciaPercent} />}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-xs num">{o.previsaoEntrega ? new Date(o.previsaoEntrega).toLocaleDateString("pt-BR") : "—"}</td>
                    <td><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(o.stage))}`}>{stageLabel(o.stage)}</span></td>
                    <td className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <RecordActions
                        statusOptions={ORDER_STAGES.map((s) => ({ id: s.id, label: s.label }))}
                        currentStatus={o.stage}
                        onChangeStatus={(next, entry) => orders.update(o.id, { stage: next as OrderStage, timeline: [...o.timeline, entry], atualizadoEm: new Date().toISOString() })}
                        onAddEntry={(entry) => orders.update(o.id, { timeline: [...o.timeline, entry], atualizadoEm: new Date().toISOString() })}
                      />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">Nenhuma entrega com esses filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {sel && (
            <div className="space-y-4">
              <div className="panel p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ordem</div>
                    <div className="font-display num text-primary">{sel.id}</div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="text-xs mb-3">
                  <div>{sel.clienteNome} · {sel.cidadeColeta}/{sel.ufColeta} → {sel.cidadeEntrega}/{sel.ufEntrega}</div>
                  <div className="text-muted-foreground mt-1">Motorista: {sel.motorista || "—"} · {sel.placa || ""}</div>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Linha do tempo</div>
                <Timeline entries={sel.timeline} />
              </div>

              <TrackingPanel
                key={sel.id}
                order={sel}
                cfg={cfg}
                autor={user?.nome ?? "sistema"}
                onUpdate={(patch) => orders.update(sel.id, patch)}
              />

              <CostPanel
                costs={sel.costs}
                valorFrete={sel.valorFrete}
                onSave={(next) => orders.update(sel.id, {
                  costs: next,
                  timeline: [...sel.timeline, {
                    quando: new Date().toISOString(), autor: "sistema", tipo: "custo",
                    texto: `Custos atualizados (${next.execMode || "—"})`,
                  }],
                  atualizadoEm: new Date().toISOString(),
                })}
              />
            </div>
          )}
        </div>

        <div className="panel p-4 text-xs text-muted-foreground flex items-center gap-2">
          <Truck className="h-3.5 w-3.5" />
          Integração de rastreamento (Cargon, Buonny, etc.) · <span className="text-accent">não conectada</span> — use o apontamento manual ao abrir cada entrega.
        </div>
      </div>

      {autoStatus && <p role="status" className="px-6 py-3 text-sm text-info">{autoStatus}</p>}
      {bulkOpen && (
        <BulkClientUpdate
          orders={orders.list}
          autor={user?.nome ?? "sistema"}
          onClose={() => setBulkOpen(false)}
          onSent={(ids, entry, email) => {
            const now = new Date().toISOString();
            orders.set(orders.list.map((o) => ids.includes(o.id)
              ? { ...o, emailCliente: o.emailCliente || email, timeline: [...o.timeline, entry], atualizadoEm: now }
              : o));
          }}
        />
      )}

      {followFor && (
        <FollowModal order={followFor} onClose={() => setFollowFor(null)} onSent={(canal) => {
          orders.update(followFor.id, {
            timeline: [...followFor.timeline, {
              quando: new Date().toISOString(), autor: "sistema", tipo: "sistema",
              texto: `Follow-up enviado ao cliente via ${canal}`,
            }],
          });
          setFollowFor(null);
        }} />
      )}
    </AppShell>
  );
}

function FollowModal({ order, onClose, onSent }: { order: Order; onClose: () => void; onSent: (canal: string) => void }) {
  const [canal, setCanal] = useState("WhatsApp");
  const [msg, setMsg] = useState(
    `Olá! Sua entrega ${order.id.slice(0, 12)} (${order.cidadeColeta}/${order.ufColeta} → ${order.cidadeEntrega}/${order.ufEntrega}) está no estágio: ${stageLabel(order.stage)}. Retornamos em breve com atualizações.`,
  );
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-lg mb-3">Disparar follow-up</div>
        <label className="block mb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Canal</div>
          <select value={canal} onChange={(e) => setCanal(e.target.value)} className="input">
            <option>WhatsApp</option>
            <option>E-mail</option>
            <option>SMS</option>
          </select>
        </label>
        <label className="block">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Mensagem</div>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="input min-h-[140px]" />
        </label>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">Cancelar</button>
          <button onClick={() => onSent(canal)} className="text-sm px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25">Enviar (simulado)</button>
        </div>
      </div>
    </div>
  );
}
