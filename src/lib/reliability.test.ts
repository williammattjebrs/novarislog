import { describe, it, expect } from 'vitest';
import { compareCte, allocateCte, paidAmount } from './reliability';

describe('reliability', () => {
  it('should compare CTE within tolerance', () => {
    const res = compareCte(100, 101, 2);
    expect(res.status).toBe('conferido');
  });

  it('should flag CTE outside tolerance', () => {
    const res = compareCte(100, 105, 2);
    expect(res.status).toBe('divergente');
  });

  it('should allocate CTE by freight value', () => {
    const orders = [
      { id: '1', valorFrete: 60, origemValor: 60, peso: 10 },
      { id: '2', valorFrete: 40, origemValor: 40, peso: 20 },
    ];
    const res = allocateCte(100, orders);
    expect(res.method).toBe('frete');
    expect(res.allocations).toEqual([
      { orderId: '1', value: 60 },
      { orderId: '2', value: 40 },
    ]);
  });

  it('should calculate paid amount from movements', () => {
    const movements: any[] = [
      { type: 'baixa', value: 100 },
      { type: 'estorno', value: 20 },
    ];
    expect(paidAmount(movements, 50)).toBe(130);
  });
});
