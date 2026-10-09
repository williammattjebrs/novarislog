import { useState } from "react";
import { Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrdemColeta } from "@/lib/mock-data";
import { aplicarStatusOc } from "@/lib/oc-actions";

export function MonitoringQuickNote({ oc, autor }: { oc: OrdemColeta; autor: string }) {
  const [text, setText] = useState("");
  const [type, setType] = useState<"observacao" | "ocorrencia">("observacao");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    if (!text.trim() || busy) return;
    setBusy(true); setMessage("");
    try {
      await aplicarStatusOc(oc, type === "ocorrencia" ? "ocorrencia" : oc.status, text.trim(), autor, type);
      setText(""); setMessage(type === "ocorrencia" ? "Ocorrência salva." : "Observação salva.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Falha ao salvar. Texto preservado."); }
    finally { setBusy(false); }
  }
  return <div className="min-w-64 max-w-80 space-y-2" onClick={(e) => e.stopPropagation()}>
    <textarea aria-label={`Observação rápida ${oc.numero}`} placeholder="Digite o apontamento…" className="input min-h-16 resize-y text-xs" maxLength={5000} disabled={busy} value={text} onChange={(e) => setText(e.target.value)} />
    <div className="flex gap-2">
      <select aria-label={`Tipo de apontamento ${oc.numero}`} className="input text-xs" disabled={busy} value={type} onChange={(e) => setType(e.target.value === "ocorrencia" ? "ocorrencia" : "observacao")}><option value="observacao">Observação</option><option value="ocorrencia">Ocorrência</option></select>
      <Button size="sm" variant="outline" disabled={busy || !text.trim()} onClick={() => void save()}>{type === "ocorrencia" ? <AlertTriangle /> : <Save />}{busy ? "Salvando…" : "Salvar"}</Button>
    </div>
    {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </div>;
}