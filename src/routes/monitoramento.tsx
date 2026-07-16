import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { Radar, MessageCircle, MapPin, AlertTriangle, Zap, Filter } from "lucide-react";
import { shipments, statusTone, toneClass, type Shipment } from "@/lib/mock-data";

export const Route = createFileRoute("/monitoramento")({
  head: () => ({
    meta: [
      { title: "Monitoramento & Torre de Controle | CargoHub" },
      { name: "description", content: "Monitoramento ponta a ponta de entregas com timeline, filtros por cliente/destino/data e disparo de follow-up em tempo real." },
    ],
  }),
  component: MonitoramentoPage,
});

type View = "lista" | "cliente" | "destino" | "data";

function MonitoramentoPage() {
  const [view, setView] = useState<View>("lista");
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [followTarget, setFollowTarget] = useState<Shipment | null>(null);
  const [clienteFiltro, setClienteFiltro] = useState<string>("todos");
  const [ufFiltro, setUfFiltro] = useState<string>("todos");

  const clientes = Array.from(new Set(shipments.map(s => s.cliente)));
  const ufs = Array.from(new Set(shipments.map(s => s.destinoUf)));

  const list = useMemo(() => shipments.filter(s =>
    (clienteFiltro === "todos" || s.cliente === clienteFiltro) &&
    (ufFiltro === "todos" || s.destinoUf === ufFiltro)
  ), [clienteFiltro, ufFiltro]);

  const criticas = shipments.filter(s => s.atrasoHoras > 0 || s.atualStatus === "ocorrencia");
  const emAndamento = shipments.filter(s => s.atualStatus !== "entregue");

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 3</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold flex items-center gap-2">
              <Radar className="h-6 w-6 text-primary" /> Torre de controle ponta a ponta
            </h1>
          </div>
          <div className="panel px-3 py-2 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Feed em tempo real</span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">API rastreamento: <span className="text-accent">não conectada</span></span>
            <button className="text-primary hover:underline flex items-center gap-1"><Zap className="h-3 w-3" /> conectar</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric l="Em andamento" v={emAndamento.length} icon={Radar} />
          <Metric l="Críticas / atrasadas" v={criticas.length} icon={AlertTriangle} tone="danger" />
          <Metric l="Entregas hoje" v={shipments.filter(s => s.atualStatus === "entregue").length} tone="success" icon={MapPin} />
          <Metric l="Sem follow >12h" v={shipments.filter(s => !s.ultimoFollow).length} icon={MessageCircle} tone="amber" />
        </div>

        {/* Follow-up panel */}
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Follow-up</div>
              <div className="font-display text-lg">Entregas que precisam de contato</div>
            </div>
            <button className="text-xs text-primary hover:underline">disparar em lote</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {criticas.concat(shipments.filter(s => !s.ultimoFollow && s.atualStatus !== "entregue")).slice(0, 6).map(s => (
              <div key={s.id + s.cte} className="rounded-md border border-border bg-elevated/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="num text-xs text-primary">{s.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${toneClass(statusTone(s.atualStatus))}`}>{s.atualStatus.replace("_", " ")}</span>
                </div>
                <div className="text-sm font-medium mt-1">{s.cliente}</div>
                <div className="text-[11px] text-muted-foreground">{s.origem} → {s.destino}</div>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className={s.atrasoHoras > 0 ? "text-danger" : "text-muted-foreground"}>
                    {s.atrasoHoras > 0 ? `atraso ${s.atrasoHoras}h` : `prev. ${s.previsao}`}
                  </span>
                  <button onClick={() => setFollowTarget(s)} className="text-primary hover:underline">disparar follow</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters + Views */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 border-b border-border">
            {([["lista","Lista"],["cliente","Por cliente"],["destino","Por destino"],["data","Por data"]] as [View,string][]).map(([v,l]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 text-sm border-b-2 -mb-px ${view===v?"border-primary text-primary":"border-transparent text-muted-foreground hover:text-foreground"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)} className="input py-1.5 text-xs">
            <option value="todos">Todos clientes</option>
            {clientes.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={ufFiltro} onChange={(e) => setUfFiltro(e.target.value)} className="input py-1.5 text-xs">
            <option value="todos">Todas UFs</option>
            {ufs.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>

        {view === "lista" && <ShipmentList list={list} onOpen={setSelected} />}
        {view === "cliente" && <GroupedView list={list} keyOf={s => s.cliente} label="Cliente" onOpen={setSelected} />}
        {view === "destino" && <GroupedView list={list} keyOf={s => `${s.destino} (${s.destinoUf})`} label="Destino" onOpen={setSelected} />}
        {view === "data" && <GroupedView list={list} keyOf={s => s.previsao} label="Previsão" onOpen={setSelected} />}
      </div>

      {selected && <TimelineDrawer shipment={selected} onClose={() => setSelected(null)} />}
      {followTarget && <FollowModal shipment={followTarget} onClose={() => setFollowTarget(null)} />}
    </AppShell>
  );
}

function Metric({ l, v, icon: Icon, tone }: { l: string; v: number; icon: typeof Radar; tone?: "danger" | "amber" | "success" }) {
  const color = tone === "danger" ? "text-danger" : tone === "amber" ? "text-accent" : tone === "success" ? "text-success" : "text-primary";
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`num text-3xl mt-2 ${tone === "danger" ? "text-danger" : ""}`}>{v}</div>
    </div>
  );
}

function ShipmentList({ list, onOpen }: { list: Shipment[]; onOpen: (s: Shipment) => void }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left font-normal px-4 py-2.5">Pedido</th>
            <th className="text-left font-normal">Cliente</th>
            <th className="text-left font-normal">CT-e</th>
            <th className="text-left font-normal">Rota</th>
            <th className="text-left font-normal">Motorista</th>
            <th className="text-left font-normal">Status</th>
            <th className="text-right font-normal">Previsão</th>
            <th className="text-right font-normal pr-4">Follow</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id + s.cte} onClick={() => onOpen(s)} className="border-t border-border hover:bg-elevated/50 cursor-pointer">
              <td className="px-4 py-3 num text-primary">{s.id}</td>
              <td className="font-medium">{s.cliente}</td>
              <td className="num text-xs">{s.cte}</td>
              <td className="text-xs">{s.origem} → {s.destino}</td>
              <td className="text-xs">{s.motorista ?? "—"}</td>
              <td><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(s.atualStatus))}`}>{s.atualStatus.replace("_"," ")}</span></td>
              <td className={`text-right num text-xs ${s.atrasoHoras > 0 ? "text-danger" : ""}`}>{s.previsao}</td>
              <td className="text-right pr-4 text-xs text-muted-foreground">{s.ultimoFollow ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupedView({ list, keyOf, label, onOpen }: { list: Shipment[]; keyOf: (s: Shipment) => string; label: string; onOpen: (s: Shipment) => void }) {
  const groups = list.reduce<Record<string, Shipment[]>>((acc, s) => {
    const k = keyOf(s);
    (acc[k] ??= []).push(s);
    return acc;
  }, {});
  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([k, arr]) => (
        <div key={k} className="panel">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div><span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span> · <span className="font-medium">{k}</span></div>
            <span className="num text-xs text-muted-foreground">{arr.length} entrega(s)</span>
          </div>
          <ShipmentList list={arr} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
}

function TimelineDrawer({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-panel border-l border-border overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Timeline</div>
            <div className="num text-primary">{shipment.id} · {shipment.cte}</div>
          </div>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">fechar ×</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <div className="font-medium">{shipment.cliente}</div>
            <div className="text-xs text-muted-foreground">{shipment.origem} → {shipment.destino}</div>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Motorista: </span>{shipment.motorista ?? "—"} · <span className="num">{shipment.placa ?? ""}</span>
          </div>
          <div className="space-y-3">
            {shipment.eventos.slice().reverse().map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-primary shadow-[0_0_10px] shadow-primary" : "bg-border"}`} />
                  {i < shipment.eventos.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-3">
                  <div className="text-sm">{e.descricao}</div>
                  <div className="text-[11px] text-muted-foreground num">{e.quando} · {e.local}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FollowModal({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  const [canal, setCanal] = useState<"whatsapp" | "email">("whatsapp");
  const msg = `Olá! Aqui é a CargoHub 🚚. Seu pedido ${shipment.id} (${shipment.cte}) para ${shipment.destino} está com status "${shipment.atualStatus.replace("_", " ")}". Previsão: ${shipment.previsao}.`;
  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="panel w-full max-w-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-display text-lg">Disparar follow-up</div>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">×</button>
        </div>
        <div className="text-xs text-muted-foreground">Para: <span className="text-foreground">{shipment.cliente}</span> · {shipment.id}</div>
        <div className="flex gap-2">
          {(["whatsapp","email"] as const).map(c => (
            <button key={c} onClick={() => setCanal(c)}
              className={`px-3 py-1.5 text-xs rounded-md border ${canal===c?"border-primary/50 bg-primary/10 text-primary":"border-border"}`}>
              {c === "whatsapp" ? "WhatsApp" : "E-mail"}
            </button>
          ))}
        </div>
        <textarea defaultValue={msg} rows={5} className="input font-mono text-xs" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 text-xs rounded-md border border-border hover:bg-elevated">Cancelar</button>
          <button onClick={onClose} className="px-3 py-2 text-xs rounded-md bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25">Enviar</button>
        </div>
      </div>
    </div>
  );
}
