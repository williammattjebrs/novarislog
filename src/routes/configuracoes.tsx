// Configurações: tolerância CT-e, custos de frota, reset de dados.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useConfig, resetAllData } from "@/lib/mock-store";
import { DEFAULT_CONFIG, DEFAULT_EMAIL_INBOX, DEFAULT_EMAIL_TEMPLATE, ORDER_STAGES } from "@/lib/mock-data";
import { Mail } from "lucide-react";
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

  const inbox = cfg.emailInbox ?? DEFAULT_EMAIL_INBOX;
  const tpl = cfg.emailTemplate ?? DEFAULT_EMAIL_TEMPLATE;
  const setInbox = (p: Partial<typeof inbox>) => setCfg({ ...cfg, emailInbox: { ...inbox, ...p } });
  const setTpl = (p: Partial<typeof tpl>) => setCfg({ ...cfg, emailTemplate: { ...tpl, ...p } });

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

        <section className="panel p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <div className="font-display text-lg">Captação de XML por e-mail</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Caixa empresarial de onde os XML de NF-e/CT-e serão lidos automaticamente e confrontados com as tabelas de frete.
            A leitura começa assim que a conta de e-mail for autorizada.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <F label="Provedor">
              <select value={inbox.provedor} onChange={(e) => setInbox({ provedor: e.target.value as typeof inbox.provedor })} className="input">
                <option value="gmail">Google Workspace / Gmail</option>
                <option value="outlook">Microsoft 365 / Outlook</option>
                <option value="imap">Outro (IMAP)</option>
              </select>
            </F>
            <F label="E-mail empresarial"><input value={inbox.endereco} onChange={(e) => setInbox({ endereco: e.target.value })} placeholder="xml@novaris.com.br" className="input" /></F>
            <F label="Filtro de busca"><input value={inbox.filtro} onChange={(e) => setInbox({ filtro: e.target.value })} className="input num" /></F>
            <F label="Verificar a cada (min)"><input type="number" value={inbox.intervaloMin} onChange={(e) => setInbox({ intervaloMin: Number(e.target.value) })} className="input num" /></F>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={inbox.ativo} onChange={(e) => setInbox({ ativo: e.target.checked })} /> Ativar leitura automática
          </label>
        </section>

        <section className="panel p-5 space-y-3">
          <div className="font-display text-lg">Layout do e-mail de rastreio ao cliente</div>
          <p className="text-sm text-muted-foreground">
            Variáveis: {"{{cliente}} {{nf}} {{ordem}} {{origem}} {{destino}} {{status}} {{situacao}} {{local}} {{previsao}} {{destinatario}}"}
          </p>
          <F label="Assunto"><input value={tpl.assunto} onChange={(e) => setTpl({ assunto: e.target.value })} className="input" /></F>
          <F label="Corpo"><textarea value={tpl.corpo} onChange={(e) => setTpl({ corpo: e.target.value })} className="input min-h-[180px]" /></F>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={tpl.autoEnvio} onChange={(e) => setTpl({ autoEnvio: e.target.checked })} /> Envio automático ao atualizar o rastreio
          </label>
          <div className="flex flex-wrap gap-2">
            {ORDER_STAGES.map((s) => {
              const on = tpl.estagiosAuto.includes(s.id);
              return (
                <button key={s.id} onClick={() => setTpl({ estagiosAuto: on ? tpl.estagiosAuto.filter((x) => x !== s.id) : [...tpl.estagiosAuto, s.id] })}
                  className={`text-xs px-2 py-1 rounded border ${on ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{s.label}</button>
              );
            })}
          </div>
          <button onClick={() => setCfg({ ...cfg, emailTemplate: DEFAULT_EMAIL_TEMPLATE })} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> restaurar modelo</button>
        </section>

        <section className="panel p-5 space-y-3 border-danger/40">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-danger" />
            <div className="font-display text-lg text-danger">Zona perigosa</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Apaga todos os clientes, tabelas, ordens, CT-es e financeiro. Útil para começar testes do zero.
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
