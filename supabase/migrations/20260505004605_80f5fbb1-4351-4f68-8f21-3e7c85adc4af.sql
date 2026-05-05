-- 1. Restrict system_info read access to admins only
DROP POLICY IF EXISTS "Authenticated users can read system_info" ON public.system_info;

CREATE POLICY "Admins can read system_info"
ON public.system_info
FOR SELECT
TO authenticated
USING (
  is_admin_principal(auth.uid())
  OR has_role(auth.uid(), 'admin_nivel_basico')
  OR has_role(auth.uid(), 'admin_regional')
);

-- 2. Tighten cotacoes anon SELECT — was USING(true), exposing all quotes.
-- The policy existed to support INSERT...RETURNING for anonymous funnels.
-- Restrict by limiting visibility to rows that have no consultor or that
-- belong to public funnels; in practice anon clients should only ever see
-- the row they just created via RETURNING, but to keep the funnel working
-- we scope it to the public-funnel context (origem = 'site' on linked lead
-- is not reliable on cotacoes itself). Safer: drop the broad SELECT and
-- grant a narrow one only when necessary.
DROP POLICY IF EXISTS "cotacoes_select_anon" ON public.cotacoes;

-- Note: INSERT...RETURNING in PostgREST does NOT require a SELECT policy
-- when using anon key; the inserted row is returned to the caller as part
-- of the INSERT response. Removing the broad SELECT closes the data leak
-- without breaking the public funnel.

-- 3. Tighten leads anon SELECT — was USING(true), allowing any anon to
-- enumerate all leads. The original purpose was duplicate-by-phone check.
-- Replace with a SECURITY DEFINER RPC for that single use-case.
DROP POLICY IF EXISTS "Allow anonymous to check existing leads by phone" ON public.leads;

CREATE OR REPLACE FUNCTION public.check_lead_exists_by_phone(_telefone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads
    WHERE telefone = _telefone
      AND origem = 'site'::lead_origem
  )
$$;

GRANT EXECUTE ON FUNCTION public.check_lead_exists_by_phone(text) TO anon, authenticated;