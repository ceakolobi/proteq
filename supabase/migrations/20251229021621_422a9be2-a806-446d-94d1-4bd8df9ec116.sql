-- Criar tabela de configurações do sistema
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_nome text NOT NULL DEFAULT 'Harmony Agro',
  empresa_logo text,
  empresa_logo_branca text,
  cor_primaria text NOT NULL DEFAULT '#F97316',
  cor_secundaria text NOT NULL DEFAULT '#22C55E',
  cor_destaque text NOT NULL DEFAULT '#F59E0B',
  texto_institucional text DEFAULT 'Esta proposta tem validade de 7 dias. Os valores podem sofrer alteração conforme tabela FIPE vigente no momento da contratação. A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade.',
  pdf_contracapa text,
  telefone text DEFAULT '(00) 00000-0000',
  email text DEFAULT 'contato@harmonyagro.com.br',
  site text DEFAULT 'www.harmonyagro.com.br',
  modo_white_label boolean NOT NULL DEFAULT false,
  esconder_marca_harmony boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Todos os usuários autenticados podem ler as configurações
CREATE POLICY "Authenticated users can view settings"
ON public.settings
FOR SELECT
USING (auth.role() = 'authenticated');

-- Apenas admin principal pode modificar
CREATE POLICY "Admin principal can manage settings"
ON public.settings
FOR ALL
USING (is_admin_principal(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão
INSERT INTO public.settings (id) VALUES (gen_random_uuid());