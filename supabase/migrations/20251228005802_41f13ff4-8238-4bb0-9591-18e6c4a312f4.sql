-- =====================================
-- PARTE 1: CRIAR FUNÇÕES AUXILIARES
-- =====================================

-- Função has_role para verificar se o usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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
      AND role = _role
  )
$$;

-- Função get_user_sede para obter a sede do usuário
CREATE OR REPLACE FUNCTION public.get_user_sede(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sede_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Função can_access_sede para verificar se usuário pode acessar dados da sede
CREATE OR REPLACE FUNCTION public.can_access_sede(_user_id uuid, _sede_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_admin_principal(_user_id) OR
    (SELECT sede_id FROM public.profiles WHERE id = _user_id) = _sede_id
$$;

-- Função can_access_regiao para verificar se usuário pode acessar dados da região
CREATE OR REPLACE FUNCTION public.can_access_regiao(_user_id uuid, _regiao_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_admin_principal(_user_id) OR
    (SELECT regiao_id FROM public.profiles WHERE id = _user_id) = _regiao_id OR
    EXISTS (
      SELECT 1 FROM public.regioes r
      JOIN public.profiles p ON p.sede_id = r.sede_id
      WHERE r.id = _regiao_id AND p.id = _user_id
    )
$$;

-- =====================================
-- PARTE 2: RLS POLICIES PARA PROFILES
-- =====================================

-- Permitir admin_principal ver todos os profiles
CREATE POLICY "Admin principal view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin_principal(auth.uid()));

-- Permitir admin da sede ver profiles da sua sede
CREATE POLICY "Admin regional view sede profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  sede_id = public.get_user_sede(auth.uid())
);

-- Admin principal pode gerenciar todos os profiles
CREATE POLICY "Admin principal manage all profiles"
ON public.profiles
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- =====================================
-- PARTE 3: RLS POLICIES PARA LEADS
-- =====================================

-- Admin principal acesso total a leads
CREATE POLICY "Admin principal full access leads"
ON public.leads
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- Admin regional ver leads da sua sede (via região)
CREATE POLICY "Admin regional view leads by sede"
ON public.leads
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  public.can_access_regiao(auth.uid(), regiao_id)
);

-- Admin regional gerenciar leads da sua sede
CREATE POLICY "Admin regional manage leads"
ON public.leads
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  public.can_access_regiao(auth.uid(), regiao_id)
);

-- Consultor ver próprios leads
CREATE POLICY "Consultor view own leads"
ON public.leads
FOR SELECT
USING (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- Consultor criar leads
CREATE POLICY "Consultor create leads"
ON public.leads
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- Consultor atualizar próprios leads
CREATE POLICY "Consultor update own leads"
ON public.leads
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- =====================================
-- PARTE 4: RLS POLICIES PARA COTAÇÕES
-- =====================================

-- Admin principal acesso total a cotações
CREATE POLICY "Admin principal full access cotacoes"
ON public.cotacoes
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- Admin regional ver cotações da sua sede
CREATE POLICY "Admin regional view cotacoes"
ON public.cotacoes
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  public.can_access_regiao(auth.uid(), regiao_id)
);

-- Admin regional gerenciar cotações
CREATE POLICY "Admin regional manage cotacoes"
ON public.cotacoes
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  public.can_access_regiao(auth.uid(), regiao_id)
);

-- Consultor ver próprias cotações
CREATE POLICY "Consultor view own cotacoes"
ON public.cotacoes
FOR SELECT
USING (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- Consultor criar cotações
CREATE POLICY "Consultor create cotacoes"
ON public.cotacoes
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- Consultor atualizar próprias cotações
CREATE POLICY "Consultor update own cotacoes"
ON public.cotacoes
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- =====================================
-- PARTE 5: RLS POLICIES PARA COTACAO_CONTATOS
-- =====================================

-- Admin principal acesso total
CREATE POLICY "Admin principal full access cotacao_contatos"
ON public.cotacao_contatos
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- Admin regional e consultor podem ver contatos das cotações que podem acessar
CREATE POLICY "Users view cotacao_contatos"
ON public.cotacao_contatos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cotacoes c
    WHERE c.id = cotacao_id
    AND (
      public.is_admin_principal(auth.uid()) OR
      (public.has_role(auth.uid(), 'admin_regional') AND public.can_access_regiao(auth.uid(), c.regiao_id)) OR
      (public.has_role(auth.uid(), 'consultor_vendas') AND c.consultor_id = auth.uid())
    )
  )
);

