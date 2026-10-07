import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {schedulerStatus,schedulerDryRun} from '@/lib/scheduler.functions';
import {useState} from 'react';
import {Button} from './ui/button';
export function SchedulerStatus(){
  const fetch=useServerFn(schedulerStatus);
  const dryRun=useServerFn(schedulerDryRun);
  const [feedback,setFeedback]=useState('');
  const {data,error}=useQuery({queryKey:['scheduler-status'],queryFn:()=>fetch(),retry:false});
  return <section className="border border-border rounded-md p-5 space-y-3"><h2 className="font-semibold">Automações no servidor</h2><p className="text-sm text-warning">{data?.enabled?'Ativação configurada':'Desativadas · aguardam validação e ativação de produção'}</p><Button variant="outline" onClick={async()=>{try{const r=await dryRun();setFeedback(`Simulação concluída: captação ${r.inboxEnabled?'configurada':'desligada'} · ${r.trackingGroups} grupos automáticos · nenhum XML buscado ou e-mail enviado.`);}catch{setFeedback('Falha na simulação.');}}}>Simular sem importar ou enviar</Button>{feedback&&<p role="status" className="text-sm text-info">{feedback}</p>}{error&&<p role="alert" className="text-danger">Não foi possível consultar execuções.</p>}<div className="overflow-auto"><table className="w-full text-xs"><thead><tr><th>Rotina</th><th>Última execução</th><th>Próxima tentativa</th><th>Estado</th><th>Erro recente</th></tr></thead><tbody>{data?.runs.map(r=><tr key={r.id} className="border-t border-border"><td>{r.task}</td><td>{new Date(r.started_at).toLocaleString('pt-BR')}</td><td>{r.next_run_at?new Date(r.next_run_at).toLocaleString('pt-BR'):'—'}</td><td>{r.status}</td><td>{r.error??'—'}</td></tr>)}</tbody></table></div>{data&&!data.runs.length&&<p className="text-sm text-muted-foreground">Nenhuma execução registrada.</p>}</section>;
}