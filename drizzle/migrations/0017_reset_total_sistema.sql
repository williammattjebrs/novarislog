CREATE OR REPLACE FUNCTION public.tms_oc_links()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE nf text; holder text;
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.collection='ordensColeta' THEN
      IF coalesce(OLD.data->>'modelo','')='v2' AND OLD.data->>'status'<>'rascunho' AND coalesce(current_setting('tms.reset_imports', true),'')<>'on' THEN RAISE EXCEPTION 'OC emitida não pode ser excluída; use cancelamento'; END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION public.tms_reset_imports(confirmacao text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r jsonb := '{}'::jsonb; n int; em text;
BEGIN
  SELECT lower(email) INTO em FROM auth.users WHERE id = auth.uid();
  IF em IS DISTINCT FROM 'wtmattje@gmail.com' OR NOT public.has_role(auth.uid(),'admin') OR NOT public.tms_active() THEN
    RAISE EXCEPTION 'Sem permissão para zerar o sistema';
  END IF;
  IF confirmacao IS DISTINCT FROM 'ZERAR' THEN RAISE EXCEPTION 'Confirmação inválida'; END IF;
  PERFORM set_config('tms.reset_imports','on',true);
  DELETE FROM tms_oc_email_outbox WHERE id IS NOT NULL; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('envios',n);
  DELETE FROM tms_oc_documents WHERE id IS NOT NULL; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('pdfs',n);
  -- Zera todos os dados operacionais, cadastrais e financeiros; mantém apenas configurações do sistema e usuários.
  DELETE FROM app_records WHERE collection <> 'config'; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('registros',n);
  DELETE FROM tms_oc_nf_active WHERE nf_id IS NOT NULL;
  DELETE FROM tms_fiscal_keys WHERE fiscal_key IS NOT NULL;
  DELETE FROM email_xml_inbox WHERE id IS NOT NULL; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('xmls',n);
  INSERT INTO tms_audit(collection, record_id, author, reason) VALUES ('*','reset-total',auth.uid(),'Zerar todo o sistema: '||r::text);
  RETURN r;
END $function$;