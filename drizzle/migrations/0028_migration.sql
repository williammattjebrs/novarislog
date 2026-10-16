CREATE OR REPLACE FUNCTION public.tms_import_nfe_worker(payload jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k text; nf_id text; now_text text:=now()::text;
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
  UPDATE public.email_xml_inbox SET status='importado',importado_em=now(),motivo_pendencia=NULL WHERE chave=k AND tipo='nfe';
  RETURN jsonb_build_object('status','importado','nf',nf_id);
END $function$;