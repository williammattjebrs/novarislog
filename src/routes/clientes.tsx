import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { Users, Plus, Search, TrendingUp, DollarSign, Calculator } from "lucide-react";
import {
  clients,
  freightTables,
  crmDeals,
  quotations,
  statusTone,
  toneClass,
  type CRMStage,
} from "@/lib/mock-data";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes, CRM & Cotação | CargoHub" },
      { name: "description", content: "Cadastro de clientes, tabelas de frete, cotação/simulação e pipeline comercial (CRM)." },
    ],
  }),
  component: ClientesPage,
});

type Tab = "clientes" | "tabela" | "cotacao" | "crm";

const stages: { id: CRMStage; label: string; tone: string }[] = [
  { id: "lead", label: "Lead", tone: "info" },
  { id: "cotacao", label: "Cotação enviada", tone: "cyan" },
  { id: "negociacao", label: "Negociação", tone: "amber" },
  { id: "fechado", label: "Fechado", tone: "success" },
  { id: "perdido", label: "Perdido", tone: "danger" },
];

function ClientesPage() {
  const [tab, setTab] = useState<Tab>("clientes");
  const [busca, setBusca] = useState("");

  const filtered = useMemo(
    () => clients.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.cnpj.includes(busca)),
    [busca]
  );

  const kpis = [
    { l: "Clientes ativos", v: String(clients.filter(c => c.status === "ativo").length), icon: Users, tone: "success" as const },
    { l: "Pipeline aberto", v: `R$ ${(crmDeals.filter(d => d.stage !== "fechado" && d.stage !== "perdido").reduce((s, d) => s + d.valorEstimado, 0) / 1000).toFixed(0)}k`, icon: TrendingUp, tone: "cyan" as const },
    { l: "Cotações abertas", v: String(quotations.filter(q => q.status === "aberta").length), icon: Calculator, tone: "amber" as const },
    { l: "Ticket médio", v: `R$ ${Math.round(clients.filter(c => c.status === "ativo").reduce((s, c) => s + c.faturamentoMes, 0) / clients.filter(c => c.status === "ativo").length / 1000)}k`, icon: DollarSign, tone: "success" as const },
  ];

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 1</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Clientes, CRM & Cotação</h1>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-3 py-2 text-sm hover:bg-primary/20">
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.l} className="panel p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.l}</div>
                  <Icon className={`h-4 w-4 ${m.tone === "success" ? "text-success" : m.tone === "amber" ? "text-accent" : "text-primary"}`} />
                </div>
                <div className="num text-3xl mt-2">{m.v}</div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {([
            ["clientes", "Clientes"],
            ["tabela", "Tabela de frete"],
            ["cotacao", "Cotação / Simulação"],
            ["crm", "CRM · Pipeline"],
          ] as [Tab, string][]).map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "clientes" && (
          <>
            <div className="flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por razão social ou CNPJ..."
                className="bg-transparent outline-none text-sm w-full"
              />
            </div>
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-normal px-4 py-2.5">Cliente</th>
                    <th className="text-left font-normal">CNPJ</th>
                    <th className="text-left font-normal">Segmento</th>
                    <th className="text-left font-normal">Contato</th>
                    <th className="text-left font-normal">Cidade/UF</th>
                    <th className="text-right font-normal">Faturamento</th>
                    <th className="text-right font-normal">SLA</th>
                    <th className="text-left font-normal pl-4 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.cnpj} className="border-t border-border hover:bg-elevated/50">
                      <td className="px-4 py-3 font-medium">{c.nome}</td>
                      <td className="num text-xs text-muted-foreground">{c.cnpj}</td>
                      <td className="text-xs">{c.segmento}</td>
                      <td className="text-xs">
                        <div>{c.contato}</div>
                        <div className="num text-muted-foreground">{c.telefone}</div>
                      </td>
                      <td className="text-xs">{c.cidade}/{c.uf}</td>
                      <td className="text-right num">{c.faturamentoMes > 0 ? `R$ ${c.faturamentoMes.toLocaleString("pt-BR")}` : "—"}</td>
                      <td className={`text-right num ${c.sla > 0 && c.sla < 95 ? "text-accent" : c.sla > 0 ? "text-success" : "text-muted-foreground"}`}>
                        {c.sla > 0 ? `${c.sla.toFixed(1)}%` : "—"}
                      </td>
                      <td className="pl-4 pr-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(c.status))}`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "tabela" && (
          <div className="panel overflow-x-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="text-sm text-muted-foreground">Tarifários vigentes por cliente e trecho</div>
              <button className="text-xs text-primary hover:underline">+ Nova linha</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Cliente</th>
                  <th className="text-left font-normal">Origem</th>
                  <th className="text-left font-normal">Destino</th>
                  <th className="text-left font-normal">Faixa peso (kg)</th>
                  <th className="text-right font-normal">R$/kg</th>
                  <th className="text-right font-normal">Mínimo</th>
                  <th className="text-right font-normal">Ad valorem</th>
                  <th className="text-right font-normal">GRIS</th>
                  <th className="text-right font-normal">Pedágio</th>
                  <th className="text-right font-normal pr-4">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {freightTables.map((f) => (
                  <tr key={f.id} className="border-t border-border hover:bg-elevated/50">
                    <td className="px-4 py-2.5 font-medium">{f.cliente}</td>
                    <td>{f.origemUf}</td>
                    <td>{f.destinoUf}</td>
                    <td className="num text-xs">{f.faixaPeso}</td>
                    <td className="text-right num">R$ {f.valorKg.toFixed(2)}</td>
                    <td className="text-right num">R$ {f.minimo}</td>
                    <td className="text-right num">{f.adValorem.toFixed(2)}%</td>
                    <td className="text-right num">{f.gris.toFixed(2)}%</td>
                    <td className="text-right num">R$ {f.pedagio}</td>
                    <td className="text-right num pr-4">{f.prazo}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "cotacao" && <SimuladorFrete />}

        {tab === "crm" && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Pipeline comercial · {crmDeals.filter(d => d.stage !== "fechado" && d.stage !== "perdido").length} oportunidades em andamento
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {stages.map((stage) => {
                const deals = crmDeals.filter(d => d.stage === stage.id);
                const total = deals.reduce((s, d) => s + d.valorEstimado, 0);
                return (
                  <div key={stage.id} className="panel p-3 flex flex-col min-h-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(stage.id))}`}>
                        {stage.label}
                      </span>
                      <span className="num text-xs text-muted-foreground">{deals.length}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-3">R$ {(total / 1000).toFixed(0)}k</div>
                    <div className="space-y-2 flex-1">
                      {deals.map((d) => (
                        <div key={d.id} className="rounded-md border border-border bg-elevated/40 p-2.5 hover:border-primary/40 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium truncate">{d.cliente}</div>
                            <span className="num text-[10px] text-primary">{d.id}</span>
                          </div>
                          <div className="num text-sm mt-1">R$ {(d.valorEstimado / 1000).toFixed(0)}k</div>
                          <div className="text-[11px] text-muted-foreground mt-1 truncate">{d.observacao}</div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                            <span>{d.responsavel}</span>
                            <span>follow: {d.proximoFollow}</span>
                          </div>
                        </div>
                      ))}
                      {deals.length === 0 && (
                        <div className="text-[11px] text-muted-foreground text-center py-8">vazio</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SimuladorFrete() {
  const clientList = Array.from(new Set(freightTables.map(f => f.cliente)));
  const [cliente, setCliente] = useState(clientList[0]);
  const [origemUf, setOrigemUf] = useState("SP");
  const [destinoUf, setDestinoUf] = useState("SP");
  const [peso, setPeso] = useState(500);
  const [valorNF, setValorNF] = useState(50000);

  const linha = useMemo(() => {
    return freightTables.find(f =>
      f.cliente === cliente &&
      f.origemUf === origemUf &&
      f.destinoUf === destinoUf
    );
  }, [cliente, origemUf, destinoUf]);

  const calc = useMemo(() => {
    if (!linha) return null;
    const pesoCalc = Math.max(peso, 0);
    const bruto = pesoCalc * linha.valorKg;
    const pisoAplicado = Math.max(bruto, linha.minimo);
    const adV = (valorNF * linha.adValorem) / 100;
    const gris = (valorNF * linha.gris) / 100;
    const total = pisoAplicado + adV + gris + linha.pedagio;
    return { pisoAplicado, adV, gris, pedagio: linha.pedagio, total };
  }, [linha, peso, valorNF]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel p-5 space-y-3">
        <div className="font-display text-lg">Nova cotação</div>
        <Field label="Cliente">
          <select value={cliente} onChange={(e) => setCliente(e.target.value)} className="input">
            {clientList.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Origem (UF)">
            <input value={origemUf} onChange={(e) => setOrigemUf(e.target.value.toUpperCase())} maxLength={2} className="input" />
          </Field>
          <Field label="Destino (UF)">
            <input value={destinoUf} onChange={(e) => setDestinoUf(e.target.value.toUpperCase())} maxLength={2} className="input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso (kg)">
            <input type="number" value={peso} onChange={(e) => setPeso(Number(e.target.value))} className="input num" />
          </Field>
          <Field label="Valor NF (R$)">
            <input type="number" value={valorNF} onChange={(e) => setValorNF(Number(e.target.value))} className="input num" />
          </Field>
        </div>
        <div className="flex gap-2 pt-2">
          <button className="rounded-md bg-primary/15 border border-primary/40 text-primary px-4 py-2 text-sm hover:bg-primary/25">Simular</button>
          <button className="rounded-md border border-border px-4 py-2 text-sm hover:bg-elevated">Salvar como oportunidade</button>
        </div>
      </div>

      <div className="panel p-5">
        <div className="font-display text-lg mb-3">Resultado</div>
        {!linha && (
          <div className="text-sm text-muted-foreground">
            Nenhuma tabela cadastrada para <span className="text-foreground">{cliente}</span> · {origemUf} → {destinoUf}.
          </div>
        )}
        {linha && calc && (
          <div className="space-y-2">
            <Line label={`Piso aplicado (${peso}kg · R$${linha.valorKg}/kg, mín R$${linha.minimo})`} value={calc.pisoAplicado} />
            <Line label={`Ad valorem (${linha.adValorem}% s/ NF)`} value={calc.adV} />
            <Line label={`GRIS (${linha.gris}% s/ NF)`} value={calc.gris} />
            <Line label="Pedágio" value={calc.pedagio} />
            <div className="border-t border-border pt-3 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Total frete</span>
              <span className="num text-2xl text-primary">R$ {calc.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Prazo estimado: {linha.prazo} dia(s)</div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Cotações recentes</div>
          <div className="space-y-1.5">
            {quotations.map(q => (
              <div key={q.id} className="flex items-center justify-between text-xs">
                <div>
                  <span className="num text-primary">{q.id}</span>
                  <span className="text-muted-foreground"> · {q.cliente} · {q.origem} → {q.destino}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="num">R$ {q.valorFrete.toLocaleString("pt-BR")}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${toneClass(statusTone(q.status))}`}>{q.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="num">R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}
