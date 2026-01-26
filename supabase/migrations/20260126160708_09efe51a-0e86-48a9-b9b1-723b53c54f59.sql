-- Allow public/anonymous access to active cotas for landing page quotation
-- This is safe because cotas only contain pricing information, not sensitive data

-- Drop existing conflicting policies that might block anonymous access
DROP POLICY IF EXISTS "Authenticated users can view cotas" ON public.cotas;
DROP POLICY IF EXISTS "authenticated_view_company_cotas" ON public.cotas;

-- Create a policy that allows anonymous SELECT on active cotas
CREATE POLICY "public_view_active_cotas"
ON public.cotas
FOR SELECT
TO anon, authenticated
USING (ativo = true);

-- Keep admin management policies intact
-- (admin_empresa_manage_cotas and system_admin_cotas policies remain unchanged)