// Empresas do grupo: emissoras das OCs e da documentação (nome, contatos, logo).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { useEmpresas, newId } from "@/lib/mock-store";
import { commitLists, getList } from "@/lib/shared-db";
import type { Empresa } from "@/lib/mock-data";

export const Route = createFileRoute("/empresas")({
  head: () => ({ meta: [
    { title: "Empresas do grupo | Novaris TMS" },
    { name: "description", content: "Cadastro das empresas do grupo que emitem ordens de coleta e documentos." },
    { property: "og:title", content: "Empresas do grupo | Novaris TMS" },
    { property: "og:description", content: "Nome, endereço, contatos e logo de cada empresa emissora." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RoleGate path="/empresas"><AppShell><Page /></AppShell></RoleGate>,
});

const inp = "w-full bg-input/40 border border-border rounded px-2 py-1.5 text-sm";
const vazio = (): Empresa => ({ id: "", nome: "", razaoSocial: "", cnpj: "", endereco: "", cidade: "", uf: "", telefone: "", email: "", site: "", logoDataUrl: "", ativa: true, criadoEm: "" });

/** Reduz o logo para no máximo 360px e grava como PNG embutido (vai no PDF e na tela). */
async function lerLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = url; });
    const sc = Math.min(1, 360 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}

function Page() {
  const empresas = useEmpresas();
  const [f, setF] = useState<Empresa | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function salvar() {
    if (!f) return;
    if (!f.nome.trim()) return setMsg("Informe o nome da empresa.");
    setBusy(true); setMsg("");
    try {
      const atual = getList<Empresa>("companies") ?? [];
      const reg: Empresa = { ...f, id: f.id || newId("EMP"), criadoEm: f.criadoEm || new Date().toISOString() };
      await commitLists({ companies: f.id ? atual.map((e) => (e.id === f.id ? reg : e)) : [reg, ...atual] }, `Empresa ${reg.nome} ${f.id ? "atualizada" : "cadastrada"}`);
      setF(null); setMsg("Empresa salva.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Falha ao salvar."); }
    finally { setBusy(false); }
  }
  const set = (k: keyof Empresa) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f!, [k]: e.target.value });
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div><h1 className="text-2xl font-display">Empresas do grupo</h1><p className="text-sm text-muted-foreground">Cada OC é emitida por uma destas empresas: o PDF e os e-mails usam o nome, logo e contatos dela.</p></div>
        <Button className="ml-auto" onClick={() => setF(vazio())}><Plus className="h-4 w-4" /> Nova empresa</Button>
      </div>
      {msg && <div role="status" className="text-sm">{msg}</div>}
      {f && <div className="panel p-4 space-y-3">
        <div className="flex items-center"><h2 className="font-display">{f.id ? `Editar ${f.nome}` : "Nova empresa"}</h2><button className="ml-auto" aria-label="Fechar" onClick={() => setF(null)}><X className="h-4 w-4" /></button></div>
        <div className="grid md:grid-cols-3 gap-2">
          <input aria-label="Nome" className={inp} placeholder="Nome fantasia *" value={f.nome} onChange={set("nome")} />
          <input aria-label="Razão social" className={inp} placeholder="Razão social" value={f.razaoSocial} onChange={set("razaoSocial")} />
          <input aria-label="CNPJ" className={inp} placeholder="CNPJ" value={f.cnpj} onChange={set("cnpj")} />
          <input aria-label="Endereço" className={inp + " md:col-span-2"} placeholder="Endereço completo" value={f.endereco} onChange={set("endereco")} />
          <div className="flex gap-2"><input aria-label="Cidade" className={inp} placeholder="Cidade" value={f.cidade} onChange={set("cidade")} /><input aria-label="UF" className={inp + " w-16"} placeholder="UF" maxLength={2} value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value.toUpperCase() })} /></div>
          <input aria-label="Telefone" className={inp} placeholder="Telefone" value={f.telefone} onChange={set("telefone")} />
          <input aria-label="E-mail" className={inp} placeholder="E-mail" value={f.email} onChange={set("email")} />
          <input aria-label="Site" className={inp} placeholder="Site" value={f.site} onChange={set("site")} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {f.logoDataUrl ? <img src={f.logoDataUrl} alt={`Logo ${f.nome}`} className="h-14 max-w-40 object-contain bg-foreground/90 rounded p-1" /> : <div className="h-14 w-28 grid place-items-center border border-dashed border-border rounded text-xs text-muted-foreground">sem logo</div>}
          <label className="text-sm text-primary cursor-pointer">Enviar logo (PNG ou JPG)<input type="file" accept="image/png,image/jpeg" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setF({ ...f, logoDataUrl: await lerLogo(file) }); }} /></label>
          {f.logoDataUrl && <button className="text-xs text-danger" onClick={() => setF({ ...f, logoDataUrl: "" })}>remover logo</button>}
          <label className="text-sm flex items-center gap-1 ml-auto"><input type="checkbox" checked={f.ativa} onChange={(e) => setF({ ...f, ativa: e.target.checked })} /> ativa</label>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setF(null)}>Cancelar</Button><Button disabled={busy} onClick={salvar}>{busy ? "Gravando…" : "Salvar"}</Button></div>
      </div>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {empresas.list.map((e) => (
          <button key={e.id} onClick={() => setF({ ...vazio(), ...e })} className="panel p-4 text-left hover:border-primary/50 flex gap-3 items-start">
            {e.logoDataUrl ? <img src={e.logoDataUrl} alt={`Logo ${e.nome}`} className="h-12 w-20 object-contain bg-foreground/90 rounded p-1" /> : <Building2 className="h-10 w-10 text-muted-foreground" />}
            <div className="min-w-0 text-sm">
              <div className="font-display">{e.nome} {!e.ativa && <span className="text-xs text-warning">· inativa</span>}</div>
              <div className="text-xs text-muted-foreground">{e.cnpj}</div>
              <div className="text-xs text-muted-foreground truncate">{[e.endereco, e.cidade && `${e.cidade}/${e.uf}`].filter(Boolean).join(" · ")}</div>
              <div className="text-xs text-muted-foreground">{[e.telefone, e.email].filter(Boolean).join(" · ")}</div>
            </div>
          </button>
        ))}
        {!empresas.list.length && <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada. Cadastre ao menos uma para emitir OCs.</p>}
      </div>
    </div>
  );
}
