// Detalhe do cliente: CNPJs, tabelas de frete (com upload Excel), cotações.
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useState, useRef } from "react";
import { RouteRatesTable } from "@/components/RouteRatesTable";
import { TrackingGroupEditor } from "@/components/TrackingGroupEditor";
import { ArrowLeft, Plus, FileUp, Trash2, Check, Pencil, FileDown, Upload } from "lucide-react";
import {
  useClients, useFreightTables, useQuotations, newId,
} from "@/lib/mock-store";
import { fmtBRL, TIPOS_CAMINHAO, type Client, type FreightRow, type FreightTable, type Modalidade } from "@/lib/mock-data";
import { parseFreightExcel } from "@/lib/excel-parser";
import { downloadFreightTemplate, parseFreightBulkExcel, type BulkResult } from "@/lib/freight-excel";
import { CityPicker } from "@/components/CityPicker";

export const Route = createFileRoute("/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Cliente | Novaris" },
      { name: "description", content: "Detalhe do cliente: CNPJs do grupo, tabelas de frete e cotações." },
      { property: "og:title", content: "Cliente | Novaris" },
      { property: "og:description", content: "Detalhe do cliente: CNPJs do grupo, tabelas de frete e cotações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate path="/clientes">
      <ClienteDetalhe />
    </RoleGate>
  ),
});

