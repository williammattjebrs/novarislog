CREATE OR REPLACE FUNCTION public.tms_oc_emit_worker(p_actor uuid, p_oc_id text, p_expected_version bigint, p_snapshot jsonb, p_pdf_path text, p_pdf_sha text, p_send boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.app_records%ROWTYPE; o public.app_records%ROWTYPE; d jsonb; newv integer; first boolean; em jsonb; nf text; now_text text:=now()::text; entry jsonb; queued integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND ativo) THEN RAISE EXCEPTION 'Responsável inativo'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ordensColeta:'||p_oc_id,0));
  SELECT * INTO r FROM public.app_records WHERE collection='ordensColeta' AND id=p_oc_id FOR UPDATE;
  IF r.id IS NULL OR coalesce(r.data->>'modelo','')<>'v2' THEN RAISE EXCEPTION 'OC não encontrada'; END IF;
  IF r.version<>p_expected_version THEN RAISE EXCEPTION 'CONFLICT: a OC foi alterada; recarregue antes de emitir'; END IF;
  IF r.data->>'status' IN ('cancelada','entregue') THEN RAISE EXCEPTION 'OC % não pode ser emitida', r.data->>'status'; END IF;
  IF coalesce((p_snapshot->'contratacao'->>'custo')::numeric,0)<=0 THEN RAISE EXCEPTION 'Informe o custo da operação antes de emitir a OC'; END IF;
  IF jsonb_array_length(coalesce(p_snapshot->'nfs','[]'::jsonb))=0 OR coalesce(p_snapshot->'motorista'->>'nome','')='' OR coalesce(p_snapshot->'veiculo'->>'placa','')=''
     OR coalesce(p_snapshot->'coleta'->'local'->>'nome','')='' OR coalesce(p_snapshot->'descarga'->'local'->>'nome','')='' OR coalesce(p_snapshot->'coleta'->>'dataHora','')='' THEN RAISE EXCEPTION 'Dados obrigatórios ausentes para emissão'; END IF;
  IF jsonb_array_length(coalesce(r.data->'orderIds','[]'::jsonb))<>jsonb_array_length(p_snapshot->'nfs') THEN RAISE EXCEPTION 'NFs da OC mudaram; recarregue'; END IF;
  FOR nf IN SELECT jsonb_array_elements_text(r.data->'orderIds') LOOP
    IF NOT EXISTS(SELECT 1 FROM public.tms_oc_nf_active WHERE nf_id=nf AND oc_id=p_oc_id) THEN RAISE EXCEPTION 'NF % sem vínculo ativo com esta OC', nf; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.app_records WHERE collection='orders' AND id=nf) THEN RAISE EXCEPTION 'NF % não encontrada', nf; END IF;
  END LOOP;
  newv:=coalesce((r.data->>'docVersion')::integer,0)+1; first:=newv=1;
  INSERT INTO public.tms_oc_documents(oc_id,version,snapshot,pdf_path,pdf_sha256,send_requested,created_by) VALUES(p_oc_id,newv,p_snapshot||jsonb_build_object('versao',newv),p_pdf_path,p_pdf_sha,first OR p_send,p_actor);
  entry:=jsonb_build_object('quando',now_text,'autor',coalesce(p_snapshot->>'emitidoPor','sistema'),'tipo','status','texto',CASE WHEN first THEN 'OC emitida · documento v1' ELSE 'Nova versão do documento v'||newv||CASE WHEN p_send THEN ' · envio solicitado' ELSE ' · sem envio' END END);
  d:=r.data||jsonb_build_object('status',CASE WHEN r.data->>'status'='rascunho' THEN 'emitida' ELSE r.data->>'status' END,'docVersion',newv,'emitidaEm',coalesce(r.data->'emitidaEm',to_jsonb(now_text)),'documentoEstado','emitido','conteudoPendenteRevisao',false,'historico',coalesce(r.data->'historico','[]'::jsonb)||jsonb_build_array(entry),'atualizadoEm',now_text);
  PERFORM set_config('tms.oc_emit','on',true);
  UPDATE public.app_records SET data=d,version=r.version+1,atualizado_em=now(),atualizado_por=p_actor WHERE collection='ordensColeta' AND id=p_oc_id;
  IF first THEN
    FOR o IN SELECT * FROM public.app_records WHERE collection='orders' AND id IN (SELECT jsonb_array_elements_text(r.data->'orderIds')) FOR UPDATE LOOP
      UPDATE public.app_records SET version=o.version+1, atualizado_em=now(), atualizado_por=p_actor, data=o.data||jsonb_build_object(
        'stage',CASE WHEN o.data->>'stage' IN ('valorizada','aguarda_vinculacao') THEN 'coleta_agendada' ELSE o.data->>'stage' END,
        'ocId',p_oc_id,'motorista',(p_snapshot->'motorista'->>'nome')||' ('||coalesce(p_snapshot->'motorista'->>'telefone','')||')','placa',p_snapshot->'veiculo'->>'placa',
        'previsaoEntrega',coalesce(nullif(p_snapshot->'descarga'->>'dataHora',''),o.data->>'previsaoEntrega'),'atualizadoEm',now_text,
        'timeline',coalesce(o.data->'timeline','[]'::jsonb)||jsonb_build_array(jsonb_build_object('quando',now_text,'autor',coalesce(p_snapshot->>'emitidoPor','sistema'),'tipo','status','texto',(r.data->>'numero')||' emitida')))
      WHERE collection='orders' AND id=o.id;
      INSERT INTO public.tms_audit(collection,record_id,author,reason,previous_version,new_version) VALUES('orders',o.id,p_actor,'Emissão da '||(r.data->>'numero'),o.version,o.version+1);
    END LOOP;
  END IF;
  PERFORM set_config('tms.oc_emit','off',true);
  INSERT INTO public.tms_audit(collection,record_id,author,reason,previous_version,new_version) VALUES('ordensColeta',p_oc_id,p_actor,'Emissão documento v'||newv,r.version,r.version+1);
  IF first OR p_send THEN
    FOR em IN SELECT value FROM jsonb_array_elements(coalesce(p_snapshot->'destinatarios','[]'::jsonb)) LOOP
      INSERT INTO public.tms_oc_email_outbox(oc_id,doc_version,email,papeis) VALUES(p_oc_id,newv,lower(trim(em->>'email')),ARRAY(SELECT jsonb_array_elements_text(coalesce(em->'papeis','[]'::jsonb)))) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  SELECT count(*) INTO queued FROM public.tms_oc_email_outbox WHERE oc_id=p_oc_id AND doc_version=newv;
  RETURN jsonb_build_object('docVersion',newv,'status',d->>'status','ocVersion',r.version+1,'enfileirados',queued);
END $$;