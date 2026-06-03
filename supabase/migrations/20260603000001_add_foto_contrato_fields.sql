-- ============================================================
-- Migration: foto de veículo, campos de endereço e contrato
-- Adaptada para o projeto painelharmony (auth real + RLS)
-- ============================================================

-- 1. Foto do veículo na tabela veiculos
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Foto do veículo vinculada à cotação
ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS veiculo_foto_url  TEXT;

-- 3. Flag de contrato gerado
ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS contrato_gerado   BOOLEAN DEFAULT false;

-- 4. Plano e valor de adesão
ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS plano             TEXT,
  ADD COLUMN IF NOT EXISTS valor_adesao      DECIMAL(10,2);

-- 5. Dados pessoais complementares
ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS data_nascimento   TEXT;

-- 6. Endereço do cliente na cotação
ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS endereco          TEXT,
  ADD COLUMN IF NOT EXISTS numero            TEXT,
  ADD COLUMN IF NOT EXISTS bairro            TEXT,
  ADD COLUMN IF NOT EXISTS cidade_cliente    TEXT,
  ADD COLUMN IF NOT EXISTS estado            TEXT,
  ADD COLUMN IF NOT EXISTS cep               TEXT;

-- 7. Bucket para fotos de veículos (público)
--    Buckets associado-documentos e veiculo-documentos já existem.
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-veiculos', 'fotos-veiculos', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Políticas de storage para fotos-veiculos
DROP POLICY IF EXISTS "fotos_veiculos_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "fotos_veiculos_auth_insert"   ON storage.objects;
DROP POLICY IF EXISTS "fotos_veiculos_auth_update"   ON storage.objects;
DROP POLICY IF EXISTS "fotos_veiculos_auth_delete"   ON storage.objects;

CREATE POLICY "fotos_veiculos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos-veiculos');

CREATE POLICY "fotos_veiculos_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-veiculos');

CREATE POLICY "fotos_veiculos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'fotos-veiculos');

CREATE POLICY "fotos_veiculos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-veiculos');
