-- Drop the restrictive insert policy that only allows consultor_id = auth.uid()
DROP POLICY IF EXISTS "Cotacoes insert policy" ON public.cotacoes;

-- Create a more flexible insert policy for authenticated users
-- Allows: own insert (consultor_id = auth.uid()), OR admin/gerente can insert for anyone
CREATE POLICY "Cotacoes insert policy" 
ON public.cotacoes FOR INSERT TO authenticated
WITH CHECK (
  consultor_id = auth.uid() 
  OR is_admin_principal(auth.uid()) 
  OR is_admin_or_gerente(auth.uid())
);