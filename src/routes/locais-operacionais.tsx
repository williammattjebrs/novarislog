// Cadastro de locais operacionais (armazéns/estabelecimentos físicos de coleta e descarga).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { CityPicker } from "@/components/CityPicker";
import { useClients, useLocais, newId } from "@/lib/mock-store";
import type { LocalOperacional } from "@/lib/mock-data";
import { enderecoCompleto } from "@/lib/oc-model";

export const Route = createFileRoute("/locais-operacionais")({
  head: () => ({ meta: [
    { title: "Locais operacionais | Novaris TMS" },
    { name: "description", content: "Armazéns e estabelecimentos de coleta e descarga com endereço completo, contatos e e-mails." },
    { property: "og:title", content: "Locais operacionais | Novaris TMS" },
    { property: "og:description", content: "Cadastro de locais físicos de coleta e descarga usados nas ordens de coleta." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RoleGate path="/locais-operacionais"><AppShell><Page /></AppShell></RoleGate>,
});

const inp = "w-full bg-input/40 border border-border rounded px-2 py-1.5 text-sm";
const vazio = { nome: "", endereco: "", numero: "", complemento: "", bairro: "", cep: "", cidade: "", uf: "", contatos: "", emails: "", clienteIds: [] as string[] };
const splitEmails = (s: string) => [...new Set(s.split(/[;,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))];

function Page() {
  const locais = useLocais(); const clients = useClients();
  const [edit, setEdit] = useState<string | null>(null);
  const [f, setF] = useState(vazio);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  function abrir(l?: LocalOperacional) {
    setErr(""); setEdit(l?.id ?? "__novo__");
    setF(l ? { ...vazio, ...l, numero: l.numero ?? "", complemento: l.complemento ?? "", bairro: l.bairro ?? "", cep: l.cep ?? "", contatos: l.contatos ?? "", emails: l.emails.join("; ") } : vazio);
  }
  async function salvar() {
    const emails = splitEmails(f.emails);
    if (!f.nome.trim() || !f.endereco.trim() || !f.cidade || !f.uf) return setErr("Nome, endereço, cidade e UF são obrigatórios.");
    const bad = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (bad.length) return setErr(`E-mail inválido: ${bad.join(", ")}`);
    const now = new Date().toISOString();
    const rec: LocalOperacional = { id: edit === "__novo__" ? newId("LOC") : edit!, nome: f.nome.trim(), endereco: f.endereco.trim(), numero: f.numero.trim(), complemento: f.complemento.trim(), bairro: f.bairro.trim(), cep: f.cep.trim(), cidade: f.cidade, uf: f.uf, contatos: f.contatos.trim(), emails, clienteIds: f.clienteIds, ativo: true, criadoEm: locais.list.find((l) => l.id === edit)?.criadoEm ?? now, atualizadoEm: now };
    setBusy(true);
    try { if (edit === "__novo__") await locais.add(rec); else await locais.update(rec.id, rec); setEdit(null); }
    catch (e) { setErr(e instanceof Error ? e.message : "Falha ao salvar."); }
    finally { setBusy(false); }
  }
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display">Locais operacionais</h1>
          <p className="text-sm text-muted-foreground">Armazéns e estabelecimentos físicos. O local é diferente do dono da carga e pode atender vários clientes. Alterações aqui não mudam OCs já emitidas.</p>
        </div>
        <Button className="ml-auto" onClick={() => abrir()}><Plus className="h-4 w-4" /> Novo local</Button>
      </div>
      {edit && (
        <div className="panel p-4 space-y-2">
          <div className="grid md:grid-cols-3 gap-2">
            <input className={inp} placeholder="Nome do local (ex.: ALILOG)" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
            <input className={inp + " md:col-span-2"} placeholder="Endereço (rua/rodovia)" value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} />
            <input className={inp} placeholder="Número" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} />
            <input className={inp} placeholder="Complemento" value={f.complemento} onChange={(e) => setF({ ...f, complemento: e.target.value })} />
            <input className={inp} placeholder="Bairro" value={f.bairro} onChange={(e) => setF({ ...f, bairro: e.target.value })} />
            <input className={inp} placeholder="CEP" value={f.cep} onChange={(e) => setF({ ...f, cep: e.target.value })} />
            <div className="md:col-span-2"><CityPicker value={f.cidade ? { nome: f.cidade, uf: f.uf } : null} onChange={(c) => setF({ ...f, cidade: c?.nome ?? "", uf: c?.uf ?? "" })} placeholder="Cidade (IBGE)" /></div>
            <input className={inp + " md:col-span-3"} placeholder="Contatos (nome, telefone, horário de atendimento)" value={f.contatos} onChange={(e) => setF({ ...f, contatos: e.target.value })} />
            <input className={inp + " md:col-span-3"} placeholder="E-mails que recebem a OC (separe com ;)" value={f.emails} onChange={(e) => setF({ ...f, emails: e.target.value })} />
          </div>
          <div className="text-xs text-muted-foreground">Donos de carga atendidos (opcional, ajuda a sugerir o local):</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {clients.list.map((c) => (
              <label key={c.id} className="flex items-center gap-1 border border-border rounded px-2 py-1">
                <input type="checkbox" checked={f.clienteIds.includes(c.id)} onChange={(e) => setF({ ...f, clienteIds: e.target.checked ? [...f.clienteIds, c.id] : f.clienteIds.filter((x) => x !== c.id) })} />{c.nome}
              </label>
            ))}
          </div>
          <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Ativo</label>
          {err && <div className="text-xs text-danger">{err}</div>}
          <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button disabled={busy} onClick={salvar}>{busy ? "Salvando…" : "Salvar local"}</Button></div>
        </div>
      )}
      <div className="panel overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left"><tr className="border-b border-border"><th className="p-2">Local</th><th>Endereço</th><th>Contatos</th><th>E-mails</th><th /></tr></thead>
          <tbody>
            {locais.list.map((l) => (
              <tr key={l.id} className="border-b border-border align-top">
                <td className="p-2 font-medium">{l.nome}</td><td className="text-xs">{enderecoCompleto(l)}</td><td className="text-xs">{l.contatos || "—"}</td>
                <td className="text-xs">{l.emails.length ? l.emails.join(", ") : <span className="text-warning">sem e-mail</span>}</td>
                <td className="p-2 text-right"><Button size="sm" variant="outline" onClick={() => abrir(l)}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {!locais.list.length && <tr><td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">Nenhum local cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
