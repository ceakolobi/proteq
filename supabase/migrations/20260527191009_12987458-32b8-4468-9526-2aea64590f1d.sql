DROP POLICY IF EXISTS admin_empresa_manage_beneficios ON public.beneficios_extras;
DROP POLICY IF EXISTS admin_principal_full_beneficios ON public.beneficios_extras;

CREATE POLICY admin_empresa_manage_beneficios ON public.beneficios_extras
  AS PERMISSIVE FOR ALL TO authenticated
  USING (strict_company_isolation(company_id) AND (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional'::app_role)))
  WITH CHECK (strict_company_isolation(company_id) AND (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional'::app_role)));

CREATE POLICY admin_principal_full_beneficios ON public.beneficios_extras
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin_principal(auth.uid()))
  WITH CHECK (is_admin_principal(auth.uid()));