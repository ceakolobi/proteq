-- =====================================================
-- UPDATE RLS POLICIES WITH COMPANY ISOLATION
-- =====================================================

-- Drop old "block anonymous" policies that weren't effective and recreate with company filter

-- 1. ASSOCIADOS - Fix RLS with company isolation
DROP POLICY IF EXISTS "Block anonymous access to associados" ON public.associados;

CREATE POLICY "Company isolation for associados"
ON public.associados FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 2. PROFILES - Fix RLS with company isolation  
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

CREATE POLICY "Company isolation for profiles"
ON public.profiles FOR SELECT
USING (company_id = get_user_company(auth.uid()) OR auth.uid() = id);

-- 3. PAGAMENTOS - Fix RLS with company isolation
DROP POLICY IF EXISTS "Block anonymous access to pagamentos" ON public.pagamentos;

CREATE POLICY "Company isolation for pagamentos"
ON public.pagamentos FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 4. VEICULOS - Add company isolation
DROP POLICY IF EXISTS "Block anonymous veiculos" ON public.veiculos;

CREATE POLICY "Company isolation for veiculos"
ON public.veiculos FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 5. LEADS - Add company isolation
DROP POLICY IF EXISTS "Block anonymous leads" ON public.leads;

CREATE POLICY "Company isolation for leads"
ON public.leads FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 6. COTACOES - Add company isolation
DROP POLICY IF EXISTS "Block anonymous access to cotacoes" ON public.cotacoes;

CREATE POLICY "Company isolation for cotacoes"
ON public.cotacoes FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 7. PROPOSTAS - Add company isolation
DROP POLICY IF EXISTS "Block anonymous access to propostas" ON public.propostas;

CREATE POLICY "Company isolation for propostas"
ON public.propostas FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 8. ATIVACOES - Add company isolation
DROP POLICY IF EXISTS "Block anonymous access to ativacoes" ON public.ativacoes;

CREATE POLICY "Company isolation for ativacoes"
ON public.ativacoes FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 9. VISTORIAS - Add company isolation
DROP POLICY IF EXISTS "Block anonymous access to vistorias" ON public.vistorias;

CREATE POLICY "Company isolation for vistorias"
ON public.vistorias FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 10. SEDES - Add company isolation
CREATE POLICY "Company isolation for sedes"
ON public.sedes FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 11. REGIOES - Add company isolation
CREATE POLICY "Company isolation for regioes"
ON public.regioes FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 12. COTAS - Add company isolation for management
CREATE POLICY "Company isolation for cotas"
ON public.cotas FOR ALL
USING (company_id = get_user_company(auth.uid()) OR company_id IS NULL)
WITH CHECK (company_id = get_user_company(auth.uid()));

-- 13. Update handle_new_user to set company_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', NEW.email),
    NEW.email,
    (NEW.raw_user_meta_data ->> 'company_id')::uuid
  );
  RETURN NEW;
END;
$$;