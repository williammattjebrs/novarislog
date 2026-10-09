CREATE OR REPLACE FUNCTION public.tms_delivery_nf_access(p_nf_id text, p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.tms_module('/monitoramento')
 AND public.tms_collection('orders', CASE WHEN p_write THEN 'write' ELSE 'read' END)
 AND EXISTS (SELECT 1 FROM public.app_records WHERE collection = 'orders' AND id = p_nf_id);
$$;
REVOKE ALL ON FUNCTION public.tms_delivery_nf_access(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tms_delivery_nf_access(text, boolean) TO authenticated, service_role;
CREATE TABLE public.tms_delivery_proofs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 nf_id text NOT NULL,
 file_name text NOT NULL,
 file_path text NOT NULL UNIQUE,
 content_type text NOT NULL,
 file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tms_delivery_proofs TO authenticated;
GRANT ALL ON public.tms_delivery_proofs TO service_role;
ALTER TABLE public.tms_delivery_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read authorized delivery proofs" ON public.tms_delivery_proofs FOR SELECT TO authenticated USING (public.tms_delivery_nf_access(nf_id, false));
CREATE POLICY "Attach authorized delivery proofs" ON public.tms_delivery_proofs FOR INSERT TO authenticated WITH CHECK (
 public.tms_delivery_nf_access(nf_id, true) AND created_by = auth.uid()
 AND file_path = nf_id || '/' || id::text
 AND content_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
);
CREATE POLICY "Upload delivery proof files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id = 'comprovantes-entrega' AND public.tms_delivery_nf_access((storage.foldername(name))[1], true)
 AND owner_id = auth.uid()::text
);
CREATE POLICY "Read linked delivery proof files" ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id = 'comprovantes-entrega'
 AND EXISTS (SELECT 1 FROM public.tms_delivery_proofs p WHERE p.file_path = name AND public.tms_delivery_nf_access(p.nf_id, false))
);
CREATE POLICY "Cleanup unlinked delivery proof files" ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id = 'comprovantes-entrega' AND owner_id = auth.uid()::text
 AND public.tms_delivery_nf_access((storage.foldername(name))[1], true)
 AND NOT EXISTS (SELECT 1 FROM public.tms_delivery_proofs p WHERE p.file_path = name)
);