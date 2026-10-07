import { describe, it, expect } from 'vitest';
import { calcFreight, calcOrderCost, findQuotation } from './cost-calc';

describe('cost-calc', () => {
  it('keeps weight outside a range pending instead of selecting the last row', () => {
    const table:any={modalidade:'fracionada',rows:[{faixaMin:0,faixaMax:100,valorKg:2,minimo:10}],adValorem:0,gris:0,pedagio:0};
    expect(calcFreight(table,{peso:101,valorNF:100}).error).toBeTruthy();
    expect(calcFreight(table,{peso:101,valorNF:100}).total).toBe(0);
  });
  it('rejects a quotation for another city',()=>{
    const q:any={status:'aprovada',clienteId:'c',origemUf:'PR',destinoUf:'RJ',origemCidade:'Curitiba',destinoCidade:'Niterói'};
    expect(findQuotation([q],{clienteId:'c',ufColeta:'PR',ufEntrega:'RJ',cidadeColeta:'Curitiba',cidadeEntrega:'Rio de Janeiro'})).toBeNull();
  });
  it('should calculate freight for lotacao', () => {
    const table: any = { modalidade: 'lotacao', valorLotacao: 500, pedagio: 50 };
    const res = calcFreight(table, { peso: 1000, valorNF: 10000 });
    expect(res.total).toBe(550);
  });

  it('should calculate order cost for terceiro', () => {
    const costs: any = { execMode: 'terceiro', valorPagoTerceiro: 300 };
    const res = calcOrderCost(costs, {} as any, 500);
    expect(res.total).toBe(300);
  });

  it('should calculate order cost for frota', () => {
    const costs: any = { execMode: 'frota', kmRodados: 100, kmPorLitro: 10, precoDiesel: 5 };
    const cfg: any = { kmPorLitro: 8, precoDiesel: 4, consumoArlaLitrosPor100km: 5, precoArla: 2, pedagioMedioPorKm: 0.1, comissaoMotoristaPercent: 10, depreciacaoPorKm: 0.2, outrosPorKm: 0.1 };
    const res = calcOrderCost(costs, cfg, 1000);
    // Diesel: 100/10 * 5 = 50
    // Arla: (100 * 5 / 100) * 2 = 10
    // Pedagio: 100 * 0.1 = 10
    // Comissao: 1000 * 10 / 100 = 100
    // Dep: 100 * 0.2 = 20
    // Outros: 100 * 0.1 = 10
    // Total = 50 + 10 + 10 + 100 + 20 + 10 = 200
    expect(res.total).toBe(200);
  });
});
