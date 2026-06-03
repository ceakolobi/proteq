ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS foto_url TEXT;

ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS veiculo_foto_url TEXT;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS contrato_gerado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS plano TEXT;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS valor_adesao NUMERIC;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS cidade_cliente TEXT;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS cep TEXT;

CREATE POLICY "Authenticated read fotos-veiculos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fotos-veiculos');

CREATE POLICY "Authenticated upload fotos-veiculos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fotos-veiculos');

CREATE POLICY "Authenticated update fotos-veiculos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'fotos-veiculos');

CREATE POLICY "Authenticated delete fotos-veiculos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'fotos-veiculos');