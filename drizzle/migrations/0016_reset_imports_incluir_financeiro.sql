CREATE OR REPLACE FUNCTION public.tms_reset_imports(confirmacao text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r jsonb := '{}'::jsonb; n int; em text;
BEGIN
  SELECT lower(email) INTO em FROM auth.users WHERE id = auth.uid();
  IF em IS DISTINCT FROM 'wtmattje@gmail.com' OR NOT public.has_role(auth.uid(),'admin') OR NOT public.tms_active() THEN
    RAISE EXCEPTION 'Sem permissão para zerar importações';
  END IF;
  IF confirmacao IS DISTINCT FROM 'ZERAR' THEN RAISE EXCEPTION 'Confirmação inválida'; END IF;
  PERFORM set_config('tms.reset_imports','on',true);
  DELETE FROM tms_oc_email_outbox WHERE id IS NOT NULL; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('envios',n);
  DELETE FROM tms_oc_documents WHERE id IS NOT NULL; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('pdfs',n);
  DELETE FROM app_records WHERE collection IN ('orders','cteDocuments','ordensColeta','rotas'); GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('registros',n);
  DELETE FROM app_records WHERE collection IN ('invoices','expenses'); GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('financeiro',n);
  DELETE FROM tms_oc_nf_active WHERE nf_id IS NOT NULL;
  DELETE FROM tms_fiscal_keys WHERE fiscal_key IS NOT NULL;
  DELETE FROM email_xml_inbox WHERE id IS NOT NULL; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('xmls',n);
  INSERT INTO tms_audit(collection, record_id, author, reason) VALUES ('*','reset-importacoes',auth.uid(),'Zerar importações e financeiro: '||r::text);
  RETURN r;
END $function$;