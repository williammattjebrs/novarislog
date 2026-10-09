import { DOMParser } from '@xmldom/xmldom';
import { parseNFe } from './xml-parser';
import { identifyClient } from './reliability';
import { calcFreight, findFreightTable, findQuotation } from './cost-calc';
import { buildTrackingEmail, enrichTrackingOrders } from './tracking-email';
import type { Client, FreightTable, Quotation, Order, OrdemColeta, RouteRate } from './mock-data';

// Called only after the HTTP handler verifies its private scheduler secret.
export async function runScheduler(dryRun: boolean) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const records:{collection:string;id:string;data:any}[]=[];
  for(let from=0;;from+=1000){
    const {data,error}=await db.from('app_records').select('collection,id,data').order('collection').order('id').range(from,from+999);
    if(error)throw error;records.push(...(data??[]));if(!data||data.length<1000)break;
  }
  const list=<T,>(key:string)=>(records??[]).filter(r=>r.collection===key).map(r=>r.data as T);
  const {data:inbox}=await db.from('email_inbox_config').select('ativo,intervalo_min').eq('id',1).maybeSingle();
  const groups=list<{id:string;automatic:boolean;emails:string[];intervalMin:number}>('trackingGroups').filter(g=>g.automatic&&g.emails.length);
  const {count:ocPending}=await db.from('tms_oc_email_outbox').select('id',{count:'exact',head:true}).in('status',['pendente','falha']);
  if(dryRun)return {dryRun:true,inboxEnabled:!!inbox?.ativo,trackingGroups:groups.length,ocEmailsPendentes:ocPending??0};
  const actor=process.env['SCHEDULER_ACTOR_ID'];
  if(!actor)throw new Error('Responsável da automação não configurado.');
  const [{data:profile},{data:roles}]=await Promise.all([db.from('profiles').select('ativo').eq('id',actor).maybeSingle(),db.from('user_roles').select('role').eq('user_id',actor)]);
  if(!profile?.ativo||!roles?.some(r=>r.role==='admin'))throw new Error('Responsável da automação não é administrador ativo.');
  async function claim(task:string,interval:number) {
    const {data,error}=await db.rpc('tms_claim_job',{p_task:task,p_interval:interval});
    if(error)throw error;return data;
  }
  async function finish(id:string,status:string,result:unknown,error?:string) {
    const {error:failure}=await db.from('tms_job_runs').update({status,finished_at:new Date().toISOString(),result:result as any,error:error?.slice(0,300)}).eq('id',id);
    if(failure)throw failure;
  }
  let imported=0,accepted=0;
  if(inbox?.ativo) {
    const id=await claim('xml-inbox',inbox.intervalo_min);
    if(id)try {
      const {performInboxSync}=await import('./email-inbox.functions');
      const fetched=await performInboxSync();if(!fetched.ok)throw new Error(fetched.mensagem);
      const {data:pending,error}=await db.from('email_xml_inbox').select('id,xml,tipo,chave').eq('status','novo').limit(200);
      if(error)throw error;
      for(const row of [...(pending??[])].sort((a,b)=>a.tipo==='nfe'?-1:b.tipo==='nfe'?1:0))try {
        if(row.tipo==='nfe') {
          const parser=new DOMParser({onError:()=>{throw new Error('XML inválido');}});
          const p=parseNFe(row.xml,parser as any);if(!p)throw new Error('XML NF-e inválido');
          const {client}=identifyClient(list<Client>('clients'),p.emitente.cnpj);
          const args={clienteId:client?.id??'',cidadeColeta:p.emitente.cidade,ufColeta:p.emitente.uf,cidadeEntrega:p.destinatario.cidade,ufEntrega:p.destinatario.uf};
          const quote=client?findQuotation(list<Quotation>('quotations'),args):null;
          const table=!quote&&client?findFreightTable(list<FreightTable>('freightTables'),args):null;
          const rates=list<RouteRate>('routeRates').filter(r=>(r.clienteId===client?.id||!r.clienteId)&&r.origemCidade===args.cidadeColeta&&r.origemUf===args.ufColeta&&r.destinoCidade===args.cidadeEntrega&&r.destinoUf===args.ufEntrega);
          const rate=rates.find(r=>!!r.clienteId)??rates.find(r=>!r.clienteId);
          const calc=table?calcFreight(table,{peso:p.pesoBruto,valorNF:p.valorTotal}):null;
          const value=quote?.valorCalculado??(calc?calc.error?0:calc.total:rate?.valorFrete??0);
          const payload={...args,clienteNome:client?.nome??`(sem cliente) ${p.emitente.nome}`,chaveNFe:p.chave,xmlOriginal:row.xml,numeroNFe:p.numero,remetente:p.emitente.nome,remetenteCnpj:p.emitente.cnpj,destinatario:p.destinatario.nome,destinatarioCnpj:p.destinatario.cnpj,peso:p.pesoBruto,volumes:p.volumes,valorNF:p.valorTotal,valorFrete:value,origemValor:value>0?quote?'cotacao':table?'tabela':rate?.clienteId?'rota_cliente':'rota_padrao':'',refValor:quote?.id??table?.id??rate?.id,stage:value>0?'valorizada':'aguarda_vinculacao',transportType:'',costs:{execMode:''},timeline:[{quando:new Date().toISOString(),autor:'automacao',tipo:'sistema',texto:'NF-e captada por rotina autorizada · aguarda programação em Rotas'}]};
          const {error}=await db.rpc('tms_import_nfe_worker',{payload:payload as any});if(error)throw error;
          imported++;
        } else {
          const {data,error}=await db.rpc('tms_import_cte_worker',{xml_text:row.xml,actor});if(error)throw error;
          const r=data as {status:string;motivo?:string};
          if(r.status==='importado')imported++;
          else await db.from('email_xml_inbox').update({motivo_pendencia:r.motivo??r.status}).eq('id',row.id);
        }
      }catch(e){await db.from('email_xml_inbox').update({motivo_pendencia:e instanceof Error?e.message.slice(0,250):'Erro de leitura'}).eq('id',row.id);}
      await finish(id,'success',{imported});
    }catch(e){await finish(id,'failed',{},e instanceof Error?e.message:'Falha na captação');}
  }
  for(const group of groups) {
    const orders=list<Order>('orders').filter(o=>(o.clienteId===group.id||o.clienteNome===group.id)&&o.stage!=='entregue');
    if(!orders.length)continue;
    const id=await claim(`tracking:${group.id}`,group.intervalMin);if(!id)continue;
    try {
      const {graphSendTracking}=await import('./graph-mail.server');
      const email=buildTrackingEmail(enrichTrackingOrders(orders,list<OrdemColeta>('ordensColeta')),orders[0].clienteNome);
      await graphSendTracking([...new Set(group.emails)],email.title,email.html);
      accepted++;await finish(id,'accepted',{provider:'Microsoft',delivered:false});
    }catch(e){await finish(id,'uncertain',{},e instanceof Error?e.message:'Resultado de envio desconhecido; revisão manual necessária');}
  }
  let ocEmails={reservados:0,aceitos:0,falhas:0,incertos:0};
  const ocJob=await claim('oc-email',5);
  if(ocJob)try{const {processOcOutbox,graphSender}=await import('./oc.server');ocEmails=await processOcOutbox(db,null,graphSender);await finish(ocJob,'success',{...ocEmails,delivered:false});}
  catch(e){await finish(ocJob,'failed',ocEmails,e instanceof Error?e.message:'Falha no envio de OCs');}
  return {dryRun:false,imported,accepted,ocEmails};
}