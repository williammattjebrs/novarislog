import { useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { CityPicker } from "@/components/CityPicker";
import { useRouteRates, newId } from "@/lib/mock-store";
import { fmtBRL, TIPOS_CAMINHAO, type RouteRate } from "@/lib/mock-data";

const EMPTY = { origemCidade: "", origemUf: "", destinoCidade: "", destinoUf: "", peso: 0, valorNF: 0, valorFrete: 0, tipoCaminhao: "Truck" };

// Lista/edição de rotas. Sem clienteId = rotas padrão. Com clienteId = rotas do cliente (pode copiar as padrão).
export function RouteRatesTable({ clienteId }: { clienteId?: string }) {
  const rates = useRouteRates();
  const list = rates.list.filter((r) => (clienteId ? r.clienteId === clienteId : !r.clienteId));
  const padrao = rates.list.filter((r) => !r.clienteId);
  const [f, setF] = useState(EMPTY);

  function add() {
    if (!f.origemCidade || !f.destinoCidade) { alert("Informe origem e destino."); return; }
    rates.add({ id: newId("RT"), clienteId, ...f, origemUf: f.origemUf.toUpperCase(), destinoUf: f.destinoUf.toUpperCase(), criadoEm: new Date().toISOString() });
    setF(EMPTY);
  }

  function copiarPadrao() {
    const ja = new Set(list.map((r) => r.baseRouteId));
    const novas = padrao.filter((p) => !ja.has(p.id));
    if (novas.length === 0) { alert("Todas as rotas padrão já foram trazidas para este cliente."); return; }
    novas.forEach((p) => rates.add({ ...p, id: newId("RT"), clienteId, baseRouteId: p.id, criadoEm: new Date().toISOString() }));
  }

  const upd = (r: RouteRate, patch: Partial<RouteRate>) => rates.update(r.id, patch);

  return (
    <div className="space-y-3">
      {clienteId && (
        <button onClick={copiarPadrao} className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20">
          <Copy className="h-3 w-3" /> trazer rotas da tabela padrão ({padrao.length})
        </button>
      )}
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-normal px-3 py-2.5">Origem</th>
              <th className="text-left font-normal">UF</th>
              <th className="text-left font-normal">Destino</th>
              <th className="text-left font-normal">UF</th>
              <th className="text-right font-normal">Peso (kg)</th>
              <th className="text-right font-normal">Valor NF</th>
              <th className="text-right font-normal">Frete</th>
              <th className="text-left font-normal pl-2">Caminhão</th>
              <th className="pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-1.5 min-w-52"><CityPicker value={r.origemCidade ? { nome: r.origemCidade, uf: r.origemUf } : null} onChange={(x) => upd(r, { origemCidade: x?.nome ?? "", origemUf: x?.uf ?? "" })} /></td>
                <td><span className="text-xs">{r.origemUf}</span></td>
                <td className="min-w-52"><CityPicker value={r.destinoCidade ? { nome: r.destinoCidade, uf: r.destinoUf } : null} onChange={(x) => upd(r, { destinoCidade: x?.nome ?? "", destinoUf: x?.uf ?? "" })} /></td>
                <td><span className="text-xs">{r.destinoUf}</span></td>
                <td><input type="number" className="input h-8 num text-right w-24" value={r.peso} onChange={(e) => upd(r, { peso: Number(e.target.value) })} /></td>
                <td><input type="number" className="input h-8 num text-right w-28" value={r.valorNF} onChange={(e) => upd(r, { valorNF: Number(e.target.value) })} /></td>
                <td><input type="number" className="input h-8 num text-right w-28" value={r.valorFrete} onChange={(e) => upd(r, { valorFrete: Number(e.target.value) })} /></td>
                <td className="pl-2">
                  <select className="input h-8" value={r.tipoCaminhao} onChange={(e) => upd(r, { tipoCaminhao: e.target.value })}>
                    {TIPOS_CAMINHAO.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td className="pr-3 text-right">
                  {r.baseRouteId && <span className="text-[10px] text-muted-foreground mr-2" title="Copiada da tabela padrão">padrão</span>}
                  <button onClick={() => confirm("Excluir rota?") && rates.remove(r.id)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            <tr className="border-t border-border bg-elevated/30">
              <td className="px-3 py-1.5 min-w-52"><CityPicker value={f.origemCidade ? { nome: f.origemCidade, uf: f.origemUf } : null} onChange={(x) => setF({ ...f, origemCidade: x?.nome ?? "", origemUf: x?.uf ?? "" })} /></td>
              <td><span className="text-xs">{f.origemUf}</span></td>
              <td className="min-w-52"><CityPicker value={f.destinoCidade ? { nome: f.destinoCidade, uf: f.destinoUf } : null} onChange={(x) => setF({ ...f, destinoCidade: x?.nome ?? "", destinoUf: x?.uf ?? "" })} /></td>
              <td><span className="text-xs">{f.destinoUf}</span></td>
              <td><input type="number" className="input h-8 num text-right w-24" value={f.peso || ""} placeholder="0" onChange={(e) => setF({ ...f, peso: Number(e.target.value) })} /></td>
              <td><input type="number" className="input h-8 num text-right w-28" value={f.valorNF || ""} placeholder="0" onChange={(e) => setF({ ...f, valorNF: Number(e.target.value) })} /></td>
              <td><input type="number" className="input h-8 num text-right w-28" value={f.valorFrete || ""} placeholder="0" onChange={(e) => setF({ ...f, valorFrete: Number(e.target.value) })} /></td>
              <td className="pl-2">
                <select className="input h-8" value={f.tipoCaminhao} onChange={(e) => setF({ ...f, tipoCaminhao: e.target.value })}>
                  {TIPOS_CAMINHAO.map((t) => <option key={t}>{t}</option>)}
                </select>
              </td>
              <td className="pr-3 text-right">
                <button onClick={add} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground"><Plus className="h-3 w-3" /> adicionar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="text-xs text-muted-foreground">
        {list.length} rota(s) · total de frete de referência {fmtBRL(list.reduce((s, r) => s + r.valorFrete, 0))}
      </div>
    </div>
  );
}
