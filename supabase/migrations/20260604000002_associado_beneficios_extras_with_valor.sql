-- ============================================================
-- Recria associado_beneficios_extras com valor_snapshot
-- (usada como fallback quando associado não tem cotação ativa)
-- APLICAR NO SUPABASE DASHBOARD → SQL Editor do projeto:
-- sbtfhtllzpurjprivqoi (painelharmony - PRODUÇÃO)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.associado_beneficios_extras (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  associado_id    uuid        NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  beneficio_id    uuid        NOT NULL REFERENCES public.beneficios_extras(id) ON DELETE CASCADE,
  ativo           boolean     NOT NULL DEFAULT true,
  valor_snapshot  numeric     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (associado_id, beneficio_id)
);

-- Add valor_snapshot if table already existed without it
ALTER TABLE public.associado_beneficios_extras
  ADD COLUMN IF NOT EXISTS valor_snapshot numeric NOT NULL DEFAULT 0;

ALTER TABLE public.associado_beneficios_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated" ON public.associado_beneficios_extras;
CREATE POLICY "allow_authenticated"
  ON public.associado_beneficios_extras
  FOR ALL TO authenticated
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
