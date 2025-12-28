-- Create enum for activation status
CREATE TYPE public.ativacao_status AS ENUM ('pendente_financeiro', 'ativo', 'suspenso', 'cancelado');

-- Create ativacoes table
CREATE TABLE public.ativacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  associado_id UUID NOT NULL REFERENCES public.associados(id) ON DELETE RESTRICT,
  sede_id UUID REFERENCES public.sedes(id),
  consultor_id UUID,
  numero_contrato VARCHAR(50) NOT NULL,
  plano VARCHAR(100),
  categoria VARCHAR(100),
  cobertura_resumida TEXT,
  data_ativacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  status ativacao_status NOT NULL DEFAULT 'pendente_financeiro',
  observacoes TEXT,
  ativado_por UUID,
  ativado_em TIMESTAMP WITH TIME ZONE,
  suspenso_por UUID,
  suspenso_em TIMESTAMP WITH TIME ZONE,
  motivo_suspensao TEXT,
  cancelado_por UUID,
  cancelado_em TIMESTAMP WITH TIME ZONE,
  motivo_cancelamento TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_veiculo_ativacao UNIQUE (veiculo_id)
);

-- Enable RLS
ALTER TABLE public.ativacoes ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_ativacoes_updated_at
  BEFORE UPDATE ON public.ativacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Block anonymous access
CREATE POLICY "Block anonymous access to ativacoes"
  ON public.ativacoes
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Admin principal full access
CREATE POLICY "Admin principal full access ativacoes"
  ON public.ativacoes
  FOR ALL
  USING (is_admin_principal(auth.uid()));

-- Admin regional manage sede ativacoes
CREATE POLICY "Admin regional manage ativacoes"
  ON public.ativacoes
  FOR ALL
  USING (has_role(auth.uid(), 'admin_regional') AND sede_id = get_user_sede(auth.uid()));

-- Cadastro/Backoffice can manage ativacoes
CREATE POLICY "Cadastro manage ativacoes"
  ON public.ativacoes
  FOR ALL
  USING (has_role(auth.uid(), 'cadastro'));

-- Financeiro can view and update (suspend)
CREATE POLICY "Financeiro view ativacoes"
  ON public.ativacoes
  FOR SELECT
  USING (has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Financeiro update ativacoes"
  ON public.ativacoes
  FOR UPDATE
  USING (has_role(auth.uid(), 'financeiro'));

-- Consultor can view own and request activation (insert)
CREATE POLICY "Consultor view own ativacoes"
  ON public.ativacoes
  FOR SELECT
  USING (has_role(auth.uid(), 'consultor_vendas') AND consultor_id = auth.uid());

CREATE POLICY "Consultor insert ativacoes"
  ON public.ativacoes
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'consultor_vendas') AND consultor_id = auth.uid());

-- Function to update vehicle status when activation status changes
CREATE OR REPLACE FUNCTION public.update_veiculo_on_ativacao_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When activation becomes active
  IF NEW.status = 'ativo' AND (OLD.status IS NULL OR OLD.status != 'ativo') THEN
    UPDATE public.veiculos 
    SET veiculo_status = 'ativo', 
        protecao_ativa = true, 
        protecao_ativada_em = now(),
        updated_at = now() 
    WHERE id = NEW.veiculo_id;
  -- When activation is cancelled
  ELSIF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    UPDATE public.veiculos 
    SET veiculo_status = 'cancelado', 
        protecao_ativa = false,
        updated_at = now() 
    WHERE id = NEW.veiculo_id;
  -- When activation is suspended
  ELSIF NEW.status = 'suspenso' AND OLD.status != 'suspenso' THEN
    UPDATE public.veiculos 
    SET protecao_ativa = false,
        updated_at = now() 
    WHERE id = NEW.veiculo_id;
  -- When reactivated from suspension
  ELSIF NEW.status = 'ativo' AND OLD.status = 'suspenso' THEN
    UPDATE public.veiculos 
    SET protecao_ativa = true,
        updated_at = now() 
    WHERE id = NEW.veiculo_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for vehicle status sync
CREATE TRIGGER sync_veiculo_on_ativacao_change
  AFTER INSERT OR UPDATE OF status ON public.ativacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_veiculo_on_ativacao_change();

-- Create indexes for performance
CREATE INDEX idx_ativacoes_veiculo ON public.ativacoes(veiculo_id);
CREATE INDEX idx_ativacoes_associado ON public.ativacoes(associado_id);
CREATE INDEX idx_ativacoes_sede ON public.ativacoes(sede_id);
CREATE INDEX idx_ativacoes_consultor ON public.ativacoes(consultor_id);
CREATE INDEX idx_ativacoes_status ON public.ativacoes(status);
CREATE INDEX idx_ativacoes_numero_contrato ON public.ativacoes(numero_contrato);