-- Rename columns in cotas table to match new structure
ALTER TABLE public.cotas RENAME COLUMN nome TO cota_nome;
ALTER TABLE public.cotas RENAME COLUMN mensalidade_carro TO valor_carro;
ALTER TABLE public.cotas RENAME COLUMN mensalidade_moto TO valor_moto;
ALTER TABLE public.cotas RENAME COLUMN mensalidade_pickup TO valor_camionete;

-- Drop percentual_geral as it's not in the new structure
ALTER TABLE public.cotas DROP COLUMN IF EXISTS percentual_geral;