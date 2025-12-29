-- Tornar o bucket vistoria-fotos privado
UPDATE storage.buckets SET public = false WHERE id = 'vistoria-fotos';

-- Criar políticas de acesso restritas para o bucket
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload inspection photos" ON storage.objects;

-- Apenas vistoriadores, admins e cadastro podem fazer upload
CREATE POLICY "vistoriador_upload_photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vistoria-fotos' AND
  auth.uid() IS NOT NULL AND
  (
    public.is_system_admin(auth.uid()) OR
    public.is_admin_principal(auth.uid()) OR
    public.has_role(auth.uid(), 'admin_regional') OR
    public.has_role(auth.uid(), 'cadastro') OR
    public.has_role(auth.uid(), 'vistoriador')
  )
);

-- Apenas usuários autorizados podem visualizar
CREATE POLICY "authorized_view_photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vistoria-fotos' AND
  auth.uid() IS NOT NULL AND
  (
    public.is_system_admin(auth.uid()) OR
    public.is_admin_principal(auth.uid()) OR
    public.has_role(auth.uid(), 'admin_regional') OR
    public.has_role(auth.uid(), 'cadastro') OR
    public.has_role(auth.uid(), 'vistoriador') OR
    public.has_role(auth.uid(), 'consultor_vendas')
  )
);

-- Apenas admins podem deletar
CREATE POLICY "admin_delete_photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vistoria-fotos' AND
  auth.uid() IS NOT NULL AND
  (
    public.is_system_admin(auth.uid()) OR
    public.is_admin_principal(auth.uid()) OR
    public.has_role(auth.uid(), 'admin_regional')
  )
);