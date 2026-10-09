// Criação de OC rascunho a partir de NFs selecionadas em Rotas. Um local de coleta e um de descarga.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClients, useLocais, newId } from "@/lib/mock-store";
import { commitLists, getList } from "@/lib/shared-db";
import { novaOcRascunho, ocAtivaDaNf } from "@/lib/oc-model";
import { useAuth } from "@/lib/auth";
import type { OrdemColeta, Order } from "@/lib/mock-data";

const inp = "w-full bg-input/40 border border-border rounded px-2 py-1.5 text-sm";
export const numeroOc = () => { const d = new Date(); return `OC-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; };

export function LocalSelect({ value, onChange, clienteId, label }: { value: string; onChange: (id: string) => void; clienteId?: string; label: string }) {
  const locais = useLocais();
  const ativos = locais.list;
  const sorted = [...ativos].sort((a, b) => Number(b.clienteIds.includes(clienteId ?? "")) - Number(a.clienteIds.includes(clienteId ?? "")) || a.nome.localeCompare(b.nome));
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ nome: "", endereco: "", cidade: "", uf: "", emails: "" });
  const [err, setErr] = useState("");
  async function salvar() {
    if (!f.nome.trim() || !f.cidade.trim() || !f.uf.trim()) return setErr("Nome, cidade e UF são obrigatórios.");
    const emails = f.emails.split(/[;,\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/.test(e));
    const existente = locais.list.find((x) => x.nome.trim().toLowerCase() === f.nome.trim().toLowerCase() && x.cidade.trim().toLowerCase() === f.cidade.trim().toLowerCase());
    if (existente) { onChange(existente.id); setNovo(false); setErr(""); return; }
    const id = newId("LOC");
    try { await locais.add({ id, nome: f.nome.trim(), endereco: f.endereco.trim(), cidade: f.cidade.trim(), uf: f.uf.trim().toUpperCase().slice(0, 2), emails, contatos: "", clienteIds: clienteId ? [clienteId] : [], ativo: true, criadoEm: new Date().toISOString() }); }
    catch (e) { setErr(e instanceof Error ? e.message : "Falha ao salvar local."); return; }
    onChange(id); setNovo(false); setF({ nome: "", endereco: "", cidade: "", uf: "", emails: "" }); setErr("");
  }
  if (novo) return (
    <div className="space-y-1 border border-primary/40 rounded p-2">
      <div className="text-xs font-semibold text-primary">Novo local</div>
      <input className={inp} placeholder="Nome do local (ex.: ALILOG)" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <input className={inp} placeholder="Endereço" value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} />
      <div className="flex gap-1">
        <input className={inp} placeholder="Cidade" value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} />
        <input className={`${inp} max-w-[70px]`} placeholder="UF" maxLength={2} value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value.toUpperCase() })} />
      </div>
      <input className={inp} placeholder="E-mails do local (separados por vírgula)" value={f.emails} onChange={(e) => setF({ ...f, emails: e.target.value })} />
      {err && <div className="text-xs text-danger">{err}</div>}
      <div className="flex gap-1"><Button size="sm" onClick={salvar}>Salvar e vincular</Button><Button size="sm" variant="outline" onClick={() => setNovo(false)}>Voltar</Button></div>
    </div>
  );
  return (
    <select aria-label={label} className={inp} value={value} onChange={(e) => e.target.value === "__novo__" ? setNovo(true) : onChange(e.target.value)}>
      <option value="">{label}…</option>
      {sorted.map((l) => <option key={l.id} value={l.id}>{l.nome} · {l.cidade}/{l.uf}{l.emails.length ? "" : " · sem e-mail"}</option>)}
      <option value="__novo__">+ Cadastrar novo local…</option>
    </select>
  );
}

export function CriarOcPanel({ nfs, onClose }: { nfs: Order[]; onClose: (ok?: boolean) => void }) {
  const clients = useClients(); const locais = useLocais(); const { user } = useAuth(); const navigate = useNavigate();
  const n0 = nfs[0];
  const [f, setF] = useState({ clienteColetaId: n0?.clienteId ?? "", clienteColetaNome: n0?.clienteNome.replace(/^\(sem cliente\)\s*/, "") ?? "", localColetaId: "", clienteDescargaNome: n0?.destinatario ?? "", localDescargaId: "", contratanteNome: n0?.clienteNome.replace(/^\(sem cliente\)\s*/, "") ?? "" });
  const [fretes, setFretes] = useState<Record<string, string>>({});
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const pares = new Set(nfs.map((n) => `${n.remetente} → ${n.destinatario}`));
  async function criar() {
    if (!nfs.length) return setErr("Selecione NFs.");
    const ocupadas = nfs.filter((n) => ocAtivaDaNf(getList<OrdemColeta>("ordensColeta") ?? [], n.id));
    if (ocupadas.length) return setErr(`NF já em OC ativa: ${ocupadas.map((n) => n.numeroNFe).join(", ")}`);
    if (!f.clienteColetaNome.trim() || !f.clienteDescargaNome.trim()) return setErr("Informe cliente da coleta e cliente da descarga.");
    const id = newId("OC");
    const oc = novaOcRascunho(nfs, { id, numero: numeroOc(), autor: user?.nome ?? "usuário", ...f, clienteColetaId: f.clienteColetaId || undefined, localColetaId: f.localColetaId || undefined, localDescargaId: f.localDescargaId || undefined, locais: locais.list });
    const now = new Date().toISOString();
    const manuais = nfs.filter((n) => !(n.valorFrete > 0) && Number(String(fretes[n.id] ?? "").replace(",", ".")) > 0);
    const orders = manuais.length ? (getList<Order>("orders") ?? []).map((o) => { const m = manuais.find((x) => x.id === o.id); if (!m) return o; const v = Number(String(fretes[o.id]).replace(",", ".")); return { ...o, valorFrete: v, origemValor: "manual" as const, stage: o.stage === "aguarda_vinculacao" ? "valorizada" as const : o.stage, atualizadoEm: now, timeline: [...o.timeline, { quando: now, autor: user?.nome ?? "usuário", tipo: "sistema" as const, texto: `Frete informado manualmente na criação da OC: R$ ${v.toFixed(2)}` }] }; }) : undefined;
    setBusy(true);
    try {
      await commitLists({ ordensColeta: [oc, ...(getList<OrdemColeta>("ordensColeta") ?? [])], ...(orders ? { orders } : {}) }, `Rascunho ${oc.numero} criado em Rotas`);
      onClose(true);
      void navigate({ to: "/ordens-coleta", search: { registro: id } });
    } catch (e) { setErr(e instanceof Error ? e.message : "Falha ao criar OC."); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 bg-background/80 grid place-items-center p-4" role="dialog" aria-label="Criar ordem de coleta">
      <div className="panel p-5 w-full max-w-2xl max-h-[90vh] overflow-auto space-y-3">
        <div className="flex items-center"><h2 className="font-display text-lg">Nova OC (rascunho) · {nfs.length} NF</h2><button className="ml-auto" aria-label="Fechar" onClick={() => onClose()}><X className="h-4 w-4" /></button></div>
        <div className="text-xs text-muted-foreground">NFs: {nfs.map((n) => n.numeroNFe).join(", ")} · {nfs.reduce((s, n) => s + (n.peso || 0), 0).toLocaleString("pt-BR")} kg</div>
        {pares.size > 1 && <div className="text-xs text-warning">Atenção: NFs com remetentes/destinatários diferentes. A OC terá um único local de coleta e um único local de descarga.</div>}
        <div className="grid md:grid-cols-2 gap-3">
          <fieldset className="space-y-2"><legend className="text-xs font-semibold text-primary">Coleta</legend>
            <select aria-label="Cliente da coleta" className={inp} value={f.clienteColetaId} onChange={(e) => { const c = clients.list.find((x) => x.id === e.target.value); setF({ ...f, clienteColetaId: e.target.value, clienteColetaNome: c?.nome ?? f.clienteColetaNome }); }}>
              <option value="">Cliente cadastrado (opcional)…</option>{clients.list.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input aria-label="Nome do cliente da coleta" className={inp} placeholder="Cliente da coleta (dono da carga)" value={f.clienteColetaNome} onChange={(e) => setF({ ...f, clienteColetaNome: e.target.value })} />
            <LocalSelect label="Local da coleta" value={f.localColetaId} clienteId={f.clienteColetaId} onChange={(id) => setF({ ...f, localColetaId: id })} />
          </fieldset>
          <fieldset className="space-y-2"><legend className="text-xs font-semibold text-primary">Descarga</legend>
            <input aria-label="Cliente da descarga" className={inp} placeholder="Cliente da descarga" value={f.clienteDescargaNome} onChange={(e) => setF({ ...f, clienteDescargaNome: e.target.value })} />
            <LocalSelect label="Local da descarga" value={f.localDescargaId} onChange={(id) => setF({ ...f, localDescargaId: id })} />
          </fieldset>
        </div>
        <fieldset className="space-y-1"><legend className="text-xs font-semibold text-primary">Frete (tabela / cotação ou manual)</legend>
          {nfs.map((n) => <div key={n.id} className="flex items-center gap-2 text-xs"><span className="num w-24">NF {n.numeroNFe}</span><span className="num w-24 text-muted-foreground">{(n.peso || 0).toLocaleString("pt-BR")} kg</span><span className="num w-28 text-muted-foreground">R$ {(n.valorNF || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>{n.valorFrete > 0 ? <span className="text-success">R$ {n.valorFrete.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · {n.origemValor || "tabela"}</span> : <><span className="text-warning">sem tabela</span><input aria-label={`Frete manual NF ${n.numeroNFe}`} className={inp + " max-w-40"} placeholder="Frete R$" inputMode="decimal" value={fretes[n.id] ?? ""} onChange={(e) => setFretes({ ...fretes, [n.id]: e.target.value })} /></>}</div>)}
        </fieldset>
        <input aria-label="Contratante do frete" className={inp} placeholder="Contratante do frete" value={f.contratanteNome} onChange={(e) => setF({ ...f, contratanteNome: e.target.value })} />
        <p className="text-xs text-muted-foreground">O rascunho aparece no Monitoramento como "aguardando programação" e não envia e-mail. Motorista, veículo e horários são definidos em Ordens de coleta antes da emissão.</p>
        {err && <div className="text-xs text-danger" role="alert">{err}</div>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onClose()}>Cancelar</Button><Button disabled={busy} onClick={criar}>{busy ? "Gravando…" : "Criar rascunho"}</Button></div>
      </div>
    </div>
  );
}
