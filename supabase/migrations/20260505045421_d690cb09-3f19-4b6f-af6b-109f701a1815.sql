-- =====================================================
-- 1) Catálogo de benefícios extras (editável por admin)
-- =====================================================
CREATE TABLE public.beneficios_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL DEFAULT 'a0000000-0000-0000-0000-000000000001'::uuid,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'Sparkles',
  valor_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  aplica_carro BOOLEAN NOT NULL DEFAULT true,
  aplica_moto BOOLEAN NOT NULL DEFAULT true,
  aplica_caminhonete BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.beneficios_extras ENABLE ROW LEVEL SECURITY;

-- Visualização pública dos ativos (necessário pro funil público)
CREATE POLICY "public_view_active_beneficios"
ON public.beneficios_extras
FOR SELECT
TO anon, authenticated
USING (ativo = true);

-- Admin principal vê tudo
CREATE POLICY "admin_principal_full_beneficios"
ON public.beneficios_extras
FOR ALL
USING (is_admin_principal(auth.uid()))
WITH CHECK (is_admin_principal(auth.uid()));

-- Admin da empresa pode gerenciar
CREATE POLICY "admin_empresa_manage_beneficios"
ON public.beneficios_extras
FOR ALL
USING (
  strict_company_isolation(company_id)
  AND (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional'::app_role))
)
WITH CHECK (
  strict_company_isolation(company_id)
  AND (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional'::app_role))
);

-- Demo não pode mexer
CREATE POLICY "demo_no_insert_beneficios"
ON public.beneficios_extras
FOR INSERT
TO authenticated
WITH CHECK (NOT is_demo_user(auth.uid()));

CREATE POLICY "demo_no_update_beneficios"
ON public.beneficios_extras
FOR UPDATE
TO authenticated
USING (NOT is_demo_user(auth.uid()));

CREATE POLICY "demo_no_delete_beneficios"
ON public.beneficios_extras
FOR DELETE
TO authenticated
USING (NOT is_demo_user(auth.uid()));

CREATE TRIGGER update_beneficios_extras_updated_at
BEFORE UPDATE ON public.beneficios_extras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_beneficios_extras_company ON public.beneficios_extras(company_id, ativo, ordem);

-- =====================================================
-- 2) Benefícios selecionados por cotação (snapshot)
-- =====================================================
CREATE TABLE public.cotacao_beneficios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID NOT NULL,
  beneficio_id UUID,
  company_id UUID,
  nome_snapshot TEXT NOT NULL,
  valor_snapshot NUMERIC(10,2) NOT NULL,
  selecionado_por TEXT NOT NULL DEFAULT 'consultor', -- consultor | publico | associado
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.cotacao_beneficios ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cotacao_beneficios_cotacao ON public.cotacao_beneficios(cotacao_id);

-- Inserção pública (funil sem auth)
CREATE POLICY "anon_insert_cotacao_beneficios"
ON public.cotacao_beneficios
FOR INSERT
TO anon
WITH CHECK (true);

-- Inserção autenticada
CREATE POLICY "auth_insert_cotacao_beneficios"
ON public.cotacao_beneficios
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cotacoes c
    WHERE c.id = cotacao_beneficios.cotacao_id
      AND (
        is_admin_principal(auth.uid())
        OR is_admin_or_gerente(auth.uid())
        OR c.consultor_id = auth.uid()
      )
  )
);

-- Visualização: segue regras da cotação
CREATE POLICY "view_cotacao_beneficios"
ON public.cotacao_beneficios
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cotacoes c
    WHERE c.id = cotacao_beneficios.cotacao_id
      AND (
        is_admin_principal(auth.uid())
        OR (is_admin_or_gerente(auth.uid()) AND c.company_id = get_user_company(auth.uid()))
        OR c.consultor_id = auth.uid()
      )
  )
);

-- Atualizar/deletar: dono da cotação ou admin
CREATE POLICY "manage_cotacao_beneficios"
ON public.cotacao_beneficios
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cotacoes c
    WHERE c.id = cotacao_beneficios.cotacao_id
      AND (
        is_admin_principal(auth.uid())
        OR is_admin_or_gerente(auth.uid())
        OR c.consultor_id = auth.uid()
      )
  )
);

-- Visualização pública (anon) por cotacao_id — necessário pro funil público que insere antes do login
CREATE POLICY "anon_view_cotacao_beneficios"
ON public.cotacao_beneficios
FOR SELECT
TO anon
USING (true);

-- =====================================================
-- 3) Pré-popular catálogo com 8 benefícios sugeridos
-- =====================================================
INSERT INTO public.beneficios_extras (company_id, nome, descricao, icone, valor_mensal, ordem) VALUES
('a0000000-0000-0000-0000-000000000001'::uuid, 'Carro Reserva Extra', 'Aumenta o período de carro reserva em caso de sinistro de 15 para 30 dias.', 'Car', 19.90, 1),
('a0000000-0000-0000-0000-000000000001'::uuid, 'Guincho km Extra', 'Adiciona 100 km extras ao serviço de guincho padrão (cobertura ampliada para viagens).', 'Truck', 14.90, 2),
('a0000000-0000-0000-0000-000000000001'::uuid, 'Proteção Vidros', 'Cobertura para troca ou reparo de para-brisa, vidros laterais e traseiro.', 'Shield', 12.90, 3),
('a0000000-0000-0000-0000-000000000001'::uuid, 'Proteção Pneus', 'Cobertura para danos em pneus por buracos, objetos cortantes ou desgaste anormal.', 'CircleDot', 9.90, 4),
('a0000000-0000-0000-0000-000000000001'::uuid, 'Assistência 24h Plus', 'Assistência ampliada com mecânico no local, troca de pneu, pane seca e elétrica em qualquer horário.', 'Wrench', 17.90, 5),
('a0000000-0000-0000-0000-000000000001'::uuid, 'Chaveiro', 'Serviço de chaveiro 24h em caso de perda, quebra ou trancamento da chave dentro do veículo.', 'Key', 7.90, 6),
('a0000000-0000-0000-0000-000000000001'::uuid, 'Proteção a Terceiros Extra', 'Aumenta o limite de cobertura para danos materiais e corporais a terceiros.', 'Users', 24.90, 7),
('a0000000-0000-0000-0000-000000000001'::uuid, 'Proteção Elétrica e Farol', 'Cobertura para reparo ou substituição de faróis, lanternas e componentes elétricos do veículo.', 'Zap', 11.90, 8);