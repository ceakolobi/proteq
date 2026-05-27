DROP POLICY IF EXISTS "Propostas public upload" ON storage.objects;
DROP POLICY IF EXISTS "Propostas public read" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload proposta PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Public can read proposta PDFs" ON storage.objects;

CREATE POLICY "Public can upload proposta PDFs"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'propostas'
  AND lower(coalesce((metadata->>'mimetype'), '')) = 'application/pdf'
  AND lower(name) LIKE '%.pdf'
);

CREATE POLICY "Public can read proposta PDFs"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'propostas');