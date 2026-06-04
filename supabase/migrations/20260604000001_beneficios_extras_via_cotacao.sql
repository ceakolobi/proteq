-- ============================================================
-- Benefícios extras agora são linhas em cotacao_beneficios
-- com is_extra = true, em vez de tabela separada.
-- APLICAR NO SUPABASE DASHBOARD → SQL Editor do projeto:
-- sbtfhtllzpurjprivqoi (painelharmony - PRODUÇÃO)
-- ============================================================

-- 1. Adicionar coluna is_extra em cotacao_beneficios
ALTER TABLE public.cotacao_beneficios
  ADD COLUMN IF NOT EXISTS is_extra boolean NOT NULL DEFAULT false;

-- 2. Remover a tabela temporária criada anteriormente (se existir)
DROP TABLE IF EXISTS public.associado_beneficios_extras;
