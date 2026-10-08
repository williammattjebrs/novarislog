-- 1) Importação headless: somente a NF (sem rota/OC automática)
CREATE OR REPLACE FUNCTION public.tms_import_nfe_worker(payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.tms_import_nfe_worker(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tms_import_nfe_worker(jsonb) TO service_role;

-- 2) Módulos novos e aliases
CREATE OR REPLACE FUNCTION public.tms_module(module_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $f$
SELECT public.tms_active() AND (public.has_role(auth.uid(),'admin') OR (module_name NOT IN ('/usuarios','/configuracoes') AND (
  EXISTS(SELECT 1 FROM public.user_modules WHERE user_id=auth.uid() AND (module=module_name OR (module_name='/rotas' AND module='/coletas') OR (module_name='/coletas' AND module='/rotas')))
  OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND ((role='comercial' AND module_name='/clientes') OR (role='operacao' AND module_name IN ('/coletas','/rotas','/ordens-coleta','/locais-operacionais','/motoristas','/monitoramento')) OR (role='financeiro' AND module_name='/financeiro'))))));
$f$;

CREATE OR REPLACE FUNCTION public.tms_collection(c text, op text DEFAULT 'read') RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $f$
SELECT public.tms_active() AND (public.has_role(auth.uid(),'admin') OR (op <> 'delete' AND CASE
  WHEN c IN ('clients','clientGroups') THEN public.tms_module('/clientes') OR (op='read' AND (public.tms_module('/coletas') OR public.tms_module('/ordens-coleta') OR public.tms_module('/locais-operacionais')))
  WHEN c IN ('freightTables','routeRates','quotations','crmDeals') THEN public.tms_module('/clientes')
  WHEN c IN ('orders','cteDocuments') THEN public.tms_module('/coletas') OR public.tms_module('/monitoramento') OR (op='read' AND (public.tms_module('/financeiro') OR public.tms_module('/ordens-coleta')))
  WHEN c IN ('rotas','ordensColeta') THEN public.tms_module('/rotas') OR public.tms_module('/ordens-coleta') OR public.tms_module('/monitoramento')
  WHEN c IN ('motoristas','veiculos') THEN public.tms_module('/motoristas') OR (op='read' AND (public.tms_module('/rotas') OR public.tms_module('/ordens-coleta') OR public.tms_module('/monitoramento')))
  WHEN c='locais' THEN public.tms_module('/locais-operacionais') OR (op='read' AND (public.tms_module('/rotas') OR public.tms_module('/ordens-coleta') OR public.tms_module('/monitoramento')))
  WHEN c='trackingGroups' THEN public.tms_module('/monitoramento') OR public.tms_module('/clientes')
  WHEN c IN ('invoices','expenses','expenseGroups') THEN public.tms_module('/financeiro')
  ELSE false END));
$f$;

-- 3) Vínculo único NF -> OC ativa
CREATE TABLE public.tms_oc_nf_active(nf_id text PRIMARY KEY, oc_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.tms_oc_nf_active TO service_role;
ALTER TABLE public.tms_oc_nf_active ENABLE ROW LEVEL SECURITY;
INSERT INTO public.tms_oc_nf_active(nf_id,oc_id)
  SELECT nf, r.id FROM public.app_records r, jsonb_array_elements_text(coalesce(r.data->'orderIds','[]'::jsonb)) nf
  WHERE r.collection='ordensColeta' AND coalesce(r.data->>'status','')<>'cancelada' ORDER BY r.criado_em
  ON CONFLICT (nf_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.tms_oc_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_data jsonb; st text; old_st text; emitted text[]:=ARRAY['emitida','em_coleta','coletada','em_viagem','entregue','ocorrencia'];
BEGIN
  IF NEW.collection<>'ordensColeta' OR coalesce(NEW.data->>'modelo','')<>'v2' THEN RETURN NEW; END IF;
  IF coalesce(current_setting('tms.oc_emit',true),'')='on' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN old_data:=OLD.data; ELSE SELECT data INTO old_data FROM public.app_records WHERE collection=NEW.collection AND id=NEW.id; END IF;
  st:=NEW.data->>'status'; old_st:=old_data->>'status';
  IF (NEW.data->'docVersion') IS DISTINCT FROM (old_data->'docVersion') OR (NEW.data->'emitidaEm') IS DISTINCT FROM (old_data->'emitidaEm') THEN RAISE EXCEPTION 'A versão do documento só muda pela emissão no servidor'; END IF;
  IF old_st='cancelada' AND st<>'cancelada' THEN RAISE EXCEPTION 'OC cancelada não pode ser reativada'; END IF;
  IF st=ANY(emitted) AND (old_data IS NULL OR old_st='rascunho') THEN RAISE EXCEPTION 'Emissão de OC somente pelo servidor'; END IF;
  IF st='rascunho' AND old_st=ANY(emitted) AND coalesce(old_data->>'modelo','')='v2' THEN RAISE EXCEPTION 'OC emitida não volta para rascunho'; END IF;
  IF st NOT IN ('rascunho','cancelada') AND NOT st=ANY(emitted) THEN RAISE EXCEPTION 'Status de OC inválido'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tms_oc_guard BEFORE INSERT OR UPDATE ON public.app_records FOR EACH ROW EXECUTE FUNCTION public.tms_oc_guard();

CREATE OR REPLACE FUNCTION public.tms_oc_links() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE nf text; holder text;
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.collection='ordensColeta' THEN
      IF coalesce(OLD.data->>'modelo','')='v2' AND OLD.data->>'status'<>'rascunho' THEN RAISE EXCEPTION 'OC emitida não pode ser excluída; use cancelamento'; END IF;
      DELETE FROM public.tms_oc_nf_active WHERE oc_id=OLD.id;
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.collection<>'ordensColeta' THEN RETURN NEW; END IF;
  DELETE FROM public.tms_oc_nf_active WHERE oc_id=NEW.id;
  IF coalesce(NEW.data->>'status','')<>'cancelada' THEN
    FOR nf IN SELECT jsonb_array_elements_text(coalesce(NEW.data->'orderIds','[]'::jsonb)) LOOP
      INSERT INTO public.tms_oc_nf_active(nf_id,oc_id) VALUES(nf,NEW.id) ON CONFLICT (nf_id) DO NOTHING;
      IF coalesce(NEW.data->>'modelo','')='v2' THEN
        SELECT oc_id INTO holder FROM public.tms_oc_nf_active WHERE nf_id=nf;
        IF holder IS DISTINCT FROM NEW.id THEN RAISE EXCEPTION 'NF % já está vinculada à OC ativa %', nf, holder; END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tms_oc_links AFTER INSERT OR UPDATE OR DELETE ON public.app_records FOR EACH ROW EXECUTE FUNCTION public.tms_oc_links();

-- 4) Documentos emitidos (imutáveis) e fila de envio
CREATE TABLE public.tms_oc_documents(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), oc_id text NOT NULL, version integer NOT NULL,
  snapshot jsonb NOT NULL, pdf_path text NOT NULL, pdf_sha256 text NOT NULL, send_requested boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(oc_id,version));
