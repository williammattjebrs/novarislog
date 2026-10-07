import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
export const schedulerStatus=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:allowed}=await context.supabase.rpc('tms_module',{module_name:'/configuracoes'});
  if(!allowed)throw new Error('Apenas administradores ativos.');
  const {data,error}=await context.supabase.from('tms_job_runs').select('id,task,status,started_at,finished_at,next_run_at,error').order('started_at',{ascending:false}).limit(30);
  if(error)throw error;
  return {enabled:process.env['ENABLE_SERVER_SCHEDULER']==='true',secretConfigured:!!process.env['INTERNAL_SCHEDULER_KEY'],runs:data};
});
export const schedulerDryRun=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:allowed}=await context.supabase.rpc('tms_module',{module_name:'/configuracoes'});
  if(!allowed)throw new Error('Apenas administradores ativos.');
  const {runScheduler}=await import('./scheduler.server');
  return runScheduler(true);
});