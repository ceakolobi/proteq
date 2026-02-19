
-- Drop ALL existing policies on cotacoes to start clean
DROP POLICY IF EXISTS "Anon pode criar cotacao publica" ON public.cotacoes;
DROP POLICY IF EXISTS "Cotacoes insert policy" ON public.cotacoes;
DROP POLICY IF EXISTS "Cotacoes select policy" ON public.cotacoes;
DROP POLICY IF EXISTS "Cotacoes update policy" ON public.cotacoes;
DROP POLICY IF EXISTS "Cotacoes delete policy" ON public.cotacoes;
DROP POLICY IF EXISTS "Demo users cannot insert cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Demo users cannot update cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Demo users cannot delete cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "admin_empresa_manage_cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "consultor_crud_own_cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "system_admin_full_access_cotacoes" ON public.cotacoes;

-- CREATE CLEAN POLICIES

-- 1. SELECT: admin principal vê tudo, admin/gerente vê da empresa, consultor vê as suas
CREATE POLICY "cotacoes_select" ON public.cotacoes FOR SELECT TO authenticated
USING (
  is_admin_principal(auth.uid())
  OR (is_admin_or_gerente(auth.uid()) AND company_id = get_user_company(auth.uid()))
  OR consultor_id = auth.uid()
);

-- 2. INSERT authenticated: dono, admin ou gerente podem inserir
CREATE POLICY "cotacoes_insert_auth" ON public.cotacoes FOR INSERT TO authenticated
WITH CHECK (
  consultor_id = auth.uid()
  OR is_admin_principal(auth.uid())
  OR is_admin_or_gerente(auth.uid())
);

-- 3. INSERT anon: funil público pode criar cotações
CREATE POLICY "cotacoes_insert_anon" ON public.cotacoes FOR INSERT TO anon
WITH CHECK (true);

-- 4. UPDATE: dono, admin ou gerente
CREATE POLICY "cotacoes_update" ON public.cotacoes FOR UPDATE TO authenticated
USING (
  consultor_id = auth.uid()
  OR is_admin_principal(auth.uid())
  OR is_admin_or_gerente(auth.uid())
);

-- 5. DELETE: apenas admins
CREATE POLICY "cotacoes_delete" ON public.cotacoes FOR DELETE TO authenticated
USING (
  is_admin_principal(auth.uid())
  OR is_admin_or_gerente(auth.uid())
);
