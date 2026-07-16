-- =====================================================================
-- CONSULTORES — Pedaço 1: consultores_detalhes + documentos_consultor + bucket
-- =====================================================================
-- ATENÇÃO:
--   * Fora de supabase/migrations/ de propósito (NÃO auto-aplica em deploy).
--   * Alvo: sfobrbxzdbgjoxgjerus. REVISAR e aplicar manualmente no SQL Editor.
--   * NÃO toca no fluxo de contrato (generate-contract-manual / send-contract-email).
--
-- DESIGN:
--   RLS por empresa DERIVADA de profiles (join por consultor_id) — sem coluna
--   company_id denormalizada. Um "consultor" é profiles.id (= auth.uid()).
--   Helpers usados: public.is_admin_principal(uuid), public.get_user_company(uuid).
-- =====================================================================


-- =======================================================
-- BLOCO 0 — VERIFICAR ANTES (rodar e conferir)
-- =======================================================
-- (a) helpers existem? ESPERADO: 2 linhas (get_user_company, is_admin_principal)
SELECT p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('is_admin_principal','get_user_company')
ORDER BY p.proname;

-- (b) tabelas ainda NÃO existem? ESPERADO: ambas NULL
SELECT to_regclass('public.consultores_detalhes') AS consultores_detalhes,
       to_regclass('public.documentos_consultor')  AS documentos_consultor;

-- (c) bucket ainda NÃO existe? ESPERADO: 0 linhas
SELECT id FROM storage.buckets WHERE id = 'consultor-documentos';

-- (d) dependência profiles existe? ESPERADO: profiles não-nulo
SELECT to_regclass('public.profiles') AS profiles;


-- =======================================================
-- BLOCO 1 — MIGRATION (rodar só depois de conferir o Bloco 0)
-- =======================================================
BEGIN;

-- 1) Detalhes do consultor (1:1 com profiles)
CREATE TABLE IF NOT EXISTS public.consultores_detalhes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id    uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  site            text,
  foto_url        text,
  telefones       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  rg              text,
  data_nascimento date,
  cnh_numero      text,
  cnh_categoria   text,
  cnh_validade    date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultores_detalhes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cd_select_owner" ON public.consultores_detalhes;
DROP POLICY IF EXISTS "cd_insert_owner" ON public.consultores_detalhes;
DROP POLICY IF EXISTS "cd_update_owner" ON public.consultores_detalhes;
DROP POLICY IF EXISTS "cd_delete_owner" ON public.consultores_detalhes;

-- SELECT: admin OR mesma empresa OR o próprio consultor
CREATE POLICY "cd_select_owner" ON public.consultores_detalhes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = consultores_detalhes.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid())
         OR p.id = auth.uid())
));

-- INSERT: staff (admin OR mesma empresa)
CREATE POLICY "cd_insert_owner" ON public.consultores_detalhes FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = consultores_detalhes.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
));

-- UPDATE: staff (USING + WITH CHECK)
CREATE POLICY "cd_update_owner" ON public.consultores_detalhes FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = consultores_detalhes.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = consultores_detalhes.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
));

-- DELETE: staff
CREATE POLICY "cd_delete_owner" ON public.consultores_detalhes FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = consultores_detalhes.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
));


-- 2) Documentos do consultor
CREATE TABLE IF NOT EXISTS public.documentos_consultor (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo          text        NOT NULL,           -- 'cnh' | 'rg' | 'comprovante_endereco'
  nome_arquivo  text,
  storage_path  text,
  url           text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_consultor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dc_select_owner" ON public.documentos_consultor;
DROP POLICY IF EXISTS "dc_insert_owner" ON public.documentos_consultor;
DROP POLICY IF EXISTS "dc_update_owner" ON public.documentos_consultor;
DROP POLICY IF EXISTS "dc_delete_owner" ON public.documentos_consultor;

CREATE POLICY "dc_select_owner" ON public.documentos_consultor FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = documentos_consultor.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid())
         OR p.id = auth.uid())
));

CREATE POLICY "dc_insert_owner" ON public.documentos_consultor FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = documentos_consultor.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
));

CREATE POLICY "dc_update_owner" ON public.documentos_consultor FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = documentos_consultor.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = documentos_consultor.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
));

CREATE POLICY "dc_delete_owner" ON public.documentos_consultor FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = documentos_consultor.consultor_id
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
));


-- 3) Bucket privado de documentos do consultor
INSERT INTO storage.buckets (id, name, public)
VALUES ('consultor-documentos', 'consultor-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- 4) Policies de storage (path = {consultor_id}/arquivo)
DROP POLICY IF EXISTS "consultor_docs_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "consultor_docs_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "consultor_docs_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "consultor_docs_delete_owner" ON storage.objects;

CREATE POLICY "consultor_docs_select_owner" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'consultor-documentos' AND EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id::text = (storage.foldername(name))[1]
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid())
         OR p.id = auth.uid())
));

CREATE POLICY "consultor_docs_insert_owner" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'consultor-documentos' AND EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id::text = (storage.foldername(name))[1]
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
));

CREATE POLICY "consultor_docs_update_owner" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'consultor-documentos' AND EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id::text = (storage.foldername(name))[1]
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
));

CREATE POLICY "consultor_docs_delete_owner" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'consultor-documentos' AND EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id::text = (storage.foldername(name))[1]
    AND (public.is_admin_principal(auth.uid())
         OR p.company_id = public.get_user_company(auth.uid()))
));

COMMIT;


-- =======================================================
-- BLOCO 2 — VERIFICAR DEPOIS
-- =======================================================
-- tabelas criadas? ESPERADO: ambas não-nulas
SELECT to_regclass('public.consultores_detalhes') AS consultores_detalhes,
       to_regclass('public.documentos_consultor')  AS documentos_consultor;

-- RLS ativa? ESPERADO: true/true
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('consultores_detalhes','documentos_consultor');

-- policies das tabelas? ESPERADO: 4 (cd_*) + 4 (dc_*)
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('consultores_detalhes','documentos_consultor')
ORDER BY tablename, policyname;

-- policies de storage? ESPERADO: 4 (consultor_docs_*)
SELECT policyname, cmd FROM pg_policies
WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'consultor_docs%'
ORDER BY policyname;

-- bucket criado e privado? ESPERADO: 1 linha, public=false
SELECT id, public FROM storage.buckets WHERE id='consultor-documentos';


-- =======================================================
-- ROLLBACK (só se precisar reverter)
-- =======================================================
-- BEGIN;
--   DROP POLICY IF EXISTS "consultor_docs_select_owner" ON storage.objects;
--   DROP POLICY IF EXISTS "consultor_docs_insert_owner" ON storage.objects;
--   DROP POLICY IF EXISTS "consultor_docs_update_owner" ON storage.objects;
--   DROP POLICY IF EXISTS "consultor_docs_delete_owner" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id='consultor-documentos';  -- só se estiver vazio
--   DROP TABLE IF EXISTS public.documentos_consultor;
--   DROP TABLE IF EXISTS public.consultores_detalhes;
-- COMMIT;
