-- Criar função para inicializar usuário demo na empresa demo
-- Esta função será chamada manualmente para criar o usuário demo

CREATE OR REPLACE FUNCTION public.setup_demo_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Buscar o usuário demo pelo email
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@protecaodemo.com.br';
  
  IF demo_user_id IS NOT NULL THEN
    -- Atualizar o profile para usar a empresa demo
    UPDATE profiles 
    SET 
      company_id = 'b0000000-0000-0000-0000-000000000002',
      sede_id = 'c0000000-0000-0000-0000-000000000003',
      regiao_id = 'd0000000-0000-0000-0000-000000000004',
      nome_completo = 'Administrador Demo',
      is_admin_principal = false,
      must_change_password = false
    WHERE id = demo_user_id;
    
    -- Garantir que tenha a role admin_demo
    INSERT INTO user_roles (user_id, role)
    VALUES (demo_user_id, 'admin_demo')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Adicionar role admin_nivel_basico para ter acesso ao painel
    INSERT INTO user_roles (user_id, role)
    VALUES (demo_user_id, 'admin_nivel_basico')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;