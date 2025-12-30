-- Fix: do not rely on hard-coded email for protected admin
CREATE OR REPLACE FUNCTION public.is_protected_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.is_admin_principal(_user_id)
$function$;

-- Fix: protect admin principal even if email changes (but allow changing email)
CREATE OR REPLACE FUNCTION public.protect_admin_principal_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Bloquear exclusão de qualquer Admin Principal
  IF TG_OP = 'DELETE' AND OLD.is_admin_principal = true THEN
    RAISE EXCEPTION 'Cannot delete admin principal profile';
  END IF;

  -- Bloquear desativação/remocao do flag de Admin Principal
  IF TG_OP = 'UPDATE' AND OLD.is_admin_principal = true THEN
    IF NEW.is_admin_principal = false THEN
      RAISE EXCEPTION 'Cannot remove admin principal flag';
    END IF;
    IF NEW.ativo = false THEN
      RAISE EXCEPTION 'Cannot deactivate admin principal';
    END IF;
    -- Observação: email pode ser alterado (não depende mais de OLD.email)
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;