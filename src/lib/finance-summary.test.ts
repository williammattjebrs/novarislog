import {describe,it,expect} from 'vitest';
import {financeSummary,costKnown} from './finance-summary';
import {DEFAULT_CONFIG} from './mock-data';
describe('monthly financial consistency',()=>{
 it('excludes other months and counts linked costs only once',()=>{
  const orders:any=[{id:'a',criadoEm:'2026-10-01',valorFrete:500,origemValor:'manual',costs:{execMode:'terceiro',valorPagoTerceiro:80}},{id:'b',criadoEm:'2026-10-02',costs:{execMode:''}}];
  const expenses:any=[{id:'e',orderId:'a',valor:80,vencimento:'2026-10-10'}];
  const invoices:any=[{valor:500,emissao:'2026-10-01',vencimento:'2026-10-31',movements:[{type:'baixa',value:100}]},{valor:999,emissao:'2026-09-01'}];
  const result=financeSummary('2026-10',invoices,expenses,orders,DEFAULT_CONFIG.frota);
  expect(result.faturada).toBe(500);expect(result.custo).toBe(80);expect(result.resultado).toBe(420);expect(result.aberta).toBe(400);expect(result.custosPendentes).toBe(1);
  expect(costKnown(orders[1])).toBe(false);
 });
});