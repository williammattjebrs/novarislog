import { describe, it, expect } from 'vitest';
import { compareCte, allocateCte, paidAmount, addPayment, reversePayment, isoDate } from './reliability';

describe('reliability', () => {
  it('does not confer a CT-e without a valid base', () => {
    expect(compareCte(0, 100, 2).status).toBe('pendente');
    expect(compareCte(0, 100, 2).percent).toBeUndefined();
  });
  it('allocates exact cents by positive weights', () => {
    const rows = ['a','b','c'].map(id => ({id,valorFrete:0,origemValor:'' as const,peso:1}));
    const result=allocateCte(100.01,rows);
    expect(result.method).toBe('peso');
    expect(Math.round(result.allocations.reduce((s,x)=>s+x.value,0)*100)).toBe(10001);
    expect(allocateCte(100,[{...rows[0],peso:0}]).method).toBe('pendente');
  });
  it('retains partial balance and append-only reversal', () => {
    const m={id:'m',type:'baixa' as const,value:40,date:'2026-10-07',author:'tester',reason:'test'};
    const history=addPayment(100,[],0,m);
    expect(100-paidAmount(history)).toBe(60);
    expect(()=>addPayment(100,history,0,{...m,id:'other',value:61})).toThrow();
    const reversed=reversePayment(history,'m','tester','correction','2026-10-07');
    expect(reversed[0]).toEqual(m);
    expect(paidAmount(reversed)).toBe(0);
    expect(()=>reversePayment(reversed,'m','tester','again','2026-10-07')).toThrow();
    expect(()=>isoDate('2026-02-30')).toThrow();
  });
  it('should compare CTE within tolerance', () => {
    const res = compareCte(100, 101, 2);
    expect(res.status).toBe('conferido');
  });

  it('should flag CTE outside tolerance', () => {
    const res = compareCte(100, 105, 2);
    expect(res.status).toBe('divergente');
  });

  it('should allocate CTE by weight share', () => {
    const orders = [
      { id: '1', valorFrete: 60, origemValor: 'manual' as const, peso: 6000 },
      { id: '2', valorFrete: 40, origemValor: 'manual' as const, peso: 3600 },
      { id: '3', valorFrete: 40, origemValor: 'manual' as const, peso: 2400 },
    ];
    const res = allocateCte(5000, orders);
    expect(res.method).toBe('peso');
    expect(res.allocations).toEqual([
      { orderId: '1', value: 2500 },
      { orderId: '2', value: 1500 },
      { orderId: '3', value: 1000 },
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
