-- Add digital signature columns to vistorias table
ALTER TABLE public.vistorias
  ADD COLUMN IF NOT EXISTS token_assinatura uuid,
  ADD COLUMN IF NOT EXISTS token_assinatura_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS contrato_url text,
  ADD COLUMN IF NOT EXISTS assinatura_png_url text,
  ADD COLUMN IF NOT EXISTS assinado_em timestamptz;

-- Index for fast lookup by signature token
CREATE INDEX IF NOT EXISTS idx_vistorias_token_assinatura
  ON public.vistorias (token_assinatura)
  WHERE token_assinatura IS NOT NULL;

-- RPC: fetch vistoria by token_assinatura (public, no auth required)
-- Used by /assinar/:token page
CREATE OR REPLACE FUNCTION public.get_vistoria_by_token_assinatura(p_token uuid)
RETURNS TABLE (
  id uuid,
  status text,
  token_assinatura uuid,
  token_assinatura_expires_at timestamptz,
  contrato_url text,
  assinado_em timestamptz,
  associado_id uuid,
  associado_nome text,
  veiculo_id uuid,
  veiculo_marca text,
  veiculo_modelo text,
  veiculo_placa text,
  veiculo_ano int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    v.status::text,
    v.token_assinatura,
    v.token_assinatura_expires_at,
    v.contrato_url,
    v.assinado_em,
    v.associado_id,
    a.nome_completo AS associado_nome,
    v.veiculo_id,
    ve.marca AS veiculo_marca,
    ve.modelo AS veiculo_modelo,
    ve.placa AS veiculo_placa,
    ve.ano AS veiculo_ano
  FROM public.vistorias v
  LEFT JOIN public.associados a ON a.id = v.associado_id
  LEFT JOIN public.veiculos ve ON ve.id = v.veiculo_id
  WHERE v.token_assinatura = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_vistoria_by_token_assinatura(uuid) TO anon, authenticated;
