-- Adicionar campo dia_vencimento ao cadastro do associado
ALTER TABLE public.associados 
ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER DEFAULT 10 CHECK (dia_vencimento IN (5, 10, 15, 20, 25, 30));

-- Comentário para documentação
COMMENT ON COLUMN public.associados.dia_vencimento IS 'Dia do mês para vencimento das mensalidades do associado (5, 10, 15, 20, 25, 30)';

-- Atualizar função de geração de mensalidades para usar o dia do associado
CREATE OR REPLACE FUNCTION public.gerar_mensalidades_mes(p_mes_referencia date, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_dia_vencimento INTEGER;
  v_data_vencimento DATE;
  v_veiculo RECORD;
  v_dia_config INTEGER;
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
$function$;