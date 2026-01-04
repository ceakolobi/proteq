-- ============================================================
-- MIGRAÇÃO: Novo modelo de cálculo com valores fixos (R$)
-- Fórmula: valor_final = valor_base + ajuste_geral_valor + ajuste_individual_valor
-- ============================================================

-- 1. Renomear coluna na tabela cotas (acrescimo_global → ajuste_geral_valor)
-- Usando abordagem de criar nova coluna se não existir

-- Verificar e adicionar coluna ajuste_geral_valor em cotas (se não existe com esse nome)
DO $$ 
BEGIN
  -- Se acrescimo_global existe mas ajuste_geral_valor não, criar a nova
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cotas' AND column_name = 'ajuste_geral_valor') THEN
    ALTER TABLE public.cotas ADD COLUMN ajuste_geral_valor numeric DEFAULT 0;
    -- Copiar valores de acrescimo_global se existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cotas' AND column_name = 'acrescimo_global') THEN
      UPDATE public.cotas SET ajuste_geral_valor = COALESCE(acrescimo_global, 0);
    END IF;
  END IF;
END $$;

-- 2. Adicionar coluna ajuste_individual_valor em cotacoes
ALTER TABLE public.cotacoes 
ADD COLUMN IF NOT EXISTS ajuste_individual_valor numeric DEFAULT 0;

-- Adicionar coluna ajuste_geral_valor em cotacoes (copiado da cota no momento da cotação)
ALTER TABLE public.cotacoes 
ADD COLUMN IF NOT EXISTS ajuste_geral_valor numeric DEFAULT 0;

-- 3. Remover trigger antigo que usa percentuais
DROP TRIGGER IF EXISTS trigger_atualizar_valor_cotacao ON cotacoes;

-- 4. Criar nova função de cálculo usando apenas valores fixos
CREATE OR REPLACE FUNCTION public.atualizar_valor_cotacao()
RETURNS trigger AS $$
BEGIN
  -- Se não houver valor base, não calcula
  IF NEW.valor_base IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nova fórmula: valor_final = valor_base + ajuste_geral_valor + ajuste_individual_valor
  NEW.valor_final := NEW.valor_base + COALESCE(NEW.ajuste_geral_valor, 0) + COALESCE(NEW.ajuste_individual_valor, 0);
  
  -- Atualizar mensalidade para refletir o valor final
  NEW.mensalidade := NEW.valor_final;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 5. Criar novo trigger para INSERT e UPDATE
CREATE TRIGGER trigger_atualizar_valor_cotacao
  BEFORE INSERT OR UPDATE OF valor_base, ajuste_geral_valor, ajuste_individual_valor
  ON cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_valor_cotacao();

-- 6. Remover trigger antigo de validação de percentual (não mais necessário)
DROP TRIGGER IF EXISTS trigger_validar_limite_gestor ON cotacoes;

-- 7. Atualizar cotações existentes que têm percentuais para usar valores fixos
-- Migrar dados: converter percentuais existentes para valores fixos
UPDATE public.cotacoes
SET 
  ajuste_geral_valor = CASE 
    WHEN percentual_global IS NOT NULL AND percentual_global != 0 AND valor_base IS NOT NULL
    THEN ROUND((valor_base * percentual_global / 100)::numeric, 2)
    ELSE COALESCE(ajuste_geral_valor, 0)
  END,
  ajuste_individual_valor = CASE 
    WHEN percentual_individual IS NOT NULL AND percentual_individual != 0 AND valor_base IS NOT NULL
    THEN ROUND((valor_base * percentual_individual / 100)::numeric, 2)
    ELSE COALESCE(ajuste_individual_valor, 0)
  END
WHERE (percentual_global IS NOT NULL AND percentual_global != 0)
   OR (percentual_individual IS NOT NULL AND percentual_individual != 0);

-- 8. Recalcular valor_final para cotações existentes
UPDATE public.cotacoes
SET valor_final = valor_base + COALESCE(ajuste_geral_valor, 0) + COALESCE(ajuste_individual_valor, 0),
    mensalidade = valor_base + COALESCE(ajuste_geral_valor, 0) + COALESCE(ajuste_individual_valor, 0)
WHERE valor_base IS NOT NULL;