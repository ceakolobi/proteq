-- Fix 1: remove SELECT anônimo aberto em cotacao_beneficios
DROP POLICY IF EXISTS "anon_view_cotacao_beneficios" ON public.cotacao_beneficios;

-- Fix 2: remove policy pública permissiva e substitui por RPC SECURITY DEFINER
DROP POLICY IF EXISTS "public_view_cotacao_by_token" ON public.cotacoes;

CREATE OR REPLACE FUNCTION public.get_cotacao_publica_by_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  marca text,
  modelo text,
  ano_modelo integer,
  valor_bem numeric,
  mensalidade numeric,
  cliente_nome text,
  cliente_email text,
  cliente_whatsapp text,
  status text,
  aceite_expires_at timestamptz,
  aceita_em timestamptz,
  placa text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.marca, c.modelo, c.ano_modelo, c.valor_bem, c.mensalidade,
    c.cliente_nome, c.cliente_email, c.cliente_whatsapp, c.status,
    c.aceite_expires_at, c.aceita_em, c.placa
  FROM public.cotacoes c
  WHERE c.aceite_token = p_token
    AND c.aceite_token IS NOT NULL
    AND (c.aceite_expires_at IS NULL OR c.aceite_expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_cotacao_publica_by_token(uuid) TO anon, authenticated;