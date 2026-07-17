// Configurações: tolerância CT-e, custos de frota, reset de dados.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useConfig, resetAllData } from "@/lib/mock-store";
import { DEFAULT_CONFIG } from "@/lib/mock-data";
import { Settings, RotateCcw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Novaris" },
      { name: "description", content: "Parâmetros globais: tolerância de divergência CT-e, custos de frota (diesel, arla, pedágio, comissão) e reset de dados." },
    ],
  }),
  component: () => (
    <RoleGate path="/configuracoes">
      <ConfigPage />
    </RoleGate>
  ),
});

function ConfigPage() {
  const [cfg, setCfg] = useConfig();

  function u<K extends keyof typeof cfg.frota>(k: K, v: number) {
    setCfg({ ...cfg, frota: { ...cfg.frota, [k]: v } });
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sistema</div>
          <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Configurações</h1>
        </div>

        <section className="panel p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <div className="font-display text-lg">Divergência CT-e</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Tolerância entre o valor da ordem de coleta e o valor do CT-e. Diferenças acima disso marcam a ordem como <b>divergente</b>.
          </p>
          <div className="max-w-xs">
            <label className="block">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tolerância (%)</div>
              <input
                type="number" step="0.1"
                value={cfg.toleranciaDivergenciaPercent}
                onChange={(e) => setCfg({ ...cfg, toleranciaDivergenciaPercent: Number(e.target.value) })}
                className="input num"
              />
            </label>
          </div>
        </section>

        <section className="panel p-5 space-y-3">
          <div className="font-display text-lg">Custos de frota própria</div>
          <p className="text-sm text-muted-foreground">
            Valores default usados no cálculo automático de custo por entrega quando a execução é <b>frota</b>.
            Cada entrega pode sobrescrever esses valores.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <F label="Diesel (R$/L)"><input type="number" step="0.01" value={cfg.frota.precoDiesel} onChange={(e) => u("precoDiesel", Number(e.target.value))} className="input num" /></F>
            <F label="Consumo (km/L)"><input type="number" step="0.1" value={cfg.frota.kmPorLitro} onChange={(e) => u("kmPorLitro", Number(e.target.value))} className="input num" /></F>
            <F label="Arla (R$/L)"><input type="number" step="0.01" value={cfg.frota.precoArla} onChange={(e) => u("precoArla", Number(e.target.value))} className="input num" /></F>
            <F label="Arla (L / 100km)"><input type="number" step="0.1" value={cfg.frota.consumoArlaLitrosPor100km} onChange={(e) => u("consumoArlaLitrosPor100km", Number(e.target.value))} className="input num" /></F>
            <F label="Pedágio médio (R$/km)"><input type="number" step="0.01" value={cfg.frota.pedagioMedioPorKm} onChange={(e) => u("pedagioMedioPorKm", Number(e.target.value))} className="input num" /></F>
            <F label="Comissão motorista (%)"><input type="number" step="0.1" value={cfg.frota.comissaoMotoristaPercent} onChange={(e) => u("comissaoMotoristaPercent", Number(e.target.value))} className="input num" /></F>
            <F label="Depreciação (R$/km)"><input type="number" step="0.01" value={cfg.frota.depreciacaoPorKm} onChange={(e) => u("depreciacaoPorKm", Number(e.target.value))} className="input num" /></F>
            <F label="Outros (R$/km)"><input type="number" step="0.01" value={cfg.frota.outrosPorKm} onChange={(e) => u("outrosPorKm", Number(e.target.value))} className="input num" /></F>
          </div>
          <button
            onClick={() => setCfg({ ...cfg, frota: DEFAULT_CONFIG.frota })}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          ><RotateCcw className="h-3 w-3" /> restaurar padrões</button>
        </section>

        <section className="panel p-5 space-y-3 border-danger/40">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-danger" />
            <div className="font-display text-lg text-danger">Zona perigosa</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Apaga todos os clientes, tabelas, ordens, CT-es, estoque e financeiro. Útil para começar testes do zero.
          </p>
          <button
            onClick={() => {
              if (confirm("Apagar TODOS os dados? Isso não pode ser desfeito.")) {
                resetAllData();
                alert("Dados apagados.");
              }
            }}
            className="text-sm px-3 py-1.5 rounded border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
          >Apagar todos os dados</button>
        </section>
      </div>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
