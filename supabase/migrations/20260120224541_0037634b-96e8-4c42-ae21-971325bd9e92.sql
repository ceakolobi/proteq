-- Tabela para armazenar tokens de API
CREATE TABLE public.api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_api_tokens_company ON public.api_tokens(company_id);
CREATE INDEX idx_api_tokens_token ON public.api_tokens(token);
CREATE INDEX idx_api_tokens_active ON public.api_tokens(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin principal pode ver todos os tokens"
ON public.api_tokens FOR SELECT
TO authenticated
USING (public.is_admin_principal(auth.uid()));

CREATE POLICY "Usuários da mesma empresa podem ver tokens"
ON public.api_tokens FOR SELECT
TO authenticated
USING (public.strict_company_isolation(company_id));

CREATE POLICY "Admin pode criar tokens"
ON public.api_tokens FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_principal(auth.uid()) OR 
  public.is_admin_or_gerente(auth.uid())
);

CREATE POLICY "Admin pode atualizar tokens"
ON public.api_tokens FOR UPDATE
TO authenticated
USING (
  public.is_admin_principal(auth.uid()) OR 
  (public.is_admin_or_gerente(auth.uid()) AND public.strict_company_isolation(company_id))
);

CREATE POLICY "Admin pode deletar tokens"
ON public.api_tokens FOR DELETE
TO authenticated
USING (
  public.is_admin_principal(auth.uid()) OR 
  (public.is_admin_or_gerente(auth.uid()) AND public.strict_company_isolation(company_id))
);

-- Trigger para set company_id automaticamente
CREATE TRIGGER set_api_tokens_company_and_creator
  BEFORE INSERT ON public.api_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by_and_company();

-- Função para gerar token seguro
CREATE OR REPLACE FUNCTION public.generate_api_token()
RETURNS VARCHAR(64)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_token VARCHAR(64);
BEGIN
  -- Gerar token com prefixo 'hag_' (Harmony Agro) + 60 caracteres aleatórios
  new_token := 'hag_' || encode(gen_random_bytes(30), 'hex');
  RETURN new_token;
END;
$$;

-- Função para validar token de API (usada nas Edge Functions)
CREATE OR REPLACE FUNCTION public.validate_api_token(_token VARCHAR)
RETURNS TABLE(
  token_id UUID,
  company_id UUID,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.company_id,
    (t.is_active AND (t.expires_at IS NULL OR t.expires_at > now())) AS is_valid
  FROM public.api_tokens t
  WHERE t.token = _token;
  
  -- Atualizar último uso
  UPDATE public.api_tokens
  SET last_used_at = now()
  WHERE token = _token AND is_active = true;
END;
$$;