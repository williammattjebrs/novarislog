// Ação rápida ao clicar numa receita ou despesa: recebido/pago (total ou parcial) ou estorno, mantendo o histórico.
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtBRL, type Expense, type Invoice } from "@/lib/mock-data";
import { addPayment, paidAmount, reversePayment, type Movement } from "@/lib/reliability";
import { useAuth } from "@/lib/auth";

type Titulo = { kind: "rec"; t: Invoice & { id?: string } } | { kind: "pag"; t: Expense };
const hoje = () => new Date().toISOString().slice(0, 10);

export function QuickBaixa({ titulo, onClose, onSave }: { titulo: Titulo; onClose: () => void; onSave: (movements: Movement[], status: string, data: string) => Promise<void> }) {
  const { user } = useAuth();
  const t = titulo.t; const rec = titulo.kind === "rec";
  const legacy = rec ? ((t as Invoice).valorRecebido ?? (t.status === "paga" && !t.movements ? t.valor : 0)) : ((t as Expense).valorPago ?? (t.status === "paga" && !t.movements ? t.valor : 0));
  const pago = paidAmount(t.movements, legacy); const saldo = Math.max(0, Math.round((t.valor - pago) * 100) / 100);
  const [modo, setModo] = useState<"total" | "parcial" | "estorno">(saldo > 0 ? "total" : "estorno");
  const [valor, setValor] = useState(String(saldo).replace(".", ","));
  const [data, setData] = useState(hoje()); const [motivo, setMotivo] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const aberto = rec ? "aberta" : "prevista";
  async function confirmar() {
    setBusy(true); setErr("");
    try {
      const autor = user?.email ?? user?.nome ?? "";
      let mov: Movement[];
      if (modo === "estorno") {
        const last = [...(t.movements ?? [])].reverse().find((m) => m.type === "baixa" && !t.movements?.some((x) => x.reverses === m.id));
        if (!last) throw new Error("Não há baixa registrada para estornar.");
        mov = reversePayment(t.movements ?? [], last.id, autor, motivo, data);
      } else {
        const v = modo === "total" ? saldo : Number(valor.replace(/\./g, "").replace(",", "."));
        mov = addPayment(t.valor, t.movements ?? [], legacy, { id: crypto.randomUUID(), type: "baixa", value: v, date: data, author: autor, reason: motivo.trim() || (rec ? "Recebimento" : "Pagamento") });
      }
      const status = paidAmount(mov, legacy) >= t.valor ? "paga" : aberto;
      await onSave(mov, status, data); onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : "Falha ao registrar."); }
    finally { setBusy(false); }
  }
  const nome = rec ? `${(t as Invoice).numero} · ${(t as Invoice).clienteNome}` : (t as Expense).descricao;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4" role="dialog" aria-label="Registrar baixa" onClick={onClose}>
      <div className="panel w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center"><h2 className="font-display">{rec ? "Receita" : "Despesa"} · {nome}</h2><button className="ml-auto" aria-label="Fechar" onClick={onClose}><X className="h-4 w-4" /></button></div>
        <div className="text-sm">Valor {fmtBRL(t.valor)} · {rec ? "recebido" : "pago"} {fmtBRL(pago)} · saldo <b>{fmtBRL(saldo)}</b></div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {(["total", "parcial", "estorno"] as const).map((m) => <button key={m} disabled={m !== "estorno" && saldo <= 0} onClick={() => setModo(m)} className={`px-2 py-2 rounded border disabled:opacity-40 ${modo === m ? "border-primary text-primary bg-primary/10" : "border-border"}`}>{m === "total" ? (rec ? "Recebido (total)" : "Pago (total)") : m === "parcial" ? "Parcial" : "Estornar / em aberto"}</button>)}
        </div>
        {modo === "parcial" && <label className="text-xs block">Valor<input aria-label="Valor da baixa" inputMode="decimal" className="input w-full" value={valor} onChange={(e) => setValor(e.target.value)} /></label>}
        <label className="text-xs block">Data<input aria-label="Data da baixa" type="date" className="input w-full" value={data} onChange={(e) => setData(e.target.value)} /></label>
        <label className="text-xs block">{modo === "estorno" ? "Motivo do estorno (obrigatório)" : "Observação"}<input aria-label="Motivo" className="input w-full" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
        {err && <div className="text-xs text-danger" role="alert">{err}</div>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={confirmar}>{busy ? "Gravando…" : "Confirmar"}</Button></div>
      </div>
    </div>
  );
}
