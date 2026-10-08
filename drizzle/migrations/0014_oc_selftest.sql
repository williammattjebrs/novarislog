CREATE OR REPLACE FUNCTION public.tms_oc_selftest()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid; saved text; k text; nf text; out jsonb:='[]'; r jsonb; n integer; s text; snap jsonb;
BEGIN
  IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Somente servidor'; END IF;
  SELECT p.id INTO uid FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.id WHERE p.ativo AND ur.role='admin' LIMIT 1;
  saved:=current_setting('request.jwt.claims',true);
  BEGIN
    k:=repeat('7',10)||lpad(floor(random()*1e15)::bigint::text,15,'0')||repeat('3',19); nf:='ORD-NFE-'||k;
    r:=public.tms_import_nfe_worker(jsonb_build_object('chaveNFe',k,'xmlOriginal','<NFe><infNFe Id="NFe'||k||'"/></NFe>','numeroNFe','T1','peso',100,'stage','valorizada','timeline','[]'::jsonb,'costs','{}'::jsonb,'ocId','OC-FORJADA'));
    IF r->>'status'<>'importado' THEN RAISE EXCEPTION 'import'; END IF;
    r:=public.tms_import_nfe_worker(jsonb_build_object('chaveNFe',k,'xmlOriginal','<NFe><infNFe Id="NFe'||k||'"/></NFe>'));
    SELECT count(*) INTO n FROM public.app_records WHERE collection='ordensColeta' AND data->'orderIds' ? nf;
    IF r->>'status'<>'duplicado' OR n<>0 OR (SELECT count(*) FROM public.app_records WHERE collection='orders' AND data->>'chaveNFe'=k)<>1 OR EXISTS(SELECT 1 FROM public.app_records WHERE collection='orders' AND id=nf AND data ? 'ocId') THEN RAISE EXCEPTION 'Import criou OC ou duplicou'; END IF;
    out:=out||'["1 importar/reimportar NF: 1 entrada, 0 OC"]';
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
    PERFORM public.tms_records_commit(jsonb_build_array(jsonb_build_object('collection','ordensColeta','id','OC-TST1','version',0,'data',jsonb_build_object('id','OC-TST1','numero','OC-TST1','modelo','v2','status','rascunho','orderIds',jsonb_build_array(nf),'historico','[]'::jsonb))),'teste');
    IF (SELECT count(*) FROM public.tms_oc_email_outbox WHERE oc_id='OC-TST1')<>0 THEN RAISE EXCEPTION 'rascunho enviou'; END IF;
    out:=out||'["3 rascunho sem envio"]';
    BEGIN PERFORM public.tms_records_commit(jsonb_build_array(jsonb_build_object('collection','ordensColeta','id','OC-TST2','version',0,'data',jsonb_build_object('id','OC-TST2','numero','OC-TST2','modelo','v2','status','rascunho','orderIds',jsonb_build_array(nf)))),'t'); RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='dup'; EXCEPTION WHEN raise_exception THEN out:=out||'["6 NF em duas OCs ativas: bloqueado"]'; END;
    BEGIN PERFORM public.tms_records_commit(jsonb_build_array(jsonb_build_object('collection','ordensColeta','id','OC-TST1','version',1,'data',jsonb_build_object('id','OC-TST1','numero','OC-TST1','modelo','v2','status','emitida','orderIds',jsonb_build_array(nf)))),'t'); RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='emit'; EXCEPTION WHEN raise_exception THEN out:=out||'["Emissão pelo navegador: bloqueada"]'; END;
    snap:=jsonb_build_object('numero','OC-TST1','emitidoPor','teste','nfs',jsonb_build_array(jsonb_build_object('id',nf)),'motorista',jsonb_build_object('nome','João','telefone','47'),'veiculo',jsonb_build_object('placa','ABC1D23'),'coleta',jsonb_build_object('local',jsonb_build_object('nome','ALILOG'),'dataHora','2026-10-09T11:00'),'descarga',jsonb_build_object('local',jsonb_build_object('nome','Novatrigo')),'destinatarios',jsonb_build_array(jsonb_build_object('email','a@x.test','papeis',jsonb_build_array('coleta','motorista')),jsonb_build_object('email',' A@x.test','papeis',jsonb_build_array('descarga'))));
    r:=public.tms_oc_emit_worker(uid,'OC-TST1',1,snap,'TST/v1.pdf','sha',false);
    IF (SELECT data->>'status' FROM public.app_records WHERE collection='ordensColeta' AND id='OC-TST1')<>'emitida' OR (SELECT data->>'ocId' FROM public.app_records WHERE collection='orders' AND id=nf)<>'OC-TST1' OR (r->>'enfileirados')::int<>1 THEN RAISE EXCEPTION 'emissão %',r; END IF;
    out:=out||'["4 emissão: status emitida, NF vinculada, 1 envio (destinatário deduplicado)"]';
    BEGIN PERFORM public.tms_oc_emit_worker(uid,'OC-TST1',1,snap,'p','s',false); RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='x'; EXCEPTION WHEN raise_exception THEN out:=out||'["6 emissão concorrente com versão antiga: rejeitada"]'; END;
    r:=public.tms_oc_emit_worker(uid,'OC-TST1',2,snap,'TST/v2.pdf','sha2',false);
    IF (r->>'enfileirados')::int<>0 OR (SELECT count(*) FROM public.tms_oc_documents WHERE oc_id='OC-TST1')<>2 THEN RAISE EXCEPTION 'revisão %',r; END IF;
    out:=out||'["Revisão sem envio: v2 criada, 0 e-mails"]';
    BEGIN UPDATE public.tms_oc_documents SET pdf_path='x' WHERE oc_id='OC-TST1'; RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='x'; EXCEPTION WHEN raise_exception THEN out:=out||'["8 documento emitido imutável"]'; END;
    SELECT count(*) INTO n FROM public.tms_oc_email_claim('OC-TST1',10); IF n<>1 THEN RAISE EXCEPTION 'claim'; END IF;
    SELECT count(*) INTO n FROM public.tms_oc_email_claim('OC-TST1',10); IF n<>0 THEN RAISE EXCEPTION 'claim duplo'; END IF;
    PERFORM public.tms_oc_email_finish(id,'falha','teste') FROM public.tms_oc_email_outbox WHERE oc_id='OC-TST1';
    IF public.tms_oc_email_requeue('OC-TST1',1)<>1 OR (SELECT data->>'status' FROM public.app_records WHERE collection='ordensColeta' AND id='OC-TST1')<>'emitida' THEN RAISE EXCEPTION 'requeue'; END IF;
    out:=out||'["6/7 reserva única; falha recuperável, OC continua emitida"]';
    PERFORM public.tms_records_commit(jsonb_build_array(jsonb_build_object('collection','ordensColeta','id','OC-TST1','version',3,'data',(SELECT data FROM public.app_records WHERE collection='ordensColeta' AND id='OC-TST1')||jsonb_build_object('status','cancelada'))),'cancelamento');
    PERFORM public.tms_records_commit(jsonb_build_array(jsonb_build_object('collection','ordensColeta','id','OC-TST3','version',0,'data',jsonb_build_object('id','OC-TST3','numero','OC-TST3','modelo','v2','status','rascunho','orderIds',jsonb_build_array(nf)))),'reprogramação');
    BEGIN PERFORM public.tms_records_commit(jsonb_build_array(jsonb_build_object('collection','ordensColeta','id','OC-TST1','version',4,'data',(SELECT data FROM public.app_records WHERE collection='ordensColeta' AND id='OC-TST1')||jsonb_build_object('status','rascunho'))),'t'); RAISE EXCEPTION USING ERRCODE='P0003',MESSAGE='x'; EXCEPTION WHEN raise_exception THEN NULL; END;
    IF (SELECT count(*) FROM public.tms_audit WHERE record_id='OC-TST1')<3 THEN RAISE EXCEPTION 'auditoria'; END IF;
    out:=out||'["9 cancelamento libera NF para nova OC, sem reativação, auditoria registrada"]';
    RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='rollback';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  PERFORM set_config('request.jwt.claims',coalesce(saved,''),true);
  RETURN jsonb_build_object('status','passed','checks',out,'data_persisted',false);
END $$;
REVOKE ALL ON FUNCTION public.tms_oc_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tms_oc_selftest() TO service_role;