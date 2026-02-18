
-- Tabela para links únicos de adesão/vistoria
CREATE TABLE public.adesao_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'documentos_enviados', 'concluido', 'expirado')),
  dados_complementares JSONB DEFAULT NULL,
  documentos_enviados JSONB DEFAULT '[]'::jsonb,
  fotos_veiculo JSONB DEFAULT '[]'::jsonb,
  assinatura_url TEXT DEFAULT NULL,
  assinado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  assinado_ip TEXT DEFAULT NULL,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days')
);

-- RLS
ALTER TABLE public.adesao_links ENABLE ROW LEVEL SECURITY;

-- Acesso público por token (para o link funcionar sem login)
CREATE POLICY "Public access by token" ON public.adesao_links
  FOR SELECT USING (true);

-- Atualização pública por token (upload de docs sem login)
CREATE POLICY "Public update by token" ON public.adesao_links
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admin full access adesao_links" ON public.adesao_links
  FOR ALL USING (is_admin_principal(auth.uid()));

-- Company isolation
CREATE POLICY "Company isolation adesao_links" ON public.adesao_links
  FOR ALL USING (company_id = get_user_company(auth.uid()))
  WITH CHECK (company_id = get_user_company(auth.uid()));

-- Storage bucket para documentos de adesão
INSERT INTO storage.buckets (id, name, public) 
VALUES ('adesao-documentos', 'adesao-documentos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload adesao docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'adesao-documentos');

CREATE POLICY "Anyone can view adesao docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'adesao-documentos');
