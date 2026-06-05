
ALTER TABLE public.vistorias 
  ADD COLUMN IF NOT EXISTS token_assinatura uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS token_assinatura_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS assinado_em timestamptz,
  ADD COLUMN IF NOT EXISTS assinado_ip text,
  ADD COLUMN IF NOT EXISTS assinado_user_agent text,
  ADD COLUMN IF NOT EXISTS assinatura_url text,
  ADD COLUMN IF NOT EXISTS contrato_url text;

CREATE INDEX IF NOT EXISTS idx_vistorias_token_assinatura ON public.vistorias(token_assinatura);

CREATE OR REPLACE FUNCTION public.get_vistoria_by_token_assinatura(p_token uuid)
RETURNS TABLE (
  id uuid,
  status text,
  token_assinatura uuid,
  token_assinatura_expires_at timestamptz,
  contrato_url text,
  assinado_em timestamptz,
  associado_nome text,
  veiculo_marca text,
  veiculo_modelo text,
  veiculo_placa text,
  veiculo_ano integer
)
LANGUAGE sql
STABLE
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
    COALESCE(a.nome_completo, '')::text AS associado_nome,
    COALESCE(ve.marca, '')::text AS veiculo_marca,
    COALESCE(ve.modelo, '')::text AS veiculo_modelo,
    COALESCE(ve.placa, '')::text AS veiculo_placa,
    COALESCE(ve.ano, 0)::integer AS veiculo_ano
  FROM public.vistorias v
  LEFT JOIN public.associados a ON a.id = v.associado_id
  LEFT JOIN public.veiculos ve ON ve.id = v.veiculo_id
  WHERE v.token_assinatura = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_vistoria_by_token_assinatura(uuid) TO anon, authenticated;
