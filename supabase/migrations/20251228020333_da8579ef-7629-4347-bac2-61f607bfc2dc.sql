-- Add tipo_vistoria enum
CREATE TYPE public.tipo_vistoria AS ENUM ('pre_adesao', 'renovacao', 'reinspecao');

-- Add 'agendada' to inspection_status enum
ALTER TYPE public.inspection_status ADD VALUE IF NOT EXISTS 'agendada' AFTER 'pendente';

-- Add new columns to vistorias table
ALTER TABLE public.vistorias
ADD COLUMN IF NOT EXISTS tipo_vistoria public.tipo_vistoria DEFAULT 'pre_adesao',
ADD COLUMN IF NOT EXISTS local_vistoria text,
ADD COLUMN IF NOT EXISTS parecer_tecnico text,
ADD COLUMN IF NOT EXISTS sede_id uuid REFERENCES public.sedes(id),
ADD COLUMN IF NOT EXISTS consultor_id uuid,
ADD COLUMN IF NOT EXISTS solicitada_em timestamp with time zone DEFAULT now();

-- Populate sede_id and consultor_id from veiculos
UPDATE public.vistorias v
SET 
  sede_id = ve.sede_id,
  consultor_id = ve.consultor_id
FROM public.veiculos ve
WHERE v.veiculo_id = ve.id AND v.sede_id IS NULL;

-- Create function to update vehicle status when vistoria is approved/rejected
CREATE OR REPLACE FUNCTION public.update_veiculo_on_vistoria_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovada' AND OLD.status != 'aprovada' THEN
    UPDATE public.veiculos SET veiculo_status = 'aprovado', updated_at = now() WHERE id = NEW.veiculo_id;
  ELSIF NEW.status = 'reprovada' AND OLD.status != 'reprovada' THEN
    UPDATE public.veiculos SET veiculo_status = 'reprovado', updated_at = now() WHERE id = NEW.veiculo_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for vehicle status update
DROP TRIGGER IF EXISTS update_veiculo_status_on_vistoria ON public.vistorias;
CREATE TRIGGER update_veiculo_status_on_vistoria
AFTER UPDATE ON public.vistorias
FOR EACH ROW
EXECUTE FUNCTION public.update_veiculo_on_vistoria_change();

-- Add additional RLS policies for vistorias
-- Consultor can view their own vistorias
DROP POLICY IF EXISTS "Consultor view own vistorias" ON public.vistorias;
CREATE POLICY "Consultor view own vistorias"
ON public.vistorias FOR SELECT
USING (has_role(auth.uid(), 'consultor_vendas') AND consultor_id = auth.uid());

-- Consultor can create vistorias for their vehicles
DROP POLICY IF EXISTS "Consultor create vistorias" ON public.vistorias;
CREATE POLICY "Consultor create vistorias"
ON public.vistorias FOR INSERT
WITH CHECK (has_role(auth.uid(), 'consultor_vendas') AND consultor_id = auth.uid());

-- Cadastro can view all vistorias
DROP POLICY IF EXISTS "Cadastro view vistorias" ON public.vistorias;
CREATE POLICY "Cadastro view vistorias"
ON public.vistorias FOR SELECT
USING (has_role(auth.uid(), 'cadastro'));

-- Cadastro can manage vistorias (validate results)
DROP POLICY IF EXISTS "Cadastro manage vistorias" ON public.vistorias;
CREATE POLICY "Cadastro manage vistorias"
ON public.vistorias FOR UPDATE
USING (has_role(auth.uid(), 'cadastro'));

-- Financeiro can view all vistorias (read-only)
DROP POLICY IF EXISTS "Financeiro view vistorias" ON public.vistorias;
CREATE POLICY "Financeiro view vistorias"
ON public.vistorias FOR SELECT
USING (has_role(auth.uid(), 'financeiro'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vistorias_sede_id ON public.vistorias(sede_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_consultor_id ON public.vistorias(consultor_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_vistoriador_id ON public.vistorias(vistoriador_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_tipo_vistoria ON public.vistorias(tipo_vistoria);