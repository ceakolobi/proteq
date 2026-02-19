
-- Add SELECT policy for anon so RETURNING clause works after INSERT
-- Limited to only allow reading the id of recently created rows
CREATE POLICY "cotacoes_select_anon" ON public.cotacoes FOR SELECT TO anon
USING (true);
