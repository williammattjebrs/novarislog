// Módulo 2 — Coletas & Ordens: NF-e → Ordem de Coleta → CT-e → Transporte.
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useState, useRef, useMemo } from "react";
import { FileUp, FileCheck2, Package, Truck, AlertTriangle, ArrowRight, Link2, Search, Download, Printer } from "lucide-react";
import { useOrders, useClients, useFreightTables, useRouteRates, useQuotations, useInvoices, useConfig, newId } from "@/lib/mock-store";
import {
  ORDER_STAGES, statusTone, toneClass, stageLabel, fmtBRL,
  type Order, type OrderStage,
} from "@/lib/mock-data";
import { parseNFe, parseCTe, readFileText } from "@/lib/xml-parser";
import { exportCsv, printReport } from "@/lib/export-utils";
import { findFreightTable, findQuotation, calcFreight } from "@/lib/cost-calc";
import { lookupCoords } from "@/lib/geo";
import { RecordActions } from "@/components/RecordActions";
import { DivergenceBadge } from "@/components/DivergenceBadge";
import { useAuth } from "@/lib/auth";
import { ColetasTriage } from "@/components/ColetasTriage";
import { correctCity, sameCityName } from "@/components/CityPicker";

export const Route = createFileRoute("/coletas")({
  head: () => ({
    meta: [
      { title: "Coletas & Ordens | Novaris" },
      { name: "description", content: "Fluxo NF-e → Ordem de Coleta → CT-e → Ordem de Transporte com detecção de divergência." },
    ],
  }),
  component: () => (
    <RoleGate path="/coletas">
      <ColetasPage />
    </RoleGate>
  ),
});

