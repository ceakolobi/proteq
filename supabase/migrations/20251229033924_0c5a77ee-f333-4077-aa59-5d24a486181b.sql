-- =====================================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA - RBAC COMPLETO
-- Parte 1: Funções helper e políticas RLS
-- =====================================================

-- 1. Criar função para verificar se é system admin (admin@system.com)
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND email = 'admin@system.com'
  ) OR is_admin_principal(_user_id)
$$;

-- 2. Criar função melhorada de isolamento de empresa
CREATE OR REPLACE FUNCTION public.strict_company_isolation(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    -- System admin pode ver tudo
    WHEN is_system_admin(auth.uid()) THEN true
    -- Usuário não autenticado não vê nada
    WHEN auth.uid() IS NULL THEN false
    -- company_id NULL não é permitido para dados normais
    WHEN _company_id IS NULL THEN false
    -- Verificar se é da mesma empresa
    ELSE _company_id = get_user_company(auth.uid())
  END
$$;

-- 3. Criar função para verificar acesso a dados sensíveis
CREATE OR REPLACE FUNCTION public.can_view_sensitive_data(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_system_admin(_user_id) OR
    is_admin_principal(_user_id) OR
    has_role(_user_id, 'admin_regional') OR
    has_role(_user_id, 'cadastro')
$$;

-- 4. Criar função para verificar acesso financeiro
CREATE OR REPLACE FUNCTION public.can_access_financial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_system_admin(_user_id) OR
    is_admin_principal(_user_id) OR
    has_role(_user_id, 'admin_regional') OR
    has_role(_user_id, 'financeiro')
$$;

-- 5. Criar função para verificar acesso a vistorias
CREATE OR REPLACE FUNCTION public.can_access_vistoria_by_id(_user_id uuid, _vistoria_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_system_admin(_user_id) OR
    is_admin_principal(_user_id) OR
    has_role(_user_id, 'admin_regional') OR
    has_role(_user_id, 'cadastro') OR
    -- Vistoriador só vê vistorias atribuídas a ele
    (has_role(_user_id, 'vistoriador') AND EXISTS (
      SELECT 1 FROM public.vistorias
      WHERE id = _vistoria_id AND vistoriador_id = _user_id
    )) OR
    -- Consultor vê vistorias dos seus veículos
    (has_role(_user_id, 'consultor_vendas') AND EXISTS (
      SELECT 1 FROM public.vistorias v
      WHERE v.id = _vistoria_id AND v.consultor_id = _user_id
    ))
$$;

-- =====================================================
-- ATUALIZAR POLÍTICAS RLS - VISTORIAS
-- =====================================================

-- Remover políticas antigas de vistorias
DROP POLICY IF EXISTS "Admin principal full access vistorias" ON public.vistorias;
DROP POLICY IF EXISTS "Admin regional view vistorias" ON public.vistorias;
DROP POLICY IF EXISTS "Consultor view own vistorias" ON public.vistorias;
DROP POLICY IF EXISTS "Vistoriador view assigned vistorias" ON public.vistorias;
DROP POLICY IF EXISTS "company_isolation_vistorias" ON public.vistorias;

-- Criar novas políticas para vistorias
CREATE POLICY "system_admin_full_access_vistorias"
ON public.vistorias FOR ALL
USING (is_system_admin(auth.uid()));

CREATE POLICY "admin_empresa_manage_vistorias"
ON public.vistorias FOR ALL
USING (
  strict_company_isolation(company_id) AND
  (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional'))
);

CREATE POLICY "vistoriador_view_assigned"
ON public.vistorias FOR SELECT
USING (
  strict_company_isolation(company_id) AND
  has_role(auth.uid(), 'vistoriador') AND
  vistoriador_id = auth.uid()
);

CREATE POLICY "vistoriador_update_assigned"
ON public.vistorias FOR UPDATE
USING (
  strict_company_isolation(company_id) AND
  has_role(auth.uid(), 'vistoriador') AND
  vistoriador_id = auth.uid()
);

CREATE POLICY "consultor_view_own_vistorias"
ON public.vistorias FOR SELECT
USING (
  strict_company_isolation(company_id) AND
  has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

CREATE POLICY "cadastro_manage_vistorias"
ON public.vistorias FOR ALL
USING (
  strict_company_isolation(company_id) AND
  has_role(auth.uid(), 'cadastro')
);

-- =====================================================
-- ATUALIZAR POLÍTICAS RLS - PAGAMENTOS (Financeiro)
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admin principal full access pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Admin regional view pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Associado can view own pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Company isolation for pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "financeiro_manage_pagamentos" ON public.pagamentos;

-- Novas políticas para pagamentos
CREATE POLICY "system_admin_full_access_pagamentos"
ON public.pagamentos FOR ALL
USING (is_system_admin(auth.uid()));

CREATE POLICY "financeiro_full_access_pagamentos"
ON public.pagamentos FOR ALL
USING (
  strict_company_isolation(company_id) AND
  can_access_financial(auth.uid())
);

CREATE POLICY "associado_view_own_pagamentos"
ON public.pagamentos FOR SELECT
USING (
  strict_company_isolation(company_id) AND
  EXISTS (
    SELECT 1 FROM associados a
    WHERE a.id = pagamentos.associado_id 
    AND a.user_id = auth.uid()
  )
);

-- =====================================================
-- ATUALIZAR POLÍTICAS RLS - SETTINGS (remover NULL company)
-- =====================================================

DROP POLICY IF EXISTS "Admin principal can manage settings" ON public.settings;
DROP POLICY IF EXISTS "admin_only_view_settings" ON public.settings;
DROP POLICY IF EXISTS "company_isolation_settings" ON public.settings;

CREATE POLICY "system_admin_full_access_settings"
ON public.settings FOR ALL
USING (is_system_admin(auth.uid()));

CREATE POLICY "admin_empresa_manage_settings"
ON public.settings FOR ALL
USING (
  strict_company_isolation(company_id) AND
  is_admin_principal(auth.uid())
);

CREATE POLICY "admin_regional_view_settings"
ON public.settings FOR SELECT
USING (
  strict_company_isolation(company_id) AND
  has_role(auth.uid(), 'admin_regional')
);

-- =====================================================
-- ATUALIZAR POLÍTICAS RLS - COTAS (remover NULL company)
-- =====================================================

DROP POLICY IF EXISTS "Admin principal can manage cotas" ON public.cotas;
DROP POLICY IF EXISTS "Authenticated users can view cotas" ON public.cotas;
DROP POLICY IF EXISTS "Company isolation for cotas" ON public.cotas;

CREATE POLICY "system_admin_full_access_cotas"
ON public.cotas FOR ALL
USING (is_system_admin(auth.uid()));

CREATE POLICY "admin_empresa_manage_cotas"
ON public.cotas FOR ALL
USING (
  strict_company_isolation(company_id) AND
  (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional'))
);

CREATE POLICY "authenticated_view_company_cotas"
ON public.cotas FOR SELECT
USING (
  strict_company_isolation(company_id) AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- ATUALIZAR POLÍTICAS RLS - LEADS (Consultor só vê os seus)
-- =====================================================

DROP POLICY IF EXISTS "AdminPrincipal delete leads" ON public.leads;
DROP POLICY IF EXISTS "AdminPrincipal update all leads" ON public.leads;
DROP POLICY IF EXISTS "AdminPrincipal view all leads" ON public.leads;
DROP POLICY IF EXISTS "AdminRegional update sede leads" ON public.leads;
DROP POLICY IF EXISTS "AdminRegional view sede leads" ON public.leads;
DROP POLICY IF EXISTS "Authorized users create leads" ON public.leads;
DROP POLICY IF EXISTS "Company isolation for leads" ON public.leads;
DROP POLICY IF EXISTS "Consultor update own leads" ON public.leads;
DROP POLICY IF EXISTS "Consultor view own leads" ON public.leads;

CREATE POLICY "system_admin_full_access_leads"
ON public.leads FOR ALL
USING (is_system_admin(auth.uid()));

CREATE POLICY "admin_empresa_manage_leads"
ON public.leads FOR ALL
USING (
  strict_company_isolation(company_id) AND
  (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional'))
);

CREATE POLICY "consultor_crud_own_leads"
ON public.leads FOR ALL
USING (
  strict_company_isolation(company_id) AND
  has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
)
WITH CHECK (
  strict_company_isolation(company_id) AND
  has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- =====================================================
-- ATUALIZAR POLÍTICAS RLS - COTACOES (Consultor só vê as suas)
-- =====================================================

DROP POLICY IF EXISTS "Admin principal full access cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Admin regional manage cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Admin regional view cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Company isolation for cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Consultor create cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Consultor update own cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Consultor view own cotacoes" ON public.cotacoes;

CREATE POLICY "system_admin_full_access_cotacoes"
ON public.cotacoes FOR ALL
USING (is_system_admin(auth.uid()));

CREATE POLICY "admin_empresa_manage_cotacoes"
ON public.cotacoes FOR ALL
USING (
  strict_company_isolation(company_id) AND
  (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional'))
);

CREATE POLICY "consultor_crud_own_cotacoes"
ON public.cotacoes FOR ALL
USING (
  strict_company_isolation(company_id) AND
  has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
)
WITH CHECK (
  strict_company_isolation(company_id) AND
  has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- =====================================================
-- REMOVER POLÍTICAS REDUNDANTES DE BLOQUEIO ANÔNIMO
-- =====================================================

DROP POLICY IF EXISTS "Block anonymous access to acionamentos" ON public.acionamentos_guincho;
DROP POLICY IF EXISTS "Block anonymous access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Block anonymous access to cotacao_contatos" ON public.cotacao_contatos;
DROP POLICY IF EXISTS "Block anonymous access to access_logs" ON public.access_logs;
DROP POLICY IF EXISTS "Block anonymous access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Block anonymous access to companies" ON public.companies;

-- =====================================================
-- RESTRINGIR INSERÇÃO EM LOGS (exigir autenticação)
-- =====================================================

DROP POLICY IF EXISTS "System can insert access logs" ON public.access_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert fipe_logs" ON public.fipe_logs;

-- Apenas usuários autenticados podem inserir logs
CREATE POLICY "authenticated_insert_access_logs"
ON public.access_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_audit_logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_fipe_logs"
ON public.fipe_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);