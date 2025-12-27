
-- =====================================================
-- MÓDULO COMPLETO DE COTAÇÃO - MIGRAÇÃO
-- =====================================================

-- 1. Estender enum vehicle_type para incluir novos tipos
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'caminhao';
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'utilitario';
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'maquina_agricola';
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'maquina_industrial';

-- 2. Criar enum para status de negociação
DO $$ BEGIN
  CREATE TYPE public.cotacao_status AS ENUM (
    'novo',
    'em_contato',
    'interessado',
    'aguardando_retorno',
    'aprovado',
    'perdido'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Criar enum para método de valoração
DO $$ BEGIN
  CREATE TYPE public.metodo_valoracao AS ENUM (
    'fipe',
    'venal',
    'nota_fiscal'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Criar enum para tipo de contato
DO $$ BEGIN
  CREATE TYPE public.tipo_contato AS ENUM (
    'ligacao',
    'whatsapp',
    'retorno',
    'reuniao',
    'email',
    'visita'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Criar tabela de cotações completas
CREATE TABLE IF NOT EXISTS public.cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  consultor_id UUID NOT NULL,
  regiao_id UUID REFERENCES public.regioes(id) ON DELETE SET NULL,
  
  -- Status da negociação
  status public.cotacao_status NOT NULL DEFAULT 'novo',
  
  -- Identificação do bem
  tipo_bem public.vehicle_type NOT NULL,
  placa VARCHAR(10),
  chassi VARCHAR(50),
  marca VARCHAR(100) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  ano_fabricacao INTEGER NOT NULL,
  ano_modelo INTEGER,
  categoria VARCHAR(100), -- categoria específica complementar
  cor VARCHAR(50),
  renavam VARCHAR(20),
  
  -- Valoração
  metodo_valoracao public.metodo_valoracao NOT NULL DEFAULT 'fipe',
  valor_bem DECIMAL(15,2) NOT NULL,
  valor_fipe DECIMAL(15,2), -- quando método = fipe
  codigo_fipe VARCHAR(30), -- código FIPE para referência futura
  usuario_informou_valor UUID, -- quem informou o valor manual
  data_valor_informado TIMESTAMP WITH TIME ZONE,
  url_nota_fiscal TEXT, -- armazena URL do arquivo (não o arquivo)
  
  -- Cálculos
  cota_id UUID REFERENCES public.cotas(id) ON DELETE SET NULL,
  mensalidade DECIMAL(10,2),
  participacao DECIMAL(10,2),
  carro_reserva_dias INTEGER DEFAULT 15,
  carro_reserva_adicional DECIMAL(10,2) DEFAULT 0,
  
  -- Conversão
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  associado_id UUID REFERENCES public.associados(id) ON DELETE SET NULL,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  aprovada_em TIMESTAMP WITH TIME ZONE,
  aprovada_por UUID,
  
  -- Metadados
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Criar tabela de histórico de contatos
CREATE TABLE IF NOT EXISTS public.cotacao_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id UUID NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  
  tipo public.tipo_contato NOT NULL,
  descricao TEXT NOT NULL,
  
  -- Dados automáticos
  data_contato TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_cotacoes_consultor ON public.cotacoes(consultor_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_lead ON public.cotacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_status ON public.cotacoes(status);
CREATE INDEX IF NOT EXISTS idx_cotacoes_regiao ON public.cotacoes(regiao_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_contatos_cotacao ON public.cotacao_contatos(cotacao_id);

-- 8. Trigger para updated_at
DROP TRIGGER IF EXISTS update_cotacoes_updated_at ON public.cotacoes;
CREATE TRIGGER update_cotacoes_updated_at
  BEFORE UPDATE ON public.cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Habilitar RLS
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacao_contatos ENABLE ROW LEVEL SECURITY;

-- 10. Políticas RLS para cotacoes
-- Bloquear anônimos
CREATE POLICY "Block anonymous access to cotacoes"
ON public.cotacoes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Admin Principal tem acesso total
CREATE POLICY "Admin Principal full access cotacoes"
ON public.cotacoes
FOR ALL
USING (is_admin_principal(auth.uid()));

-- Admin Regional vê cotações da sua região
CREATE POLICY "Admin Regional view cotacoes by region"
ON public.cotacoes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin_regional') 
  AND regiao_id = get_user_regiao(auth.uid())
);

-- Admin Regional pode gerenciar cotações da sua região
CREATE POLICY "Admin Regional manage cotacoes by region"
ON public.cotacoes
FOR ALL
USING (
  has_role(auth.uid(), 'admin_regional') 
  AND regiao_id = get_user_regiao(auth.uid())
);

-- Consultor vê apenas suas cotações
CREATE POLICY "Consultor view own cotacoes"
ON public.cotacoes
FOR SELECT
USING (
  has_role(auth.uid(), 'consultor_vendas') 
  AND consultor_id = auth.uid()
);

-- Consultor pode criar cotações
CREATE POLICY "Consultor create cotacoes"
ON public.cotacoes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'consultor_vendas') 
  AND consultor_id = auth.uid()
);

-- Consultor pode atualizar suas cotações
CREATE POLICY "Consultor update own cotacoes"
ON public.cotacoes
FOR UPDATE
USING (
  has_role(auth.uid(), 'consultor_vendas') 
  AND consultor_id = auth.uid()
);

-- 11. Políticas RLS para cotacao_contatos
-- Bloquear anônimos
CREATE POLICY "Block anonymous access to cotacao_contatos"
ON public.cotacao_contatos
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Admin Principal tem acesso total
CREATE POLICY "Admin Principal full access cotacao_contatos"
ON public.cotacao_contatos
FOR ALL
USING (is_admin_principal(auth.uid()));

-- Admin Regional acessa contatos de cotações da região
CREATE POLICY "Admin Regional view cotacao_contatos"
ON public.cotacao_contatos
FOR SELECT
USING (
  has_role(auth.uid(), 'admin_regional') 
  AND EXISTS (
    SELECT 1 FROM public.cotacoes c 
    WHERE c.id = cotacao_contatos.cotacao_id 
    AND c.regiao_id = get_user_regiao(auth.uid())
  )
);

-- Admin Regional gerencia contatos de cotações da região
CREATE POLICY "Admin Regional manage cotacao_contatos"
ON public.cotacao_contatos
FOR ALL
USING (
  has_role(auth.uid(), 'admin_regional') 
  AND EXISTS (
    SELECT 1 FROM public.cotacoes c 
    WHERE c.id = cotacao_contatos.cotacao_id 
    AND c.regiao_id = get_user_regiao(auth.uid())
  )
);

-- Consultor vê contatos das suas cotações
CREATE POLICY "Consultor view own cotacao_contatos"
ON public.cotacao_contatos
FOR SELECT
USING (
  has_role(auth.uid(), 'consultor_vendas') 
  AND EXISTS (
    SELECT 1 FROM public.cotacoes c 
    WHERE c.id = cotacao_contatos.cotacao_id 
    AND c.consultor_id = auth.uid()
  )
);

-- Consultor pode adicionar contatos às suas cotações
CREATE POLICY "Consultor insert cotacao_contatos"
ON public.cotacao_contatos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'consultor_vendas') 
  AND EXISTS (
    SELECT 1 FROM public.cotacoes c 
    WHERE c.id = cotacao_contatos.cotacao_id 
    AND c.consultor_id = auth.uid()
  )
);

-- 12. Adicionar novos tipos de veículo à tabela cotas (mensalidades)
ALTER TABLE public.cotas 
  ADD COLUMN IF NOT EXISTS mensalidade_caminhao DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mensalidade_utilitario DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mensalidade_maquina_agricola DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mensalidade_maquina_industrial DECIMAL(10,2) DEFAULT 0;

-- 13. Atualizar cotas existentes com valores padrão razoáveis
UPDATE public.cotas 
SET 
  mensalidade_caminhao = COALESCE(mensalidade_caminhao, mensalidade_pickup * 1.3),
  mensalidade_utilitario = COALESCE(mensalidade_utilitario, mensalidade_pickup * 1.1),
  mensalidade_maquina_agricola = COALESCE(mensalidade_maquina_agricola, mensalidade_pickup * 1.5),
  mensalidade_maquina_industrial = COALESCE(mensalidade_maquina_industrial, mensalidade_pickup * 1.5)
WHERE mensalidade_caminhao = 0 OR mensalidade_caminhao IS NULL;
