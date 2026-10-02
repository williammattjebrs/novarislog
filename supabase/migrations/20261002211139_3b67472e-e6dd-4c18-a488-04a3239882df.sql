DROP POLICY IF EXISTS "Leitura de papeis" ON public.user_roles;

CREATE POLICY "Leitura de papeis"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));