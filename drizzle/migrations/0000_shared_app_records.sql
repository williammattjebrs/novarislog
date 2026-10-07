CREATE TABLE public.app_records (
  collection text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid DEFAULT auth.uid(),
  PRIMARY KEY (collection, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_records TO authenticated;
GRANT ALL ON public.app_records TO service_role;
ALTER TABLE public.app_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura compartilhada" ON public.app_records FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Criacao compartilhada" ON public.app_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Edicao compartilhada" ON public.app_records FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Exclusao compartilhada" ON public.app_records FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
ALTER TABLE public.app_records REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_records;