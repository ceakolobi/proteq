-- Adiciona valor 'cancelada' ao ENUM inspection_status
ALTER TYPE public.inspection_status ADD VALUE IF NOT EXISTS 'cancelada';

-- Colunas de auditoria para cancelamento (mantém histórico no banco)
ALTER TABLE public.vistorias
  ADD COLUMN IF NOT EXISTS cancelada_por  UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelada_em   TIMESTAMPTZ;

-- Policy RESTRICTIVA de DELETE: apenas admin_principal e admin_nivel_basico
-- (RESTRICTIVE faz AND com as permissive policies existentes)
CREATE POLICY "admins_delete_vistorias"
ON public.vistorias
AS RESTRICTIVE
FOR DELETE
USING (
  has_role(auth.uid(), 'admin_principal'::app_role)
  OR has_role(auth.uid(), 'admin_nivel_basico'::app_role)
);
