-- Remove duplicatas em beneficios_extras mantendo o registro mais antigo por (company_id, nome)
-- Causa: useUpsertBeneficio não enviava company_id → DEFAULT repetia o mesmo UUID
--        sem UNIQUE constraint, a inserção duplicava silenciosamente
DELETE FROM public.beneficios_extras
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY company_id, nome ORDER BY created_at ASC) AS rn
    FROM public.beneficios_extras
  ) ranked
  WHERE rn > 1
);

-- Previne recorrência
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_beneficios_extras_company_nome'
  ) THEN
    ALTER TABLE public.beneficios_extras
      ADD CONSTRAINT uq_beneficios_extras_company_nome UNIQUE (company_id, nome);
  END IF;
END $$;
