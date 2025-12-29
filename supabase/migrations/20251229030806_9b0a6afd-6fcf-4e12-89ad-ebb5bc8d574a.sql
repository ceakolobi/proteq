-- =====================================================
-- MULTI-TENANT ARCHITECTURE: Companies Table
-- =====================================================

-- 1. Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text UNIQUE,
  email text,
  telefone text,
  site text,
  endereco text,
  cidade text,
  estado text,
  -- Branding
  logo text,
  logo_branca text,
  cor_primaria text DEFAULT '#F97316',
  cor_secundaria text DEFAULT '#22C55E',
  cor_destaque text DEFAULT '#F59E0B',
  -- PDF Settings
  texto_institucional text DEFAULT 'Esta proposta tem validade de 7 dias. Os valores podem sofrer alteração conforme tabela FIPE vigente no momento da contratação. A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade.',
  pdf_contracapa text,
  cover_1 text,
  cover_2 text,
  cover_3 text,
  cover_4 text,
  cover_mode text DEFAULT 'fixed',
  cover_fixed_index integer DEFAULT 1,
  -- Status
  ativo boolean DEFAULT true,
  modo_white_label boolean DEFAULT false,
  esconder_marca_harmony boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3. Add company_id to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 4. Create function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

-- 5. Create function to check if user belongs to same company
CREATE OR REPLACE FUNCTION public.same_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT company_id FROM public.profiles WHERE id = _user_id) = _company_id
$$;

-- 6. RLS Policies for companies
CREATE POLICY "Users can view own company"
ON public.companies FOR SELECT
USING (id = get_user_company(auth.uid()));

CREATE POLICY "Admin principal of company can update"
ON public.companies FOR UPDATE
USING (id = get_user_company(auth.uid()) AND is_admin_principal(auth.uid()));

CREATE POLICY "Block anonymous access to companies"
ON public.companies FOR ALL
USING (false)
WITH CHECK (false);

-- 7. Add company_id to key tables
ALTER TABLE public.sedes ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.regioes ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.associados ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.ativacoes ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.vistorias ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.cotas ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_sedes_company ON public.sedes(company_id);
CREATE INDEX IF NOT EXISTS idx_regioes_company ON public.regioes(company_id);
CREATE INDEX IF NOT EXISTS idx_associados_company ON public.associados(company_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_company ON public.veiculos(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_company ON public.cotacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_propostas_company ON public.propostas(company_id);
CREATE INDEX IF NOT EXISTS idx_ativacoes_company ON public.ativacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_company ON public.vistorias(company_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_company ON public.pagamentos(company_id);
CREATE INDEX IF NOT EXISTS idx_cotas_company ON public.cotas(company_id);

-- 9. Create default company (Harmony Agro)
INSERT INTO public.companies (id, nome, email, telefone, site)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Harmony Agro',
  'contato@harmonyagro.com.br',
  '(00) 00000-0000',
  'www.harmonyagro.com.br'
)
ON CONFLICT DO NOTHING;