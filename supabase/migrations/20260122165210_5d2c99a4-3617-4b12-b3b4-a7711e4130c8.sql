-- Contratos internos: auditoria e controle

-- 1) Logs de alteração de status (auditável; sem exclusão via RLS)
CREATE TABLE IF NOT EXISTS public.contract_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.generated_contracts(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_ip inet NULL,
  changed_user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_status_logs ENABLE ROW LEVEL SECURITY;

-- 2) Garantir RLS na tabela de contratos gerados
ALTER TABLE public.generated_contracts ENABLE ROW LEVEL SECURITY;

-- 3) Função helper: pode gerenciar/visualizar contratos internos?
CREATE OR REPLACE FUNCTION public.can_access_contracts_internal(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_admin_principal(_user_id)
    OR public.has_role(_user_id, 'admin_nivel_basico')
    OR public.has_role(_user_id, 'admin_regional');
$$;

-- 4) Policies - generated_contracts
DROP POLICY IF EXISTS "Contracts internal: select" ON public.generated_contracts;
CREATE POLICY "Contracts internal: select"
ON public.generated_contracts
FOR SELECT
USING (
  public.strict_company_isolation(company_id)
  AND (
    public.is_admin_principal(auth.uid())
    OR public.has_role(auth.uid(), 'admin_nivel_basico')
    OR (
      public.has_role(auth.uid(), 'admin_regional')
      AND EXISTS (
        SELECT 1
        FROM public.associados a
        JOIN public.regioes r ON r.id = a.regiao_id
        WHERE a.id = public.generated_contracts.associado_id
          AND r.sede_id = public.get_user_sede(auth.uid())
      )
    )
  )
);

-- Atualização de status: apenas admins; consultor não edita
DROP POLICY IF EXISTS "Contracts internal: update" ON public.generated_contracts;
CREATE POLICY "Contracts internal: update"
ON public.generated_contracts
FOR UPDATE
USING (
  public.strict_company_isolation(company_id)
  AND (
    public.is_admin_principal(auth.uid())
    OR public.has_role(auth.uid(), 'admin_nivel_basico')
    OR (
      public.has_role(auth.uid(), 'admin_regional')
      AND EXISTS (
        SELECT 1
        FROM public.associados a
        JOIN public.regioes r ON r.id = a.regiao_id
        WHERE a.id = public.generated_contracts.associado_id
          AND r.sede_id = public.get_user_sede(auth.uid())
      )
    )
  )
)
WITH CHECK (
  public.strict_company_isolation(company_id)
);

-- (Não criamos policy de DELETE: contratos não podem ser apagados)

-- 5) Policies - contract_status_logs (somente leitura por admins internos)
DROP POLICY IF EXISTS "Contracts internal logs: select" ON public.contract_status_logs;
CREATE POLICY "Contracts internal logs: select"
ON public.contract_status_logs
FOR SELECT
USING (
  public.strict_company_isolation(company_id)
  AND (
    public.is_admin_principal(auth.uid())
    OR public.has_role(auth.uid(), 'admin_nivel_basico')
    OR public.has_role(auth.uid(), 'admin_regional')
  )
);

-- (Sem policy de INSERT/UPDATE/DELETE: logs apenas via função SECURITY DEFINER)

-- 6) Função para alterar status com log (inclui IP/User-Agent opcionais)
CREATE OR REPLACE FUNCTION public.update_contract_status_internal(
  p_contract_id uuid,
  p_new_status text,
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_status text;
  v_company_id uuid;
  v_associado_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT status, company_id, associado_id
  INTO v_old_status, v_company_id, v_associado_id
  FROM public.generated_contracts
  WHERE id = p_contract_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  -- Acesso: apenas admin_principal/admin_nivel_basico/admin_regional
  IF NOT public.can_access_contracts_internal(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Isolamento por empresa
  IF NOT public.strict_company_isolation(v_company_id) THEN
    RAISE EXCEPTION 'Cross-company access denied';
  END IF;

  -- Admin regional: restringir por sede
  IF public.has_role(auth.uid(), 'admin_regional') AND NOT public.is_admin_principal(auth.uid()) AND NOT public.has_role(auth.uid(), 'admin_nivel_basico') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.associados a
      JOIN public.regioes r ON r.id = a.regiao_id
      WHERE a.id = v_associado_id
        AND r.sede_id = public.get_user_sede(auth.uid())
    ) THEN
      RAISE EXCEPTION 'Not allowed (sede)';
    END IF;
  END IF;

  UPDATE public.generated_contracts
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_contract_id;

  INSERT INTO public.contract_status_logs (
    contract_id,
    company_id,
    old_status,
    new_status,
    changed_by,
    changed_at,
    changed_ip,
    changed_user_agent
  ) VALUES (
    p_contract_id,
    v_company_id,
    v_old_status,
    p_new_status,
    auth.uid(),
    now(),
    p_ip,
    p_user_agent
  );
END;
$$;