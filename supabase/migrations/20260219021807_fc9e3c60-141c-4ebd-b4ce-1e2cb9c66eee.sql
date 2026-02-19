
-- Allow anonymous users to insert cotacoes from the public quotation page
CREATE POLICY "Anon pode criar cotacao publica"
ON public.cotacoes
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to insert adesao_links from the public quotation page
CREATE POLICY "Anon pode criar adesao_link publica"
ON public.adesao_links
FOR INSERT
TO anon
WITH CHECK (true);
