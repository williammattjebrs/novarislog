CREATE TABLE public.tms_master_users (user_id uuid PRIMARY KEY, criado_em timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.tms_master_users TO authenticated;
GRANT ALL ON public.tms_master_users TO service_role;
ALTER TABLE public.tms_master_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura do proprio master" ON public.tms_master_users FOR SELECT TO authenticated USING (auth.uid() = user_id);
COMMENT ON TABLE public.tms_master_users IS 'Administradores master: únicos autorizados a ações irreversíveis como zerar o sistema. Gerenciado apenas pelo backend.';

INSERT INTO public.tms_master_users(user_id) SELECT id FROM auth.users WHERE lower(email)='wtmattje@gmail.com' ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.tms_is_master() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.tms_active() AND public.has_role(auth.uid(),'admin') AND EXISTS(SELECT 1 FROM public.tms_master_users WHERE user_id=auth.uid()) $$;
GRANT EXECUTE ON FUNCTION public.tms_is_master() TO authenticated;

CREATE OR REPLACE FUNCTION public.tms_reset_imports(confirmacao text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r jsonb := '{}'::jsonb; n int;
BEGIN
  IF NOT public.tms_is_master() THEN RAISE EXCEPTION 'Somente o administrador master pode zerar o sistema'; END IF;
  IF confirmacao IS DISTINCT FROM 'ZERAR' THEN RAISE EXCEPTION 'Confirmação inválida'; END IF;
  PERFORM set_config('tms.reset_imports','on',true);
  DELETE FROM tms_oc_email_outbox WHERE id IS NOT NULL; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('envios',n);
  DELETE FROM tms_oc_documents WHERE id IS NOT NULL; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('pdfs',n);
  DELETE FROM app_records WHERE collection <> 'config'; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('registros',n);
  DELETE FROM tms_oc_nf_active WHERE nf_id IS NOT NULL;
  DELETE FROM tms_fiscal_keys WHERE fiscal_key IS NOT NULL;
  DELETE FROM email_xml_inbox WHERE id IS NOT NULL; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('xmls',n);
  INSERT INTO tms_audit(collection, record_id, author, reason) VALUES ('*','reset-total',auth.uid(),'Zerar todo o sistema: '||r::text);
  RETURN r;
END $function$;