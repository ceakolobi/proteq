-- Criar função para verificar se é usuário demo
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'demo_user'
  )
$$;

-- Criar função para verificar se é demo por email
CREATE OR REPLACE FUNCTION public.is_demo_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _email = 'demo@marka.com.br'
$$;