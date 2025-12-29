-- Função para calcular automaticamente o valor_final
CREATE OR REPLACE FUNCTION public.atualizar_valor_cotacao()
RETURNS trigger AS $$
DECLARE 
  total_percentual NUMERIC(6,2);
BEGIN
  -- Se não houver valor base, não calcula
  IF NEW.valor_base IS NULL THEN
    RETURN NEW;
  END IF;

  -- Soma os percentuais e calcula valor final
  total_percentual := COALESCE(NEW.percentual_global, 0) + COALESCE(NEW.percentual_individual, 0);
  NEW.valor_final := NEW.valor_base + (NEW.valor_base * (total_percentual / 100));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_atualizar_valor_cotacao ON cotacoes;
CREATE TRIGGER trigger_atualizar_valor_cotacao
  BEFORE INSERT OR UPDATE OF valor_base, percentual_global, percentual_individual
  ON cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_valor_cotacao();