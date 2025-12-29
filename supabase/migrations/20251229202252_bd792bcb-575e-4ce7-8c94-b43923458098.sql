-- Permitir trabalhar por categoria de forma independente: valores podem ficar nulos quando a cota não se aplica
ALTER TABLE public.cotas
  ALTER COLUMN valor_carro DROP NOT NULL,
  ALTER COLUMN valor_moto DROP NOT NULL,
  ALTER COLUMN valor_camionete DROP NOT NULL;

-- Regras de integridade: pelo menos uma categoria deve estar marcada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cotas_aplicabilidade_chk'
  ) THEN
    ALTER TABLE public.cotas
      ADD CONSTRAINT cotas_aplicabilidade_chk
      CHECK (aplica_carro OR aplica_moto OR aplica_caminhonete);
  END IF;
END $$;

-- Regras de integridade: valores obrigatórios somente para categorias aplicáveis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cotas_valores_por_categoria_chk'
  ) THEN
    ALTER TABLE public.cotas
      ADD CONSTRAINT cotas_valores_por_categoria_chk
      CHECK (
        (NOT aplica_carro OR (valor_carro IS NOT NULL AND valor_carro > 0)) AND
        (NOT aplica_moto OR (valor_moto IS NOT NULL AND valor_moto > 0)) AND
        (NOT aplica_caminhonete OR (valor_camionete IS NOT NULL AND valor_camionete > 0))
      );
  END IF;
END $$;