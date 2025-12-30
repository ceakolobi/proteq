-- Adicionar colunas de acréscimo em reais na tabela cotas
ALTER TABLE public.cotas
ADD COLUMN IF NOT EXISTS acrescimo_individual numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS acrescimo_global numeric DEFAULT 0;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.cotas.acrescimo_individual IS 'Acréscimo em R$ aplicado apenas a esta cota específica';
COMMENT ON COLUMN public.cotas.acrescimo_global IS 'Acréscimo em R$ aplicado a todas as cotas (configuração global)';