function ClienteDetalhe() {
  const { id } = useParams({ from: "/clientes/$id" });
  const clients = useClients();
  const tables = useFreightTables();
  const quotes = useQuotations();
  const client = clients.list.find((c) => c.id === id);
  const [tab, setTab] = useState<"dados" | "rotas" | "tabelas" | "cotacoes">("dados");
  const [showTable, setShowTable] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  if (!client) {
    return (
      <AppShell>
        <div className="p-6 space-y-3">
          <Link to="/clientes" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> voltar
          </Link>
          <div className="panel p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>
        </div>
      </AppShell>
    );
  }

  const clientTables = tables.list.filter((t) => t.clienteId === client.id);
  const clientQuotes = quotes.list.filter((q) => q.clienteId === client.id);

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <Link to="/clientes" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> todos os clientes
        </Link>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cliente {client.isGrupo ? "· Grupo" : ""}</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">{client.nome}</h1>
            <p className="text-sm text-muted-foreground mt-1">{client.segmento} · {client.cnpjs.length} CNPJ(s)</p>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-border">
          {([
            ["dados", "Dados & CNPJs"],
            ["rotas", "Rotas do cliente"],
            ["tabelas", `Tabelas de frete (${clientTables.length})`],
            ["cotacoes", `Cotações (${clientQuotes.length})`],
          ] as const).map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >{l}</button>
          ))}
        </div>

        {tab === "dados" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="panel p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-lg">Dados & Contato</div>
                <button onClick={() => setShowEdit(true)} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  <Pencil className="h-3 w-3" /> editar dados
                </button>
              </div>
              <Line label="Responsável" v={client.responsavel || client.contato} />
              <Line label="Aniversário do responsável" v={client.aniversarioResponsavel ? client.aniversarioResponsavel.split("-").reverse().join("/") : ""} />
              <Line label="Contato" v={client.contato} />
              <Line label="Telefone" v={client.telefone} />
              <Line label="Telefone 2" v={client.telefone2 ?? ""} />
              <Line label="E-mail" v={client.email} />
              <Line label="E-mail financeiro" v={client.emailFinanceiro ?? ""} />
              <Line label="Segmento" v={client.segmento} />
              <Line label="Endereço" v={[client.endereco, client.numero, client.complemento].filter(Boolean).join(", ")} />
              <Line label="Bairro" v={client.bairro ?? ""} />
              <Line label="Cidade/UF" v={[client.cidade, client.uf].filter(Boolean).join("/")} />
              <Line label="CEP" v={client.cep ?? ""} />
              {client.observacao && <Line label="Observação" v={client.observacao} />}
              <div className="mt-3"><TrackingGroupEditor client={client.nome} defaultEmail={client.email} /></div>
            </div>
            <div className="panel p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-lg">CNPJs do grupo</div>
                <button
                  onClick={() => {
                    const cnpj = prompt("CNPJ:") ?? "";
                    const razao = prompt("Razão social:") ?? "";
                    const cidade = prompt("Cidade:") ?? "";
                    const uf = (prompt("UF:") ?? "").toUpperCase();
                    if (cnpj) clients.update(client.id, {
                      cnpjs: [...client.cnpjs, { cnpj, razaoSocial: razao, cidade, uf }],
                    });
                  }}
                  className="text-xs text-primary hover:underline"
                ><Plus className="h-3 w-3 inline" /> adicionar CNPJ</button>
              </div>
              <ul className="space-y-2">
                {client.cnpjs.map((c, i) => (
                  <li key={i} className="rounded-md border border-border p-2 flex justify-between text-xs">
                    <div>
                      <div className="num">{c.cnpj}</div>
                      <div className="text-muted-foreground">{c.razaoSocial} · {c.cidade}/{c.uf}</div>
                    </div>
                    {client.cnpjs.length > 1 && (
                      <button
                        onClick={() => clients.update(client.id, {
                          cnpjs: client.cnpjs.filter((_, j) => j !== i),
                        })}
                        className="text-muted-foreground hover:text-danger"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "rotas" && (
          <>
            <p className="text-sm text-muted-foreground">Rotas salvas para este cliente. Traga da tabela padrão e altere os valores à vontade — a tabela padrão não é afetada.</p>
            <RouteRatesTable clienteId={client.id} />
          </>
        )}

        {tab === "tabelas" && (
          <>
            <div className="panel p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <div className="text-xs font-medium mb-1">Criar tabela nova deste cliente</div>
                <p className="text-[11px] text-muted-foreground mb-2">Cadastra uma tabela exclusiva de {client.nome}, sem mexer na tabela padrão.</p>
                <button onClick={() => setShowTable(true)} className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20">
                  <Plus className="h-3 w-3" /> nova tabela do cliente
                </button>
              </div>
              <div className="rounded-md border border-border p-3 md:col-span-2">
                <div className="text-xs font-medium mb-1">Importar tabelas em massa (Excel modelo)</div>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Uma planilha com várias rotas e tipos de caminhão (fracionado, Truck, Carreta, Bitrem…). As cidades são validadas pela base oficial do IBGE.
                </p>
                <BulkImport clientId={client.id} />
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs font-medium mb-1">Vincular tabela existente</div>
                <p className="text-[11px] text-muted-foreground mb-2">Copia uma tabela já cadastrada (de outro cliente ou a padrão) para este cliente. A original não é alterada.</p>
                <select
                  className="input h-8 text-xs w-full"
                  value=""
                  onChange={(e) => {
                    const src = tables.list.find((t) => t.id === e.target.value);
                    if (!src) return;
                    const dono = clients.list.find((c) => c.id === src.clienteId)?.nome ?? "sem cliente";
                    if (!confirm(`Vincular a tabela "${src.nome}" (de ${dono}) a ${client.nome}? Será criada uma cópia própria do cliente; a tabela original não é alterada.`)) return;
                    tables.add({ ...src, id: newId("TAB"), clienteId: client.id, criadoEm: new Date().toISOString() });
                  }}
                >
                  <option value="">Escolher tabela para vincular…</option>
                  {tables.list.filter((t) => t.clienteId !== client.id).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} · {t.origemUf}→{t.destinoUf} · {clients.list.find((c) => c.id === t.clienteId)?.nome ?? "sem cliente"}
                    </option>
                  ))}
                </select>
                {tables.list.filter((t) => t.clienteId !== client.id).length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">Nenhuma outra tabela cadastrada para vincular.</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {clientTables.map((t) => (
                <TableCard key={t.id} table={t} onDelete={() => tables.remove(t.id)} onUpdate={(patch) => tables.update(t.id, patch)} />
              ))}
              {clientTables.length === 0 && (
                <div className="panel p-8 text-center text-sm text-muted-foreground">
                  Nenhuma tabela cadastrada. Clique em <b>nova tabela</b> para criar manualmente ou importar Excel.
                </div>
              )}
            </div>
          </>
        )}

        {tab === "cotacoes" && (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">ID</th>
                  <th className="text-left font-normal">Rota</th>
                  <th className="text-right font-normal">Peso</th>
                  <th className="text-right font-normal">Valor NF</th>
                  <th className="text-right font-normal">Frete calc.</th>
                  <th className="text-left font-normal">Status</th>
                  <th className="text-right font-normal pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientQuotes.map((q) => (
                  <tr key={q.id} className="border-t border-border">
                    <td className="px-4 py-2.5 num text-primary">{q.id}</td>
                    <td className="text-xs">{q.origemCidade}/{q.origemUf} → {q.destinoCidade}/{q.destinoUf}</td>
                    <td className="text-right num text-xs">{q.peso}kg</td>
                    <td className="text-right num text-xs">{fmtBRL(q.valorNF)}</td>
                    <td className="text-right num">{fmtBRL(q.valorCalculado)}</td>
                    <td><span className="text-[11px] px-2 py-0.5 rounded border border-border">{q.status}</span></td>
                    <td className="text-right pr-4">
                      {q.status === "aberta" && (
                        <button onClick={() => quotes.update(q.id, { status: "aprovada" })} className="text-xs text-success hover:underline inline-flex items-center gap-1">
                          <Check className="h-3 w-3" /> aprovar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {clientQuotes.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">Nenhuma cotação registrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showTable && (
        <NewTableModal
          onClose={() => setShowTable(false)}
          onSave={(t) => { tables.add({ ...t, clienteId: client.id }); setShowTable(false); }}
        />
      )}
      {showEdit && (
        <EditClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSave={(patch) => { clients.update(client.id, patch); setShowEdit(false); }}
        />
      )}
    </AppShell>
  );
}

function Line({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{v || "—"}</span>
    </div>
  );
}

function TableCard({ table, onDelete, onUpdate }: {
  table: FreightTable;
  onDelete: () => void;
  onUpdate: (patch: Partial<FreightTable>) => void;
}) {
  const [expand, setExpand] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { rows } = await parseFreightExcel(f);
      if (rows.length === 0) { alert("Nenhuma linha reconhecida. Colunas esperadas: faixa_min, faixa_max, valor_kg, minimo"); return; }
      onUpdate({ rows });
      alert(`✓ ${rows.length} faixa(s) importada(s) da planilha`);
    } catch (err) {
      alert("Falha ao ler o arquivo: " + (err as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{table.nome}</div>
          <div className="text-xs text-muted-foreground">
            {table.modalidade === "lotacao" ? "Lotação" : "Fracionada"} · {table.origemCidade || table.origemUf} → {table.destinoCidade || table.destinoUf} · vig. {table.vigenciaInicio} a {table.vigenciaFim}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate({ ativa: !table.ativa })}
            className={`text-[11px] px-2 py-0.5 rounded border ${table.ativa ? "text-success bg-success/10 border-success/30" : "text-muted-foreground border-border"}`}
          >{table.ativa ? "ativa" : "inativa"}</button>
          <label className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-elevated cursor-pointer">
            <FileUp className="h-3 w-3" /> Excel
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcel} className="hidden" />
          </label>
          <button onClick={onDelete} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-xs">
        <div><span className="text-muted-foreground">Ad valorem: </span><span className="num">{table.adValorem}%</span></div>
        <div><span className="text-muted-foreground">GRIS: </span><span className="num">{table.gris}%</span></div>
        <div><span className="text-muted-foreground">Pedágio: </span><span className="num">{fmtBRL(table.pedagio)}</span></div>
        <div><span className="text-muted-foreground">Prazo: </span><span className="num">{table.prazoDias}d</span></div>
        {table.modalidade === "lotacao" && <div><span className="text-muted-foreground">Lotação: </span><span className="num">{fmtBRL(table.valorLotacao ?? 0)}</span></div>}
      </div>

      {table.modalidade === "fracionada" && (
        <>
          <button onClick={() => setExpand(!expand)} className="text-xs text-primary hover:underline mt-3">
            {expand ? "− ocultar" : "+ ver"} faixas ({table.rows.length})
          </button>
          {expand && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-1">Faixa min (kg)</th>
                    <th className="text-left">Faixa máx (kg)</th>
                    <th className="text-right">R$/kg</th>
                    <th className="text-right">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1 num">{r.faixaMin}</td>
                      <td className="num">{r.faixaMax}</td>
                      <td className="text-right num">R$ {r.valorKg.toFixed(2)}</td>
                      <td className="text-right num">{fmtBRL(r.minimo)}</td>
                    </tr>
                  ))}
                  {table.rows.length === 0 && (
                    <tr><td colSpan={4} className="py-2 text-center text-muted-foreground">sem faixas — importe Excel</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewTableModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (t: Omit<FreightTable, "clienteId">) => void;
}) {
  const [nome, setNome] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("fracionada");
  const [origemUf, setOrigemUf] = useState("SP");
  const [destinoUf, setDestinoUf] = useState("SP");
  const [origemCidade, setOrigemCidade] = useState("");
  const [destinoCidade, setDestinoCidade] = useState("");
  const [adV, setAdV] = useState(0.15);
  const [gris, setGris] = useState(0.10);
  const [pedagio, setPedagio] = useState(0);
  const [prazo, setPrazo] = useState(1);
  const [valorLotacao, setValorLotacao] = useState(0);
  const [vigenciaInicio, setVI] = useState(new Date().toISOString().slice(0, 10));
  const [vigenciaFim, setVF] = useState(new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10));

  function submit() {
    if (!nome.trim()) return;
    const rows: FreightRow[] = modalidade === "fracionada"
      ? [{ faixaMin: 0, faixaMax: 500, valorKg: 0.5, minimo: 100 }]
      : [];
    onSave({
      id: newId("FT"),
      nome, modalidade,
      origemUf, destinoUf,
      origemCidade: origemCidade || undefined,
      destinoCidade: destinoCidade || undefined,
      rows,
      adValorem: adV, gris, pedagio, prazoDias: prazo,
      vigenciaInicio, vigenciaFim,
      ativa: true,
      criadoEm: new Date().toISOString(),
      valorLotacao: modalidade === "lotacao" ? valorLotacao : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-lg mb-3">Nova tabela de frete</div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Nome da tabela" full><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder='Ex.: "SP → RJ Fracionada 2025"' className="input" /></F>
          <F label="Modalidade">
            <select value={modalidade} onChange={(e) => setModalidade(e.target.value as Modalidade)} className="input">
              <option value="fracionada">Fracionada</option>
              <option value="lotacao">Lotação (carga fechada)</option>
            </select>
          </F>
          {modalidade === "lotacao" && (
            <F label="Valor da lotação (R$)"><input type="number" value={valorLotacao} onChange={(e) => setValorLotacao(Number(e.target.value))} className="input num" /></F>
          )}
          <F label="UF origem"><input value={origemUf} onChange={(e) => setOrigemUf(e.target.value.toUpperCase())} maxLength={2} className="input" /></F>
          <F label="UF destino"><input value={destinoUf} onChange={(e) => setDestinoUf(e.target.value.toUpperCase())} maxLength={2} className="input" /></F>
          <F label="Cidade origem (opcional)"><input value={origemCidade} onChange={(e) => setOrigemCidade(e.target.value)} className="input" /></F>
          <F label="Cidade destino (opcional)"><input value={destinoCidade} onChange={(e) => setDestinoCidade(e.target.value)} className="input" /></F>
          <F label="Ad valorem (%)"><input type="number" step="0.01" value={adV} onChange={(e) => setAdV(Number(e.target.value))} className="input num" /></F>
          <F label="GRIS (%)"><input type="number" step="0.01" value={gris} onChange={(e) => setGris(Number(e.target.value))} className="input num" /></F>
          <F label="Pedágio (R$)"><input type="number" step="0.01" value={pedagio} onChange={(e) => setPedagio(Number(e.target.value))} className="input num" /></F>
          <F label="Prazo (dias)"><input type="number" value={prazo} onChange={(e) => setPrazo(Number(e.target.value))} className="input num" /></F>
          <F label="Vigência início"><input type="date" value={vigenciaInicio} onChange={(e) => setVI(e.target.value)} className="input" /></F>
          <F label="Vigência fim"><input type="date" value={vigenciaFim} onChange={(e) => setVF(e.target.value)} className="input" /></F>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Após salvar, use o botão <b>Excel</b> no card da tabela para importar as faixas de peso (colunas: <span className="num">faixa_min · faixa_max · valor_kg · minimo</span>).
        </p>
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

// Edição completa dos dados do cliente (o cadastro rápido continua enxuto).
function EditClientModal({ client, onClose, onSave }: {
  client: Client;
  onClose: () => void;
  onSave: (patch: Partial<Client>) => void;
}) {
  const [f, setF] = useState({
    nome: client.nome, segmento: client.segmento,
    responsavel: client.responsavel ?? client.contato, aniversarioResponsavel: client.aniversarioResponsavel ?? "",
    contato: client.contato, telefone: client.telefone, telefone2: client.telefone2 ?? "",
    email: client.email, emailFinanceiro: client.emailFinanceiro ?? "",
    endereco: client.endereco ?? "", numero: client.numero ?? "", complemento: client.complemento ?? "",
    bairro: client.bairro ?? "", cidade: client.cidade ?? "", uf: client.uf ?? "", cep: client.cep ?? "",
    observacao: client.observacao ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-lg mb-3">Editar dados de {client.nome}</div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Nome do cliente" full><input value={f.nome} onChange={set("nome")} className="input" /></F>
          <F label="Segmento"><input value={f.segmento} onChange={set("segmento")} className="input" /></F>
          <F label="Responsável"><input value={f.responsavel} onChange={set("responsavel")} className="input" /></F>
          <F label="Aniversário do responsável"><input type="date" value={f.aniversarioResponsavel} onChange={set("aniversarioResponsavel")} className="input" /></F>
          <F label="Contato"><input value={f.contato} onChange={set("contato")} className="input" /></F>
          <F label="Telefone"><input value={f.telefone} onChange={set("telefone")} className="input" /></F>
          <F label="Telefone 2"><input value={f.telefone2} onChange={set("telefone2")} className="input" /></F>
          <F label="E-mail"><input value={f.email} onChange={set("email")} className="input" /></F>
          <F label="E-mail financeiro"><input value={f.emailFinanceiro} onChange={set("emailFinanceiro")} className="input" /></F>
          <F label="Endereço"><input value={f.endereco} onChange={set("endereco")} className="input" /></F>
          <F label="Número"><input value={f.numero} onChange={set("numero")} className="input" /></F>
          <F label="Complemento"><input value={f.complemento} onChange={set("complemento")} className="input" /></F>
          <F label="Bairro"><input value={f.bairro} onChange={set("bairro")} className="input" /></F>
          <F label="Cidade"><input value={f.cidade} onChange={set("cidade")} className="input" /></F>
          <F label="UF"><input value={f.uf} onChange={set("uf")} maxLength={2} className="input" /></F>
          <F label="CEP"><input value={f.cep} onChange={set("cep")} className="input" /></F>
          <F label="Observação" full><textarea value={f.observacao} onChange={set("observacao")} className="input min-h-[60px]" /></F>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">Cancelar</button>
          <button
            onClick={() => { if (!f.nome.trim()) return alert("Informe o nome do cliente."); onSave({ ...f, uf: f.uf.toUpperCase() }); }}
            className="text-sm px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25"
          >Salvar</button>
        </div>
      </div>
    </div>
  );
}
