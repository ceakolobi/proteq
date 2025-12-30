-- Adicionar status 'isento' e 'a_vencer' ao tipo de status de mensalidade
-- A coluna status é text, então podemos usar livremente

-- Criar função para gerar a primeira mensalidade quando ativação é aprovada
CREATE OR REPLACE FUNCTION public.gerar_primeira_mensalidade_ativacao()
RETURNS TRIGGER AS $$
DECLARE
  v_associado RECORD;
  v_veiculo RECORD;
  v_data_vencimento DATE;
  v_mes_referencia DATE;
  v_dia_vencimento INTEGER;
BEGIN
  -- Só gerar quando status muda para 'ativo'
  IF NEW.status = 'ativo' AND (OLD.status IS NULL OR OLD.status != 'ativo') THEN
    
    -- Buscar dados do associado
    SELECT * INTO v_associado 
    FROM public.associados 
    WHERE id = NEW.associado_id;
    
    -- Buscar dados do veículo com mensalidade da cota
    SELECT v.*, c.valor_carro, c.valor_moto, c.valor_camionete
    INTO v_veiculo
    FROM public.veiculos v
    LEFT JOIN public.cotas c ON c.id = v.cota_id
    WHERE v.id = NEW.veiculo_id;
    
    -- Usar dia de vencimento do associado ou padrão 10
    v_dia_vencimento := COALESCE(v_associado.dia_vencimento, 10);
    
    -- Mês de referência é o mês atual
    v_mes_referencia := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    -- Calcular data de vencimento (no mês atual ou próximo se já passou)
    v_data_vencimento := make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
      EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
      LEAST(v_dia_vencimento, 28)
    );
    
    -- Se a data de vencimento já passou, usar o próximo mês
    IF v_data_vencimento < CURRENT_DATE THEN
      v_data_vencimento := v_data_vencimento + INTERVAL '1 month';
      v_mes_referencia := v_mes_referencia + INTERVAL '1 month';
    END IF;
    
    -- Verificar se já existe mensalidade para este mês
    IF NOT EXISTS (
      SELECT 1 FROM public.mensalidades 
      WHERE veiculo_id = NEW.veiculo_id 
      AND mes_referencia = v_mes_referencia
    ) THEN
      -- Inserir a primeira mensalidade
      INSERT INTO public.mensalidades (
        associado_id,
        veiculo_id,
        cota_id,
        company_id,
        valor_base,
        valor_final,
        mes_referencia,
        data_vencimento,
        status,
        created_by
      ) VALUES (
        NEW.associado_id,
        NEW.veiculo_id,
        v_veiculo.cota_id,
        NEW.company_id,
        COALESCE(v_veiculo.mensalidade, 0),
        COALESCE(v_veiculo.mensalidade, 0),
        v_mes_referencia,
        v_data_vencimento,
        CASE 
          WHEN v_data_vencimento > CURRENT_DATE THEN 'a_vencer'
          ELSE 'pendente'
        END,
        NEW.ativado_por
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para gerar mensalidade na ativação
DROP TRIGGER IF EXISTS trigger_gerar_mensalidade_ativacao ON public.ativacoes;
CREATE TRIGGER trigger_gerar_mensalidade_ativacao
  AFTER UPDATE ON public.ativacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_primeira_mensalidade_ativacao();

-- Atualizar função de atualizar atrasadas para considerar status 'a_vencer'
CREATE OR REPLACE FUNCTION public.atualizar_status_mensalidades()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count_atrasadas INTEGER := 0;
  v_count_a_vencer INTEGER := 0;
BEGIN
  -- Atualizar pendentes/a_vencer que passaram do vencimento para atrasadas
  UPDATE public.mensalidades
  SET status = 'atrasada', updated_at = now()
  WHERE status IN ('pendente', 'a_vencer')
  AND data_vencimento < CURRENT_DATE;
  GET DIAGNOSTICS v_count_atrasadas = ROW_COUNT;

  -- Atualizar mensalidades que ainda não venceram para 'a_vencer'
  UPDATE public.mensalidades
  SET status = 'a_vencer', updated_at = now()
  WHERE status = 'pendente'
  AND data_vencimento >= CURRENT_DATE;
  GET DIAGNOSTICS v_count_a_vencer = ROW_COUNT;

  RETURN v_count_atrasadas + v_count_a_vencer;
END;
$$;

-- Função melhorada para gerar mensalidades do mês
CREATE OR REPLACE FUNCTION public.gerar_mensalidades_mes(p_mes_referencia date, p_company_id uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_dia_vencimento INTEGER;
  v_data_vencimento DATE;
  v_veiculo RECORD;
  v_dia_config INTEGER;
  v_status TEXT;
BEGIN
  -- Buscar dia de vencimento padrão da empresa (usado como fallback)
  SELECT COALESCE(dia_vencimento_padrao, 10) INTO v_dia_config
  FROM public.configuracoes_financeiras
  WHERE company_id = COALESCE(p_company_id, get_user_company(auth.uid()));

  IF v_dia_config IS NULL THEN
    v_dia_config := 10;
  END IF;

  -- Inserir mensalidades para veículos ativos
  FOR v_veiculo IN
    SELECT 
      v.id AS veiculo_id,
      v.associado_id,
      v.cota_id,
      v.mensalidade AS valor,
      v.company_id,
      COALESCE(a.dia_vencimento, v_dia_config) AS dia_venc_associado
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
    -- Usar dia de vencimento do associado
    v_dia_vencimento := v_veiculo.dia_venc_associado;
    
    -- Calcular data de vencimento respeitando dias válidos do mês
    v_data_vencimento := make_date(
      EXTRACT(YEAR FROM p_mes_referencia)::INTEGER,
      EXTRACT(MONTH FROM p_mes_referencia)::INTEGER,
      LEAST(v_dia_vencimento, 28)
    );

    -- Definir status baseado na data de vencimento
    IF v_data_vencimento >= CURRENT_DATE THEN
      v_status := 'a_vencer';
    ELSE
      v_status := 'atrasada';
    END IF;

    INSERT INTO public.mensalidades (
      associado_id, veiculo_id, cota_id, company_id,
      valor_base, valor_final, mes_referencia, data_vencimento, status
    ) VALUES (
      v_veiculo.associado_id, v_veiculo.veiculo_id, v_veiculo.cota_id, v_veiculo.company_id,
      v_veiculo.valor, v_veiculo.valor, p_mes_referencia, v_data_vencimento, v_status
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;