GRANT SELECT ON public.tms_oc_documents TO authenticated;
GRANT ALL ON public.tms_oc_documents TO service_role;
ALTER TABLE public.tms_oc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de documentos de OC" ON public.tms_oc_documents FOR SELECT TO authenticated USING (public.tms_module('/ordens-coleta') OR public.tms_module('/monitoramento') OR public.tms_module('/rotas'));
CREATE OR REPLACE FUNCTION public.tms_oc_document_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Documento emitido de OC é imutável'; END $$;
CREATE TRIGGER tms_oc_document_immutable BEFORE UPDATE OR DELETE ON public.tms_oc_documents FOR EACH ROW EXECUTE FUNCTION public.tms_oc_document_immutable();

CREATE TABLE public.tms_oc_email_outbox(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), oc_id text NOT NULL, doc_version integer NOT NULL, email text NOT NULL,
  papeis text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviando','aceito','falha','incerto')),
  attempts integer NOT NULL DEFAULT 0, last_error text, locked_at timestamptz, accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(oc_id,doc_version,email));
GRANT SELECT ON public.tms_oc_email_outbox TO authenticated;
GRANT ALL ON public.tms_oc_email_outbox TO service_role;
ALTER TABLE public.tms_oc_email_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de envios de OC" ON public.tms_oc_email_outbox FOR SELECT TO authenticated USING (public.tms_module('/ordens-coleta') OR public.tms_module('/monitoramento'));

-- 5) Emissão transacional (somente servidor)
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
REVOKE ALL ON FUNCTION public.tms_oc_emit_worker(uuid,text,bigint,jsonb,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tms_oc_emit_worker(uuid,text,bigint,jsonb,text,text,boolean) TO service_role;

-- 6) Fila de envio: reserva durável, conclusão e reenfileiramento
CREATE OR REPLACE FUNCTION public.tms_oc_email_claim(p_oc_id text, p_limit integer) RETURNS SETOF public.tms_oc_email_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.tms_oc_email_outbox SET status='incerto', last_error='Envio interrompido sem confirmação do provedor; confira antes de reenviar', updated_at=now() WHERE status='enviando' AND locked_at < now()-interval '15 minutes';
  RETURN QUERY UPDATE public.tms_oc_email_outbox o SET status='enviando', attempts=o.attempts+1, locked_at=now(), updated_at=now()
    WHERE o.id IN (SELECT x.id FROM public.tms_oc_email_outbox x WHERE x.status IN ('pendente','falha') AND x.attempts<5 AND (p_oc_id IS NULL OR x.oc_id=p_oc_id) ORDER BY x.created_at FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(p_limit,50)))
    RETURNING o.*;
END $$;
CREATE OR REPLACE FUNCTION public.tms_oc_email_finish(p_id uuid, p_status text, p_error text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_status NOT IN ('aceito','falha','incerto') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  UPDATE public.tms_oc_email_outbox SET status=p_status, last_error=left(p_error,300), accepted_at=CASE WHEN p_status='aceito' THEN now() END, updated_at=now() WHERE id=p_id AND status='enviando';
END $$;
CREATE OR REPLACE FUNCTION public.tms_oc_email_requeue(p_oc_id text, p_doc_version integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.tms_oc_email_outbox SET status='pendente', attempts=0, last_error=NULL, locked_at=NULL, updated_at=now() WHERE oc_id=p_oc_id AND doc_version=p_doc_version AND status IN ('falha','incerto');
  GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.tms_oc_email_claim(text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.tms_oc_email_finish(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.tms_oc_email_requeue(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tms_oc_email_claim(text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.tms_oc_email_finish(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.tms_oc_email_requeue(text,integer) TO service_role;
