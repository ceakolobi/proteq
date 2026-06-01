
-- 1. api_tokens: drop broad company-wide SELECT
DROP POLICY IF EXISTS "Usuários da mesma empresa podem ver tokens" ON public.api_tokens;
-- Keep admin SELECT, add admin_or_gerente SELECT scoped to company
CREATE POLICY "Admins e gerentes podem ver tokens da empresa"
  ON public.api_tokens FOR SELECT
  TO authenticated
  USING (is_admin_principal(auth.uid()) OR (is_admin_or_gerente(auth.uid()) AND strict_company_isolation(company_id)));

-- 2. profiles: drop anon SELECT
DROP POLICY IF EXISTS "Allow anonymous to read consultant profiles for lead creation" ON public.profiles;

-- 3. termos_aceite: restrict writes to staff roles
DROP POLICY IF EXISTS "Users can create terms" ON public.termos_aceite;
DROP POLICY IF EXISTS "Users can update terms from their company" ON public.termos_aceite;
DROP POLICY IF EXISTS "Users can view terms from their company" ON public.termos_aceite;

CREATE POLICY "Staff can view terms from their company"
  ON public.termos_aceite FOR SELECT
  TO authenticated
  USING (
    strict_company_isolation(company_id)
    AND (
      is_admin_principal(auth.uid())
      OR is_admin_or_gerente(auth.uid())
      OR has_role(auth.uid(), 'cadastro'::app_role)
      OR has_role(auth.uid(), 'admin_regional'::app_role)
      OR has_role(auth.uid(), 'financeiro'::app_role)
    )
  );

CREATE POLICY "Staff can create terms"
  ON public.termos_aceite FOR INSERT
  TO authenticated
  WITH CHECK (
    strict_company_isolation(company_id)
    AND (
      is_admin_principal(auth.uid())
      OR is_admin_or_gerente(auth.uid())
      OR has_role(auth.uid(), 'cadastro'::app_role)
      OR has_role(auth.uid(), 'admin_regional'::app_role)
    )
  );

CREATE POLICY "Staff can update terms"
  ON public.termos_aceite FOR UPDATE
  TO authenticated
  USING (
    strict_company_isolation(company_id)
    AND (
      is_admin_principal(auth.uid())
      OR is_admin_or_gerente(auth.uid())
      OR has_role(auth.uid(), 'cadastro'::app_role)
      OR has_role(auth.uid(), 'admin_regional'::app_role)
    )
  )
  WITH CHECK (
    strict_company_isolation(company_id)
    AND (
      is_admin_principal(auth.uid())
      OR is_admin_or_gerente(auth.uid())
      OR has_role(auth.uid(), 'cadastro'::app_role)
      OR has_role(auth.uid(), 'admin_regional'::app_role)
    )
  );

-- 4. propostas bucket: require authenticated upload
DROP POLICY IF EXISTS "Public can upload proposta PDFs" ON storage.objects;
CREATE POLICY "Authenticated can upload proposta PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'propostas' AND lower(name) LIKE '%.pdf');

-- 5. vistoria-fotos: require folder UUID maps to an existing pending/open vistoria
DROP POLICY IF EXISTS "Anon can upload vistoria-fotos" ON storage.objects;
CREATE POLICY "Anon can upload vistoria-fotos for open vistorias"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'vistoria-fotos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM public.vistorias v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.status IN ('pendente', 'em_andamento')
    )
  );
