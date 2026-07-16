import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { FileUp, FileCheck2, Truck, ArrowRight, Package } from "lucide-react";
import { pickups, pickupStages, statusTone, toneClass, type PickupStage, type Pickup } from "@/lib/mock-data";

export const Route = createFileRoute("/coletas")({
  head: () => ({
    meta: [
      { title: "Coletas & Entregas | CargoHub" },
      { name: "description", content: "Gestão de coletas e entregas com importação automática de XML de NF-e e CT-e, do agendamento à saída para viagem." },
    ],
  }),
  component: ColetasPage,
});

function ColetasPage() {
  const [items, setItems] = useState<Pickup[]>(pickups);
  const [filtroStage, setFiltroStage] = useState<PickupStage | "todos">("todos");

  const porStage = useMemo(() => {
    const map: Record<PickupStage, Pickup[]> = {
      nfe_recebida: [], coleta_agendada: [], em_coleta: [], coletado: [],
      aguardando_cte: [], pronto_viagem: [], em_viagem: [],
    };
    items.forEach(p => { map[p.stage].push(p); });
    return map;
  }, [items]);

  const filtered = filtroStage === "todos" ? items : items.filter(p => p.stage === filtroStage);

  function importXml(tipo: "nfe" | "cte") {
    // Prototype: simula processamento do XML avançando um item
    if (tipo === "nfe") {
      const novo: Pickup = {
        id: `COL-${9010 + items.length}`,
        cliente: "Cliente XML",
        chaveNFe: "35240700000000000000550010000" + Math.floor(Math.random() * 1e12),
        numeroNFe: String(Math.floor(Math.random() * 999999)).padStart(6, "0"),
        remetente: "Importado via XML",
        destinatario: "A definir",
        cidadeDestino: "—",
        peso: 400, volumes: 12, valorNF: 24_800,
        stage: "nfe_recebida",
        atualizadoEm: "agora",
      };
      setItems([novo, ...items]);
    } else {
      // Primeiro pickup aguardando CT-e avança
      setItems(items.map(p => p.stage === "aguardando_cte"
        ? { ...p, stage: "pronto_viagem", cteNumero: `CTe ${443_000 + Math.floor(Math.random() * 500)}`, atualizadoEm: "agora" }
        : p));
    }
  }

  function avancarStage(id: string) {
    const ordem: PickupStage[] = ["nfe_recebida", "coleta_agendada", "em_coleta", "coletado", "aguardando_cte", "pronto_viagem", "em_viagem"];
    setItems(items.map(p => {
      if (p.id !== id) return p;
      const idx = ordem.indexOf(p.stage);
      const nova = ordem[Math.min(idx + 1, ordem.length - 1)];
      return { ...p, stage: nova, atualizadoEm: "agora" };
    }));
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 2</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Coletas & Entregas</h1>
            <p className="text-sm text-muted-foreground mt-1">Fluxo NF-e → coleta → CT-e → viagem</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => importXml("nfe")} className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-3 py-2 text-sm hover:bg-primary/20">
              <FileUp className="h-4 w-4" /> Importar XML NF-e
            </button>
            <button onClick={() => importXml("cte")} className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 text-accent px-3 py-2 text-sm hover:bg-accent/20">
              <FileCheck2 className="h-4 w-4" /> Importar XML CT-e
            </button>
          </div>
        </div>

        {/* Pipeline */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
          {pickupStages.map((s, i) => {
            const count = porStage[s.id].length;
            const active = filtroStage === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setFiltroStage(active ? "todos" : s.id)}
                className={`panel p-3 text-left relative transition-colors ${active ? "border-primary/60 bg-primary/5" : "hover:border-border/70"}`}
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  {i + 1}. {i < 3 ? <Package className="h-3 w-3" /> : i < 5 ? <FileCheck2 className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                </div>
                <div className="text-xs mt-1 leading-tight">{s.label}</div>
                <div className="num text-2xl mt-2 text-primary">{count}</div>
                {i < pickupStages.length - 1 && (
                  <ArrowRight className="hidden xl:block absolute -right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-border" />
                )}
              </button>
            );
          })}
        </div>

        {filtroStage !== "todos" && (
          <button onClick={() => setFiltroStage("todos")} className="text-xs text-primary hover:underline">
            ← ver todos os estágios
          </button>
        )}

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-normal px-4 py-2.5">Pedido</th>
                <th className="text-left font-normal">Cliente</th>
                <th className="text-left font-normal">NF-e</th>
                <th className="text-left font-normal">CT-e</th>
                <th className="text-left font-normal">Destino</th>
                <th className="text-right font-normal">Peso/Vol</th>
                <th className="text-right font-normal">Valor NF</th>
                <th className="text-left font-normal">Motorista</th>
                <th className="text-left font-normal">Estágio</th>
                <th className="text-right font-normal pr-4">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-elevated/50">
                  <td className="px-4 py-3 num text-primary">{p.id}</td>
                  <td className="font-medium">{p.cliente}</td>
                  <td className="num text-xs">
                    <div>{p.numeroNFe}</div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={p.chaveNFe}>{p.chaveNFe.slice(0, 20)}…</div>
                  </td>
                  <td className="num text-xs">{p.cteNumero ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="text-xs">{p.cidadeDestino}</td>
                  <td className="text-right num text-xs">{p.peso}kg / {p.volumes}v</td>
                  <td className="text-right num text-xs">R$ {p.valorNF.toLocaleString("pt-BR")}</td>
                  <td className="text-xs">
                    {p.motorista ? (
                      <>
                        <div>{p.motorista}</div>
                        <div className="num text-[10px] text-muted-foreground">{p.placa}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">a alocar</span>
                    )}
                  </td>
                  <td>
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(p.stage))}`}>
                      {pickupStages.find(s => s.id === p.stage)?.label}
                    </span>
                  </td>
                  <td className="text-right pr-4">
                    {p.stage !== "em_viagem" && (
                      <button onClick={() => avancarStage(p.id)} className="text-xs text-primary hover:underline">
                        avançar →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-muted-foreground text-sm">Nenhum pedido neste estágio</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
