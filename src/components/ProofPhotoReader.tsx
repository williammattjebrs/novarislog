// Leitura em lote de fotos de comprovantes: IA identifica a NF; anexa sozinho só quando há uma única NF segura.
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lerComprovanteFoto } from "@/lib/proof-reader.functions";
import type { Order } from "@/lib/mock-data";

type Item = { id: string; file: File; preview: string; status: "lendo" | "anexado" | "conferir" | "erro"; motivo?: string; lido?: string; nfId?: string; escolha?: string };
const MAX = 5 * 1024 * 1024;

const toBase64 = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = () => rej(new Error("Falha ao ler a foto.")); r.readAsDataURL(f); });

export async function anexarComprovante(nfId: string, file: File) {
  const id = crypto.randomUUID(), path = `${nfId}/${id}`;
  const up = await supabase.storage.from("comprovantes-entrega").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error(`Falha ao anexar: ${up.error.message}`);
  const { error } = await supabase.from("tms_delivery_proofs").insert({ id, nf_id: nfId, file_name: `IA · ${file.name}`, file_path: path, content_type: file.type, file_size: file.size });
  if (error) { await supabase.storage.from("comprovantes-entrega").remove([path]); throw new Error("Não foi possível vincular à NF (a NF precisa estar em OC emitida)."); }
}

/** nfs: somente NFs de OCs emitidas visíveis no Monitoramento. */
export function ProofPhotoReader({ nfs }: { nfs: Order[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const ler = useServerFn(lerComprovanteFoto);
  const upd = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const num = (s: string) => s.replace(/\D/g, "").replace(/^0+/, "");

  async function processar(it: Item) {
    try {
      const r = await ler({ data: { mime: it.file.type as "image/jpeg", base64: await toBase64(it.file) } });
      const porChave = nfs.filter((n) => n.chaveNFe && r.chaves.includes(n.chaveNFe.replace(/\D/g, "")));
      const achadas = porChave.length ? porChave : nfs.filter((n) => r.numerosNf.includes(num(n.numeroNFe)));
      const lido = [...r.numerosNf.map((n) => `NF ${n}`), ...r.chaves.map((c) => `chave …${c.slice(-6)}`)].join(", ") || "nada legível";
      if (achadas.length === 1 && r.confianca !== "baixa") {
        await anexarComprovante(achadas[0].id, it.file);
        upd(it.id, { status: "anexado", lido, nfId: achadas[0].id });
      } else {
        const motivo = !r.numerosNf.length && !r.chaves.length ? "NF não identificada na foto" : achadas.length > 1 ? "mais de uma NF possível" : achadas.length === 0 ? "NF lida não está em OC emitida" : "leitura duvidosa";
        upd(it.id, { status: "conferir", lido, motivo, escolha: achadas[0]?.id });
      }
    } catch (e) { upd(it.id, { status: "conferir", motivo: e instanceof Error ? e.message : "Falha na leitura" }); }
  }
  function adicionar(files: FileList | null) {
    const novos: Item[] = [];
    for (const f of Array.from(files ?? [])) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > MAX) { novos.push({ id: crypto.randomUUID(), file: f, preview: "", status: "erro", motivo: "Use foto JPG, PNG ou WebP de até 5 MB" }); continue; }
      novos.push({ id: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f), status: "lendo" });
    }
    setItems((xs) => [...novos, ...xs]);
    // Sequencial para não estourar o limite de leituras simultâneas.
    void (async () => { for (const it of novos) if (it.status === "lendo") await processar(it); })();
    if (input.current) input.current.value = "";
  }
  async function confirmar(it: Item) {
    if (!it.escolha) return;
    try { await anexarComprovante(it.escolha, it.file); upd(it.id, { status: "anexado", nfId: it.escolha }); }
    catch (e) { upd(it.id, { motivo: e instanceof Error ? e.message : "Falha ao anexar" }); }
  }
  const nfLabel = (id?: string) => { const n = nfs.find((x) => x.id === id); return n ? `NF ${n.numeroNFe} · ${n.destinatario}` : ""; };
  const pend = items.filter((i) => i.status === "conferir").length;

  return <div className="panel p-4 space-y-3">
    <div className="flex items-center gap-2 flex-wrap">
      <h3 className="font-display">Comprovantes por foto</h3>
      <span className="text-xs text-muted-foreground">Envie várias fotos de canhotos; o sistema lê a NF e anexa sozinho quando tem certeza.</span>
      {pend > 0 && <span className="text-xs px-2 py-0.5 rounded border border-warning/50 text-warning">{pend} a conferir</span>}
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Fotos de comprovantes" onChange={(e) => adicionar(e.target.files)} />
      <Button size="sm" className="ml-auto" onClick={() => input.current?.click()}><Camera className="h-3 w-3" /> Enviar fotos</Button>
    </div>
    {items.length > 0 && <ul className="space-y-2">
      {items.map((it) => <li key={it.id} className="flex items-center gap-3 border border-border rounded p-2 text-xs">
        {it.preview ? <img src={it.preview} alt="" className="h-12 w-12 object-cover rounded" /> : <div className="h-12 w-12 rounded bg-muted" />}
        <div className="min-w-0 flex-1">
          <div className="truncate">{it.file.name}{it.lido && <span className="text-muted-foreground"> · lido: {it.lido}</span>}</div>
          {it.status === "lendo" && <div className="text-muted-foreground">Lendo a foto…</div>}
          {it.status === "anexado" && <div className="text-success flex items-center gap-1"><Check className="h-3 w-3" /> Anexado em {nfLabel(it.nfId)}</div>}
          {it.status === "erro" && <div className="text-destructive">{it.motivo}</div>}
          {it.status === "conferir" && <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-warning">A conferir: {it.motivo}</span>
            <select className="bg-background border border-border rounded px-1 py-0.5 max-w-64" value={it.escolha ?? ""} onChange={(e) => upd(it.id, { escolha: e.target.value })}>
              <option value="">Escolha a NF…</option>
              {nfs.map((n) => <option key={n.id} value={n.id}>NF {n.numeroNFe} · {n.destinatario}</option>)}
            </select>
            <Button size="sm" variant="outline" disabled={!it.escolha} onClick={() => void confirmar(it)}>Anexar</Button>
            <button aria-label="Descartar" onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))}><X className="h-3 w-3" /></button>
          </div>}
        </div>
      </li>)}
    </ul>}
  </div>;
}
