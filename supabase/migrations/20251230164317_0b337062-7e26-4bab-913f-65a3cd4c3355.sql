-- Tabela de Mensalidades (cobranças recorrentes por veículo)
CREATE TABLE IF NOT EXISTS public.mensalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associado_id UUID NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  cota_id UUID REFERENCES public.cotas(id),
  company_id UUID REFERENCES public.companies(id),
  created_by UUID,
  
  -- Valores
  valor_base NUMERIC(10,2) NOT NULL,
  valor_final NUMERIC(10,2) NOT NULL,
  desconto NUMERIC(10,2) DEFAULT 0,
  acrescimo NUMERIC(10,2) DEFAULT 0,
  
  -- Datas
  mes_referencia DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  
  -- Status: pendente, paga, atrasada, cancelada, suspensa
  status TEXT NOT NULL DEFAULT 'pendente',
  
  -- Pagamento
  forma_pagamento TEXT,
  comprovante_url TEXT,
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mensalidades_associado ON public.mensalidades(associado_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_veiculo ON public.mensalidades(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_status ON public.mensalidades(status);
CREATE INDEX IF NOT EXISTS idx_mensalidades_vencimento ON public.mensalidades(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_mensalidades_company ON public.mensalidades(company_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_mes_ref ON public.mensalidades(mes_referencia);

-- Tabela de Cobranças (links de pagamento, boletos futuros)
CREATE TABLE IF NOT EXISTS public.cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensalidade_id UUID REFERENCES public.mensalidades(id) ON DELETE CASCADE,
  associado_id UUID NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID,
  
  -- Valores
  valor NUMERIC(10,2) NOT NULL,
  
  -- Tipo: boleto, pix, link, manual
  tipo TEXT NOT NULL DEFAULT 'manual',
  
  -- Link/código de pagamento
  link_pagamento TEXT,
  codigo_barras TEXT,
  codigo_pix TEXT,
  
  -- Status: gerada, enviada, paga, cancelada, vencida
  status TEXT NOT NULL DEFAULT 'gerada',
  
  -- Datas
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  
  -- Observações
  observacoes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cobrancas_mensalidade ON public.cobrancas(mensalidade_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_associado ON public.cobrancas(associado_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_status ON public.cobrancas(status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_company ON public.cobrancas(company_id);

-- Configurações Financeiras por Empresa
CREATE TABLE IF NOT EXISTS public.configuracoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  
  -- Dia padrão de vencimento (1-28)
  dia_vencimento_padrao INTEGER DEFAULT 10,
  
  -- Tolerância para inadimplência (dias)
  dias_tolerancia INTEGER DEFAULT 5,
  
  -- Multa e Juros
  percentual_multa NUMERIC(5,2) DEFAULT 2.00,
  percentual_juros_dia NUMERIC(5,4) DEFAULT 0.0333,
  
  -- PIX
  chave_pix TEXT,
  tipo_chave_pix TEXT, -- cpf, cnpj, email, telefone, aleatoria
  
  -- Notificações
  enviar_lembrete_dias_antes INTEGER DEFAULT 3,
  enviar_cobranca_apos_dias INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_financeiras ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_mensalidades_updated_at
  BEFORE UPDATE ON public.mensalidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cobrancas_updated_at
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_fin_updated_at
  BEFORE UPDATE ON public.configuracoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para preencher company_id e created_by automaticamente
CREATE TRIGGER set_mensalidades_company
  BEFORE INSERT ON public.mensalidades
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_and_company();

CREATE TRIGGER set_cobrancas_company
  BEFORE INSERT ON public.cobrancas
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_and_company();

-- RLS Policies para mensalidades
CREATE POLICY "system_admin_full_access_mensalidades" ON public.mensalidades
  FOR ALL USING (is_system_admin(auth.uid()));

CREATE POLICY "financeiro_manage_mensalidades" ON public.mensalidades
  FOR ALL USING (
    strict_company_isolation(company_id) AND 
    (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role))
  );

CREATE POLICY "admin_regional_view_mensalidades" ON public.mensalidades
  FOR SELECT USING (
    strict_company_isolation(company_id) AND 
    has_role(auth.uid(), 'admin_regional'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.associados a 
      WHERE a.id = mensalidades.associado_id 
      AND can_access_regiao(auth.uid(), a.regiao_id)
    )
  );

CREATE POLICY "consultor_view_mensalidades" ON public.mensalidades
  FOR SELECT USING (
    strict_company_isolation(company_id) AND 
    has_role(auth.uid(), 'consultor_vendas'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.associados a 
      WHERE a.id = mensalidades.associado_id 
      AND a.consultor_id = auth.uid()
    )
  );

-- RLS Policies para cobrancas
CREATE POLICY "system_admin_full_access_cobrancas" ON public.cobrancas
  FOR ALL USING (is_system_admin(auth.uid()));

CREATE POLICY "financeiro_manage_cobrancas" ON public.cobrancas
  FOR ALL USING (
    strict_company_isolation(company_id) AND 
    (is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role))
  );

CREATE POLICY "admin_regional_view_cobrancas" ON public.cobrancas
  FOR SELECT USING (
    strict_company_isolation(company_id) AND 
    has_role(auth.uid(), 'admin_regional'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.associados a 
      WHERE a.id = cobrancas.associado_id 
      AND can_access_regiao(auth.uid(), a.regiao_id)
    )
  );

-- RLS Policies para configuracoes_financeiras
CREATE POLICY "system_admin_full_access_config_fin" ON public.configuracoes_financeiras
  FOR ALL USING (is_system_admin(auth.uid()));

CREATE POLICY "admin_principal_manage_config_fin" ON public.configuracoes_financeiras
  FOR ALL USING (
    strict_company_isolation(company_id) AND 
    is_admin_principal(auth.uid())
  );

CREATE POLICY "financeiro_view_config_fin" ON public.configuracoes_financeiras
  FOR SELECT USING (
    strict_company_isolation(company_id) AND 
    has_role(auth.uid(), 'financeiro'::app_role)
  );

-- Função para gerar mensalidades do mês
CREATE OR REPLACE FUNCTION public.gerar_mensalidades_mes(
  p_mes_referencia DATE,
  p_company_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_dia_vencimento INTEGER;
  v_data_vencimento DATE;
  v_veiculo RECORD;
BEGIN
  -- Buscar dia de vencimento padrão
  SELECT COALESCE(dia_vencimento_padrao, 10) INTO v_dia_vencimento
  FROM public.configuracoes_financeiras
  WHERE company_id = COALESCE(p_company_id, get_user_company(auth.uid()));

  IF v_dia_vencimento IS NULL THEN
    v_dia_vencimento := 10;
  END IF;

  -- Calcular data de vencimento
  v_data_vencimento := make_date(
    EXTRACT(YEAR FROM p_mes_referencia)::INTEGER,
    EXTRACT(MONTH FROM p_mes_referencia)::INTEGER,
    LEAST(v_dia_vencimento, 28)
  );

  -- Inserir mensalidades para veículos ativos
  FOR v_veiculo IN
    SELECT 
      v.id AS veiculo_id,
      v.associado_id,
      v.cota_id,
      v.mensalidade AS valor,
      v.company_id
    FROM public.veiculos v
    JOIN public.associados a ON a.id = v.associado_id
    WHERE v.protecao_ativa = true
    AND v.veiculo_status = 'ativo'
    AND a.status = 'ativo'
    AND (p_company_id IS NULL OR v.company_id = p_company_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.mensalidades m
      WHERE m.veiculo_id = v.id
      AND m.mes_referencia = p_mes_referencia
    )
  LOOP
    INSERT INTO public.mensalidades (
      associado_id, veiculo_id, cota_id, company_id,
      valor_base, valor_final, mes_referencia, data_vencimento, status
    ) VALUES (
      v_veiculo.associado_id, v_veiculo.veiculo_id, v_veiculo.cota_id, v_veiculo.company_id,
      v_veiculo.valor, v_veiculo.valor, p_mes_referencia, v_data_vencimento, 'pendente'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Função para atualizar status de mensalidades atrasadas
CREATE OR REPLACE FUNCTION public.atualizar_status_mensalidades_atrasadas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.mensalidades
  SET status = 'atrasada', updated_at = now()
  WHERE status = 'pendente'
  AND data_vencimento < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;