-- Documentos e Contratos

-- 1) Templates (Contrato padrão / Carta de cancelamento)
CREATE TABLE IF NOT EXISTS public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  template_key text NOT NULL,
  template_type text NOT NULL, -- 'contract' | 'cancellation_letter'
  title text NOT NULL,
  description text,
  content_markdown text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_document_templates_company ON public.document_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON public.document_templates(company_id, template_type);

-- 2) Versionamento automático de templates
CREATE TABLE IF NOT EXISTS public.document_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content_markdown text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.document_template_versions(template_id, version DESC);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS trg_document_templates_updated_at ON public.document_templates;
CREATE TRIGGER trg_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: criar versão ao inserir/alterar conteúdo
CREATE OR REPLACE FUNCTION public.create_template_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_version integer;
BEGIN
  -- Insert: cria versão 1
  IF TG_OP = 'INSERT' THEN
    next_version := 1;
    INSERT INTO public.document_template_versions (template_id, version, content_markdown, created_by)
    VALUES (NEW.id, next_version, NEW.content_markdown, NEW.created_by);
    RETURN NEW;
  END IF;

  -- Update: só cria versão se o conteúdo mudou
  IF TG_OP = 'UPDATE' THEN
    IF NEW.content_markdown IS DISTINCT FROM OLD.content_markdown THEN
      SELECT COALESCE(MAX(v.version), 0) + 1
      INTO next_version
      FROM public.document_template_versions v
      WHERE v.template_id = NEW.id;

      INSERT INTO public.document_template_versions (template_id, version, content_markdown, created_by)
      VALUES (NEW.id, next_version, NEW.content_markdown, NEW.updated_by);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_templates_versioning ON public.document_templates;
CREATE TRIGGER trg_document_templates_versioning
AFTER INSERT OR UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.create_template_version();

-- 3) Configurações gerais
CREATE TABLE IF NOT EXISTS public.document_settings (
  company_id uuid PRIMARY KEY,
  auto_generate_contract boolean NOT NULL DEFAULT true,
  require_digital_accept boolean NOT NULL DEFAULT true,
  record_ip_and_date boolean NOT NULL DEFAULT true,
  send_contract_by_email boolean NOT NULL DEFAULT true,
  show_contract_in_associate_area boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_document_settings_updated_at ON public.document_settings;
CREATE TRIGGER trg_document_settings_updated_at
BEFORE UPDATE ON public.document_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Documentos internos (admin)
CREATE TABLE IF NOT EXISTS public.internal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  category text NOT NULL, -- 'certificados' | 'susep' | 'pdf'
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  mime_type text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_documents_company ON public.internal_documents(company_id, category);

DROP TRIGGER IF EXISTS trg_internal_documents_updated_at ON public.internal_documents;
CREATE TRIGGER trg_internal_documents_updated_at
BEFORE UPDATE ON public.internal_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Contratos gerados e vinculados ao associado (e mensalidade)
CREATE TABLE IF NOT EXISTS public.generated_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  associado_id uuid NOT NULL REFERENCES public.associados(id) ON DELETE RESTRICT,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  mensalidade_id uuid REFERENCES public.mensalidades(id) ON DELETE SET NULL,
  template_version_id uuid NOT NULL REFERENCES public.document_template_versions(id) ON DELETE RESTRICT,

  contract_number text,
  status text NOT NULL DEFAULT 'gerado', -- gerado | enviado | aceito | cancelado

  content_markdown_snapshot text NOT NULL,
  rendered_text_snapshot text,

  pdf_path text, -- caminho no storage

  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_ip inet,

  accepted_at timestamptz,
  accepted_ip inet,
  accepted_user_agent text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_contracts_company ON public.generated_contracts(company_id, associado_id);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_mensalidade ON public.generated_contracts(mensalidade_id);

DROP TRIGGER IF EXISTS trg_generated_contracts_updated_at ON public.generated_contracts;
CREATE TRIGGER trg_generated_contracts_updated_at
BEFORE UPDATE ON public.generated_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6) RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_contracts ENABLE ROW LEVEL SECURITY;

-- Helpers: admin (somente administradores)
-- Admin principal ou admin básico (inclui legado admin_regional)
CREATE OR REPLACE FUNCTION public.can_manage_documents(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin_principal(_user_id)
    OR public.has_role(_user_id, 'admin_nivel_basico')
    OR public.has_role(_user_id, 'admin_regional');
$$;

-- Policies: templates
DROP POLICY IF EXISTS "templates_select_admin" ON public.document_templates;
CREATE POLICY "templates_select_admin"
ON public.document_templates
FOR SELECT
USING (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
);

DROP POLICY IF EXISTS "templates_write_admin" ON public.document_templates;
CREATE POLICY "templates_write_admin"
ON public.document_templates
FOR INSERT
WITH CHECK (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
);

DROP POLICY IF EXISTS "templates_update_admin" ON public.document_templates;
CREATE POLICY "templates_update_admin"
ON public.document_templates
FOR UPDATE
USING (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
)
WITH CHECK (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
);

DROP POLICY IF EXISTS "templates_delete_admin" ON public.document_templates;
CREATE POLICY "templates_delete_admin"
ON public.document_templates
FOR DELETE
USING (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
);

-- Policies: template versions (admin view)
DROP POLICY IF EXISTS "template_versions_select_admin" ON public.document_template_versions;
CREATE POLICY "template_versions_select_admin"
ON public.document_template_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.document_templates t
    WHERE t.id = template_id
      AND public.strict_company_isolation(t.company_id)
  )
  AND public.can_manage_documents(auth.uid())
);

-- Policies: settings
DROP POLICY IF EXISTS "document_settings_select_admin" ON public.document_settings;
CREATE POLICY "document_settings_select_admin"
ON public.document_settings
FOR SELECT
USING (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
);

DROP POLICY IF EXISTS "document_settings_upsert_admin" ON public.document_settings;
CREATE POLICY "document_settings_upsert_admin"
ON public.document_settings
FOR INSERT
WITH CHECK (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
);

DROP POLICY IF EXISTS "document_settings_update_admin" ON public.document_settings;
CREATE POLICY "document_settings_update_admin"
ON public.document_settings
FOR UPDATE
USING (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
)
WITH CHECK (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
);

-- Policies: internal documents (admin only)
DROP POLICY IF EXISTS "internal_documents_admin_all" ON public.internal_documents;
CREATE POLICY "internal_documents_admin_all"
ON public.internal_documents
FOR ALL
USING (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
)
WITH CHECK (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
);

-- Policies: generated contracts
-- Admins: full access within company
DROP POLICY IF EXISTS "generated_contracts_admin_all" ON public.generated_contracts;
CREATE POLICY "generated_contracts_admin_all"
ON public.generated_contracts
FOR ALL
USING (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
)
WITH CHECK (
  public.strict_company_isolation(company_id)
  AND public.can_manage_documents(auth.uid())
);

-- Associado: visualizar apenas seus contratos (associados.user_id = auth.uid())
DROP POLICY IF EXISTS "generated_contracts_associado_select" ON public.generated_contracts;
CREATE POLICY "generated_contracts_associado_select"
ON public.generated_contracts
FOR SELECT
USING (
  public.strict_company_isolation(company_id)
  AND EXISTS (
    SELECT 1 FROM public.associados a
    WHERE a.id = associado_id
      AND a.user_id = auth.uid()
  )
);
