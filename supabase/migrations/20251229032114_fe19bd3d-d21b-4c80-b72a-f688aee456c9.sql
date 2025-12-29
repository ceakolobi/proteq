-- =====================================================
-- FIX: Security Definer Views -> Security Invoker
-- =====================================================

-- Drop the SECURITY DEFINER views and recreate as SECURITY INVOKER
DROP VIEW IF EXISTS public.v_associados_masked;
DROP VIEW IF EXISTS public.v_veiculos_masked;

-- Recreate v_associados_masked with SECURITY INVOKER (default, safe)
CREATE VIEW public.v_associados_masked 
WITH (security_invoker = true)
AS
SELECT 
  id,
  CASE 
    WHEN is_admin_principal(auth.uid()) THEN cpf
    WHEN has_role(auth.uid(), 'cadastro') THEN 
      SUBSTRING(cpf, 1, 3) || '.***.' || SUBSTRING(cpf, 8, 3) || '-**'
    ELSE '***.***.***-**'
  END as cpf,
  CASE 
    WHEN is_admin_principal(auth.uid()) THEN rg
    WHEN has_role(auth.uid(), 'cadastro') THEN 
      COALESCE(SUBSTRING(rg, 1, 2) || '.***.***-*', rg)
    ELSE '**.***.**'
  END as rg,
  nome_completo,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional') THEN email
    ELSE SUBSTRING(email, 1, 3) || '***@***'
  END as email,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'admin_regional') THEN telefone
    ELSE '(**) *****-' || SUBSTRING(telefone, LENGTH(telefone)-3, 4)
  END as telefone,
  CASE 
    WHEN is_admin_principal(auth.uid()) THEN endereco
    ELSE COALESCE(SUBSTRING(endereco, 1, 10) || '...', endereco)
  END as endereco,
  cidade,
  estado,
  cep,
  status,
  regiao_id,
  consultor_id,
  company_id,
  created_at,
  updated_at
FROM public.associados;

-- Recreate v_veiculos_masked with SECURITY INVOKER (default, safe)
CREATE VIEW public.v_veiculos_masked 
WITH (security_invoker = true)
AS
SELECT 
  id,
  associado_id,
  tipo,
  marca,
  modelo,
  ano,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'cadastro') THEN placa
    ELSE SUBSTRING(placa, 1, 3) || '-****'
  END as placa,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'cadastro') THEN chassi
    ELSE COALESCE('*****' || SUBSTRING(chassi, LENGTH(chassi)-5, 6), chassi)
  END as chassi,
  CASE 
    WHEN is_admin_principal(auth.uid()) OR has_role(auth.uid(), 'financeiro') THEN renavam
    ELSE '***********'
  END as renavam,
  cor,
  valor_fipe,
  mensalidade,
  veiculo_status,
  company_id,
  created_at,
  updated_at
FROM public.veiculos;