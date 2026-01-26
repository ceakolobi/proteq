-- Permitir que usuários anônimos leiam consultores para associar leads da landing page
-- Esta política permite apenas SELECT limitado para encontrar um consultor padrão

CREATE POLICY "Allow anonymous to read consultant profiles for lead creation"
ON public.profiles
FOR SELECT
TO anon
USING (
  -- Apenas permite leitura de profiles que são consultores ativos
  ativo = true
);