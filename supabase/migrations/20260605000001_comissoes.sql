-- Sistema de comissões: configuração por regional/consultor e registro mensal
CREATE TABLE IF NOT EXISTS public.configuracao_comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  regional_id uuid REFERENCES public.sedes(id) ON DELETE CASCADE,
  percentual_consultor numeric DEFAULT 15,
  percentual_regional numeric DEFAULT 25,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  associado_id uuid REFERENCES public.associados(id) ON DELETE CASCADE,
  consultor_id uuid REFERENCES public.profiles(id),
  regional_id uuid REFERENCES public.sedes(id),
  mensalidade_base numeric,
  percentual_consultor numeric,
  percentual_regional numeric,
  valor_consultor numeric,
  valor_regional numeric,
  valor_empresa numeric,
  status text DEFAULT 'prevista',
  mes_referencia date,
  pago_em timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (associado_id, mes_referencia)
);

ALTER TABLE public.configuracao_comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.configuracao_comissoes;
CREATE POLICY "authenticated_full_access" ON public.configuracao_comissoes
  FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_full_access" ON public.comissoes;
CREATE POLICY "authenticated_full_access" ON public.comissoes
  FOR ALL USING (auth.uid() IS NOT NULL);
