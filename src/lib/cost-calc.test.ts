import { describe, it, expect } from 'vitest';
import { calcFreight, calcOrderCost } from './cost-calc';

describe('cost-calc', () => {
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
