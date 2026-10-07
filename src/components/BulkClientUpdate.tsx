// Envio de atualização de rastreio em lote: escolhe o cliente e as notas.
import { useMemo, useState } from "react";
import { Mail, X } from "lucide-react";
import { stageLabel, type Order, type TimelineEntry } from "@/lib/mock-data";

export function BulkClientUpdate({ orders, autor, onClose, onSent }: {
  orders: Order[];
  autor: string;
  onClose: () => void;
  onSent: (ids: string[], entry: TimelineEntry, email: string) => void;
}) {
  const clientes = useMemo(() => Array.from(new Set(orders.map((o) => o.clienteNome))).sort(), [orders]);
  const [cliente, setCliente] = useState(clientes[0] ?? "");
  const [soAbertas, setSoAbertas] = useState(true);
  const lista = orders.filter((o) => o.clienteNome === cliente && (!soAbertas || o.stage !== "entregue"));
  const [marcadas, setMarcadas] = useState<Set<string> | null>(null);
  const sel = marcadas ?? new Set(lista.map((o) => o.id));
  const [email, setEmail] = useState("");
  const emailSugerido = lista.find((o) => o.emailCliente)?.emailCliente ?? "";

  function trocarCliente(c: string) { setCliente(c); setMarcadas(null); setEmail(""); }
  function toggle(id: string) {
    const n = new Set(sel); if (n.has(id)) n.delete(id); else n.add(id); setMarcadas(n);
  }

  function enviar() {
    const destino = email || emailSugerido;
    const escolhidas = lista.filter((o) => sel.has(o.id));
    if (!destino) { alert("Informe o e-mail do cliente."); return; }
    if (!escolhidas.length) { alert("Selecione ao menos uma nota."); return; }
    const linhas = escolhidas.map((o) =>
      `• NF ${o.numeroNFe} — ${o.cidadeColeta}/${o.ufColeta} → ${o.cidadeEntrega}/${o.ufEntrega}\n  Status: ${stageLabel(o.stage)}${o.rastreio ? ` · ${o.rastreio.situacao}${o.rastreio.local ? ` (${o.rastreio.local})` : ""}` : ""}\n  Previsão: ${o.previsaoEntrega ? new Date(o.previsaoEntrega).toLocaleDateString("pt-BR") : "—"}`,
    ).join("\n\n");
    const assunto = `Atualização das suas entregas — ${escolhidas.length} nota(s)`;
    const corpo = `Olá ${cliente},\n\nSegue a posição atualizada das suas entregas:\n\n${linhas}\n\nAtenciosamente,\nNovaris · Operador Logístico Integrado`;
    window.open(`mailto:${destino}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`);
    onSent(escolhidas.map((o) => o.id), {
      quando: new Date().toISOString(), autor, tipo: "sistema",
      texto: `Atualização consolidada enviada para ${destino} (${escolhidas.length} notas)`,
    }, destino);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel w-full max-w-2xl p-5 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-lg">Enviar atualização ao cliente</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <select value={cliente} onChange={(e) => trocarCliente(e.target.value)} className="input">
            {clientes.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={emailSugerido || "e-mail do cliente"} className="input" />
        </div>
        <div className="flex items-center justify-between text-xs mb-2">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={soAbertas} onChange={(e) => { setSoAbertas(e.target.checked); setMarcadas(null); }} /> Só notas não entregues</label>
          <div className="flex gap-3">
            <button onClick={() => setMarcadas(new Set(lista.map((o) => o.id)))} className="text-primary hover:underline">Marcar todas</button>
            <button onClick={() => setMarcadas(new Set())} className="text-muted-foreground hover:underline">Desmarcar</button>
          </div>
        </div>
        <div className="overflow-y-auto border border-border rounded-md flex-1">
          {lista.map((o) => (
            <label key={o.id} className="flex items-center gap-3 px-3 py-2 border-b border-border text-xs cursor-pointer hover:bg-elevated/50">
              <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} />
              <span className="num w-20">NF {o.numeroNFe}</span>
              <span className="flex-1">{o.cidadeEntrega}/{o.ufEntrega}</span>
              <span className="text-muted-foreground">{o.rastreio?.situacao ?? stageLabel(o.stage)}</span>
            </label>
          ))}
          {lista.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">Nenhuma nota para este cliente.</div>}
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">{lista.filter((o) => sel.has(o.id)).length} de {lista.length} selecionadas</span>
          <button onClick={enviar} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> Enviar atualização
          </button>
        </div>
      </div>
    </div>
  );
}
