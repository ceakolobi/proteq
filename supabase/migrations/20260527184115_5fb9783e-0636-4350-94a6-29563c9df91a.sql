
-- Revoke from PUBLIC role too
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Tighten anon upload to vistoria-fotos: require uuid-shaped path prefix
DROP POLICY IF EXISTS "Anon can upload vistoria-fotos" ON storage.objects;
CREATE POLICY "Anon can upload vistoria-fotos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'vistoria-fotos'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);
