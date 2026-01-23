-- Tabela para capas ilimitadas por empresa
CREATE TABLE IF NOT EXISTS public.company_covers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL
);

-- Índice para listagem por empresa
CREATE INDEX IF NOT EXISTS idx_company_covers_company_id_created_at
  ON public.company_covers (company_id, created_at DESC);

-- RLS
ALTER TABLE public.company_covers ENABLE ROW LEVEL SECURITY;

-- Policies: somente usuários da mesma empresa
CREATE POLICY "Company covers: select within company"
ON public.company_covers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.company_id = company_covers.company_id
  )
);

CREATE POLICY "Company covers: insert within company"
ON public.company_covers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.company_id = company_covers.company_id
  )
);

CREATE POLICY "Company covers: delete within company"
ON public.company_covers
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.company_id = company_covers.company_id
  )
);

CREATE POLICY "Company covers: update within company"
ON public.company_covers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.company_id = company_covers.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.company_id = company_covers.company_id
  )
);

-- Defaults para auditoria simples
ALTER TABLE public.company_covers
  ALTER COLUMN created_by SET DEFAULT auth.uid();
