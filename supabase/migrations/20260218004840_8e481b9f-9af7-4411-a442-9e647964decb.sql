
-- Add new cotacao_status values for the enrollment flow
ALTER TYPE public.cotacao_status ADD VALUE IF NOT EXISTS 'aceita';
ALTER TYPE public.cotacao_status ADD VALUE IF NOT EXISTS 'aguardando_docs';
ALTER TYPE public.cotacao_status ADD VALUE IF NOT EXISTS 'adesao_concluida';
ALTER TYPE public.cotacao_status ADD VALUE IF NOT EXISTS 'enviada';
