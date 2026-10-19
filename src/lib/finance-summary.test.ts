import {describe,it,expect} from 'vitest';
import {financeSummary,costKnown,clientCashDetail} from './finance-summary';
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
describe('client cash detail',()=>{
 it('splits month receipts and open balances by client',()=>{
  const invoices:any=[
   {id:'1',numero:'N1',clienteNome:'Eixo',valor:1000,competencia:'2026-10-01',vencimento:'2026-10-31',movements:[{type:'baixa',value:400,date:'2026-10-05'}]},
   {id:'2',numero:'N2',clienteNome:'Eixo',valor:500,competencia:'2026-10-02',vencimento:'2026-10-31',movements:[]},
   {id:'3',numero:'N3',clienteNome:'Novatrigo',valor:800,competencia:'2026-10-03',vencimento:'2026-10-20',movements:[{type:'baixa',value:800,date:'2026-10-06'}]},
   {id:'4',numero:'N4',clienteNome:'Novatrigo',valor:700,competencia:'2026-09-03',vencimento:'2026-09-20',movements:[{type:'baixa',value:200,date:'2026-09-10'}]},
   {id:'5',numero:'N5',clienteNome:'(sem cliente) PASTIFICIO SELMI S A',valor:300,competencia:'2026-10-04',vencimento:'2026-10-30',movements:[]},
   {id:'6',numero:'N6',clienteNome:'  ',valor:250,competencia:'2026-10-05',vencimento:'2026-10-30',movements:[]},
  ];
  const {rows,totais}=clientCashDetail('2026-10',invoices);
  const eixo=rows.find(r=>r.cliente==='Eixo')!;
  const nova=rows.find(r=>r.cliente==='Novatrigo')!;
  const selmi=rows.find(r=>r.cliente==='PASTIFICIO SELMI S A')!;
  const sem=rows.find(r=>r.cliente==='Sem cliente')!;
  expect(eixo.faturado).toBe(1500);
  expect(eixo.recebido).toBe(400);
  expect(eixo.aReceber).toBe(1100);
  expect(nova.faturado).toBe(800);
  expect(nova.recebido).toBe(800);
  expect(nova.aReceber).toBe(500);
  expect(selmi.aReceber).toBe(300);
  expect(sem.aReceber).toBe(250);
  expect(rows.map(r=>r.cliente)).not.toContain('(sem cliente) PASTIFICIO SELMI S A');
  expect(rows[0].cliente).toBe('Eixo');
  expect(totais.faturado).toBe(2850);
  expect(totais.recebido).toBe(1200);
  expect(totais.aReceber).toBe(2150);
 });
 it('keeps reversals out of what the client actually paid',()=>{
  const invoices:any=[{id:'1',clienteNome:'Eixo',valor:1000,competencia:'2026-10-01',movements:[{type:'baixa',value:600,date:'2026-10-05'},{type:'estorno',value:200,date:'2026-10-08'}]}];
  const {rows}=clientCashDetail('2026-10',invoices);
  expect(rows).toHaveLength(1);
  expect(rows[0].recebido).toBe(400);
  expect(rows[0].aReceber).toBe(600);
 });
 it('uses the legacy received field when there is no movement history',()=>{
  const invoices:any=[{id:'1',clienteNome:'Eixo',valor:1000,competencia:'2026-10-01',status:'paga',recebidoEm:'2026-10-09',valorRecebido:1000,movements:[]}];
  const {rows}=clientCashDetail('2026-10',invoices);
  expect(rows[0].recebido).toBe(1000);
  expect(rows[0].aReceber).toBe(0);
 });
});
