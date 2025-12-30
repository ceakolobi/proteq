-- Add new fields to associados table
ALTER TABLE public.associados 
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS estado_civil text,
ADD COLUMN IF NOT EXISTS profissao text,
ADD COLUMN IF NOT EXISTS numero text,
ADD COLUMN IF NOT EXISTS complemento text,
ADD COLUMN IF NOT EXISTS bairro text;

-- Add new fields to veiculos table  
ALTER TABLE public.veiculos
ADD COLUMN IF NOT EXISTS combustivel text,
ADD COLUMN IF NOT EXISTS quilometragem integer,
ADD COLUMN IF NOT EXISTS situacao_financeira text DEFAULT 'quitado';

-- Create storage bucket for associate documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('associado-documentos', 'associado-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for vehicle documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('veiculo-documentos', 'veiculo-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for associado-documentos bucket
CREATE POLICY "Authenticated users can upload associado docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'associado-documentos');

CREATE POLICY "Authenticated users can view associado docs"
ON storage.objects FOR SELECT
TO authenticated  
USING (bucket_id = 'associado-documentos');

CREATE POLICY "Authenticated users can update associado docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'associado-documentos');

CREATE POLICY "Authenticated users can delete associado docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'associado-documentos');

-- RLS policies for veiculo-documentos bucket
CREATE POLICY "Authenticated users can upload veiculo docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'veiculo-documentos');

CREATE POLICY "Authenticated users can view veiculo docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'veiculo-documentos');

CREATE POLICY "Authenticated users can update veiculo docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'veiculo-documentos');

CREATE POLICY "Authenticated users can delete veiculo docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'veiculo-documentos');

-- Create table to track uploaded documents
CREATE TABLE IF NOT EXISTS public.documentos_associado (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  associado_id uuid NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'rg', 'cnh', 'cpf', 'comprovante_residencia'
  nome_arquivo text NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  company_id uuid REFERENCES public.companies(id)
);

-- Enable RLS
ALTER TABLE public.documentos_associado ENABLE ROW LEVEL SECURITY;

-- RLS policies for documentos_associado
CREATE POLICY "Admin principal full access docs_associado"
ON public.documentos_associado FOR ALL
USING (is_admin_principal(auth.uid()));

CREATE POLICY "Company isolation docs_associado"
ON public.documentos_associado FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Consultor can manage own associado docs"
ON public.documentos_associado FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.associados a
    WHERE a.id = documentos_associado.associado_id
    AND a.consultor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.associados a
    WHERE a.id = documentos_associado.associado_id
    AND a.consultor_id = auth.uid()
  )
);

-- Create table to track vehicle documents
CREATE TABLE IF NOT EXISTS public.documentos_veiculo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'crlv', 'foto_frente', 'foto_traseira', 'foto_lateral', 'foto_painel', 'laudo_vistoria'
  nome_arquivo text NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  company_id uuid REFERENCES public.companies(id)
);

-- Enable RLS
ALTER TABLE public.documentos_veiculo ENABLE ROW LEVEL SECURITY;

-- RLS policies for documentos_veiculo
CREATE POLICY "Admin principal full access docs_veiculo"
ON public.documentos_veiculo FOR ALL
USING (is_admin_principal(auth.uid()));

CREATE POLICY "Company isolation docs_veiculo"
ON public.documentos_veiculo FOR ALL
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Consultor can manage own veiculo docs"
ON public.documentos_veiculo FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.veiculos v
    WHERE v.id = documentos_veiculo.veiculo_id
    AND v.consultor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.veiculos v
    WHERE v.id = documentos_veiculo.veiculo_id
    AND v.consultor_id = auth.uid()
  )
);

-- Add triggers for created_by and company_id
CREATE TRIGGER set_created_by_documentos_associado
  BEFORE INSERT ON public.documentos_associado
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by_and_company();

CREATE TRIGGER set_created_by_documentos_veiculo
  BEFORE INSERT ON public.documentos_veiculo
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by_and_company();