-- Inserir contatos em cotações que pode gerenciar
CREATE POLICY "Users insert cotacao_contatos"
ON public.cotacao_contatos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cotacoes c
    WHERE c.id = cotacao_id
    AND (
      public.is_admin_principal(auth.uid()) OR
      (public.has_role(auth.uid(), 'admin_regional') AND public.can_access_regiao(auth.uid(), c.regiao_id)) OR
      (public.has_role(auth.uid(), 'consultor_vendas') AND c.consultor_id = auth.uid())
    )
  )
);

-- =====================================
-- PARTE 6: RLS POLICIES PARA ASSOCIADOS
-- =====================================

-- Admin principal acesso total
CREATE POLICY "Admin principal full access associados"
ON public.associados
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- Admin regional ver associados da sua sede
CREATE POLICY "Admin regional view associados"
ON public.associados
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  public.can_access_regiao(auth.uid(), regiao_id)
);

-- Admin regional gerenciar associados
CREATE POLICY "Admin regional manage associados"
ON public.associados
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  public.can_access_regiao(auth.uid(), regiao_id)
);

-- Consultor ver próprios associados
CREATE POLICY "Consultor view own associados"
ON public.associados
FOR SELECT
USING (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- Consultor criar associados
CREATE POLICY "Consultor create associados"
ON public.associados
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- Consultor atualizar próprios associados
CREATE POLICY "Consultor update own associados"
ON public.associados
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- Cadastro pode ver e gerenciar associados (backoffice)
CREATE POLICY "Cadastro view all associados"
ON public.associados
FOR SELECT
USING (public.has_role(auth.uid(), 'cadastro'));

CREATE POLICY "Cadastro manage associados"
ON public.associados
FOR ALL
USING (public.has_role(auth.uid(), 'cadastro'));

-- =====================================
-- PARTE 7: RLS POLICIES PARA VEÍCULOS
-- =====================================

-- Admin principal acesso total
CREATE POLICY "Admin principal full access veiculos"
ON public.veiculos
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- Admin regional ver veículos da sua sede (via associado)
CREATE POLICY "Admin regional view veiculos"
ON public.veiculos
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  EXISTS (
    SELECT 1 FROM public.associados a 
    WHERE a.id = associado_id 
    AND public.can_access_regiao(auth.uid(), a.regiao_id)
  )
);

-- Admin regional gerenciar veículos
CREATE POLICY "Admin regional manage veiculos"
ON public.veiculos
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  EXISTS (
    SELECT 1 FROM public.associados a 
    WHERE a.id = associado_id 
    AND public.can_access_regiao(auth.uid(), a.regiao_id)
  )
);

-- Consultor ver veículos dos próprios associados
CREATE POLICY "Consultor view own associados veiculos"
ON public.veiculos
FOR SELECT
USING (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  EXISTS (
    SELECT 1 FROM public.associados a 
    WHERE a.id = associado_id 
    AND a.consultor_id = auth.uid()
  )
);

-- Cadastro pode ver todos os veículos
CREATE POLICY "Cadastro view all veiculos"
ON public.veiculos
FOR SELECT
USING (public.has_role(auth.uid(), 'cadastro'));

CREATE POLICY "Cadastro manage veiculos"
ON public.veiculos
FOR ALL
USING (public.has_role(auth.uid(), 'cadastro'));

-- =====================================
-- PARTE 8: RLS POLICIES PARA VISTORIAS
-- =====================================

