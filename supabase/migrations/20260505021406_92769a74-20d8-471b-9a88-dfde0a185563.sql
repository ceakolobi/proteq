
-- ============================================================
-- 1. adesao_links: lock down public access (table is unused)
-- ============================================================
DROP POLICY IF EXISTS "Public access by token" ON public.adesao_links;
DROP POLICY IF EXISTS "Public update by token" ON public.adesao_links;
DROP POLICY IF EXISTS "Anon pode criar adesao_link publica" ON public.adesao_links;

-- ============================================================
-- 2. termos_aceite: remove broad public SELECT, restrict UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Public can view term by token" ON public.termos_aceite;
DROP POLICY IF EXISTS "Public can sign term by token" ON public.termos_aceite;

CREATE POLICY "Public can renew term token"
ON public.termos_aceite
FOR UPDATE
TO anon, authenticated
USING (status = 'pendente')
WITH CHECK (status = 'pendente');

-- Secure RPC to fetch a term by its exact token (uuid).
CREATE OR REPLACE FUNCTION public.get_termo_by_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  associado_id uuid,
  veiculo_id uuid,
  conteudo_termo text,
  status text,
  token_assinatura uuid,
  token_expires_at timestamptz,
  associado_nome text,
  associado_cpf text,
  associado_email text,
  associado_telefone text,
  associado_whatsapp text,
  veiculo_placa text,
  veiculo_marca text,
  veiculo_modelo text,
  veiculo_ano integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.associado_id,
    t.veiculo_id,
    t.conteudo_termo,
    t.status,
    t.token_assinatura,
    t.token_expires_at,
    a.nome_completo,
    a.cpf,
    a.email,
    a.telefone,
    a.whatsapp,
    v.placa,
    v.marca,
    v.modelo,
    v.ano
  FROM public.termos_aceite t
  LEFT JOIN public.associados a ON a.id = t.associado_id
  LEFT JOIN public.veiculos   v ON v.id = t.veiculo_id
  WHERE t.token_assinatura = p_token
    AND p_token IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_termo_by_token(uuid) TO anon, authenticated;

-- Secure RPC to renew an expiring/expired token.
CREATE OR REPLACE FUNCTION public.renovar_token_termo(p_old_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token uuid;
  v_termo_id uuid;
BEGIN
  IF p_old_token IS NULL THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;

  SELECT id INTO v_termo_id
  FROM public.termos_aceite
  WHERE token_assinatura = p_old_token
    AND status = 'pendente'
  LIMIT 1;

  IF v_termo_id IS NULL THEN
    RAISE EXCEPTION 'Termo não encontrado ou já assinado';
  END IF;

  v_new_token := gen_random_uuid();

  UPDATE public.termos_aceite
  SET token_assinatura = v_new_token,
      token_expires_at = now() + interval '72 hours',
      updated_at = now()
  WHERE id = v_termo_id;

  RETURN v_new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.renovar_token_termo(uuid) TO anon, authenticated;

-- ============================================================
-- 3. Storage: termos-aceite bucket — remove public SELECT
-- ============================================================
DROP POLICY IF EXISTS "Public can view term files by path" ON storage.objects;

-- ============================================================
-- 4. Storage: adesao-documentos bucket — make private + lock down
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'adesao-documentos';

DROP POLICY IF EXISTS "Anyone can view adesao docs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload adesao docs" ON storage.objects;

CREATE POLICY "Staff can view adesao docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'adesao-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
    OR has_role(auth.uid(), 'consultor_vendas'::app_role)
  )
);

CREATE POLICY "Staff can upload adesao docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'adesao-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
    OR has_role(auth.uid(), 'consultor_vendas'::app_role)
  )
);

-- ============================================================
-- 5. Storage: associado-documentos / veiculo-documentos
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view associado docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload associado docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update associado docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete associado docs" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can view veiculo docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload veiculo docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update veiculo docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete veiculo docs" ON storage.objects;

CREATE POLICY "Staff can view associado docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'associado-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
    OR has_role(auth.uid(), 'consultor_vendas'::app_role)
    OR has_role(auth.uid(), 'vistoriador'::app_role)
  )
);

CREATE POLICY "Staff can upload associado docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'associado-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
    OR has_role(auth.uid(), 'consultor_vendas'::app_role)
  )
);

CREATE POLICY "Staff can update associado docs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'associado-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
  )
);

CREATE POLICY "Staff can delete associado docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'associado-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
  )
);

CREATE POLICY "Staff can view veiculo docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'veiculo-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
    OR has_role(auth.uid(), 'consultor_vendas'::app_role)
    OR has_role(auth.uid(), 'vistoriador'::app_role)
  )
);

CREATE POLICY "Staff can upload veiculo docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'veiculo-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
    OR has_role(auth.uid(), 'consultor_vendas'::app_role)
  )
);

CREATE POLICY "Staff can update veiculo docs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'veiculo-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
  )
);

CREATE POLICY "Staff can delete veiculo docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'veiculo-documentos'
  AND (
    is_admin_principal(auth.uid())
    OR has_role(auth.uid(), 'admin_regional'::app_role)
    OR has_role(auth.uid(), 'cadastro'::app_role)
  )
);
