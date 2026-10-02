import { useState } from "react";
import { Calculator, Save } from "lucide-react";
import { fmtBRL, TIPOS_CAMINHAO } from "@/lib/mock-data";
import { CityPicker, type City } from "./CityPicker";
import { useRouteRates, newId } from "@/lib/mock-store";

// Simulador de preço: custos diretos + % sobre a receita (impostos e margem) → preço final.
// Preço = (contratação + mão de obra + adm + seguro) / (1 − impostos% − margem%)
export function FreightSimulator() {
  const [v, setV] = useState({
    contratacao: 0, maoObra: 0, admValor: 0, admPercent: 0,
    valorNF: 0, seguroPercent: 0.3, impostosPercent: 12, margemPercent: 15,
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) });

  const seguro = v.valorNF * v.seguroPercent / 100;
  const base = v.contratacao + v.maoObra + v.admValor;
  const adm = v.admValor + base * v.admPercent / 100;
  const custo = v.contratacao + v.maoObra + adm + seguro;
  const divisor = 1 - (v.impostosPercent + v.margemPercent) / 100;
  const preco = divisor > 0 ? custo / divisor : 0;
  const impostos = preco * v.impostosPercent / 100;
  const margem = preco * v.margemPercent / 100;

  const rates = useRouteRates();
  const [origem, setOrigem] = useState<City | null>(null);
  const [destino, setDestino] = useState<City | null>(null);
  const [tipo, setTipo] = useState("Truck");
  const [peso, setPeso] = useState(0);

  function salvar() {
    if (!origem || !destino) { alert("Selecione origem e destino na lista do IBGE."); return; }
    if (divisor <= 0 || preco <= 0) { alert("Preencha os custos para gerar o preço."); return; }
    rates.add({
      id: newId("RT"), origemCidade: origem.nome, origemUf: origem.uf, destinoCidade: destino.nome, destinoUf: destino.uf,
      peso, valorNF: v.valorNF, valorFrete: Math.round(preco * 100) / 100, tipoCaminhao: tipo, criadoEm: new Date().toISOString(),
    });
    alert(`Rota ${origem.nome}/${origem.uf} → ${destino.nome}/${destino.uf} salva na tabela padrão.`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel p-5 space-y-4">
        <div className="font-display text-lg">Rota</div>
        <div className="grid grid-cols-2 gap-3">
          <F l="Origem (IBGE)"><CityPicker value={origem} onChange={setOrigem} /></F>
          <F l="Destino (IBGE)"><CityPicker value={destino} onChange={setDestino} /></F>
          <F l="Tipo de veículo">
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_CAMINHAO.map((t) => <option key={t}>{t}</option>)}
            </select>
          </F>
          <F l="Peso (kg)"><input type="number" className="input num" value={peso || ""} onChange={(e) => setPeso(Number(e.target.value))} /></F>
        </div>
        <div className="flex items-center gap-2 pt-2"><Calculator className="h-4 w-4 text-primary" /><div className="font-display text-lg">Custos da operação</div></div>
        <div className="grid grid-cols-2 gap-3">
          <F l="Contratação (R$)"><input type="number" className="input num" value={v.contratacao || ""} onChange={set("contratacao")} /></F>
          <F l="Mão de obra (R$)"><input type="number" className="input num" value={v.maoObra || ""} onChange={set("maoObra")} /></F>
          <F l="Despesa adm. (R$)"><input type="number" className="input num" value={v.admValor || ""} onChange={set("admValor")} /></F>
          <F l="Despesa adm. (% s/ custo)"><input type="number" step="0.1" className="input num" value={v.admPercent || ""} onChange={set("admPercent")} /></F>
          <F l="Valor da NF (R$)"><input type="number" className="input num" value={v.valorNF || ""} onChange={set("valorNF")} /></F>
          <F l="Seguro (% s/ NF)"><input type="number" step="0.01" className="input num" value={v.seguroPercent} onChange={set("seguroPercent")} /></F>
          <F l="Impostos (% s/ preço)"><input type="number" step="0.1" className="input num" value={v.impostosPercent} onChange={set("impostosPercent")} /></F>
          <F l="Margem desejada (%)"><input type="number" step="0.1" className="input num" value={v.margemPercent} onChange={set("margemPercent")} /></F>
        </div>
        <p className="text-[11px] text-muted-foreground">Impostos e margem são calculados sobre o preço final (cálculo "por dentro").</p>
      </div>

      <div className="panel p-5 space-y-2">
        <div className="font-display text-lg mb-2">Composição do preço</div>
        <Row l="Contratação" v={v.contratacao} />
        <Row l="Mão de obra" v={v.maoObra} />
        <Row l="Despesa administrativa" v={adm} />
        <Row l="Seguro" v={seguro} />
        <div className="border-t border-border pt-2"><Row l="Custo total" v={custo} b /></div>
        <Row l={`Impostos (${v.impostosPercent}%)`} v={impostos} />
        <Row l={`Margem (${v.margemPercent}%)`} v={margem} />
        <div className="border-t border-border pt-3 mt-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Preço de frete final</div>
          <div className="num text-4xl text-primary mt-1">{divisor > 0 ? fmtBRL(preco) : "—"}</div>
          {divisor <= 0 && <div className="text-xs text-danger mt-1">Impostos + margem não podem somar 100% ou mais.</div>}
        </div>
        <button onClick={salvar} className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-primary text-primary-foreground text-sm">
          <Save className="h-4 w-4" /> Salvar na tabela padrão
        </button>
      </div>
    </div>
  );
}

function F({ l, children }: { l: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{l}</div>{children}</label>;
}
function Row({ l, v, b }: { l: string; v: number; b?: boolean }) {
  return <div className={`flex justify-between text-sm ${b ? "font-semibold" : ""}`}><span className="text-muted-foreground">{l}</span><span className="num">{fmtBRL(v)}</span></div>;
}
