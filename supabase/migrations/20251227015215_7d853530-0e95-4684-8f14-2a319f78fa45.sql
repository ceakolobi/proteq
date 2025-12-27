-- =====================================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA: RLS POLICIES
-- Bloquear explicitamente acesso anônimo/público
-- =====================================================

-- 1. ASSOCIADOS - Dados pessoais sensíveis (CPF, RG, endereço)
-- Criar policy que bloqueia anônimo explicitamente
CREATE POLICY "Block anonymous access to associados"
ON public.associados
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2. VEICULOS - Dados de veículos (chassi, placa, renavam)
CREATE POLICY "Block anonymous access to veiculos"
ON public.veiculos
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 3. PROFILES - Dados de funcionários
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 4. LEADS - Contatos de potenciais clientes
CREATE POLICY "Block anonymous access to leads"
ON public.leads
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 5. PAGAMENTOS - Dados financeiros
CREATE POLICY "Block anonymous access to pagamentos"
ON public.pagamentos
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 6. ACIONAMENTOS_GUINCHO - Dados de localização
CREATE POLICY "Block anonymous access to acionamentos"
ON public.acionamentos_guincho
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 7. VISTORIAS - Fotos e detalhes de inspeção
CREATE POLICY "Block anonymous access to vistorias"
ON public.vistorias
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 8. AUDIT_LOGS - Logs de auditoria
CREATE POLICY "Block anonymous access to audit_logs"
ON public.audit_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 9. PROPOSTAS - Propostas comerciais
CREATE POLICY "Block anonymous access to propostas"
ON public.propostas
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 10. USER_ROLES - Papéis de usuários
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- POLÍTICAS ADICIONAIS PARA CONSULTOR
-- Consultor só vê associados que ele próprio criou
-- =====================================================

-- Atualizar policy de consultor para associados (mais restritiva)
DROP POLICY IF EXISTS "Consultor can view own associados" ON public.associados;
CREATE POLICY "Consultor can view own associados"
ON public.associados
FOR SELECT
TO authenticated
USING (
  consultor_id = auth.uid()
  OR is_admin(auth.uid())
  OR has_role(auth.uid(), 'cadastro'::app_role)
  OR has_role(auth.uid(), 'financeiro'::app_role)
  OR (user_id = auth.uid())
);

-- Consultor só pode criar associados vinculados a si mesmo
DROP POLICY IF EXISTS "Consultor can create associados" ON public.associados;
CREATE POLICY "Consultor can create associados"
ON public.associados
FOR INSERT
TO authenticated
WITH CHECK (
  consultor_id = auth.uid()
  OR is_admin(auth.uid())
  OR has_role(auth.uid(), 'cadastro'::app_role)
);

-- Consultor só pode editar associados que criou
DROP POLICY IF EXISTS "Consultor can update own associados" ON public.associados;
CREATE POLICY "Consultor can update own associados"
ON public.associados
FOR UPDATE
TO authenticated
USING (
  consultor_id = auth.uid()
  OR is_admin(auth.uid())
  OR has_role(auth.uid(), 'cadastro'::app_role)
);

-- =====================================================
-- POLÍTICAS PARA VEÍCULOS - Consultor só vê veículos dos seus associados
-- =====================================================

DROP POLICY IF EXISTS "Consultor can view vehicles of own associados" ON public.veiculos;
CREATE POLICY "Consultor can view vehicles of own associados"
ON public.veiculos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.associados a
    WHERE a.id = veiculos.associado_id
    AND a.consultor_id = auth.uid()
  )
  OR is_admin(auth.uid())
  OR has_role(auth.uid(), 'cadastro'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.associados a
    WHERE a.id = veiculos.associado_id
    AND a.user_id = auth.uid()
  )
);

-- =====================================================
-- CRIAR TABELA DE LOGS DE ACESSO A DADOS SENSÍVEIS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de logs de acesso
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin principal pode ver logs de acesso
CREATE POLICY "Admin principal can view access logs"
ON public.access_logs
FOR SELECT
TO authenticated
USING (is_admin_principal(auth.uid()));

-- Sistema pode inserir logs
CREATE POLICY "System can insert access logs"
ON public.access_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Bloquear anônimo
CREATE POLICY "Block anonymous access to access_logs"
ON public.access_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- FUNÇÃO PARA REGISTRAR ACESSO A DADOS SENSÍVEIS
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  _action TEXT,
  _resource_type TEXT,
  _resource_id UUID DEFAULT NULL,
  _details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_email TEXT;
BEGIN
  -- Obter email do usuário atual
  SELECT email INTO _user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Inserir log
  INSERT INTO public.access_logs (
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    _user_email,
    _action,
    _resource_type,
    _resource_id,
    _details
  );
END;
$$;

-- =====================================================
-- GARANTIR QUE ADMIN@SYSTEM.COM TEM ROLE ADMIN_PRINCIPAL
-- =====================================================

-- Inserir role admin_principal se não existir
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin_principal'::app_role
FROM public.profiles p
WHERE p.email = 'admin@system.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'admin_principal'
);

-- Atualizar flag is_admin_principal
UPDATE public.profiles
SET is_admin_principal = true
WHERE email = 'admin@system.com';

-- =====================================================
-- CRIAR TRIGGERS DE PROTEÇÃO DO ADMIN PRINCIPAL
-- =====================================================

-- Função para verificar se é o admin protegido
CREATE OR REPLACE FUNCTION public.is_protected_admin(_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND email = 'admin@system.com'
  )
$$;

-- Trigger para proteger o perfil do admin principal
CREATE OR REPLACE FUNCTION public.protect_admin_principal_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bloquear exclusão do admin@system.com
  IF TG_OP = 'DELETE' AND OLD.email = 'admin@system.com' THEN
    RAISE EXCEPTION 'Cannot delete admin principal profile';
  END IF;
  
  -- Bloquear alteração de campos críticos
  IF TG_OP = 'UPDATE' AND OLD.email = 'admin@system.com' THEN
    IF NEW.email != OLD.email THEN
      RAISE EXCEPTION 'Cannot change admin principal email';
    END IF;
    IF NEW.is_admin_principal = false THEN
      RAISE EXCEPTION 'Cannot remove admin principal flag';
    END IF;
    IF NEW.ativo = false THEN
      RAISE EXCEPTION 'Cannot deactivate admin principal';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar trigger no profiles
DROP TRIGGER IF EXISTS protect_admin_principal_profile_trigger ON public.profiles;
CREATE TRIGGER protect_admin_principal_profile_trigger
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_principal_profile();

-- Trigger para proteger role admin_principal
CREATE OR REPLACE FUNCTION public.protect_admin_principal_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bloquear remoção de role admin_principal do admin@system.com
  IF TG_OP = 'DELETE' AND OLD.role = 'admin_principal' THEN
    IF is_protected_admin(OLD.user_id) THEN
      RAISE EXCEPTION 'Cannot remove admin_principal role from protected admin';
    END IF;
  END IF;
  
  -- Bloquear alteração de role do admin protegido
  IF TG_OP = 'UPDATE' AND OLD.role = 'admin_principal' THEN
    IF is_protected_admin(OLD.user_id) AND NEW.role != 'admin_principal' THEN
      RAISE EXCEPTION 'Cannot change admin_principal role for protected admin';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar trigger no user_roles
DROP TRIGGER IF EXISTS protect_admin_principal_role_trigger ON public.user_roles;
CREATE TRIGGER protect_admin_principal_role_trigger
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_principal_role();