CREATE TABLE public.email_inbox_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 993,
  secure boolean NOT NULL DEFAULT true,
  usuario text NOT NULL DEFAULT '',
  senha text NOT NULL DEFAULT '',
  pasta text NOT NULL DEFAULT 'INBOX',
  dias_retroativos integer NOT NULL DEFAULT 7,
  filtro_remetente text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT false,
  intervalo_min integer NOT NULL DEFAULT 15,
  ultima_sync timestamptz,
  ultimo_status text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_inbox_config TO service_role;
ALTER TABLE public.email_inbox_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.email_xml_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  tipo text NOT NULL,
  arquivo text NOT NULL DEFAULT '',
  remetente text NOT NULL DEFAULT '',
  assunto text NOT NULL DEFAULT '',
  recebido_em timestamptz,
  xml text NOT NULL,
  status text NOT NULL DEFAULT 'novo',
  importado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_xml_inbox TO service_role;
ALTER TABLE public.email_xml_inbox ENABLE ROW LEVEL SECURITY;