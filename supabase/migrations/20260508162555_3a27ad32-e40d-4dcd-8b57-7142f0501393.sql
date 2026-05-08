ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS aceite_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS aceite_expires_at timestamptz DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS aceita_em timestamptz,
  ADD COLUMN IF NOT EXISTS aceita_ip text;

-- Backfill em registros antigos
UPDATE public.cotacoes
SET aceite_token = gen_random_uuid(),
    aceite_expires_at = now() + interval '7 days'
WHERE aceite_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_cotacoes_aceite_token ON public.cotacoes(aceite_token);

-- RLS pública: qualquer um com o token pode SELECIONAR a cotação não expirada
CREATE POLICY "public_view_cotacao_by_token"
  ON public.cotacoes
  FOR SELECT
  TO anon, authenticated
  USING (
    aceite_token IS NOT NULL
    AND aceite_expires_at > now()
  );

-- Observação: o UPDATE (aceitar) é feito via edge function com service role,
-- então NÃO criamos policy de UPDATE pública aqui (mais seguro).