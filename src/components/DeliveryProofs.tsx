import { useEffect, useRef, useState } from "react";
import { Paperclip, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Proof = { id: string; nf_id: string; file_name: string; file_path: string; created_at: string };
const MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function DeliveryProofs({ nfId, numero }: { nfId: string; numero: string }) {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function load() {
    const { data, error } = await supabase.from("tms_delivery_proofs").select("id,nf_id,file_name,file_path,created_at").eq("nf_id", nfId).order("created_at", { ascending: false });
    if (error) throw new Error("Falha ao consultar comprovantes. Tente novamente.");
    setProofs(data ?? []);
  }
  useEffect(() => { void load().catch((e) => setMessage(e.message)); }, [nfId]);
  async function attach(file?: File) {
    if (!file || busy) return;
    if (!MIME_TYPES.includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setMessage("Selecione um PDF, JPG, PNG ou WebP de até 5 MB."); return;
    }
    setBusy(true); setMessage("");
    const id = crypto.randomUUID(), path = `${nfId}/${id}`;
    let uploaded = false, linked = false;
    try {
      const up = await supabase.storage.from("comprovantes-entrega").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw new Error(`Falha ao anexar: ${up.error.message}`);
      uploaded = true;
      const { data, error } = await supabase.from("tms_delivery_proofs").insert({ id, nf_id: nfId, file_name: file.name, file_path: path, content_type: file.type, file_size: file.size }).select("id,nf_id,file_name,file_path,created_at").single();
      if (error || !data) throw new Error("Não foi possível confirmar o vínculo com a NF. Tente novamente.");
      linked = true;
      setProofs((prev) => [data, ...prev]); setMessage("Comprovante vinculado à NF.");
    } catch (e) {
      // Never delete a confirmed attachment; orphan-only DELETE policy protects uncertain results.
      if (uploaded && !linked) await supabase.storage.from("comprovantes-entrega").remove([path]);
      setMessage(e instanceof Error ? e.message : "Falha ao anexar comprovante.");
    } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function open(proof: Proof) {
    setMessage("");
    const { data, error } = await supabase.storage.from("comprovantes-entrega").createSignedUrl(proof.file_path, 300);
    if (error || !data) { setMessage("Não foi possível abrir o comprovante."); return; }
    const link = document.createElement("a"); link.href = data.signedUrl; link.target = "_blank"; link.rel = "noopener noreferrer"; link.click();
  }
  return <div className="space-y-2">
    <input ref={input} type="file" className="hidden" aria-label={`Arquivo de comprovante NF ${numero}`} accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => void attach(e.target.files?.[0])} />
    <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}><Paperclip />{busy ? "Anexando…" : `Comprovante · NF ${numero}`}</Button>
    {proofs.map((p) => <Button key={p.id} size="sm" variant="ghost" className="w-full justify-start h-auto whitespace-normal text-left" onClick={() => void open(p)}><ExternalLink /><span className="min-w-0 break-all">{p.file_name}<span className="block text-muted-foreground text-[10px]">{new Date(p.created_at).toLocaleString("pt-BR")}</span></span></Button>)}
    {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </div>;
}