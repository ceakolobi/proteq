-- Adicionar novos valores ao enum de status de cotação
ALTER TYPE public.cotacao_status ADD VALUE IF NOT EXISTS 'arquivado';
ALTER TYPE public.cotacao_status ADD VALUE IF NOT EXISTS 'bloqueado';
ALTER TYPE public.cotacao_status ADD VALUE IF NOT EXISTS 'quarentena';

-- Nota: A exclusão será um soft-delete usando status, não precisa de novo valor