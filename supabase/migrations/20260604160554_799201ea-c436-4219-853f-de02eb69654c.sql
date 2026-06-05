CREATE TABLE IF NOT EXISTS public.associado_beneficios_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  associado_id uuid REFERENCES public.associados(id) ON DELETE CASCADE,
  beneficio_id uuid REFERENCES public.beneficios_extras(id) ON DELETE CASCADE,
  ativo boolean DEFAULT true,
  valor_snapshot numeric,
  nome_snapshot text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(associado_id, beneficio_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.associado_beneficios_extras TO authenticated;
GRANT ALL ON public.associado_beneficios_extras TO service_role;

ALTER TABLE public.associado_beneficios_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access"
  ON public.associado_beneficios_extras
  FOR ALL USING (auth.uid() IS NOT NULL);