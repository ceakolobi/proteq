DROP POLICY IF EXISTS "Public can upload proposta PDFs" ON storage.objects;

CREATE POLICY "Public can upload proposta PDFs"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'propostas'
  AND lower(name) LIKE '%.pdf'
);