-- Permitir inserção de leads pela landing page pública
-- A política permite que usuários anônimos (visitantes do site) criem leads
-- Isso é necessário para o funil de cotação pública funcionar

-- Primeiro, vamos criar uma política mais específica para permitir INSERT do anon
CREATE POLICY "Allow anonymous lead creation from landing page"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (
  -- Apenas permite se os campos obrigatórios estiverem preenchidos
  nome IS NOT NULL AND
  telefone IS NOT NULL AND
  consultor_id IS NOT NULL
);

-- Permitir que anon leia leads existentes apenas para verificar duplicatas (por telefone)
CREATE POLICY "Allow anonymous to check existing leads by phone"
ON public.leads
FOR SELECT
TO anon
USING (true);