-- Update is_demo_user function to check for admin_demo role
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin_demo'
  )
$$;

-- Block demo user from INSERT on associados
DROP POLICY IF EXISTS "Demo users cannot insert associados" ON public.associados;
CREATE POLICY "Demo users cannot insert associados"
ON public.associados
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

-- Block demo user from UPDATE on associados
DROP POLICY IF EXISTS "Demo users cannot update associados" ON public.associados;
CREATE POLICY "Demo users cannot update associados"
ON public.associados
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from DELETE on associados
DROP POLICY IF EXISTS "Demo users cannot delete associados" ON public.associados;
CREATE POLICY "Demo users cannot delete associados"
ON public.associados
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from INSERT on veiculos
DROP POLICY IF EXISTS "Demo users cannot insert veiculos" ON public.veiculos;
CREATE POLICY "Demo users cannot insert veiculos"
ON public.veiculos
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

-- Block demo user from UPDATE on veiculos
DROP POLICY IF EXISTS "Demo users cannot update veiculos" ON public.veiculos;
CREATE POLICY "Demo users cannot update veiculos"
ON public.veiculos
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from DELETE on veiculos
DROP POLICY IF EXISTS "Demo users cannot delete veiculos" ON public.veiculos;
CREATE POLICY "Demo users cannot delete veiculos"
ON public.veiculos
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from INSERT on leads
DROP POLICY IF EXISTS "Demo users cannot insert leads" ON public.leads;
CREATE POLICY "Demo users cannot insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

-- Block demo user from UPDATE on leads
DROP POLICY IF EXISTS "Demo users cannot update leads" ON public.leads;
CREATE POLICY "Demo users cannot update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from DELETE on leads
DROP POLICY IF EXISTS "Demo users cannot delete leads" ON public.leads;
CREATE POLICY "Demo users cannot delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from INSERT on cotacoes
DROP POLICY IF EXISTS "Demo users cannot insert cotacoes" ON public.cotacoes;
CREATE POLICY "Demo users cannot insert cotacoes"
ON public.cotacoes
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

-- Block demo user from UPDATE on cotacoes
DROP POLICY IF EXISTS "Demo users cannot update cotacoes" ON public.cotacoes;
CREATE POLICY "Demo users cannot update cotacoes"
ON public.cotacoes
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from DELETE on cotacoes
DROP POLICY IF EXISTS "Demo users cannot delete cotacoes" ON public.cotacoes;
CREATE POLICY "Demo users cannot delete cotacoes"
ON public.cotacoes
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying profiles
DROP POLICY IF EXISTS "Demo users cannot update profiles" ON public.profiles;
CREATE POLICY "Demo users cannot update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from user_roles modifications
DROP POLICY IF EXISTS "Demo users cannot insert user_roles" ON public.user_roles;
CREATE POLICY "Demo users cannot insert user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update user_roles" ON public.user_roles;
CREATE POLICY "Demo users cannot update user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete user_roles" ON public.user_roles;
CREATE POLICY "Demo users cannot delete user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying cotas
DROP POLICY IF EXISTS "Demo users cannot insert cotas" ON public.cotas;
CREATE POLICY "Demo users cannot insert cotas"
ON public.cotas
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update cotas" ON public.cotas;
CREATE POLICY "Demo users cannot update cotas"
ON public.cotas
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete cotas" ON public.cotas;
CREATE POLICY "Demo users cannot delete cotas"
ON public.cotas
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying companies
DROP POLICY IF EXISTS "Demo users cannot insert companies" ON public.companies;
CREATE POLICY "Demo users cannot insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update companies" ON public.companies;
CREATE POLICY "Demo users cannot update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete companies" ON public.companies;
CREATE POLICY "Demo users cannot delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying sedes
DROP POLICY IF EXISTS "Demo users cannot insert sedes" ON public.sedes;
CREATE POLICY "Demo users cannot insert sedes"
ON public.sedes
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update sedes" ON public.sedes;
CREATE POLICY "Demo users cannot update sedes"
ON public.sedes
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete sedes" ON public.sedes;
CREATE POLICY "Demo users cannot delete sedes"
ON public.sedes
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying regioes
DROP POLICY IF EXISTS "Demo users cannot insert regioes" ON public.regioes;
CREATE POLICY "Demo users cannot insert regioes"
ON public.regioes
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update regioes" ON public.regioes;
CREATE POLICY "Demo users cannot update regioes"
ON public.regioes
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete regioes" ON public.regioes;
CREATE POLICY "Demo users cannot delete regioes"
ON public.regioes
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying mensalidades
DROP POLICY IF EXISTS "Demo users cannot insert mensalidades" ON public.mensalidades;
CREATE POLICY "Demo users cannot insert mensalidades"
ON public.mensalidades
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update mensalidades" ON public.mensalidades;
CREATE POLICY "Demo users cannot update mensalidades"
ON public.mensalidades
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete mensalidades" ON public.mensalidades;
CREATE POLICY "Demo users cannot delete mensalidades"
ON public.mensalidades
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying pagamentos
DROP POLICY IF EXISTS "Demo users cannot insert pagamentos" ON public.pagamentos;
CREATE POLICY "Demo users cannot insert pagamentos"
ON public.pagamentos
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update pagamentos" ON public.pagamentos;
CREATE POLICY "Demo users cannot update pagamentos"
ON public.pagamentos
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete pagamentos" ON public.pagamentos;
CREATE POLICY "Demo users cannot delete pagamentos"
ON public.pagamentos
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying configuracoes_financeiras
DROP POLICY IF EXISTS "Demo users cannot insert configuracoes_financeiras" ON public.configuracoes_financeiras;
CREATE POLICY "Demo users cannot insert configuracoes_financeiras"
ON public.configuracoes_financeiras
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update configuracoes_financeiras" ON public.configuracoes_financeiras;
CREATE POLICY "Demo users cannot update configuracoes_financeiras"
ON public.configuracoes_financeiras
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete configuracoes_financeiras" ON public.configuracoes_financeiras;
CREATE POLICY "Demo users cannot delete configuracoes_financeiras"
ON public.configuracoes_financeiras
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying vistorias
DROP POLICY IF EXISTS "Demo users cannot insert vistorias" ON public.vistorias;
CREATE POLICY "Demo users cannot insert vistorias"
ON public.vistorias
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update vistorias" ON public.vistorias;
CREATE POLICY "Demo users cannot update vistorias"
ON public.vistorias
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete vistorias" ON public.vistorias;
CREATE POLICY "Demo users cannot delete vistorias"
ON public.vistorias
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying ativacoes
DROP POLICY IF EXISTS "Demo users cannot insert ativacoes" ON public.ativacoes;
CREATE POLICY "Demo users cannot insert ativacoes"
ON public.ativacoes
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update ativacoes" ON public.ativacoes;
CREATE POLICY "Demo users cannot update ativacoes"
ON public.ativacoes
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete ativacoes" ON public.ativacoes;
CREATE POLICY "Demo users cannot delete ativacoes"
ON public.ativacoes
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

-- Block demo user from modifying user_permissions
DROP POLICY IF EXISTS "Demo users cannot insert user_permissions" ON public.user_permissions;
CREATE POLICY "Demo users cannot insert user_permissions"
ON public.user_permissions
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot update user_permissions" ON public.user_permissions;
CREATE POLICY "Demo users cannot update user_permissions"
ON public.user_permissions
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));

DROP POLICY IF EXISTS "Demo users cannot delete user_permissions" ON public.user_permissions;
CREATE POLICY "Demo users cannot delete user_permissions"
ON public.user_permissions
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user(auth.uid()));