
-- Allow anonymous users to update lead status from the public quotation page
CREATE POLICY "Anon pode atualizar lead do site"
ON public.leads
FOR UPDATE
TO anon
USING (origem = 'site')
WITH CHECK (origem = 'site');
