CREATE TABLE IF NOT EXISTS public.associado_beneficios_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  associado_id uuid NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  beneficio_id uuid NOT NULL REFERENCES public.beneficios_extras(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (associado_id, beneficio_id)
);

-- RLS: same user/company isolation pattern as the rest
ALTER TABLE public.associado_beneficios_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage associado_beneficios_extras"
  ON public.associado_beneficios_extras
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
