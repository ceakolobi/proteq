-- Backfill company_id em cotacoes que ficaram com NULL
-- Causa: createCotacao no frontend não enviava company_id no insert
-- Fix: preenche company_id buscando do profile do consultor

UPDATE public.cotacoes c
SET company_id = p.company_id
FROM public.profiles p
WHERE c.consultor_id = p.id
  AND c.company_id IS NULL
  AND p.company_id IS NOT NULL;
