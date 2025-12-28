-- PARTE 1: Remover todas as políticas que dependem do enum app_role

-- Profiles
DROP POLICY IF EXISTS "Admin regional can view profiles in same region" ON public.profiles;
DROP POLICY IF EXISTS "Admin principal can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin principal can manage all profiles" ON public.profiles;

-- Associados
DROP POLICY IF EXISTS "Cadastro can view all associados" ON public.associados;
DROP POLICY IF EXISTS "Financeiro can view all associados" ON public.associados;
DROP POLICY IF EXISTS "Cadastro can manage associados" ON public.associados;
DROP POLICY IF EXISTS "Consultor can view own associados" ON public.associados;
DROP POLICY IF EXISTS "Consultor can create associados" ON public.associados;
DROP POLICY IF EXISTS "Consultor can update own associados" ON public.associados;
DROP POLICY IF EXISTS "Admin can manage associados" ON public.associados;
DROP POLICY IF EXISTS "Admin can view all associados" ON public.associados;

-- Veiculos
DROP POLICY IF EXISTS "Cadastro can view all vehicles" ON public.veiculos;
DROP POLICY IF EXISTS "Admin can manage vehicles" ON public.veiculos;
DROP POLICY IF EXISTS "Admin can view all vehicles" ON public.veiculos;
DROP POLICY IF EXISTS "Consultor can view vehicles of own associados" ON public.veiculos;

-- Pagamentos
DROP POLICY IF EXISTS "Financeiro can view all pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Financeiro can manage pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Admin can manage pagamentos" ON public.pagamentos;

-- Cotacoes
DROP POLICY IF EXISTS "Admin Regional view cotacoes by region" ON public.cotacoes;
DROP POLICY IF EXISTS "Admin Regional manage cotacoes by region" ON public.cotacoes;
DROP POLICY IF EXISTS "Consultor view own cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Consultor create cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Consultor update own cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Admin Principal full access cotacoes" ON public.cotacoes;

-- Cotacao_contatos
DROP POLICY IF EXISTS "Admin Regional view cotacao_contatos" ON public.cotacao_contatos;
DROP POLICY IF EXISTS "Admin Regional manage cotacao_contatos" ON public.cotacao_contatos;
DROP POLICY IF EXISTS "Consultor view own cotacao_contatos" ON public.cotacao_contatos;
DROP POLICY IF EXISTS "Consultor insert cotacao_contatos" ON public.cotacao_contatos;
DROP POLICY IF EXISTS "Admin Principal full access cotacao_contatos" ON public.cotacao_contatos;

-- Leads
DROP POLICY IF EXISTS "Admin can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Consultores can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Consultores can create leads" ON public.leads;
DROP POLICY IF EXISTS "Consultores can update own leads" ON public.leads;

-- Propostas
DROP POLICY IF EXISTS "Admin can manage propostas" ON public.propostas;
DROP POLICY IF EXISTS "Admin can view all propostas" ON public.propostas;
DROP POLICY IF EXISTS "Consultor can view own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Consultor can create propostas" ON public.propostas;

-- Vistorias
DROP POLICY IF EXISTS "Admin can manage all vistorias" ON public.vistorias;
DROP POLICY IF EXISTS "Vistoriador can view assigned vistorias" ON public.vistorias;
DROP POLICY IF EXISTS "Vistoriador can update assigned vistorias" ON public.vistorias;

-- User roles (remover policies que usam o enum)
DROP POLICY IF EXISTS "Admin principal can manage all roles" ON public.user_roles;

-- Remover função que depende do enum
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Remover coluna temporária se existir da migração anterior
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS role_new;

-- Remover o enum novo se existir da tentativa anterior
DROP TYPE IF EXISTS public.app_role_new;