-- Criar tabela de informações do sistema
CREATE TABLE public.system_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_version text NOT NULL,
  release_date timestamp with time zone NOT NULL DEFAULT now(),
  release_notes text,
  updated_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.system_info ENABLE ROW LEVEL SECURITY;

-- Política: todos autenticados podem ler
CREATE POLICY "Authenticated users can read system_info"
ON public.system_info
FOR SELECT
TO authenticated
USING (true);

-- Política: apenas admin principal pode inserir/atualizar
CREATE POLICY "Admin principal can manage system_info"
ON public.system_info
FOR ALL
USING (is_admin_principal(auth.uid()))
WITH CHECK (is_admin_principal(auth.uid()));

-- Inserir versão inicial
INSERT INTO public.system_info (system_version, release_date, release_notes, updated_by)
VALUES ('1.0.0', now(), 'Versão inicial do sistema MARKA CRM - Proteção Veicular', 'Admin');