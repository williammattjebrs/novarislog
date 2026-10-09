CREATE OR REPLACE FUNCTION public.tms_delivery_nf_access(p_nf_id text, p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.tms_module('/monitoramento')
 AND public.tms_collection('orders', CASE WHEN p_write THEN 'write' ELSE 'read' END)
 AND EXISTS (SELECT 1 FROM public.app_records WHERE collection = 'orders' AND id = p_nf_id)
 AND EXISTS (SELECT 1 FROM public.app_records WHERE collection = 'ordensColeta' AND data->>'modelo' = 'v2' AND data->>'status' IN ('emitida','em_coleta','coletada','em_viagem','entregue','ocorrencia') AND nullif(data->>'emitidaEm','') IS NOT NULL AND data->'orderIds' ? p_nf_id);
$$;
REVOKE ALL ON FUNCTION public.tms_delivery_nf_access(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tms_delivery_nf_access(text, boolean) TO authenticated, service_role;