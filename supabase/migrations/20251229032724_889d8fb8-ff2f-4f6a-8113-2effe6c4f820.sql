-- =====================================================
-- ADD company_id AND created_by FOR DATA ISOLATION & AUDIT
-- =====================================================

-- 1. ACCESS_LOGS - Add company_id
ALTER TABLE public.access_logs 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 2. COTACAO_CONTATOS - Add company_id
ALTER TABLE public.cotacao_contatos 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Update cotacao_contatos with company from cotacoes
UPDATE public.cotacao_contatos cc
SET company_id = c.company_id
FROM public.cotacoes c
WHERE cc.cotacao_id = c.id
AND cc.company_id IS NULL;

-- 3. LEAD_INTERACOES - Add company_id
ALTER TABLE public.lead_interacoes 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Update lead_interacoes with company from leads
UPDATE public.lead_interacoes li
SET company_id = l.company_id
FROM public.leads l
WHERE li.lead_id = l.id
AND li.company_id IS NULL;

-- 4. SETTINGS - Add company_id (for multi-tenant settings)
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 5. USER_ROLES - Add company_id for company isolation
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Update user_roles with company from profiles
UPDATE public.user_roles ur
SET company_id = p.company_id
FROM public.profiles p
WHERE ur.user_id = p.id
AND ur.company_id IS NULL;

-- =====================================================
-- ADD created_by TO ALL BUSINESS TABLES
-- =====================================================

-- Associados
ALTER TABLE public.associados 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Ativacoes
ALTER TABLE public.ativacoes 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Cotacoes
ALTER TABLE public.cotacoes 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Cotas
ALTER TABLE public.cotas 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Pagamentos
ALTER TABLE public.pagamentos 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Propostas
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Regioes
ALTER TABLE public.regioes 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Sedes
ALTER TABLE public.sedes 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Veiculos
ALTER TABLE public.veiculos 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Vistorias
ALTER TABLE public.vistorias 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Acionamentos Guincho
ALTER TABLE public.acionamentos_guincho 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Cotacao Contatos
ALTER TABLE public.cotacao_contatos 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Lead Interacoes
ALTER TABLE public.lead_interacoes 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Access Logs (already has user_id, but add created_by for consistency)
ALTER TABLE public.access_logs 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Audit Logs (already has user_id, but add created_by for consistency)
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- =====================================================
-- UPDATE RLS POLICIES FOR NEW company_id COLUMNS
-- =====================================================

-- Cotacao Contatos - Add company isolation
DROP POLICY IF EXISTS "Company isolation cotacao_contatos" ON public.cotacao_contatos;
CREATE POLICY "company_isolation_cotacao_contatos"
ON public.cotacao_contatos FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- Lead Interacoes - Add company isolation
DROP POLICY IF EXISTS "Company isolation lead_interacoes" ON public.lead_interacoes;
CREATE POLICY "company_isolation_lead_interacoes"
ON public.lead_interacoes FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

-- User Roles - Add company isolation
DROP POLICY IF EXISTS "Company isolation user_roles" ON public.user_roles;
CREATE POLICY "company_isolation_user_roles"
ON public.user_roles FOR SELECT
USING (company_id = get_user_company(auth.uid()) OR auth.uid() = user_id);

-- Settings - Add company isolation (replaces admin-only if multi-tenant)
DROP POLICY IF EXISTS "Company isolation settings" ON public.settings;
CREATE POLICY "company_isolation_settings"
ON public.settings FOR ALL
USING (
  company_id IS NULL -- Global settings for admins
  OR company_id = get_user_company(auth.uid())
);

-- Access Logs - Add company isolation
DROP POLICY IF EXISTS "Company isolation access_logs" ON public.access_logs;
CREATE POLICY "company_isolation_access_logs"
ON public.access_logs FOR SELECT
USING (
  is_admin_principal(auth.uid())
  AND (company_id IS NULL OR company_id = get_user_company(auth.uid()))
);

-- =====================================================
-- CREATE TRIGGER TO AUTO-SET created_by AND company_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_created_by_and_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set created_by if column exists and is null
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
    
    -- Set company_id if column exists and is null
    IF NEW.company_id IS NULL AND auth.uid() IS NOT NULL THEN
      NEW.company_id := get_user_company(auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to main business tables
DROP TRIGGER IF EXISTS set_created_by_associados ON public.associados;
CREATE TRIGGER set_created_by_associados
  BEFORE INSERT ON public.associados
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_leads ON public.leads;
CREATE TRIGGER set_created_by_leads
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_cotacoes ON public.cotacoes;
CREATE TRIGGER set_created_by_cotacoes
  BEFORE INSERT ON public.cotacoes
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_veiculos ON public.veiculos;
CREATE TRIGGER set_created_by_veiculos
  BEFORE INSERT ON public.veiculos
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_propostas ON public.propostas;
CREATE TRIGGER set_created_by_propostas
  BEFORE INSERT ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_vistorias ON public.vistorias;
CREATE TRIGGER set_created_by_vistorias
  BEFORE INSERT ON public.vistorias
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_pagamentos ON public.pagamentos;
CREATE TRIGGER set_created_by_pagamentos
  BEFORE INSERT ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_ativacoes ON public.ativacoes;
CREATE TRIGGER set_created_by_ativacoes
  BEFORE INSERT ON public.ativacoes
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_acionamentos ON public.acionamentos_guincho;
CREATE TRIGGER set_created_by_acionamentos
  BEFORE INSERT ON public.acionamentos_guincho
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_cotacao_contatos ON public.cotacao_contatos;
CREATE TRIGGER set_created_by_cotacao_contatos
  BEFORE INSERT ON public.cotacao_contatos
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();

DROP TRIGGER IF EXISTS set_created_by_lead_interacoes ON public.lead_interacoes;
CREATE TRIGGER set_created_by_lead_interacoes
  BEFORE INSERT ON public.lead_interacoes
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_company();