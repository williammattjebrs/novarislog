// Cálculo de frete a partir de tabelas/cotações + custo por entrega.

import type {
  FreightTable, Quotation, FreightRow, OrderCosts, FrotaCostParams,
} from "./mock-data";

// -----------------------------------------------------------
// Busca tabela de frete que cobre o roteiro
// -----------------------------------------------------------
export function findFreightTable(
  tables: FreightTable[],
  args: {
    clienteId: string;
    ufColeta: string;
    cidadeColeta?: string;
    ufEntrega: string;
    cidadeEntrega?: string;
    modalidade?: "fracionada" | "lotacao";
  },
): FreightTable | null {
  const now = new Date().toISOString().slice(0, 10);
  const matches = tables.filter((t) => {
    if (!t.ativa) return false;
    if (t.clienteId !== args.clienteId) return false;
    if (t.origemUf !== args.ufColeta) return false;
    if (t.destinoUf !== args.ufEntrega) return false;
    if (t.origemCidade && args.cidadeColeta && t.origemCidade.toLowerCase() !== args.cidadeColeta.toLowerCase()) return false;
    if (t.destinoCidade && args.cidadeEntrega && t.destinoCidade.toLowerCase() !== args.cidadeEntrega.toLowerCase()) return false;
    if (args.modalidade && t.modalidade !== args.modalidade) return false;
    if (t.vigenciaInicio && t.vigenciaInicio > now) return false;
    if (t.vigenciaFim && t.vigenciaFim < now) return false;
    return true;
  });
  // preferência: cidade específica > UF genérica
  matches.sort((a, b) => {
    const scoreA = (a.origemCidade ? 1 : 0) + (a.destinoCidade ? 1 : 0);
    const scoreB = (b.origemCidade ? 1 : 0) + (b.destinoCidade ? 1 : 0);
    return scoreB - scoreA;
  });
  return matches[0] ?? null;
}

export function findQuotation(
  quotations: Quotation[],
  args: { clienteId: string; ufColeta: string; ufEntrega: string; cidadeColeta?: string; cidadeEntrega?: string },
): Quotation | null {
  return quotations.find(
    (q) =>
      q.status === "aprovada" &&
      q.clienteId === args.clienteId &&
      q.origemUf === args.ufColeta &&
      q.destinoUf === args.ufEntrega &&
      (!args.cidadeColeta || q.origemCidade.toLowerCase() === args.cidadeColeta.toLowerCase()) &&
      (!args.cidadeEntrega || q.destinoCidade.toLowerCase() === args.cidadeEntrega.toLowerCase()),
  ) ?? null;
}

// -----------------------------------------------------------
// Calcula valor do frete usando tabela
// -----------------------------------------------------------
export interface CalcInput {
  peso: number;
  valorNF: number;
}
export interface CalcResult {
  base: number;
  adValorem: number;
  gris: number;
  pedagio: number;
  total: number;
  faixa: FreightRow | null;
}

export function calcFreight(t: FreightTable, i: CalcInput): CalcResult {
  if (t.modalidade === "lotacao") {
    const total = (t.valorLotacao ?? 0) + t.pedagio;
    return { base: t.valorLotacao ?? 0, adValorem: 0, gris: 0, pedagio: t.pedagio, total, faixa: null };
  }
  const faixa = t.rows.find((r) => i.peso >= r.faixaMin && i.peso <= r.faixaMax) ?? t.rows[t.rows.length - 1] ?? null;
  const bruto = faixa ? i.peso * faixa.valorKg : 0;
  const base = faixa ? Math.max(bruto, faixa.minimo) : 0;
  const adValorem = (i.valorNF * t.adValorem) / 100;
  const gris = (i.valorNF * t.gris) / 100;
  const total = base + adValorem + gris + t.pedagio;
  return { base, adValorem, gris, pedagio: t.pedagio, total, faixa };
}

// -----------------------------------------------------------
// Custo total da entrega
// -----------------------------------------------------------
export function calcOrderCost(c: OrderCosts, cfg: FrotaCostParams, valorFrete: number): {
  total: number;
  detalhes: { label: string; valor: number }[];
} {
  if (c.execMode === "terceiro") {
    return {
      total: c.valorPagoTerceiro ?? 0,
      detalhes: [{ label: "Pago ao terceiro", valor: c.valorPagoTerceiro ?? 0 }],
    };
  }
  if (c.execMode === "frota") {
    const km = c.kmRodados ?? 0;
    const kpl = c.kmPorLitro ?? cfg.kmPorLitro;
    const litros = kpl > 0 ? km / kpl : 0;
    const diesel = litros * (c.precoDiesel ?? cfg.precoDiesel);
    const arla = ((c.arlaLitros ?? (km * cfg.consumoArlaLitrosPor100km / 100))) * (c.precoArla ?? cfg.precoArla);
    const pedagio = c.pedagio ?? km * cfg.pedagioMedioPorKm;
    const comissao = c.comissaoMotorista ?? (valorFrete * cfg.comissaoMotoristaPercent) / 100;
    const dep = c.depreciacao ?? km * cfg.depreciacaoPorKm;
    const outros = c.outros ?? km * cfg.outrosPorKm;
    const total = diesel + arla + pedagio + comissao + dep + outros;
    return {
      total,
      detalhes: [
        { label: `Diesel (${litros.toFixed(1)} L × R$ ${(c.precoDiesel ?? cfg.precoDiesel).toFixed(2)})`, valor: diesel },
        { label: "Arla", valor: arla },
        { label: "Pedágio", valor: pedagio },
        { label: `Comissão motorista (${cfg.comissaoMotoristaPercent}%)`, valor: comissao },
        { label: "Depreciação", valor: dep },
        { label: "Outros (manut. etc.)", valor: outros },
      ],
    };
  }
  return { total: 0, detalhes: [] };
}
