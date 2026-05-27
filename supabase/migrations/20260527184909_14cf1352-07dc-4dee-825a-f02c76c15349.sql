
-- Recreate admin policies on cotas scoped to authenticated only,
-- so anon users do not trigger SECURITY DEFINER function checks they cannot execute.
DROP POLICY IF EXISTS "system_admin_full_access_cotas" ON public.cotas;
DROP POLICY IF EXISTS "admin_empresa_manage_cotas" ON public.cotas;
DROP POLICY IF EXISTS "Demo users cannot delete cotas" ON public.cotas;
DROP POLICY IF EXISTS "Demo users cannot insert cotas" ON public.cotas;
DROP POLICY IF EXISTS "Demo users cannot update cotas" ON public.cotas;

CREATE POLICY "system_admin_full_access_cotas"
ON public.cotas
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.is_system_admin(auth.uid()))
WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "admin_empresa_manage_cotas"
ON public.cotas
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.strict_company_isolation(company_id) AND (public.is_admin_principal(auth.uid()) OR public.has_role(auth.uid(), 'admin_regional'::app_role)))
WITH CHECK (public.strict_company_isolation(company_id) AND (public.is_admin_principal(auth.uid()) OR public.has_role(auth.uid(), 'admin_regional'::app_role)));

CREATE POLICY "Demo users cannot delete cotas"
ON public.cotas
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

CREATE POLICY "Demo users cannot insert cotas"
ON public.cotas
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

CREATE POLICY "Demo users cannot update cotas"
ON public.cotas
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Ensure base privileges exist
GRANT SELECT ON public.cotas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotas TO authenticated;
GRANT ALL ON public.cotas TO service_role;
