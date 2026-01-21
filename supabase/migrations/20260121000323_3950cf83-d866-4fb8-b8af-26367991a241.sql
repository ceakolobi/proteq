-- Corrigir geração de token para resolver gen_random_bytes quando a extensão pgcrypto está no schema 'extensions'
-- (em ambientes Lovable Cloud, extensões costumam ficar no schema extensions)

CREATE OR REPLACE FUNCTION public.generate_api_token()
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_token VARCHAR(64);
BEGIN
  -- Gerar token com prefixo 'hag_' (Harmony Agro) + 60 caracteres aleatórios
  new_token := 'hag_' || encode(extensions.gen_random_bytes(30), 'hex');
  RETURN new_token;
END;
$$;