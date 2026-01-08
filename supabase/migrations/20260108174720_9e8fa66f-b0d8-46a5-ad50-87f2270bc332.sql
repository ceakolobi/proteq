-- Adicionar campos na tabela de associados para migração de outra associação
ALTER TABLE public.associados
ADD COLUMN IF NOT EXISTS veio_de_outra_associacao boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nome_associacao_anterior text,
ADD COLUMN IF NOT EXISTS data_saida_associacao date,
ADD COLUMN IF NOT EXISTS comprovante_migracao_url text;

-- Adicionar novo status de vistoria 'dispensada' (usando o tipo correto inspection_status)
ALTER TYPE public.inspection_status ADD VALUE IF NOT EXISTS 'dispensada';

-- Adicionar campo de motivo de dispensa na tabela de vistorias
ALTER TABLE public.vistorias
ADD COLUMN IF NOT EXISTS motivo_dispensa text,
ADD COLUMN IF NOT EXISTS dispensada_por uuid,
ADD COLUMN IF NOT EXISTS dispensada_em timestamp with time zone;

-- Criar índice para busca rápida de associados migrados
CREATE INDEX IF NOT EXISTS idx_associados_migracao ON public.associados(veio_de_outra_associacao) WHERE veio_de_outra_associacao = true;