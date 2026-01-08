-- Table to store acceptance term documents
CREATE TABLE public.termos_aceite (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  associado_id UUID NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id),
  tipo_documento TEXT NOT NULL DEFAULT 'termo_aceite',
  
  -- Term content and acceptance data
  versao_termo TEXT NOT NULL DEFAULT '1.0',
  conteudo_termo TEXT NOT NULL,
  
  -- Acceptance metadata
  data_hora_aceite TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_aceite TEXT,
  user_agent_aceite TEXT,
  canal_aceite TEXT NOT NULL DEFAULT 'app' CHECK (canal_aceite IN ('app', 'link', 'whatsapp', 'email')),
  
  -- Signature data
  assinatura_data TEXT, -- Base64 signature image
  assinatura_nome TEXT,
  assinatura_cpf TEXT,
  assinado_em TIMESTAMP WITH TIME ZONE,
  
  -- Document storage
  pdf_url TEXT,
  pdf_assinado_url TEXT,
  
  -- Token for public signing
  token_assinatura UUID NOT NULL DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'assinado', 'expirado', 'cancelado')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_termos_aceite_associado ON public.termos_aceite(associado_id);
CREATE INDEX idx_termos_aceite_token ON public.termos_aceite(token_assinatura);
CREATE INDEX idx_termos_aceite_status ON public.termos_aceite(status);
CREATE UNIQUE INDEX idx_termos_aceite_token_unique ON public.termos_aceite(token_assinatura);

-- Enable RLS
ALTER TABLE public.termos_aceite ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can view terms from their company"
ON public.termos_aceite FOR SELECT
USING (public.strict_company_isolation(company_id));

CREATE POLICY "Users can create terms"
ON public.termos_aceite FOR INSERT
WITH CHECK (public.strict_company_isolation(company_id));

CREATE POLICY "Users can update terms from their company"
ON public.termos_aceite FOR UPDATE
USING (public.strict_company_isolation(company_id));

-- Public access via token for signing
CREATE POLICY "Public can view term by token"
ON public.termos_aceite FOR SELECT
USING (
  token_assinatura IS NOT NULL 
  AND token_expires_at > now()
  AND status = 'pendente'
);

CREATE POLICY "Public can sign term by token"
ON public.termos_aceite FOR UPDATE
USING (
  token_assinatura IS NOT NULL 
  AND token_expires_at > now()
  AND status = 'pendente'
);

-- Trigger for updated_at
CREATE TRIGGER update_termos_aceite_updated_at
BEFORE UPDATE ON public.termos_aceite
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for auto company_id and created_by
CREATE TRIGGER set_termos_aceite_company
BEFORE INSERT ON public.termos_aceite
FOR EACH ROW
EXECUTE FUNCTION public.set_created_by_and_company();

-- Create storage bucket for term documents
INSERT INTO storage.buckets (id, name, public) VALUES ('termos-aceite', 'termos-aceite', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view term files"
ON storage.objects FOR SELECT
USING (bucket_id = 'termos-aceite' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload term files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'termos-aceite' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view term files by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'termos-aceite');