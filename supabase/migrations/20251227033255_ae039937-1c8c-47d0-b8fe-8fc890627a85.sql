-- Tabela de cache FIPE (24 horas)
CREATE TABLE public.fipe_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_veiculo TEXT NOT NULL,
  marca_id TEXT NOT NULL,
  marca_nome TEXT NOT NULL,
  modelo_id TEXT NOT NULL,
  modelo_nome TEXT NOT NULL,
  ano_id TEXT NOT NULL,
  ano_nome TEXT NOT NULL,
  codigo_fipe TEXT,
  valor NUMERIC NOT NULL,
  mes_referencia TEXT NOT NULL,
  combustivel TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE(tipo_veiculo, marca_id, modelo_id, ano_id)
);

-- Índices para performance
CREATE INDEX idx_fipe_cache_lookup ON public.fipe_cache(tipo_veiculo, marca_id, modelo_id, ano_id);
CREATE INDEX idx_fipe_cache_expires ON public.fipe_cache(expires_at);

-- Tabela de logs de consulta FIPE (auditoria LGPD)
CREATE TABLE public.fipe_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  endpoint TEXT NOT NULL,
  parametros JSONB NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  origem TEXT NOT NULL DEFAULT 'web', -- web, android, ios
  sucesso BOOLEAN NOT NULL DEFAULT true,
  erro TEXT,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas de auditoria
CREATE INDEX idx_fipe_logs_user ON public.fipe_logs(user_id);
CREATE INDEX idx_fipe_logs_created ON public.fipe_logs(created_at);

-- Enable RLS
ALTER TABLE public.fipe_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fipe_logs ENABLE ROW LEVEL SECURITY;

-- Políticas fipe_cache: leitura para autenticados, escrita via service role
CREATE POLICY "Authenticated users can read fipe_cache"
ON public.fipe_cache FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage fipe_cache"
ON public.fipe_cache FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas fipe_logs: admin pode ver todos, usuário vê os próprios
CREATE POLICY "Admin can view all fipe_logs"
ON public.fipe_logs FOR SELECT
USING (is_admin_principal(auth.uid()));

CREATE POLICY "Users can view own fipe_logs"
ON public.fipe_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert fipe_logs"
ON public.fipe_logs FOR INSERT
WITH CHECK (true);

-- Função para limpar cache expirado (pode ser chamada periodicamente)
CREATE OR REPLACE FUNCTION public.cleanup_expired_fipe_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.fipe_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;