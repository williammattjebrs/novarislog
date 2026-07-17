import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useState, useMemo } from "react";
import { Users, Plus, Search, Building2 } from "lucide-react";
import { useClients, useCRMDeals, useFreightTables, useQuotations, newId } from "@/lib/mock-store";
import { statusTone, toneClass, fmtBRL, type CRMStage, type Client } from "@/lib/mock-data";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes & CRM | Novaris" },
      { name: "description", content: "Cadastro de clientes, grupos empresariais, tabelas de frete e pipeline comercial." },
    ],
  }),
  component: () => (
    <RoleGate path="/clientes">
      <ClientesPage />
    </RoleGate>
  ),
});

const STAGES: { id: CRMStage; label: string }[] = [
  { id: "lead", label: "Lead" },
  { id: "cotacao", label: "Cotação" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
];

function ClientesPage() {
  const clients = useClients();
  const tables = useFreightTables();
  const quotes = useQuotations();
  const deals = useCRMDeals();

  const [tab, setTab] = useState<"clientes" | "crm">("clientes");
  const [busca, setBusca] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(
    () => clients.list.filter((c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.cnpjs.some((x) => x.cnpj.includes(busca)),
    ),
    [clients.list, busca],
  );

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 1</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Clientes & CRM</h1>
            <p className="text-sm text-muted-foreground mt-1">CNPJ único ou conglomerados. Tabelas de frete por cliente, cotações e pipeline.</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-3 py-2 text-sm hover:bg-primary/20"
          >
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Clientes ativos" v={String(clients.list.filter((c) => c.status === "ativo").length)} tone="text-success" />
          <Kpi label="Tabelas cadastradas" v={String(tables.list.length)} tone="text-primary" />
          <Kpi label="Cotações abertas" v={String(quotes.list.filter((q) => q.status === "aberta").length)} tone="text-accent" />
          <Kpi label="Pipeline aberto" v={fmtBRL(deals.list.filter((d) => d.stage !== "fechado" && d.stage !== "perdido").reduce((s, d) => s + d.valorEstimado, 0))} tone="text-primary" />
        </div>

        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {(["clientes", "crm"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "clientes" ? "Clientes" : "CRM · Pipeline"}
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
                    <th className="text-left font-normal">CNPJ(s)</th>
                    <th className="text-left font-normal">Segmento</th>
                    <th className="text-left font-normal">Contato</th>
                    <th className="text-left font-normal">Tabelas</th>
                    <th className="text-left font-normal pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-elevated/50">
                      <td className="px-4 py-3">
                        <Link to="/clientes/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline flex items-center gap-1.5">
                          {c.isGrupo && <Building2 className="h-3.5 w-3.5" />}
                          {c.nome}
                        </Link>
                      </td>
                      <td className="num text-xs text-muted-foreground">
                        {c.cnpjs[0]?.cnpj ?? "—"}
                        {c.cnpjs.length > 1 && <span className="ml-1 text-primary">+{c.cnpjs.length - 1}</span>}
                      </td>
                      <td className="text-xs">{c.segmento}</td>
                      <td className="text-xs">
                        <div>{c.contato}</div>
                        <div className="num text-muted-foreground">{c.telefone}</div>
                      </td>
                      <td className="num text-xs">{tables.list.filter((t) => t.clienteId === c.id).length}</td>
                      <td className="pr-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(c.status))}`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      Nenhum cliente cadastrado. Clique em <b>Novo cliente</b> para começar.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "crm" && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Pipeline comercial · arraste os cards para atualizar o estágio (mock).
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {STAGES.map((stage) => {
                const stageDeals = deals.list.filter((d) => d.stage === stage.id);
                const total = stageDeals.reduce((s, d) => s + d.valorEstimado, 0);
                return (
                  <div key={stage.id} className="panel p-3 flex flex-col min-h-[240px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(stage.id))}`}>
                        {stage.label}
                      </span>
                      <span className="num text-xs text-muted-foreground">{stageDeals.length}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-3">{fmtBRL(total)}</div>
                    <div className="space-y-2 flex-1">
                      {stageDeals.map((d) => (
                        <div key={d.id} className="rounded-md border border-border bg-elevated/40 p-2.5 hover:border-primary/40">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium truncate">{d.clienteNome}</div>
                            <span className="num text-[10px] text-primary">{d.id}</span>
                          </div>
                          <div className="num text-sm mt-1">{fmtBRL(d.valorEstimado)}</div>
                          <div className="text-[11px] text-muted-foreground mt-1 truncate">{d.observacao}</div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                            <span>{d.responsavel}</span>
                            <span>follow: {d.proximoFollow}</span>
                          </div>
                          <div className="flex gap-1 mt-2">
                            {STAGES.filter((s) => s.id !== d.stage).slice(0, 2).map((s) => (
                              <button
                                key={s.id}
                                onClick={() => deals.update(d.id, { stage: s.id })}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-elevated"
                              >
                                → {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {stageDeals.length === 0 && (
                        <div className="text-[11px] text-muted-foreground text-center py-8">vazio</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                const id = newId("OPP");
                deals.add({
                  id, clienteNome: "Novo lead", responsavel: "—", valorEstimado: 0,
                  stage: "lead", proximoFollow: "definir", origem: "manual", observacao: "",
                  criadoEm: new Date().toISOString(),
                });
              }}
              className="text-xs text-primary hover:underline"
            >+ adicionar oportunidade</button>
          </div>
        )}
      </div>

      {showNew && <NewClientModal onClose={() => setShowNew(false)} onSave={(c) => { clients.add(c); setShowNew(false); }} />}
    </AppShell>
  );
}

function Kpi({ label, v, tone }: { label: string; v: string; tone: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Users className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="num text-2xl mt-2">{v}</div>
    </div>
  );
}

function NewClientModal({ onClose, onSave }: { onClose: () => void; onSave: (c: Client) => void }) {
  const [nome, setNome] = useState("");
  const [segmento, setSegmento] = useState("");
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [razao, setRazao] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("SP");
  const [isGrupo, setIsGrupo] = useState(false);

  function submit() {
    if (!nome.trim() || !cnpj.trim()) return;
    onSave({
      id: newId("CLI"),
      nome: nome.trim(),
      segmento: segmento || "—",
      contato, telefone, email,
      status: "ativo",
      isGrupo,
      cnpjs: [{ cnpj, razaoSocial: razao || nome, cidade, uf }],
      criadoEm: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-lg mb-3">Novo cliente</div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Razão social / Grupo" full><input value={nome} onChange={(e) => setNome(e.target.value)} className="input" /></F>
          <F label="Segmento"><input value={segmento} onChange={(e) => setSegmento(e.target.value)} className="input" /></F>
          <F label="É grupo?">
            <select value={String(isGrupo)} onChange={(e) => setIsGrupo(e.target.value === "true")} className="input">
              <option value="false">Não (CNPJ único)</option>
              <option value="true">Sim (conglomerado)</option>
            </select>
          </F>
          <F label="CNPJ"><input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="input num" /></F>
          <F label="Razão social CNPJ"><input value={razao} onChange={(e) => setRazao(e.target.value)} className="input" /></F>
          <F label="Cidade"><input value={cidade} onChange={(e) => setCidade(e.target.value)} className="input" /></F>
          <F label="UF"><input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} maxLength={2} className="input" /></F>
          <F label="Contato"><input value={contato} onChange={(e) => setContato(e.target.value)} className="input" /></F>
          <F label="Telefone"><input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="input" /></F>
          <F label="E-mail" full><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></F>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">Cancelar</button>
          <button onClick={submit} className="text-sm px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
