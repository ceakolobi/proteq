-- Adicionar colunas de aplicabilidade por categoria na tabela cotas
ALTER TABLE public.cotas 
ADD COLUMN IF NOT EXISTS aplica_carro boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS aplica_moto boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS aplica_caminhonete boolean NOT NULL DEFAULT true;

-- Comentários para documentação
COMMENT ON COLUMN public.cotas.aplica_carro IS 'Indica se esta cota se aplica a veículos do tipo CARRO';
COMMENT ON COLUMN public.cotas.aplica_moto IS 'Indica se esta cota se aplica a veículos do tipo MOTO';
COMMENT ON COLUMN public.cotas.aplica_caminhonete IS 'Indica se esta cota se aplica a veículos do tipo CAMINHONETE/PICKUP';