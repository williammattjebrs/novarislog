CREATE TABLE public.whatsapp_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  phone_number_id text NOT NULL DEFAULT '',
  waba_id text NOT NULL DEFAULT '',
  access_token text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT false,
  ultima_verificacao timestamptz,
  ultimo_status text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_config TO service_role;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;