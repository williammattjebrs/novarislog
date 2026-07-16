import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Filter, Plus, Download, Search } from "lucide-react";
import { orders, routes, statusLabel, statusTone } from "@/lib/mock-data";

export const Route = createFileRoute("/operacao")({
  head: () => ({
    meta: [
      { title: "Operação — Pedidos & Rotas | CargoHub" },
      { name: "description", content: "Pedidos, expedição e rotas em execução do operador logístico." },
    ],
  }),
  component: Operacao,
});

function toneClass(tone: ReturnType<typeof statusTone>) {
  switch (tone) {
    case "cyan": return "text-primary bg-primary/10 border-primary/30";
    case "amber": return "text-accent bg-accent/10 border-accent/30";
    case "success": return "text-success bg-success/10 border-success/30";
    case "danger": return "text-danger bg-danger/10 border-danger/30";
    case "info": return "text-info bg-info/10 border-info/30";
    default: return "text-muted-foreground bg-muted/40 border-border";
  }
}

function Operacao() {
  const [tab, setTab] = useState<"pedidos" | "rotas">("pedidos");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("todos");

  const filteredOrders = orders.filter((o) => {
    const q = query.toLowerCase();
    const match =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.cliente.toLowerCase().includes(q) ||
      o.destino.toLowerCase().includes(q);
    const s = filter === "todos" || o.status === filter;
    return match && s;
  });

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operação</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Pedidos & Rotas</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-sm hover:bg-elevated">
              <Download className="h-4 w-4" /> Exportar
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Novo pedido
            </button>
          </div>
        </div>

        {/* Metric strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { l: "Em coleta", v: orders.filter(o => o.status === "coleta").length, tone: "info" as const },
            { l: "No CD", v: orders.filter(o => o.status === "armazem").length, tone: "amber" as const },
            { l: "Em rota", v: orders.filter(o => o.status === "em_rota").length, tone: "cyan" as const },
            { l: "Entregues", v: orders.filter(o => o.status === "entregue").length, tone: "success" as const },
            { l: "Ocorrências", v: orders.filter(o => o.status === "ocorrencia").length, tone: "danger" as const },
          ].map((m) => (
            <div key={m.l} className="panel p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.l}</div>
              <div className={`num text-2xl mt-1 ${m.tone === "danger" ? "text-danger" : m.tone === "success" ? "text-success" : m.tone === "amber" ? "text-accent" : "text-primary"}`}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {(["pedidos", "rotas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "pedidos" ? "Pedidos" : "Rotas"}
            </button>
          ))}
        </div>

        {tab === "pedidos" ? (
          <div className="panel">
            <div className="p-3 border-b border-border flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-1.5 flex-1 min-w-[240px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar pedido, cliente, destino…"
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                {(["todos", "coleta", "armazem", "em_rota", "entregue", "ocorrencia"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded border transition-colors ${
                      filter === f
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "todos" ? "Todos" : statusLabel(f as never)}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-normal px-4 py-2.5">Pedido</th>
                    <th className="text-left font-normal">Cliente</th>
                    <th className="text-left font-normal">Origem → Destino</th>
                    <th className="text-right font-normal">Peso</th>
                    <th className="text-right font-normal">Vol.</th>
                    <th className="text-right font-normal">Valor</th>
                    <th className="text-left font-normal pl-4">Status</th>
                    <th className="text-left font-normal">Motorista</th>
                    <th className="text-right font-normal pr-4">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border hover:bg-elevated/50">
                      <td className="px-4 py-3 num text-primary">{o.id}</td>
                      <td>{o.cliente}</td>
                      <td className="text-muted-foreground text-xs">{o.origem} → {o.destino}</td>
                      <td className="text-right num">{o.peso.toLocaleString("pt-BR")} kg</td>
                      <td className="text-right num">{o.volumes}</td>
                      <td className="text-right num">R$ {o.valor.toLocaleString("pt-BR")}</td>
                      <td className="pl-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(o.status))}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusLabel(o.status)}
                        </span>
                      </td>
                      <td className="text-xs">{o.motorista ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="text-right num text-xs pr-4">{o.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-10">Nenhum pedido para o filtro.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {routes.map((r) => (
              <div key={r.id} className="panel p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="num text-primary text-sm">{r.id}</div>
                    <div className="font-display text-base mt-0.5">{r.regiao}</div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(r.status))}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded border border-border bg-elevated/40 py-2">
                    <div className="num text-lg">{r.paradas}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">paradas</div>
                  </div>
                  <div className="rounded border border-border bg-elevated/40 py-2">
                    <div className="num text-lg text-success">{r.concluidas}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">concluídas</div>
                  </div>
                  <div className="rounded border border-border bg-elevated/40 py-2">
                    <div className="num text-lg">{r.distancia}<span className="text-xs text-muted-foreground"> km</span></div>
                    <div className="text-[10px] uppercase text-muted-foreground">distância</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">progresso</span>
                    <span className="num">{r.progresso}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.status === "atrasada" ? "bg-danger" : r.status === "concluida" ? "bg-success" : "bg-primary"}`}
                      style={{ width: `${r.progresso}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {r.motorista} · <span className="num text-foreground">{r.placa}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
