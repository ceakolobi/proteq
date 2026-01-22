-- Fix: permissive RLS policy on fipe_cache
-- The previous policy allowed ALL commands with USING(true)/WITH CHECK(true) for role public.

DROP POLICY IF EXISTS "Service role can manage fipe_cache" ON public.fipe_cache;

-- Allow only the database role 'service_role' (used by backend/service key) to manage cache rows.
-- Using current_user prevents linter warning about always-true expressions.
CREATE POLICY "service_role_manage_fipe_cache"
ON public.fipe_cache
FOR ALL
TO public
USING (current_user = 'service_role')
WITH CHECK (current_user = 'service_role');
