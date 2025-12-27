
-- Adicionar novos tipos de veículo
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'carreta';
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'implemento_agricola';

-- Adicionar mensalidades para novos tipos na tabela cotas
ALTER TABLE public.cotas 
  ADD COLUMN IF NOT EXISTS mensalidade_carreta DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mensalidade_implemento_agricola DECIMAL(10,2) DEFAULT 0;

-- Atualizar cotas existentes com valores padrão
UPDATE public.cotas 
SET 
  mensalidade_carreta = COALESCE(mensalidade_carreta, mensalidade_pickup * 1.2),
  mensalidade_implemento_agricola = COALESCE(mensalidade_implemento_agricola, mensalidade_pickup * 1.3)
WHERE mensalidade_carreta = 0 OR mensalidade_carreta IS NULL;
