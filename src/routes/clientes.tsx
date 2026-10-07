import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useState, useMemo } from "react";
import { RouteRatesTable } from "@/components/RouteRatesTable";
import { FreightSimulator } from "@/components/FreightSimulator";
import { Users, Plus, Search, Building2, Trash2 } from "lucide-react";
import { useClients, useClientGroups, useCRMDeals, useFreightTables, useQuotations, newId } from "@/lib/mock-store";
import { statusTone, toneClass, fmtBRL, type CRMStage, type Client, type ClientCNPJ } from "@/lib/mock-data";

export const Route = createFileRoute("/clientes")({
  validateSearch: (s: Record<string, unknown>) => ({ registro: typeof s.registro === "string" ? s.registro : undefined }),
  head: () => ({
    meta: [
      { title: "Clientes & CRM | Novaris" },
      { name: "description", content: "Cadastro de clientes, grupos empresariais, tabelas de frete e pipeline comercial." },
      { property: "og:title", content: "Clientes & CRM | Novaris" },
      { property: "og:description", content: "Cadastro de clientes, grupos empresariais, tabelas de frete e pipeline comercial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const groups = useClientGroups();

  const [tab, setTab] = useState<"clientes" | "grupos" | "rotas" | "simulador" | "crm">("clientes");
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
          {(["clientes", "grupos", "rotas", "simulador", "crm"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "clientes" ? "Clientes" : t === "grupos" ? "Conglomerados" : t === "rotas" ? "Tabela padrão (rotas)" : t === "simulador" ? "Simulador de frete" : "CRM · Pipeline"}
            </button>
          ))}
        </div>

        {tab === "rotas" && (
          <>
            <p className="text-sm text-muted-foreground">Rotas de referência para todos os clientes. Em cada cliente você pode trazer estas rotas e ajustar os valores só para ele.</p>
            <RouteRatesTable />
          </>
        )}

        {tab === "simulador" && <FreightSimulator />}

        {tab === "grupos" && <GruposTab />}

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
                    <th className="text-left font-normal">Conglomerado</th>
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
                      <td className="text-xs">{groups.list.find((g) => g.id === c.grupoId)?.nome ?? "—"}</td>
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
                    <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
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
  const groups = useClientGroups();
  const [nome, setNome] = useState("");
  const [segmento, setSegmento] = useState("");
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [cnpjs, setCnpjs] = useState<ClientCNPJ[]>([{ cnpj: "", razaoSocial: "", cidade: "", uf: "SP" }]);

  const upd = (i: number, patch: Partial<ClientCNPJ>) =>
    setCnpjs((l) => l.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  function submit() {
    const validos = cnpjs.filter((c) => c.cnpj.trim());
    if (!nome.trim() || validos.length === 0) return;
    onSave({
      id: newId("CLI"),
      nome: nome.trim(),
      segmento: segmento || "—",
      contato, telefone, email,
      status: "ativo",
      isGrupo: validos.length > 1 || !!grupoId,
      grupoId: grupoId || undefined,
      cnpjs: validos.map((c) => ({ ...c, razaoSocial: c.razaoSocial || nome })),
      criadoEm: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-lg mb-3">Novo cliente</div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Nome do cliente" full><input value={nome} onChange={(e) => setNome(e.target.value)} className="input" /></F>
          <F label="Segmento"><input value={segmento} onChange={(e) => setSegmento(e.target.value)} className="input" /></F>
          <F label="Conglomerado">
            <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className="input">
              <option value="">Nenhum</option>
              {groups.list.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </F>
          <F label="Contato"><input value={contato} onChange={(e) => setContato(e.target.value)} className="input" /></F>
          <F label="Telefone"><input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="input" /></F>
          <F label="E-mail" full><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></F>
        </div>
        <div className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">CNPJs do cliente</div>
        <div className="space-y-2">
          {cnpjs.map((c, i) => (
            <div key={i} className="grid grid-cols-[1.2fr_1.5fr_1fr_60px_auto] gap-2">
              <input value={c.cnpj} onChange={(e) => upd(i, { cnpj: e.target.value })} placeholder="CNPJ" className="input num" />
              <input value={c.razaoSocial} onChange={(e) => upd(i, { razaoSocial: e.target.value })} placeholder="Razão social" className="input" />
              <input value={c.cidade} onChange={(e) => upd(i, { cidade: e.target.value })} placeholder="Cidade" className="input" />
              <input value={c.uf} onChange={(e) => upd(i, { uf: e.target.value.toUpperCase() })} maxLength={2} className="input" />
              <button type="button" disabled={cnpjs.length === 1} onClick={() => setCnpjs((l) => l.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-danger disabled:opacity-30 px-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setCnpjs((l) => [...l, { cnpj: "", razaoSocial: "", cidade: "", uf: "SP" }])} className="mt-2 text-xs text-primary hover:underline">+ adicionar outro CNPJ</button>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">Cancelar</button>
          <button onClick={submit} className="text-sm px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function GruposTab() {
  const groups = useClientGroups();
  const clients = useClients();
  const [nome, setNome] = useState("");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Crie conglomerados (grupos econômicos) e vincule os clientes e seus CNPJs a eles.</p>
      <div className="panel p-4 flex gap-2 max-w-lg">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do conglomerado" className="input" />
        <button
          onClick={() => {
            if (!nome.trim()) return;
            groups.add({ id: newId("GRP"), nome: nome.trim(), criadoEm: new Date().toISOString() });
            setNome("");
          }}
          className="text-sm px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 whitespace-nowrap"
        >Criar</button>
      </div>
      {groups.list.length === 0 && <div className="text-xs text-muted-foreground">Nenhum conglomerado criado ainda.</div>}
      <div className="grid md:grid-cols-2 gap-3">
        {groups.list.map((g) => {
          const membros = clients.list.filter((c) => c.grupoId === g.id);
          const livres = clients.list.filter((c) => c.grupoId !== g.id);
          const totalCnpj = membros.reduce((s, c) => s + c.cnpjs.length, 0);
          return (
            <div key={g.id} className="panel p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />{g.nome}</div>
                <button
                  onClick={() => {
                    if (!window.confirm("Excluir este conglomerado? Os clientes ficam sem vínculo.")) return;
                    membros.forEach((c) => clients.update(c.id, { grupoId: undefined }));
                    groups.remove(g.id);
                  }}
                  className="text-muted-foreground hover:text-danger"
                ><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{membros.length} cliente(s) · {totalCnpj} CNPJ(s)</div>
              <div className="mt-3 space-y-1.5">
                {membros.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs border border-border rounded px-2 py-1.5">
                    <div>
                      <Link to="/clientes/$id" params={{ id: c.id }} className="text-primary hover:underline">{c.nome}</Link>
                      <div className="num text-muted-foreground">{c.cnpjs.map((x) => x.cnpj).join(" · ")}</div>
                    </div>
                    <button onClick={() => clients.update(c.id, { grupoId: undefined })} className="text-muted-foreground hover:text-danger text-[11px]">desvincular</button>
                  </div>
                ))}
              </div>
              {livres.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && clients.update(e.target.value, { grupoId: g.id, isGrupo: true })}
                  className="input mt-3 text-xs"
                >
                  <option value="">+ vincular cliente…</option>
                  {livres.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.cnpjs.length} CNPJ)</option>)}
                </select>
              )}
            </div>
          );
        })}
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
