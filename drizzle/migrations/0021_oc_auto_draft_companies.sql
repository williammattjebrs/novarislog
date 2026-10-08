CREATE OR REPLACE FUNCTION public.tms_collection(c text, op text DEFAULT 'read'::text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
SELECT public.tms_active() AND (public.has_role(auth.uid(),'admin') OR (op <> 'delete' AND CASE
  WHEN c IN ('clients','clientGroups') THEN public.tms_module('/clientes') OR (op='read' AND (public.tms_module('/coletas') OR public.tms_module('/ordens-coleta') OR public.tms_module('/locais-operacionais')))
  WHEN c IN ('freightTables','routeRates','quotations','crmDeals') THEN public.tms_module('/clientes')
  WHEN c IN ('orders','cteDocuments') THEN public.tms_module('/coletas') OR public.tms_module('/monitoramento') OR (op='read' AND (public.tms_module('/financeiro') OR public.tms_module('/ordens-coleta')))
  WHEN c IN ('rotas','ordensColeta') THEN public.tms_module('/rotas') OR public.tms_module('/ordens-coleta') OR public.tms_module('/monitoramento')
  WHEN c IN ('motoristas','veiculos') THEN public.tms_module('/motoristas') OR (op='read' AND (public.tms_module('/rotas') OR public.tms_module('/ordens-coleta') OR public.tms_module('/monitoramento')))
  WHEN c='locais' THEN public.tms_module('/locais-operacionais') OR (op='read' AND (public.tms_module('/rotas') OR public.tms_module('/ordens-coleta') OR public.tms_module('/monitoramento')))
  WHEN c='trackingGroups' THEN public.tms_module('/monitoramento') OR public.tms_module('/clientes')
  WHEN c IN ('invoices','expenses','expenseGroups') THEN public.tms_module('/financeiro')
  WHEN c='companies' THEN op='read'
  ELSE false END));
$function$;

-- Coloca a NF em um rascunho de OC do mesmo remetente+destinatário; cria um se não houver. Idempotente.
CREATE OR REPLACE FUNCTION public.tms_oc_auto_draft_worker(p_nf_id text, p_actor text DEFAULT 'sistema')
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE nf jsonb; k text; oc record; oc_id text; now_text text:=now()::text; seq int;
BEGIN
  SELECT data INTO nf FROM public.app_records WHERE collection='orders' AND id=p_nf_id;
  IF nf IS NULL THEN RETURN NULL; END IF;
  IF EXISTS(SELECT 1 FROM public.tms_oc_nf_active WHERE nf_id=p_nf_id) THEN RETURN (SELECT a.oc_id FROM public.tms_oc_nf_active a WHERE a.nf_id=p_nf_id); END IF;
  k:=upper(coalesce(nullif(nf->>'remetenteCnpj',''),nf->>'remetente',''))||'|'||upper(coalesce(nullif(nf->>'destinatarioCnpj',''),nf->>'destinatario',''));
  PERFORM pg_advisory_xact_lock(hashtextextended('ocauto:'||k,0));
  SELECT id, data INTO oc FROM public.app_records WHERE collection='ordensColeta' AND data->>'modelo'='v2' AND data->>'status'='rascunho' AND data->>'autoKey'=k ORDER BY criado_em LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.app_records SET data = jsonb_set(jsonb_set(jsonb_set(data,'{orderIds}',coalesce(data->'orderIds','[]'::jsonb)||to_jsonb(p_nf_id)),'{historico}',coalesce(data->'historico','[]'::jsonb)||jsonb_build_object('quando',now_text,'autor',p_actor,'tipo','sistema','texto','NF '||coalesce(nf->>'numeroNFe','')||' acrescentada automaticamente na importação')),'{atualizadoEm}',to_jsonb(now_text)), version=version+1, atualizado_em=now()
      WHERE collection='ordensColeta' AND id=oc.id;
    RETURN oc.id;
  END IF;
  SELECT count(*)+1 INTO seq FROM public.app_records WHERE collection='ordensColeta';
  oc_id:='OC-AUTO-'||substr(md5(p_nf_id||clock_timestamp()::text),1,10);
  INSERT INTO public.app_records(collection,id,data) VALUES('ordensColeta',oc_id,jsonb_build_object(
    'id',oc_id,'numero','OC-'||lpad(seq::text,5,'0')||'-'||upper(substr(md5(oc_id),1,3)),'modelo','v2','rotaId','','autoKey',k,
    'clienteNome',coalesce(nf->>'clienteNome',''),'clienteColetaId',nullif(nf->>'clienteId',''),'clienteColetaNome',regexp_replace(coalesce(nf->>'clienteNome',nf->>'remetente',''),'^\(sem cliente\)\s*',''),
    'clienteDescargaNome',coalesce(nf->>'destinatario',''),'contratanteNome',regexp_replace(coalesce(nf->>'clienteNome',nf->>'remetente',''),'^\(sem cliente\)\s*',''),
    'orderIds',jsonb_build_array(p_nf_id),'localColeta','','cidadeColeta',coalesce(nf->>'cidadeColeta',''),'ufColeta',coalesce(nf->>'ufColeta',''),'dataHoraColeta','',
    'localEntrega','','cidadeEntrega',coalesce(nf->>'cidadeEntrega',''),'ufEntrega',coalesce(nf->>'ufEntrega',''),'dataHoraEntrega','',
    'status','rascunho','documentoEstado','sem_documento','criadoPor',p_actor,'criadoEm',now_text,'atualizadoEm',now_text,
    'historico',jsonb_build_array(jsonb_build_object('quando',now_text,'autor',p_actor,'tipo','sistema','texto','Rascunho sugerido automaticamente na importação da NF '||coalesce(nf->>'numeroNFe','')))));
  RETURN oc_id;
END $function$;
REVOKE ALL ON FUNCTION public.tms_oc_auto_draft_worker(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tms_oc_auto_draft_worker(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.tms_oc_auto_draft(p_nf_ids text[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE i text; r jsonb:='[]'::jsonb; nome text;
BEGIN
  IF NOT public.tms_collection('ordensColeta','write') THEN RAISE EXCEPTION 'Sem permissão para Ordens de coleta'; END IF;
  SELECT coalesce(nullif(p.nome,''),'usuário') INTO nome FROM public.profiles p WHERE p.id=auth.uid();
  FOREACH i IN ARRAY coalesce(p_nf_ids,'{}') LOOP r:=r||to_jsonb(public.tms_oc_auto_draft_worker(i,coalesce(nome,'usuário'))); END LOOP;
  RETURN r;
END $function$;
REVOKE ALL ON FUNCTION public.tms_oc_auto_draft(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tms_oc_auto_draft(text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tms_import_nfe_worker(payload jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k text; nf_id text; now_text text:=now()::text; oc text;
BEGIN
  k:=payload->>'chaveNFe';
  IF k !~ '^\d{44}$' OR payload->>'xmlOriginal' IS NULL OR regexp_replace((xpath('string(//*[local-name()="infNFe"]/@Id)',xmlparse(document payload->>'xmlOriginal')))[1]::text,'^NFe','') IS DISTINCT FROM k THEN RAISE EXCEPTION 'NF-e inválida'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('nfe:'||k,0));
  IF EXISTS(SELECT 1 FROM public.app_records WHERE collection='orders' AND data->>'chaveNFe'=k) THEN
    UPDATE public.email_xml_inbox SET status='importado',importado_em=coalesce(importado_em,now()),motivo_pendencia=NULL WHERE chave=k AND tipo='nfe';
    RETURN jsonb_build_object('status','duplicado');
  END IF;
  nf_id:='ORD-NFE-'||k;
  INSERT INTO public.app_records(collection,id,data) VALUES('orders',nf_id,(payload - 'ocId')||jsonb_build_object('id',nf_id,'criadoEm',now_text,'atualizadoEm',now_text));
  oc:=public.tms_oc_auto_draft_worker(nf_id,'importação automática');
  UPDATE public.email_xml_inbox SET status='importado',importado_em=now(),motivo_pendencia=NULL WHERE chave=k AND tipo='nfe';
  RETURN jsonb_build_object('status','importado','nf',nf_id,'oc',oc);
END $function$;