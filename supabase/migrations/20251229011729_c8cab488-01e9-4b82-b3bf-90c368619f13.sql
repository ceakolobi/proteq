-- Adicionar campos de dados do cliente na cotação
ALTER TABLE public.cotacoes 
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS cliente_email TEXT,
ADD COLUMN IF NOT EXISTS cliente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS proposta_enviada_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS proposta_enviada_por UUID;