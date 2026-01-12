-- Verificar se RLS está habilitado na tabela cotacoes
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Cotacoes select own company" ON public.cotacoes;
DROP POLICY IF EXISTS "Cotacoes insert own" ON public.cotacoes;
DROP POLICY IF EXISTS "Cotacoes update own" ON public.cotacoes;
DROP POLICY IF EXISTS "Cotacoes delete admin" ON public.cotacoes;

-- Função helper para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin_or_gerente(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin_principal', 'admin_nivel_basico', 'gerente')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.is_admin_principal = true
  )
$$;

-- Política SELECT: Admins e gerentes veem todas da empresa, consultores veem apenas suas
CREATE POLICY "Cotacoes select policy"
ON public.cotacoes
FOR SELECT
TO authenticated
USING (
  -- Admin principal vê tudo
  (SELECT is_admin_principal FROM public.profiles WHERE id = auth.uid())
  OR
  -- Admins e gerentes veem cotações da mesma empresa
  (
    public.is_admin_or_gerente(auth.uid())
    AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
  OR
  -- Consultores veem apenas suas próprias cotações
  (consultor_id = auth.uid())
);

-- Política INSERT: Qualquer autenticado pode criar cotação
CREATE POLICY "Cotacoes insert policy"
ON public.cotacoes
FOR INSERT
TO authenticated
WITH CHECK (
  consultor_id = auth.uid()
);

-- Política UPDATE: Dono da cotação ou admin pode atualizar
CREATE POLICY "Cotacoes update policy"
ON public.cotacoes
FOR UPDATE
TO authenticated
USING (
  consultor_id = auth.uid()
  OR (SELECT is_admin_principal FROM public.profiles WHERE id = auth.uid())
  OR public.is_admin_or_gerente(auth.uid())
);

-- Política DELETE: Apenas admin pode deletar
CREATE POLICY "Cotacoes delete policy"
ON public.cotacoes
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin_principal FROM public.profiles WHERE id = auth.uid())
  OR public.is_admin_or_gerente(auth.uid())
);