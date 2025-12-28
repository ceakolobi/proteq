-- 1. Create vehicle status enum if not exists
DO $$ BEGIN
  CREATE TYPE public.vehicle_status AS ENUM (
    'cadastrado',
    'aguardando_vistoria',
    'aprovado',
    'reprovado',
    'ativo',
    'cancelado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add missing columns to veiculos table
ALTER TABLE public.veiculos 
ADD COLUMN IF NOT EXISTS veiculo_status public.vehicle_status DEFAULT 'cadastrado',
ADD COLUMN IF NOT EXISTS sede_id uuid REFERENCES public.sedes(id),
ADD COLUMN IF NOT EXISTS consultor_id uuid,
ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id),
ADD COLUMN IF NOT EXISTS cotacao_id uuid REFERENCES public.cotacoes(id),
ADD COLUMN IF NOT EXISTS codigo_fipe text,
ADD COLUMN IF NOT EXISTS mes_referencia_fipe text;

-- 3. Migrate existing data - set veiculo_status based on protecao_ativa
UPDATE public.veiculos 
SET veiculo_status = CASE 
  WHEN protecao_ativa = true THEN 'ativo'::public.vehicle_status
  ELSE 'cadastrado'::public.vehicle_status
END
WHERE veiculo_status IS NULL;

-- 4. Populate sede_id and consultor_id from associados
UPDATE public.veiculos v
SET 
  sede_id = (
    SELECT r.sede_id FROM public.regioes r 
    JOIN public.associados a ON a.regiao_id = r.id 
    WHERE a.id = v.associado_id
    LIMIT 1
  ),
  consultor_id = (
    SELECT a.consultor_id FROM public.associados a 
    WHERE a.id = v.associado_id
    LIMIT 1
  )
WHERE v.sede_id IS NULL;

-- 5. Create helper function to check vehicle access
CREATE OR REPLACE FUNCTION public.can_access_veiculo(_user_id uuid, _veiculo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.veiculos v
    WHERE v.id = _veiculo_id
    AND (
      is_admin_principal(_user_id)
      OR (has_role(_user_id, 'admin_regional') AND v.sede_id = get_user_sede(_user_id))
      OR (has_role(_user_id, 'consultor_vendas') AND v.consultor_id = _user_id)
      OR (has_role(_user_id, 'cadastro'))
      OR (has_role(_user_id, 'financeiro'))
      OR (has_role(_user_id, 'vistoriador') AND v.veiculo_status = 'aguardando_vistoria')
    )
  )
$$;

-- 6. Drop existing RLS policies on veiculos
DROP POLICY IF EXISTS "Block anonymous veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "AdminPrincipal full access veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "AdminRegional view sede veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "AdminRegional manage sede veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "AdminRegional insert sede veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "AdminRegional delete sede veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Consultor view own veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Consultor insert own veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Consultor update own veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Cadastro view all veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Cadastro update veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Cadastro insert veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Financeiro view all veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Vistoriador view aguardando veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Associado view own veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Admin principal full access veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Admin regional manage veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Admin regional view veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Associado can view own vehicles" ON public.veiculos;
DROP POLICY IF EXISTS "Block anonymous access to veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Cadastro manage veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Consultor view own associados veiculos" ON public.veiculos;

-- 7. Create new RLS policies for veiculos

-- Block anonymous
CREATE POLICY "Block anonymous veiculos"
ON public.veiculos FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Admin Principal - full access
CREATE POLICY "AdminPrincipal full access veiculos"
ON public.veiculos FOR ALL
USING (is_admin_principal(auth.uid()));

-- Admin Regional - manage vehicles of their sede
CREATE POLICY "AdminRegional view sede veiculos"
ON public.veiculos FOR SELECT
USING (has_role(auth.uid(), 'admin_regional') AND sede_id = get_user_sede(auth.uid()));

CREATE POLICY "AdminRegional update sede veiculos"
ON public.veiculos FOR UPDATE
USING (has_role(auth.uid(), 'admin_regional') AND sede_id = get_user_sede(auth.uid()));

CREATE POLICY "AdminRegional insert sede veiculos"
ON public.veiculos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin_regional') AND sede_id = get_user_sede(auth.uid()));

CREATE POLICY "AdminRegional delete sede veiculos"
ON public.veiculos FOR DELETE
USING (has_role(auth.uid(), 'admin_regional') AND sede_id = get_user_sede(auth.uid()));

-- Consultor - view and create own vehicles
CREATE POLICY "Consultor view own veiculos"
ON public.veiculos FOR SELECT
USING (has_role(auth.uid(), 'consultor_vendas') AND consultor_id = auth.uid());

CREATE POLICY "Consultor insert own veiculos"
ON public.veiculos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'consultor_vendas') AND consultor_id = auth.uid());

CREATE POLICY "Consultor update own veiculos"
ON public.veiculos FOR UPDATE
USING (has_role(auth.uid(), 'consultor_vendas') AND consultor_id = auth.uid());

-- Cadastro (Backoffice) - full management
CREATE POLICY "Cadastro view all veiculos"
ON public.veiculos FOR SELECT
USING (has_role(auth.uid(), 'cadastro'));

CREATE POLICY "Cadastro update veiculos"
ON public.veiculos FOR UPDATE
USING (has_role(auth.uid(), 'cadastro'));

CREATE POLICY "Cadastro insert veiculos"
ON public.veiculos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'cadastro'));

-- Financeiro - read only
CREATE POLICY "Financeiro view all veiculos"
ON public.veiculos FOR SELECT
USING (has_role(auth.uid(), 'financeiro'));

-- Vistoriador - only aguardando_vistoria
CREATE POLICY "Vistoriador view aguardando veiculos"
ON public.veiculos FOR SELECT
USING (has_role(auth.uid(), 'vistoriador') AND veiculo_status = 'aguardando_vistoria');

-- Associado - own vehicles
CREATE POLICY "Associado view own veiculos"
ON public.veiculos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.associados a 
  WHERE a.id = veiculos.associado_id 
  AND a.user_id = auth.uid()
));

-- 8. Create trigger to prevent deletion of approved/active vehicles
CREATE OR REPLACE FUNCTION public.prevent_veiculo_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.veiculo_status IN ('aprovado', 'ativo') THEN
    RAISE EXCEPTION 'Não é possível excluir veículos aprovados ou ativos';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_veiculo_deletion_trigger ON public.veiculos;
CREATE TRIGGER prevent_veiculo_deletion_trigger
BEFORE DELETE ON public.veiculos
FOR EACH ROW
EXECUTE FUNCTION public.prevent_veiculo_deletion();

-- 9. Create audit trigger for vehicle changes
CREATE OR REPLACE FUNCTION public.audit_veiculo_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, acao, tabela, registro_id, dados_anteriores, dados_novos)
    VALUES (
      auth.uid(),
      'UPDATE',
      'veiculos',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, acao, tabela, registro_id, dados_novos)
    VALUES (
      auth.uid(),
      'INSERT',
      'veiculos',
      NEW.id,
      to_jsonb(NEW)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_veiculo_changes_trigger ON public.veiculos;
CREATE TRIGGER audit_veiculo_changes_trigger
AFTER INSERT OR UPDATE ON public.veiculos
FOR EACH ROW
EXECUTE FUNCTION public.audit_veiculo_changes();

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_veiculos_veiculo_status ON public.veiculos(veiculo_status);
CREATE INDEX IF NOT EXISTS idx_veiculos_sede_id ON public.veiculos(sede_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_consultor_id ON public.veiculos(consultor_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON public.veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_chassi ON public.veiculos(chassi);