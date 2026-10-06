CREATE TABLE public.user_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);
GRANT SELECT ON public.user_modules TO authenticated;
GRANT ALL ON public.user_modules TO service_role;
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de modulos" ON public.user_modules FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));