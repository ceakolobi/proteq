-- Adicionar colunas de cálculo e rastreamento de ajustes na tabela cotacoes
ALTER TABLE cotacoes 
ADD COLUMN IF NOT EXISTS valor_base NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS percentual_global NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentual_individual NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_final NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS editado_por UUID,
ADD COLUMN IF NOT EXISTS perfil_editor TEXT,
ADD COLUMN IF NOT EXISTS motivo_ajuste TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN cotacoes.valor_base IS 'Valor base da mensalidade conforme tipo de veículo e cota';
COMMENT ON COLUMN cotacoes.percentual_global IS 'Percentual geral aplicado (da cota)';
COMMENT ON COLUMN cotacoes.percentual_individual IS 'Percentual extra/individual aplicado';
COMMENT ON COLUMN cotacoes.valor_final IS 'Valor final calculado: valor_base + (valor_base * (percentual_global + percentual_individual) / 100)';
COMMENT ON COLUMN cotacoes.editado_por IS 'UUID do usuário que fez ajuste manual';
COMMENT ON COLUMN cotacoes.perfil_editor IS 'Perfil/role do usuário que editou';
COMMENT ON COLUMN cotacoes.motivo_ajuste IS 'Justificativa para ajuste manual de valores';