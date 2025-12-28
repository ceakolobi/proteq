-- Create storage bucket for vistoria photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vistoria-fotos', 'vistoria-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for vistoria-fotos bucket
CREATE POLICY "Authenticated users can upload vistoria photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vistoria-fotos');

CREATE POLICY "Authenticated users can view vistoria photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'vistoria-fotos');

CREATE POLICY "Authenticated users can update own vistoria photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'vistoria-fotos');

CREATE POLICY "Authenticated users can delete own vistoria photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'vistoria-fotos');