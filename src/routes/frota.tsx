import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Truck, User, Wrench, ShieldAlert, Plus } from "lucide-react";
import { vehicles, drivers, statusTone } from "@/lib/mock-data";

export const Route = createFileRoute("/frota")({
  head: () => ({
    meta: [
      { title: "Frota & Motoristas | CargoHub" },
      { name: "description", content: "Veículos, motoristas, manutenções e documentos do operador logístico." },
    ],
  }),
  component: FrotaPage,
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

function FrotaPage() {
  const [tab, setTab] = useState<"veiculos" | "motoristas">("veiculos");

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Frota</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Frota & Motoristas</h1>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90">
            <Plus className="h-4 w-4" /> {tab === "veiculos" ? "Novo veículo" : "Novo motorista"}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "Veículos ativos", v: vehicles.filter(v => v.status === "em_rota" || v.status === "ativo").length, icon: Truck, tone: "success" as const },
            { l: "Em manutenção", v: vehicles.filter(v => v.status === "manutencao").length, icon: Wrench, tone: "amber" as const },
            { l: "Motoristas ativos", v: drivers.filter(d => d.status === "em_rota" || d.status === "disponivel").length, icon: User, tone: "cyan" as const },
            { l: "Docs vencendo", v: vehicles.filter(v => v.documento === "vencido").length + drivers.filter(d => d.cnh.includes("2024") || d.cnh.includes("2025")).length, icon: ShieldAlert, tone: "danger" as const },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.l} className="panel p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.l}</div>
                  <Icon className={`h-4 w-4 ${m.tone === "danger" ? "text-danger" : m.tone === "success" ? "text-success" : m.tone === "amber" ? "text-accent" : "text-primary"}`} />
                </div>
                <div className={`num text-3xl mt-2 ${m.tone === "danger" ? "text-danger" : ""}`}>{m.v}</div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 border-b border-border">
          {(["veiculos", "motoristas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "veiculos" ? "Veículos" : "Motoristas"}
            </button>
          ))}
        </div>

        {tab === "veiculos" ? (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Placa</th>
                  <th className="text-left font-normal">Tipo / Modelo</th>
                  <th className="text-right font-normal">Capacidade</th>
                  <th className="text-right font-normal">Odômetro</th>
                  <th className="text-right font-normal">Próx. revisão</th>
                  <th className="text-left font-normal pl-4">Documento</th>
                  <th className="text-left font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.placa} className="border-t border-border hover:bg-elevated/50">
                    <td className="px-4 py-3 num text-primary">{v.placa}</td>
                    <td>
                      <div>{v.tipo}</div>
                      <div className="text-xs text-muted-foreground">{v.modelo}</div>
                    </td>
                    <td className="text-right num">{v.capacidade.toLocaleString("pt-BR")} kg</td>
                    <td className="text-right num">{v.odometro.toLocaleString("pt-BR")} km</td>
                    <td className={`text-right num text-xs ${v.proxRevisao < 500 ? "text-accent" : v.proxRevisao <= 0 ? "text-danger" : ""}`}>
                      {v.proxRevisao <= 0 ? "vencida" : `em ${v.proxRevisao} km`}
                    </td>
                    <td className="pl-4">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${v.documento === "ok" ? "text-success bg-success/10 border-success/30" : "text-danger bg-danger/10 border-danger/30"}`}>
                        {v.documento}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(v.status))}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {v.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {drivers.map((d) => (
              <div key={d.cnh} className="panel p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-elevated border border-border grid place-items-center text-sm font-semibold">
                      {d.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="font-medium">{d.nome}</div>
                      <div className="text-xs text-muted-foreground">{d.vinculo} · Cat. {d.categoria}</div>
                    </div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(d.status))}`}>
                    {d.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded border border-border bg-elevated/40 py-2">
                    <div className="num text-lg">{d.entregas}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">entregas</div>
                  </div>
                  <div className="rounded border border-border bg-elevated/40 py-2">
                    <div className={`num text-lg ${d.score >= 90 ? "text-success" : d.score >= 80 ? "text-accent" : "text-danger"}`}>{d.score}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">score</div>
                  </div>
                  <div className="rounded border border-border bg-elevated/40 py-2">
                    <div className="num text-[11px] mt-1.5 text-muted-foreground">{d.telefone}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">contato</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
                  <span>CNH {d.cnh}</span>
                  <button className="text-primary hover:underline">detalhes</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
