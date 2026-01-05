-- Adicionar campo logo_escura à tabela companies para suporte completo a white-label
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_escura text;

-- Comentário para documentação
COMMENT ON COLUMN public.companies.logo_escura IS 'Logo escura/preta para uso em fundos claros e relatórios';