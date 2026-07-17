// Módulo 4 — Armazém / WMS.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useState } from "react";
import { Warehouse, Plus, Package } from "lucide-react";
import { useWarehouseInbound, useWarehouseOutbound, useStock, newId } from "@/lib/mock-store";
import { fmtBRL, statusTone, toneClass, type WarehouseInbound, type WarehouseOutbound } from "@/lib/mock-data";
import { RecordActions } from "@/components/RecordActions";

export const Route = createFileRoute("/armazem")({
  head: () => ({
    meta: [
      { title: "Armazém (WMS) | Novaris" },
      { name: "description", content: "Gestão de armazém: entrada de NF de remessa, endereçamento, estoque, separação e retorno simbólico." },
    ],
  }),
  component: () => (
    <RoleGate path="/armazem">
      <ArmazemPage />
    </RoleGate>
  ),
});

function ArmazemPage() {
  const inbound = useWarehouseInbound();
  const outbound = useWarehouseOutbound();
  const stock = useStock();
  const [tab, setTab] = useState<"entradas" | "estoque" | "saidas">("entradas");

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 4</div>
          <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Armazém (WMS)</h1>
          <p className="text-sm text-muted-foreground mt-1">Remessa → Conferência → Endereçamento → Estoque → Separação → NF retorno → Baixa.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Entradas do dia" v={String(inbound.list.length)} />
          <Kpi label="SKUs em estoque" v={String(stock.list.length)} />
          <Kpi label="Aguardando separação" v={String(outbound.list.filter((o) => o.status === "aguardando_separacao").length)} />
          <Kpi label="Em separação" v={String(outbound.list.filter((o) => o.status === "em_separacao").length)} />
        </div>

        <div className="flex items-center gap-1 border-b border-border">
          {(["entradas", "estoque", "saidas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "entradas" ? "Entradas (NF remessa)" : t === "estoque" ? "Estoque endereçado" : "Saídas & separação"}
            </button>
          ))}
        </div>

        {tab === "entradas" && (
          <>
            <button
              onClick={() => {
                const cliente = prompt("Cliente:") ?? "";
                const nf = prompt("Número NF remessa:") ?? "";
                if (!cliente || !nf) return;
                inbound.add({
                  id: newId("IN"),
                  clienteNome: cliente,
                  nfRemessa: nf,
                  data: new Date().toISOString(),
                  volumes: Number(prompt("Volumes:") ?? 0),
                  peso: Number(prompt("Peso (kg):") ?? 0),
                  status: "recebida",
                  timeline: [{ quando: new Date().toISOString(), autor: "sistema", tipo: "sistema", texto: "Entrada registrada manualmente" }],
                });
              }}
              className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            >
              <Plus className="h-3 w-3" /> nova entrada
            </button>
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-normal px-4 py-2.5">ID</th>
                    <th className="text-left font-normal">Cliente</th>
                    <th className="text-left font-normal">NF Remessa</th>
                    <th className="text-right font-normal">Volumes</th>
                    <th className="text-right font-normal">Peso</th>
                    <th className="text-left font-normal">Status</th>
                    <th className="text-left font-normal">Endereço</th>
                    <th className="text-right font-normal pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {inbound.list.map((i) => (
                    <tr key={i.id} className="border-t border-border hover:bg-elevated/50">
                      <td className="px-4 py-2.5 num text-primary text-xs">{i.id}</td>
                      <td className="text-xs">{i.clienteNome}</td>
                      <td className="num text-xs">{i.nfRemessa}</td>
                      <td className="text-right num text-xs">{i.volumes}</td>
                      <td className="text-right num text-xs">{i.peso}kg</td>
                      <td><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(i.status))}`}>{i.status.replace("_", " ")}</span></td>
                      <td className="num text-xs">
                        {i.endereco || (
                          <button
                            onClick={() => {
                              const end = prompt("Endereço (ex: A-12-04):") ?? "";
                              if (end) inbound.update(i.id, { endereco: end, status: "enderecada" });
                            }}
                            className="text-primary hover:underline text-xs"
                          >+ endereçar</button>
                        )}
                      </td>
                      <td className="text-right pr-4">
                        <RecordActions
                          statusOptions={[
                            { id: "recebida", label: "Recebida" },
                            { id: "em_conferencia", label: "Em conferência" },
                            { id: "enderecada", label: "Endereçada" },
                          ]}
                          currentStatus={i.status}
                          onChangeStatus={(next, entry) => inbound.update(i.id, { status: next as WarehouseInbound["status"], timeline: [...i.timeline, entry] })}
                          onAddEntry={(entry) => inbound.update(i.id, { timeline: [...i.timeline, entry] })}
                        />
                      </td>
                    </tr>
                  ))}
                  {inbound.list.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">Nenhuma entrada registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "estoque" && (
          <>
            <button
              onClick={() => {
                const sku = prompt("SKU:") ?? "";
                const desc = prompt("Descrição:") ?? "";
                if (!sku) return;
                stock.add({
                  id: newId("STK"),
                  sku, descricao: desc,
                  categoria: prompt("Categoria:") ?? "—",
                  endereco: prompt("Endereço:") ?? "—",
                  qtd: Number(prompt("Qtd:") ?? 0),
                  minimo: Number(prompt("Mínimo:") ?? 0),
                  clienteNome: prompt("Cliente:") ?? "—",
                  giro: "medio",
                });
              }}
              className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            >
              <Plus className="h-3 w-3" /> novo item
            </button>
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-normal px-4 py-2.5">SKU</th>
                    <th className="text-left font-normal">Descrição</th>
                    <th className="text-left font-normal">Cliente</th>
                    <th className="text-left font-normal">Endereço</th>
                    <th className="text-right font-normal">Qtd</th>
                    <th className="text-right font-normal pr-4">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.list.map((s) => (
                    <tr key={s.sku} className="border-t border-border hover:bg-elevated/50">
                      <td className="px-4 py-2.5 num text-primary text-xs">{s.sku}</td>
                      <td className="text-xs">{s.descricao}</td>
                      <td className="text-xs">{s.clienteNome}</td>
                      <td className="num text-xs">{s.endereco}</td>
                      <td className={`text-right num ${s.qtd < s.minimo ? "text-accent" : ""}`}>{s.qtd}</td>
                      <td className="text-right num text-xs pr-4">{s.minimo}</td>
                    </tr>
                  ))}
                  {stock.list.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">Estoque vazio.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "saidas" && (
          <>
            <button
              onClick={() => {
                const cli = prompt("Cliente:") ?? "";
                if (!cli) return;
                outbound.add({
                  id: newId("OUT"),
                  clienteNome: cli,
                  nfVenda: prompt("NF Venda:") ?? "",
                  destinatario: prompt("Destinatário:") ?? "",
                  cidade: prompt("Cidade destino:") ?? "",
                  itens: Number(prompt("Itens:") ?? 0),
                  status: "aguardando_separacao",
                  atualizadoEm: new Date().toISOString(),
                  timeline: [{ quando: new Date().toISOString(), autor: "sistema", tipo: "sistema", texto: "Saída criada" }],
                });
              }}
              className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            >
              <Plus className="h-3 w-3" /> nova saída
            </button>
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-normal px-4 py-2.5">ID</th>
                    <th className="text-left font-normal">Cliente</th>
                    <th className="text-left font-normal">NF venda</th>
                    <th className="text-left font-normal">Destino</th>
                    <th className="text-right font-normal">Itens</th>
                    <th className="text-left font-normal">Status</th>
                    <th className="text-right font-normal pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {outbound.list.map((o) => (
                    <tr key={o.id} className="border-t border-border hover:bg-elevated/50">
                      <td className="px-4 py-2.5 num text-primary text-xs">{o.id}</td>
                      <td className="text-xs">{o.clienteNome}</td>
                      <td className="num text-xs">{o.nfVenda}</td>
                      <td className="text-xs">{o.destinatario} · {o.cidade}</td>
                      <td className="text-right num text-xs">{o.itens}</td>
                      <td><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(o.status))}`}>{o.status.replace(/_/g, " ")}</span></td>
                      <td className="text-right pr-4">
                        <RecordActions
                          statusOptions={[
                            { id: "aguardando_separacao", label: "Aguardando" },
                            { id: "em_separacao", label: "Em separação" },
                            { id: "conferencia", label: "Conferência" },
                            { id: "aguardando_retorno", label: "Aguardando NF retorno" },
                            { id: "baixado", label: "Baixado" },
                          ]}
                          currentStatus={o.status}
                          onChangeStatus={(next, entry) => outbound.update(o.id, { status: next as WarehouseOutbound["status"], timeline: [...o.timeline, entry], atualizadoEm: new Date().toISOString() })}
                          onAddEntry={(entry) => outbound.update(o.id, { timeline: [...o.timeline, entry], atualizadoEm: new Date().toISOString() })}
                        />
                      </td>
                    </tr>
                  ))}
                  {outbound.list.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">Nenhuma saída cadastrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Kpi({ label, v }: { label: string; v: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Warehouse className="h-4 w-4 text-primary" />
      </div>
      <div className="num text-2xl mt-2">{v}</div>
    </div>
  );
}
