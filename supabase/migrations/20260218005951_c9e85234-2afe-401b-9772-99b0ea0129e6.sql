
-- Tighten public update policy to only allow status/docs/fotos/assinatura updates
DROP POLICY "Public update by token" ON public.adesao_links;

CREATE POLICY "Public update by token" ON public.adesao_links
  FOR UPDATE USING (status != 'concluido' AND expires_at > now())
  WITH CHECK (status != 'concluido');
