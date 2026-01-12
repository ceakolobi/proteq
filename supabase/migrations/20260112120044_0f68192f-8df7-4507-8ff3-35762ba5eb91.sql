-- Adicionar campos para controle de mensalidade manual
ALTER TABLE public.veiculos 
ADD COLUMN IF NOT EXISTS mensalidade_manual DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS mensalidade_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mensalidade_alterada_por UUID,
ADD COLUMN IF NOT EXISTS mensalidade_alterada_em TIMESTAMP WITH TIME ZONE;

-- Criar tabela de auditoria para alterações de mensalidade
CREATE TABLE IF NOT EXISTS public.mensalidade_alteracoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  valor_anterior DECIMAL(10,2),
  valor_novo DECIMAL(10,2),
  alterado_por UUID NOT NULL,
  alterado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  motivo TEXT,
  company_id UUID REFERENCES public.companies(id)
);

-- Enable RLS
ALTER TABLE public.mensalidade_alteracoes_log ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para log de alterações
CREATE POLICY "Log de mensalidade visível para admin e financeiro" 
ON public.mensalidade_alteracoes_log 
FOR SELECT 
USING (
  public.is_admin_principal(auth.uid()) OR 
  public.has_role(auth.uid(), 'admin_regional') OR 
  public.has_role(auth.uid(), 'financeiro')
);

CREATE POLICY "Apenas admin e financeiro podem inserir log" 
ON public.mensalidade_alteracoes_log 
FOR INSERT 
WITH CHECK (
  public.is_admin_principal(auth.uid()) OR 
  public.has_role(auth.uid(), 'financeiro')
);

-- Trigger para registrar alterações de mensalidade
CREATE OR REPLACE FUNCTION public.log_mensalidade_alteracao()
RETURNS TRIGGER AS $$
BEGIN
  -- Só loga se o campo mensalidade_override foi ativado ou se mensalidade_manual mudou
  IF (NEW.mensalidade_override = true AND (OLD.mensalidade_override IS DISTINCT FROM NEW.mensalidade_override OR OLD.mensalidade_manual IS DISTINCT FROM NEW.mensalidade_manual)) THEN
    INSERT INTO public.mensalidade_alteracoes_log (
      veiculo_id,
      valor_anterior,
      valor_novo,
      alterado_por,
      alterado_em,
      company_id
    ) VALUES (
      NEW.id,
      OLD.mensalidade,
      NEW.mensalidade,
      COALESCE(NEW.mensalidade_alterada_por, auth.uid()),
      now(),
      NEW.company_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_log_mensalidade_alteracao ON public.veiculos;
CREATE TRIGGER trigger_log_mensalidade_alteracao
AFTER UPDATE ON public.veiculos
FOR EACH ROW
EXECUTE FUNCTION public.log_mensalidade_alteracao();

-- Função para verificar se usuário pode editar mensalidade
CREATE OR REPLACE FUNCTION public.can_edit_mensalidade(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    public.is_admin_principal(_user_id) OR
    public.has_role(_user_id, 'financeiro')
$$;