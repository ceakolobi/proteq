
-- 1) PROFILES
DROP POLICY IF EXISTS "Anon pode ler perfil basico para cotacao publica" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_consultor_publico(p_consultor_id uuid)
RETURNS TABLE(id uuid, nome_completo text, company_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.nome_completo, p.company_id FROM public.profiles p
  WHERE p.id = p_consultor_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_default_consultor_publico()
RETURNS TABLE(id uuid, nome_completo text, company_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.nome_completo, p.company_id
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'consultor_vendas' AND COALESCE(p.ativo, true) = true
  ORDER BY p.created_at ASC LIMIT 1;
$$;

-- 2) COTACOES
DROP POLICY IF EXISTS "public_view_cotacao_by_token" ON public.cotacoes;

CREATE OR REPLACE FUNCTION public.get_proposta_publica_by_id(p_id uuid)
RETURNS TABLE(
  id uuid, created_at timestamptz, marca text, modelo text,
  ano_modelo integer, valor_bem numeric, mensalidade numeric,
  cliente_nome text, consultor_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.created_at, c.marca, c.modelo, c.ano_modelo,
         c.valor_bem, c.mensalidade, c.cliente_nome, c.consultor_id
  FROM public.cotacoes c WHERE c.id = p_id LIMIT 1;
$$;

-- 3) VISTORIAS  (fotos is text[])
DROP POLICY IF EXISTS "Allow public access via token" ON public.vistorias;
DROP POLICY IF EXISTS "Allow public update via token for photos and checklist" ON public.vistorias;

DROP FUNCTION IF EXISTS public.get_vistoria_publica_by_token(uuid);
CREATE OR REPLACE FUNCTION public.get_vistoria_publica_by_token(p_token uuid)
RETURNS TABLE(
  id uuid, token_acesso uuid, token_expires_at timestamptz, status text,
  tipo_vistoria text, checklist jsonb, fotos text[], observacoes text,
  veiculo_id uuid, veiculo_marca text, veiculo_modelo text, veiculo_placa text, veiculo_ano integer,
  associado_id uuid, associado_nome text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.id, v.token_acesso, v.token_expires_at, v.status::text,
         v.tipo_vistoria::text, v.checklist, v.fotos, v.observacoes,
         ve.id, ve.marca, ve.modelo, ve.placa, ve.ano,
         a.id, a.nome_completo
  FROM public.vistorias v
  LEFT JOIN public.veiculos ve ON ve.id = v.veiculo_id
  LEFT JOIN public.associados a ON a.id = v.associado_id
  WHERE v.token_acesso = p_token
    AND v.token_acesso IS NOT NULL
    AND (v.token_expires_at IS NULL OR v.token_expires_at > now())
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.salvar_vistoria_publica(uuid, jsonb, jsonb);
CREATE OR REPLACE FUNCTION public.salvar_vistoria_publica(
  p_token uuid, p_checklist jsonb, p_fotos text[]
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_token IS NULL THEN RAISE EXCEPTION 'Token inválido'; END IF;
  SELECT id INTO v_id FROM public.vistorias
  WHERE token_acesso = p_token
    AND (token_expires_at IS NULL OR token_expires_at > now())
    AND status::text IN ('pendente', 'em_andamento')
  LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Vistoria não encontrada, expirada ou já concluída'; END IF;
  UPDATE public.vistorias
  SET checklist = p_checklist, fotos = p_fotos,
      status = 'em_andamento',
      solicitada_em = COALESCE(solicitada_em, now()),
      updated_at = now()
  WHERE id = v_id;
  RETURN v_id;
END;
$$;

-- 4) TERMOS_ACEITE
DROP POLICY IF EXISTS "Public can renew term token" ON public.termos_aceite;

-- 5) COTACAO_BENEFICIOS
DROP POLICY IF EXISTS "anon_view_cotacao_beneficios" ON public.cotacao_beneficios;
DROP POLICY IF EXISTS "anon_insert_cotacao_beneficios" ON public.cotacao_beneficios;

CREATE POLICY "anon_insert_cotacao_beneficios_scoped"
ON public.cotacao_beneficios FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cotacoes c
    WHERE c.id = cotacao_beneficios.cotacao_id
      AND (c.aceite_expires_at IS NULL OR c.aceite_expires_at > now())
      AND c.created_at > (now() - interval '24 hours')
  )
);

-- 6) STORAGE: vistoria-fotos
DROP POLICY IF EXISTS "Authenticated users can upload vistoria photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vistoria photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vistoria photos" ON storage.objects;
DROP POLICY IF EXISTS "Vistoria photos accessible to authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Public can list vistoria fotos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view vistoria fotos" ON storage.objects;

CREATE POLICY "Staff can list vistoria-fotos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vistoria-fotos' AND (
    public.is_admin_principal(auth.uid())
    OR public.has_role(auth.uid(), 'admin_regional')
    OR public.has_role(auth.uid(), 'cadastro')
    OR public.has_role(auth.uid(), 'vistoriador')
  )
);

CREATE POLICY "Anon can upload vistoria-fotos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'vistoria-fotos');

CREATE POLICY "Staff can upload vistoria-fotos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vistoria-fotos' AND (
    public.is_admin_principal(auth.uid())
    OR public.has_role(auth.uid(), 'admin_regional')
    OR public.has_role(auth.uid(), 'cadastro')
    OR public.has_role(auth.uid(), 'vistoriador')
  )
);

CREATE POLICY "Staff can update vistoria-fotos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vistoria-fotos' AND (
    public.is_admin_principal(auth.uid())
    OR public.has_role(auth.uid(), 'admin_regional')
    OR public.has_role(auth.uid(), 'cadastro')
    OR public.has_role(auth.uid(), 'vistoriador')
  )
);

CREATE POLICY "Staff can delete vistoria-fotos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vistoria-fotos' AND (
    public.is_admin_principal(auth.uid())
    OR public.has_role(auth.uid(), 'admin_regional')
    OR public.has_role(auth.uid(), 'cadastro')
  )
);

-- 7) STORAGE: propostas
DROP POLICY IF EXISTS "Public can read propostas" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view propostas" ON storage.objects;
DROP POLICY IF EXISTS "Public can list propostas" ON storage.objects;

CREATE POLICY "Authenticated can list propostas"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'propostas');

-- 8) Revoke anon EXECUTE on all SECURITY DEFINER fns
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Criar função se não existir antes do grant
CREATE OR REPLACE FUNCTION public.check_lead_exists_by_phone(p_telefone text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.leads WHERE telefone = p_telefone);
$$;

GRANT EXECUTE ON FUNCTION public.get_termo_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_cotacao_publica_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.renovar_token_termo(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.check_lead_exists_by_phone(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_consultor_publico(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_default_consultor_publico() TO anon;
GRANT EXECUTE ON FUNCTION public.get_proposta_publica_by_id(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_vistoria_publica_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.salvar_vistoria_publica(uuid, jsonb, text[]) TO anon;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', r.nspname, r.proname, r.args);
  END LOOP;
END $$;
