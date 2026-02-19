
-- Allow anon to read minimal profile data (needed to get default consultor_id for public cotacao)
CREATE POLICY "Anon pode ler perfil basico para cotacao publica"
ON public.profiles
FOR SELECT
TO anon
USING (true);
