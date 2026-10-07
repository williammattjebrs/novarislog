import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
export const Route=createFileRoute('/api/public/automation')({server:{handlers:{POST:async({request})=>{
  const key=process.env['INTERNAL_SCHEDULER_KEY'];
  const supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
  if(!key||key.length<32||supplied.length!==key.length)return new Response('Unauthorized',{status:401});
  let diff=0;for(let i=0;i<key.length;i++)diff|=key.charCodeAt(i)^supplied.charCodeAt(i);
  if(diff)return new Response('Unauthorized',{status:401});
  const parsed=z.object({dryRun:z.boolean().default(true)}).strict().safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return new Response('Invalid input',{status:400});
  if(!parsed.data.dryRun&&process.env['ENABLE_SERVER_SCHEDULER']!=='true')return new Response('Disabled',{status:409});
  const {runScheduler}=await import('@/lib/scheduler.server');
  await runScheduler(parsed.data.dryRun);
  return Response.json({ok:true,dryRun:parsed.data.dryRun});
}}}});