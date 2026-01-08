-- Add cotacao_id and canal_abertura to vistorias table for tracking inspection origin from quotations
ALTER TABLE public.vistorias 
ADD COLUMN IF NOT EXISTS cotacao_id UUID REFERENCES public.cotacoes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS canal_abertura TEXT CHECK (canal_abertura IN ('link', 'telefone', 'whatsapp')),
ADD COLUMN IF NOT EXISTS associado_id UUID REFERENCES public.associados(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS token_acesso UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- Add index for token lookup
CREATE INDEX IF NOT EXISTS idx_vistorias_token_acesso ON public.vistorias(token_acesso);

-- Add index for cotacao_id
CREATE INDEX IF NOT EXISTS idx_vistorias_cotacao_id ON public.vistorias(cotacao_id);

-- RLS policy to allow public access to vistorias with valid token (for public inspection page)
CREATE POLICY "Allow public access via token"
ON public.vistorias
FOR SELECT
USING (
  token_acesso IS NOT NULL 
  AND token_expires_at > NOW()
);

CREATE POLICY "Allow public update via token for photos and checklist"
ON public.vistorias
FOR UPDATE
USING (
  token_acesso IS NOT NULL 
  AND token_expires_at > NOW()
)
WITH CHECK (
  token_acesso IS NOT NULL 
  AND token_expires_at > NOW()
);