function ColetasPage() {
  const orders = useOrders();
  const clients = useClients();
  const tables = useFreightTables();
  const routeRates = useRouteRates();
  const quotes = useQuotations();
  const invoices = useInvoices();
  const [cfg] = useConfig();
  const { user } = useAuth();
  const autor = user?.nome ?? "sistema";

  const [filtro, setFiltro] = useState<OrderStage | "todos">("todos");
  const [selected, setSelected] = useState<string | null>(null);
  const nfeInput = useRef<HTMLInputElement>(null);
  const cteInput = useRef<HTMLInputElement>(null);

  const porStage = useMemo(() => {
    const m: Record<string, number> = {};
    ORDER_STAGES.forEach((s) => (m[s.id] = 0));
    orders.list.forEach((o) => (m[o.stage] = (m[o.stage] ?? 0) + 1));
    return m;
  }, [orders.list]);

  const [busca, setBusca] = useState("");
  const base = filtro === "todos" ? orders.list : orders.list.filter((o) => o.stage === filtro);
  const q = busca.trim().toLowerCase();
  const filtered = q
    ? base.filter((o) =>
        [o.id, o.clienteNome, String(o.numeroNFe), `${o.cidadeColeta}/${o.ufColeta}`, `${o.cidadeEntrega}/${o.ufEntrega}`]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : base;

  // ----------------------------------------------------
  // Upload NF-e
  // ----------------------------------------------------
  async function importNFe(files: FileList) {
    const texts: string[] = [];
    for (const f of Array.from(files)) texts.push(await readFileText(f));
    const r = await importNFeTexts(texts);
    if (!r) return;
    alert(`✓ ${r.ok} NF-e(s) importada(s)${r.dup ? ` · ${r.dup} já existia(m) e foi(ram) ignorada(s)` : ""}${r.fail > 0 ? ` · ${r.fail} com erro de leitura` : ""}${r.corrigidas.length ? `\n\nCidades corrigidas pelo IBGE:\n${r.corrigidas.join("\n")}` : ""}`);
    if (nfeInput.current) nfeInput.current.value = "";
  }

  async function importNFeTexts(texts: string[]) {
    // Sem cliente cadastrado para o CNPJ, a ordem entra como "(sem cliente)" na fila de tratamento.
    let ok = 0, fail = 0, dup = 0;
    const corrigidas: string[] = [];
    const chavesExistentes = new Set(orders.list.map((o) => o.chaveNFe).filter(Boolean));
    for (const text of texts) {
      const p = parseNFe(text);
      if (!p) { fail++; continue; }
      if (p.chave && chavesExistentes.has(p.chave)) { dup++; continue; }
      chavesExistentes.add(p.chave);
      // Corrige nomes de cidades da NF para o cadastro oficial do IBGE
      for (const part of [p.emitente, p.destinatario]) {
        const fixed = await correctCity(part.cidade, part.uf);
        if (fixed !== part.cidade) { corrigidas.push(`${part.cidade} → ${fixed}`); part.cidade = fixed; }
      }

      // Cliente = quem tem esse CNPJ como remetente (emitente)
      const client = clients.list.find((c) => c.cnpjs.some((x) => x.cnpj.replace(/\D/g, "") === p.emitente.cnpj.replace(/\D/g, "")));
      const clienteId = client?.id ?? "";
      const clienteNome = client?.nome ?? `(sem cliente) ${p.emitente.nome}`;

      // Busca tabela/cotação
      const table = clienteId
        ? findFreightTable(tables.list, {
            clienteId,
            ufColeta: p.emitente.uf,
            cidadeColeta: p.emitente.cidade,
            ufEntrega: p.destinatario.uf,
            cidadeEntrega: p.destinatario.cidade,
          })
        : null;
      const quote = !table && clienteId
        ? findQuotation(quotes.list, {
            clienteId,
            ufColeta: p.emitente.uf,
            ufEntrega: p.destinatario.uf,
          })
        : null;

      // Rotas (cliente > padrão) por cidade origem/destino
      const sameCity = sameCityName;
      const matchRoute = (r: { origemCidade: string; destinoCidade: string; origemUf: string; destinoUf: string }) =>
        sameCity(r.origemCidade, p.emitente.cidade) && sameCity(r.destinoCidade, p.destinatario.cidade) &&
        r.origemUf === p.emitente.uf && r.destinoUf === p.destinatario.uf;
      const rotaCliente = !table && !quote && clienteId ? routeRates.list.find((r) => r.clienteId === clienteId && matchRoute(r)) : undefined;
      const rotaPadrao = !table && !quote && !rotaCliente ? routeRates.list.find((r) => !r.clienteId && matchRoute(r)) : undefined;

      let valorFrete = 0;
      let origemValor: Order["origemValor"] = "";
      let refValor: string | undefined = undefined;
      if (table) {
        const c = calcFreight(table, { peso: p.pesoBruto, valorNF: p.valorTotal });
        valorFrete = c.total;
        origemValor = "tabela";
        refValor = table.id;
      } else if (quote) {
        valorFrete = quote.valorCalculado;
        origemValor = "cotacao";
        refValor = quote.id;
      } else if (rotaCliente) {
        valorFrete = rotaCliente.valorFrete;
        origemValor = "rota_cliente";
        refValor = rotaCliente.id;
      } else if (rotaPadrao) {
        valorFrete = rotaPadrao.valorFrete;
        origemValor = "rota_padrao";
        refValor = rotaPadrao.id;
      }

      const coords = lookupCoords(p.destinatario.cidade, p.destinatario.uf);

      const order: Order = {
        id: newId("ORD"),
        clienteId,
        clienteNome,
        chaveNFe: p.chave,
        numeroNFe: p.numero,
        remetente: p.emitente.nome,
        remetenteCnpj: p.emitente.cnpj,
        cidadeColeta: p.emitente.cidade,
        ufColeta: p.emitente.uf,
        destinatario: p.destinatario.nome,
        destinatarioCnpj: p.destinatario.cnpj,
        cidadeEntrega: p.destinatario.cidade,
        ufEntrega: p.destinatario.uf,
        peso: p.pesoBruto,
        volumes: p.volumes,
        valorNF: p.valorTotal,
        valorFrete,
        origemValor,
        refValor,
        transportType: "",
        stage: valorFrete > 0 ? "valorizada" : "aguarda_vinculacao",
        costs: { execMode: "" },
        latDestino: coords?.[0],
        lngDestino: coords?.[1],
        timeline: [
          {
            quando: new Date().toISOString(),
            autor,
            tipo: "sistema",
            texto: `NF-e ${p.numero} importada · ${valorFrete > 0 ? `valorizada por ${origemValor} (${refValor})` : "sem match de tabela — aguarda vinculação"}`,
          },
        ],
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };
      orders.add(order);
      ok++;
    }
    return { ok, fail, dup, corrigidas: [...new Set(corrigidas)] };
  }

  // ----------------------------------------------------
  // Upload CT-e
  // ----------------------------------------------------
  async function importCTe(files: FileList) {
    const texts: string[] = [];
    for (const f of Array.from(files)) texts.push(await readFileText(f));
    const r = importCTeTexts(texts);
    alert(`✓ ${r.ok} CT-e(s) vinculado(s) a ordens${r.dup ? ` · ${r.dup} já vinculado(s)` : ""}`);
    if (cteInput.current) cteInput.current.value = "";
  }

  function importCTeTexts(texts: string[]) {
    let ok = 0, dup = 0;
    const ctesExistentes = new Set(orders.list.map((o) => o.cteChave).filter(Boolean));
    for (const text of texts) {
      const p = parseCTe(text);
      if (!p) continue;
      if (p.chave && ctesExistentes.has(p.chave)) { dup++; continue; }
      ctesExistentes.add(p.chave);

      // Casa por chave da NF-e referenciada
      const order = orders.list.find((o) =>
        (p.chaveNFeReferenciada && o.chaveNFe === p.chaveNFeReferenciada) ||
        (o.stage === "aguardando_cte" || o.stage === "coletado"),
      );
      if (!order) continue;

      const diff = order.valorFrete > 0 ? ((p.valorTotal - order.valorFrete) / order.valorFrete) * 100 : 0;
      const stage: OrderStage = Math.abs(diff) > cfg.toleranciaDivergenciaPercent ? "cte_divergente" : "cte_ok";

      orders.update(order.id, {
        cteChave: p.chave,
        cteNumero: p.numero,
        cteValor: p.valorTotal,
        divergenciaPercent: diff,
        stage,
        atualizadoEm: new Date().toISOString(),
        timeline: [
          ...order.timeline,
          {
            quando: new Date().toISOString(),
            autor,
            tipo: "sistema",
            texto: `CT-e ${p.numero} vinculado · ${fmtBRL(p.valorTotal)} · divergência ${diff.toFixed(2)}% ${stage === "cte_divergente" ? "(FORA da tolerância)" : "(dentro da tolerância)"}`,
          },
        ],
      });

      // Emite fatura (mock)
      invoices.add({
        numero: `CTe ${p.numero}`,
        clienteNome: order.clienteNome,
        emissao: new Date().toLocaleDateString("pt-BR"),
        vencimento: new Date(Date.now() + 30 * 86400_000).toLocaleDateString("pt-BR"),
        valor: p.valorTotal,
        status: "aberta",
        tipo: "CTe",
      });
      ok++;
    }
    return { ok, dup };
  }

  async function importFromEmail(xmls: { chave: string; tipo: "nfe" | "cte"; xml: string }[]) {
    const nfes = xmls.filter((x) => x.tipo === "nfe");
    const ctes = xmls.filter((x) => x.tipo === "cte");
    const rn = nfes.length ? await importNFeTexts(nfes.map((x) => x.xml)) : { ok: 0, fail: 0, dup: 0, corrigidas: [] };
    if (!rn) return null; // sem clientes cadastrados — mantém os XML pendentes
    const rc = ctes.length ? importCTeTexts(ctes.map((x) => x.xml)) : { ok: 0, dup: 0 };
    return { nfe: rn.ok, cte: rc.ok, dup: rn.dup + rc.dup, fail: rn.fail, chaves: xmls.map((x) => x.chave) };
  }

  function ordensExportData(): [string, string[], (string | number)[][]] {
    const headers = [
      "Ordem", "Cliente", "NF-e", "Remetente", "Origem", "Destino",
      "Valor NF (R$)", "Valor Ordem (R$)", "Valor CT-e (R$)", "Divergência (%)",
      "Estágio", "Peso (kg)", "Volumes",
    ];
    const rows = filtered.map((o) => [
      o.id, o.clienteNome, o.numeroNFe, o.remetente,
      `${o.cidadeColeta}/${o.ufColeta}`, `${o.cidadeEntrega}/${o.ufEntrega}`,
      o.valorNF, o.valorFrete, o.cteValor ?? "", o.divergenciaPercent ?? "",
      stageLabel(o.stage), o.peso, o.volumes,
    ]);
    return ["Ordens de Coleta", headers, rows];
  }
  function exportOrdensExcel() {
    const [, headers, rows] = ordensExportData();
    exportCsv(`coletas-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }
  function exportOrdensPdf() {
    const [titulo, headers, rows] = ordensExportData();
    printReport(titulo, `${filtered.length} ordem(ns) · gerado em ${new Date().toLocaleString("pt-BR")}`, headers, rows);
  }

  const sel = selected ? orders.list.find((o) => o.id === selected) : null;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 2</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Coletas & Ordens</h1>
            <p className="text-sm text-muted-foreground mt-1">NF-e → Ordem de Coleta → CT-e → Ordem de Transporte · tolerância ±{cfg.toleranciaDivergenciaPercent}%</p>
          </div>
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-3 py-2 text-sm hover:bg-primary/20 cursor-pointer">
              <FileUp className="h-4 w-4" /> Importar XML NF-e
              <input ref={nfeInput} type="file" multiple accept=".xml" className="hidden" onChange={(e) => e.target.files && importNFe(e.target.files)} />
            </label>
            <label className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 text-accent px-3 py-2 text-sm hover:bg-accent/20 cursor-pointer">
              <FileCheck2 className="h-4 w-4" /> Importar XML CT-e
              <input ref={cteInput} type="file" multiple accept=".xml" className="hidden" onChange={(e) => e.target.files && importCTe(e.target.files)} />
            </label>
          </div>
        </div>

        <ColetasTriage
          orders={orders.list}
          onImportEmail={importFromEmail}
          onSelect={setSelected}
          onEmitirSugerido={(o) => {
            setSelected(o.id);
            orders.update(o.id, {
              stage: "aguardando_cte",
              timeline: [...o.timeline, { quando: new Date().toISOString(), autor, tipo: "sistema", texto: `Emissão de CT-e solicitada no valor sugerido ${fmtBRL(o.valorFrete)} (${o.origemValor})` }],
              atualizadoEm: new Date().toISOString(),
            });
          }}
        />

        {/* Pipeline */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-11 gap-1.5">
          {ORDER_STAGES.map((s, i) => {
            const count = porStage[s.id] ?? 0;
            const active = filtro === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setFiltro(active ? "todos" : s.id)}
                className={`panel p-2.5 text-left relative transition-colors ${active ? "border-primary/60 bg-primary/5" : "hover:border-border/70"}`}
              >
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  {i + 1}. {i < 5 ? <Package className="h-2.5 w-2.5" /> : i < 8 ? <FileCheck2 className="h-2.5 w-2.5" /> : <Truck className="h-2.5 w-2.5" />}
                </div>
                <div className="text-[11px] mt-0.5 leading-tight">{s.label}</div>
                <div className={`num text-xl mt-1 ${s.id === "cte_divergente" || s.id === "ocorrencia" ? "text-danger" : "text-primary"}`}>{count}</div>
              </button>
            );
          })}
        </div>
        {filtro !== "todos" && (
          <button onClick={() => setFiltro("todos")} className="text-xs text-primary hover:underline">
            ← ver todos os estágios
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por ordem, cliente, NF-e ou rota" className="input pl-7 text-sm" />
          </div>
          <button onClick={exportOrdensExcel} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportOrdensPdf} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated">
            <Printer className="h-4 w-4" /> PDF
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lista */}
          <div className={`panel overflow-x-auto ${sel ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Ordem</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-left font-normal">Rota</th>
                  <th className="text-right font-normal">Ordem</th>
                  <th className="text-right font-normal">CT-e</th>
                  <th className="text-left font-normal">Estágio</th>
                  <th className="text-right font-normal pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className={`border-t border-border hover:bg-elevated/50 cursor-pointer ${sel?.id === o.id ? "bg-elevated/60" : ""}`} onClick={() => setSelected(o.id)}>
                    <td className="px-4 py-3 num text-primary text-xs">{o.id.slice(0, 12)}</td>
                    <td className="text-xs">
                      <div className="font-medium">{o.clienteNome}</div>
                      <div className="num text-muted-foreground">NF {o.numeroNFe}</div>
                    </td>
                    <td className="text-xs">{o.cidadeColeta}/{o.ufColeta} → {o.cidadeEntrega}/{o.ufEntrega}</td>
                    <td className="text-right num text-xs">
                      <div>{fmtBRL(o.valorFrete)}</div>
                      <div className="text-[9px] text-muted-foreground">{o.origemValor || "—"}</div>
                    </td>
                    <td className="text-right num text-xs">
                      {o.cteValor ? (
                        <div>
                          <div>{fmtBRL(o.cteValor)}</div>
                          {o.divergenciaPercent != null && (
                            <DivergenceBadge percent={o.divergenciaPercent} tolerancia={cfg.toleranciaDivergenciaPercent} />
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td>
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(o.stage))}`}>
                        {stageLabel(o.stage)}
                      </span>
                    </td>
                    <td className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <RecordActions
                        statusOptions={ORDER_STAGES.map((s) => ({ id: s.id, label: s.label }))}
                        currentStatus={o.stage}
                        onChangeStatus={(next, entry) => {
                          orders.update(o.id, { stage: next as OrderStage, timeline: [...o.timeline, entry], atualizadoEm: new Date().toISOString() });
                        }}
                        onAddEntry={(entry) => orders.update(o.id, { timeline: [...o.timeline, entry], atualizadoEm: new Date().toISOString() })}
                      />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    Nenhuma ordem. Importe um XML de NF-e para começar.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {sel && (
            <OrderDetail
              order={sel}
              onClose={() => setSelected(null)}
              onUpdate={(patch) => orders.update(sel.id, { ...patch, atualizadoEm: new Date().toISOString() })}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function OrderDetail({ order, onClose, onUpdate }: {
  order: Order;
  onClose: () => void;
  onUpdate: (patch: Partial<Order>) => void;
}) {
  const [cfg] = useConfig();
  const tables = useFreightTables();
  const quotes = useQuotations();

  // Sugestões de match manual quando aguarda vinculação
  const suggestions = order.stage === "aguarda_vinculacao" ? tables.list.filter(
    (t) => t.clienteId === order.clienteId && t.ativa,
  ) : [];

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Ordem</div>
          <div className="font-display text-lg num text-primary">{order.id}</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">fechar</button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Info label="Cliente" v={order.clienteNome} />
        <Info label="Peso" v={`${order.peso} kg · ${order.volumes} vol.`} />
        <Info label="NF-e" v={`${order.numeroNFe}`} />
        <Info label="Valor NF" v={fmtBRL(order.valorNF)} />
        <Info label="Coleta" v={`${order.cidadeColeta}/${order.ufColeta}`} />
        <Info label="Entrega" v={`${order.cidadeEntrega}/${order.ufEntrega}`} />
      </div>

      {order.stage === "aguarda_vinculacao" && (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-3">
          <div className="flex items-center gap-2 text-accent text-sm font-medium">
            <AlertTriangle className="h-4 w-4" /> Aguarda vinculação de valor
          </div>
          <p className="text-xs text-muted-foreground mt-1">Sem tabela ou cotação aprovada para {order.cidadeColeta}/{order.ufColeta} → {order.cidadeEntrega}/{order.ufEntrega}.</p>
          {suggestions.length > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Vincular manualmente:</div>
              {suggestions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onUpdate({
                    valorFrete: t.modalidade === "lotacao" ? (t.valorLotacao ?? 0) : 0,
                    origemValor: "manual",
                    refValor: t.id,
                    stage: "valorizada",
                    timeline: [...order.timeline, {
                      quando: new Date().toISOString(),
                      autor: "sistema",
                      tipo: "sistema",
                      texto: `Vinculada manualmente à tabela ${t.nome}`,
                    }],
                  })}
                  className="w-full text-left text-xs px-2 py-1.5 rounded border border-border hover:bg-elevated flex items-center gap-2"
                >
                  <Link2 className="h-3 w-3" /> {t.nome}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-2">
              <Link to="/clientes" className="text-primary hover:underline">Cadastre uma tabela</Link> para este cliente.
            </div>
          )}
          <div className="mt-2">
            <button
              onClick={() => {
                const v = Number(prompt("Valor manual do frete (R$):") ?? 0);
                if (v > 0) onUpdate({
                  valorFrete: v,
                  origemValor: "manual",
                  stage: "valorizada",
                  timeline: [...order.timeline, {
                    quando: new Date().toISOString(), autor: "sistema", tipo: "sistema",
                    texto: `Valor manual definido: ${fmtBRL(v)}`,
                  }],
                });
              }}
              className="text-xs text-primary hover:underline"
            >… ou definir valor manual</button>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Valor da ordem</div>
        <div className="num text-2xl">{fmtBRL(order.valorFrete)}</div>
        <div className="text-[10px] text-muted-foreground">origem: {order.origemValor || "—"} {order.refValor ? `· ${order.refValor}` : ""}</div>
      </div>

      {order.cteValor != null && (
        <div className="rounded-md border border-border p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Conferência CT-e</div>
          <div className="flex justify-between text-xs"><span>Ordem</span><span className="num">{fmtBRL(order.valorFrete)}</span></div>
          <div className="flex justify-between text-xs"><span>CT-e</span><span className="num">{fmtBRL(order.cteValor)}</span></div>
          <div className="flex justify-between text-xs pt-1 border-t border-border mt-1">
            <span>Divergência</span>
            <DivergenceBadge percent={order.divergenciaPercent ?? 0} tolerancia={cfg.toleranciaDivergenciaPercent} />
          </div>
        </div>
      )}

      {(order.stage === "cte_ok" || order.stage === "cte_divergente") && !order.transportType && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tipo de transporte</div>
          <div className="flex gap-2">
            <button onClick={() => onUpdate({ transportType: "middle", stage: "em_viagem" })} className="flex-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-elevated"><ArrowRight className="h-3 w-3 inline" /> Middle Mile</button>
            <button onClick={() => onUpdate({ transportType: "last", stage: "em_viagem" })} className="flex-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-elevated"><Truck className="h-3 w-3 inline" /> Last Mile</button>
          </div>
        </div>
      )}

      <Link to="/monitoramento" className="text-xs text-primary hover:underline">Ver rastreamento e custos completos →</Link>
    </div>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{v}</div>
    </div>
  );
}
