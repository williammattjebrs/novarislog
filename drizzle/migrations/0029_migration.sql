CREATE TABLE public.tms_company_mail (
  empresa_id text PRIMARY KEY,
  provedor text NOT NULL DEFAULT 'smtp',
  email_envio text NOT NULL DEFAULT '',
  nome_remetente text NOT NULL DEFAULT '',
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 465,
  secure boolean NOT NULL DEFAULT true,
  usuario text NOT NULL DEFAULT '',
  senha text NOT NULL DEFAULT '',
  ultimo_teste timestamptz,
  ultimo_status text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tms_company_mail TO service_role;
ALTER TABLE public.tms_company_mail ENABLE ROW LEVEL SECURITY;