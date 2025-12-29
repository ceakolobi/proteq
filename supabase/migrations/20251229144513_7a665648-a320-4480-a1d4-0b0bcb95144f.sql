-- Make the vistoria-fotos bucket public so PDFs can be accessed via shared links
UPDATE storage.buckets 
SET public = true 
WHERE id = 'vistoria-fotos';

-- Ensure there's a policy for public read access to the propostas folder
CREATE POLICY "Public can read propostas folder"
ON storage.objects FOR SELECT
USING (bucket_id = 'vistoria-fotos' AND (storage.foldername(name))[1] = 'propostas');