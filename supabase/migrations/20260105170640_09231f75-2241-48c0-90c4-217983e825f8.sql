-- Create enum for modules
CREATE TYPE public.permission_module AS ENUM (
  'dashboard',
  'leads',
  'cotacoes',
  'associados',
  'veiculos',
  'vistorias',
  'contratos',
  'relatorios',
  'financeiro',
  'usuarios',
  'cotas',
  'configuracoes'
);

-- Create enum for actions
CREATE TYPE public.permission_action AS ENUM (
  'visualizar',
  'criar',
  'editar',
  'excluir'
);

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module permission_module NOT NULL,
  action permission_action NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module, action)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is admin_principal
CREATE OR REPLACE FUNCTION public.is_admin_principal(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND is_admin_principal = true
  )
$$;

-- Create security definer function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module permission_module, _action permission_action)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admin principal always has all permissions
  SELECT CASE 
    WHEN public.is_admin_principal(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_permissions
      WHERE user_id = _user_id
        AND module = _module
        AND action = _action
        AND granted = true
    )
  END
$$;

-- RLS policies for user_permissions
-- Only admin_principal can view all permissions
CREATE POLICY "Admin principal can view all permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (
  public.is_admin_principal(auth.uid()) 
  OR user_id = auth.uid()
);

-- Only admin_principal can insert permissions
CREATE POLICY "Admin principal can insert permissions"
ON public.user_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_principal(auth.uid())
);

-- Only admin_principal can update permissions
CREATE POLICY "Admin principal can update permissions"
ON public.user_permissions
FOR UPDATE
TO authenticated
USING (
  public.is_admin_principal(auth.uid())
);

-- Only admin_principal can delete permissions
CREATE POLICY "Admin principal can delete permissions"
ON public.user_permissions
FOR DELETE
TO authenticated
USING (
  public.is_admin_principal(auth.uid())
);

-- Create index for performance
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_module ON public.user_permissions(module);

-- Add trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();