-- Admin principal acesso total
CREATE POLICY "Admin principal full access vistorias"
ON public.vistorias
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- Admin regional ver vistorias da sua sede
CREATE POLICY "Admin regional view vistorias"
ON public.vistorias
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  EXISTS (
    SELECT 1 FROM public.veiculos v
    JOIN public.associados a ON a.id = v.associado_id
    WHERE v.id = veiculo_id
    AND public.can_access_regiao(auth.uid(), a.regiao_id)
  )
);

-- Admin regional gerenciar vistorias
CREATE POLICY "Admin regional manage vistorias"
ON public.vistorias
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  EXISTS (
    SELECT 1 FROM public.veiculos v
    JOIN public.associados a ON a.id = v.associado_id
    WHERE v.id = veiculo_id
    AND public.can_access_regiao(auth.uid(), a.regiao_id)
  )
);

-- Vistoriador ver vistorias atribuídas a ele
CREATE POLICY "Vistoriador view own vistorias"
ON public.vistorias
FOR SELECT
USING (
  public.has_role(auth.uid(), 'vistoriador') AND
  vistoriador_id = auth.uid()
);

-- Vistoriador atualizar vistorias atribuídas
CREATE POLICY "Vistoriador update own vistorias"
ON public.vistorias
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'vistoriador') AND
  vistoriador_id = auth.uid()
);

-- =====================================
-- PARTE 9: RLS POLICIES PARA PROPOSTAS
-- =====================================

-- Admin principal acesso total
CREATE POLICY "Admin principal full access propostas"
ON public.propostas
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- Admin regional ver propostas da região
CREATE POLICY "Admin regional view propostas"
ON public.propostas
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  (
    EXISTS (SELECT 1 FROM public.associados a WHERE a.id = associado_id AND public.can_access_regiao(auth.uid(), a.regiao_id)) OR
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.can_access_regiao(auth.uid(), l.regiao_id))
  )
);

-- Admin regional gerenciar propostas
CREATE POLICY "Admin regional manage propostas"
ON public.propostas
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  (
    EXISTS (SELECT 1 FROM public.associados a WHERE a.id = associado_id AND public.can_access_regiao(auth.uid(), a.regiao_id)) OR
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.can_access_regiao(auth.uid(), l.regiao_id))
  )
);

-- Consultor ver próprias propostas
CREATE POLICY "Consultor view own propostas"
ON public.propostas
FOR SELECT
USING (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- Consultor criar propostas
CREATE POLICY "Consultor create propostas"
ON public.propostas
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- Consultor atualizar próprias propostas
CREATE POLICY "Consultor update own propostas"
ON public.propostas
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'consultor_vendas') AND
  consultor_id = auth.uid()
);

-- =====================================
-- PARTE 10: RLS POLICIES PARA PAGAMENTOS
-- =====================================

-- Admin principal acesso total
CREATE POLICY "Admin principal full access pagamentos"
ON public.pagamentos
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- Admin regional ver pagamentos da sede
CREATE POLICY "Admin regional view pagamentos"
ON public.pagamentos
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  EXISTS (
    SELECT 1 FROM public.associados a 
    WHERE a.id = associado_id 
    AND public.can_access_regiao(auth.uid(), a.regiao_id)
  )
);

-- Financeiro ver todos os pagamentos
CREATE POLICY "Financeiro view all pagamentos"
ON public.pagamentos
FOR SELECT
USING (public.has_role(auth.uid(), 'financeiro'));

-- Financeiro gerenciar pagamentos
CREATE POLICY "Financeiro manage pagamentos"
ON public.pagamentos
FOR ALL
USING (public.has_role(auth.uid(), 'financeiro'));

-- =====================================
-- PARTE 11: RLS POLICIES PARA USER_ROLES
-- =====================================

-- Admin principal pode gerenciar todas as roles
CREATE POLICY "Admin principal manage all roles"
ON public.user_roles
FOR ALL
USING (public.is_admin_principal(auth.uid()));

-- Admin regional pode ver roles da sua sede
CREATE POLICY "Admin regional view roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_regional') AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
    AND p.sede_id = public.get_user_sede(auth.uid())
  )
);