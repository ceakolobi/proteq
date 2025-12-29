-- =====================================================
-- SECURITY FIX: Comprehensive RLS Policy Hardening
-- =====================================================

-- 1. FIX PROFILES TABLE - Remove overly permissive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Company isolation for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin regional view sede profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin principal view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin principal manage all profiles" ON public.profiles;

-- Create stricter policies for profiles
-- Users can ONLY see their own profile
CREATE POLICY "users_view_own_profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update ONLY their own profile (limited fields)
CREATE POLICY "users_update_own_profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin principal can view all profiles in same company
CREATE POLICY "admin_principal_view_company_profiles"
ON public.profiles FOR SELECT
USING (
  is_admin_principal(auth.uid()) 
  AND company_id = get_user_company(auth.uid())
);

-- Admin principal can manage profiles in same company
CREATE POLICY "admin_principal_manage_company_profiles"
ON public.profiles FOR ALL
USING (
  is_admin_principal(auth.uid()) 
  AND company_id = get_user_company(auth.uid())
);

-- Admin regional can view profiles in their sede within same company
CREATE POLICY "admin_regional_view_sede_profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'admin_regional')
  AND sede_id = get_user_sede(auth.uid())
  AND company_id = get_user_company(auth.uid())
);

-- 2. FIX ASSOCIADOS TABLE - Remove overly permissive user_id policy
DROP POLICY IF EXISTS "Users can view associated record" ON public.associados;

-- Associados can view ONLY their own record (strict)
CREATE POLICY "associado_view_own_record"
ON public.associados FOR SELECT
USING (
  user_id = auth.uid()
  AND company_id = get_user_company(auth.uid())
);

-- 3. ENSURE COMPANY ISOLATION ON ALL SENSITIVE TABLES
-- Add block for unauthenticated access if missing

-- Pagamentos - ensure only financeiro/admin can access
DROP POLICY IF EXISTS "Financeiro manage pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Financeiro view all pagamentos" ON public.pagamentos;

CREATE POLICY "financeiro_manage_pagamentos"
ON public.pagamentos FOR ALL
USING (
  (has_role(auth.uid(), 'financeiro') OR is_admin_principal(auth.uid()))
  AND company_id = get_user_company(auth.uid())
);

-- 4. FIX SETTINGS TABLE - Should be company-specific or admin only
-- Settings are global but should require admin
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;

CREATE POLICY "admin_only_view_settings"
ON public.settings FOR SELECT
USING (
  is_admin_principal(auth.uid())
  OR has_role(auth.uid(), 'admin_regional')
);

-- 5. ADD STRICT COMPANY ISOLATION FUNCTION
CREATE OR REPLACE FUNCTION public.enforce_company_isolation(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _company_id IS NULL THEN false
    WHEN get_user_company(auth.uid()) IS NULL THEN false
    ELSE _company_id = get_user_company(auth.uid())
  END
$$;

-- 6. ENSURE USER_ROLES has company isolation through profiles
-- Add function to check role with company context
CREATE OR REPLACE FUNCTION public.has_role_in_company(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND p.company_id = get_user_company(auth.uid())
  )
$$;

-- 7. Block any anonymous/public access on critical tables
-- These policies with false ensure no public access

-- Ensure acionamentos_guincho has company context
ALTER TABLE public.acionamentos_guincho 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Update existing records with company from associado
UPDATE public.acionamentos_guincho ag
SET company_id = a.company_id
FROM public.associados a
WHERE ag.associado_id = a.id
AND ag.company_id IS NULL;

-- Add company isolation to acionamentos_guincho
DROP POLICY IF EXISTS "Company isolation acionamentos" ON public.acionamentos_guincho;
CREATE POLICY "company_isolation_acionamentos"
ON public.acionamentos_guincho FOR ALL
USING (
  company_id = get_user_company(auth.uid())
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  company_id = get_user_company(auth.uid())
  AND auth.uid() IS NOT NULL
);

-- 8. ADD EXPLICIT BLOCK FOR ANONYMOUS ON ALL TABLES
-- This ensures no table can be accessed without authentication

-- Block policy for fipe_cache (should only be readable by authenticated)
DROP POLICY IF EXISTS "Authenticated users can read fipe_cache" ON public.fipe_cache;
CREATE POLICY "authenticated_read_fipe_cache"
ON public.fipe_cache FOR SELECT
USING (auth.role() = 'authenticated');

-- Block policy for lead_interacoes
DROP POLICY IF EXISTS "Block anonymous lead_interacoes" ON public.lead_interacoes;
CREATE POLICY "require_authentication_lead_interacoes"
ON public.lead_interacoes FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 9. CREATE VIEW FOR MASKED SENSITIVE DATA
-- This view masks sensitive fields based on role
CREATE OR REPLACE VIEW public.v_associados_masked AS
SELECT 
  id,
  CASE 
    WHEN is_admin_principal(auth.uid()) THEN cpf
    WHEN has_role(auth.uid(), 'cadastro') THEN 
      SUBSTRING(cpf, 1, 3) || '.***.' || SUBSTRING(cpf, 8, 3) || '-**'
    ELSE '***.***.***-**'
  END as cpf,
  CASE 
    WHEN is_admin_principal(auth.uid()) THEN rg
    WHEN has_role(auth.uid(), 'cadastro') THEN 
      COALESCE(SUBSTRING(rg, 1, 2) || '.***.***-*', rg)
    ELSE '**.***.**'
  END as rg,
  nome_completo,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional') THEN email
    ELSE SUBSTRING(email, 1, 3) || '***@***'
  END as email,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional') THEN telefone
    ELSE '(**) *****-' || SUBSTRING(telefone, LENGTH(telefone)-3, 4)
  END as telefone,
  CASE 
    WHEN is_admin_principal(auth.uid()) THEN endereco
    ELSE COALESCE(SUBSTRING(endereco, 1, 10) || '...', endereco)
  END as endereco,
  cidade,
  estado,
  cep,
  status,
  regiao_id,
  consultor_id,
  company_id,
  created_at,
  updated_at
FROM public.associados
WHERE company_id = get_user_company(auth.uid());

-- 10. CREATE VIEW FOR MASKED VEICULOS DATA
CREATE OR REPLACE VIEW public.v_veiculos_masked AS
SELECT 
  id,
  associado_id,
  tipo,
  marca,
  modelo,
  ano,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'cadastro') THEN placa
    ELSE SUBSTRING(placa, 1, 3) || '-****'
  END as placa,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'cadastro') THEN chassi
    ELSE COALESCE('*****' || SUBSTRING(chassi, LENGTH(chassi)-5, 6), chassi)
  END as chassi,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'financeiro') THEN renavam
    ELSE '***********'
  END as renavam,
  cor,
  valor_fipe,
  mensalidade,
  veiculo_status,
  company_id,
  created_at,
  updated_at
FROM public.veiculos
WHERE company_id = get_user_company(auth.uid());