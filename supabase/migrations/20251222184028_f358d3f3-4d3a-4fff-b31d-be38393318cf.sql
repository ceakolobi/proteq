-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM (
  'admin_principal',
  'admin_regional',
  'financeiro',
  'cadastro',
  'consultor_vendas',
  'vistoriador',
  'associado'
);

-- Create enum for vehicle types
CREATE TYPE public.vehicle_type AS ENUM (
  'carro',
  'moto',
  'pickup'
);

-- Create enum for proposal status
CREATE TYPE public.proposal_status AS ENUM (
  'rascunho',
  'enviada',
  'aceita',
  'recusada',
  'cancelada'
);

-- Create enum for inspection status
CREATE TYPE public.inspection_status AS ENUM (
  'pendente',
  'em_andamento',
  'aprovada',
  'reprovada'
);

-- Create enum for associate status
CREATE TYPE public.associate_status AS ENUM (
  'ativo',
  'inadimplente',
  'suspenso',
  'cancelado'
);

-- Create sedes (headquarters) table
CREATE TABLE public.sedes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('matriz', 'regional')),
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create regioes (regions) table
CREATE TABLE public.regioes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sede_id UUID NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT,
  sede_id UUID REFERENCES public.sedes(id),
  regiao_id UUID REFERENCES public.regioes(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_admin_principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create cotas table (pricing table by FIPE range)
CREATE TABLE public.cotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  fipe_min DECIMAL(12,2) NOT NULL DEFAULT 0,
  fipe_max DECIMAL(12,2) NOT NULL,
  mensalidade_carro DECIMAL(10,2) NOT NULL,
  mensalidade_moto DECIMAL(10,2) NOT NULL,
  mensalidade_pickup DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  consultor_id UUID NOT NULL REFERENCES auth.users(id),
  regiao_id UUID REFERENCES public.regioes(id),
  observacoes TEXT,
  convertido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create associados table
CREATE TABLE public.associados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  nome_completo TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  rg TEXT,
  data_nascimento DATE,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  consultor_id UUID REFERENCES auth.users(id),
  regiao_id UUID REFERENCES public.regioes(id),
  status associate_status NOT NULL DEFAULT 'ativo',
  termos_aceitos BOOLEAN NOT NULL DEFAULT false,
  termos_aceitos_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create veiculos table
CREATE TABLE public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  associado_id UUID NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  tipo vehicle_type NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER NOT NULL,
  placa TEXT NOT NULL,
  cor TEXT,
  chassi TEXT,
  renavam TEXT,
  valor_fipe DECIMAL(12,2) NOT NULL,
  cota_id UUID REFERENCES public.cotas(id),
  mensalidade DECIMAL(10,2) NOT NULL,
  carro_reserva_dias INTEGER NOT NULL DEFAULT 15,
  carro_reserva_adicional DECIMAL(10,2) DEFAULT 0,
  protecao_ativa BOOLEAN NOT NULL DEFAULT false,
  protecao_ativada_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create propostas table
CREATE TABLE public.propostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id),
  associado_id UUID REFERENCES public.associados(id),
  consultor_id UUID NOT NULL REFERENCES auth.users(id),
  veiculo_marca TEXT NOT NULL,
  veiculo_modelo TEXT NOT NULL,
  veiculo_ano INTEGER NOT NULL,
  veiculo_tipo vehicle_type NOT NULL,
  valor_fipe DECIMAL(12,2) NOT NULL,
  cota_id UUID REFERENCES public.cotas(id),
  mensalidade DECIMAL(10,2) NOT NULL,
  participacao DECIMAL(10,2) NOT NULL,
  carro_reserva_dias INTEGER NOT NULL DEFAULT 15,
  carro_reserva_adicional DECIMAL(10,2) DEFAULT 0,
  status proposal_status NOT NULL DEFAULT 'rascunho',
  aceita_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vistorias table
CREATE TABLE public.vistorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  vistoriador_id UUID REFERENCES auth.users(id),
  proposta_id UUID REFERENCES public.propostas(id),
  status inspection_status NOT NULL DEFAULT 'pendente',
  data_agendada TIMESTAMP WITH TIME ZONE,
  data_realizada TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  checklist JSONB,
  fotos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pagamentos table
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  associado_id UUID NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.veiculos(id),
  valor DECIMAL(10,2) NOT NULL,
  tipo TEXT NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  referencia TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create acionamentos_guincho table
CREATE TABLE public.acionamentos_guincho (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  associado_id UUID NOT NULL REFERENCES public.associados(id),
  data_acionamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  km_utilizado INTEGER NOT NULL,
  origem TEXT,
  destino TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.associados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acionamentos_guincho ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin principal
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

-- Create function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_principal', 'admin_regional')
  )
$$;

-- Create function to get user region
CREATE OR REPLACE FUNCTION public.get_user_regiao(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT regiao_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin principal can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_principal(auth.uid()));

CREATE POLICY "Admin regional can view profiles in same region" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin_regional') AND
    regiao_id = public.get_user_regiao(auth.uid())
  );

CREATE POLICY "Admin principal can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_admin_principal(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin principal can manage all roles" ON public.user_roles
  FOR ALL USING (public.is_admin_principal(auth.uid()));

-- RLS Policies for sedes
CREATE POLICY "Authenticated users can view sedes" ON public.sedes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin principal can manage sedes" ON public.sedes
  FOR ALL USING (public.is_admin_principal(auth.uid()));

-- RLS Policies for regioes
CREATE POLICY "Authenticated users can view regioes" ON public.regioes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin principal can manage regioes" ON public.regioes
  FOR ALL USING (public.is_admin_principal(auth.uid()));

-- RLS Policies for cotas
CREATE POLICY "Authenticated users can view cotas" ON public.cotas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin principal can manage cotas" ON public.cotas
  FOR ALL USING (public.is_admin_principal(auth.uid()));

-- RLS Policies for leads
CREATE POLICY "Consultores can view own leads" ON public.leads
  FOR SELECT USING (consultor_id = auth.uid());

CREATE POLICY "Consultores can create leads" ON public.leads
  FOR INSERT WITH CHECK (consultor_id = auth.uid());

CREATE POLICY "Consultores can update own leads" ON public.leads
  FOR UPDATE USING (consultor_id = auth.uid());

CREATE POLICY "Admin can view all leads" ON public.leads
  FOR SELECT USING (public.is_admin(auth.uid()));

-- RLS Policies for associados
CREATE POLICY "Users can view associated record" ON public.associados
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin can view all associados" ON public.associados
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Cadastro can view all associados" ON public.associados
  FOR SELECT USING (public.has_role(auth.uid(), 'cadastro'));

CREATE POLICY "Financeiro can view all associados" ON public.associados
  FOR SELECT USING (public.has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Consultor can view own associados" ON public.associados
  FOR SELECT USING (consultor_id = auth.uid());

CREATE POLICY "Admin can manage associados" ON public.associados
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Cadastro can manage associados" ON public.associados
  FOR ALL USING (public.has_role(auth.uid(), 'cadastro'));

-- RLS Policies for veiculos
CREATE POLICY "Associado can view own vehicles" ON public.veiculos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.associados
      WHERE id = associado_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all vehicles" ON public.veiculos
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Cadastro can view all vehicles" ON public.veiculos
  FOR SELECT USING (public.has_role(auth.uid(), 'cadastro'));

CREATE POLICY "Admin can manage vehicles" ON public.veiculos
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for propostas
CREATE POLICY "Consultor can view own propostas" ON public.propostas
  FOR SELECT USING (consultor_id = auth.uid());

CREATE POLICY "Consultor can create propostas" ON public.propostas
  FOR INSERT WITH CHECK (consultor_id = auth.uid());

CREATE POLICY "Admin can view all propostas" ON public.propostas
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can manage propostas" ON public.propostas
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for vistorias
CREATE POLICY "Vistoriador can view assigned vistorias" ON public.vistorias
  FOR SELECT USING (vistoriador_id = auth.uid());

CREATE POLICY "Vistoriador can update assigned vistorias" ON public.vistorias
  FOR UPDATE USING (vistoriador_id = auth.uid());

CREATE POLICY "Admin can manage all vistorias" ON public.vistorias
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for pagamentos
CREATE POLICY "Financeiro can view all pagamentos" ON public.pagamentos
  FOR SELECT USING (public.has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Financeiro can manage pagamentos" ON public.pagamentos
  FOR ALL USING (public.has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Admin can manage pagamentos" ON public.pagamentos
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Associado can view own pagamentos" ON public.pagamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.associados
      WHERE id = associado_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admin principal can view all logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin_principal(auth.uid()));

CREATE POLICY "System can insert logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for acionamentos_guincho
CREATE POLICY "Admin can view all acionamentos" ON public.acionamentos_guincho
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Associado can view own acionamentos" ON public.acionamentos_guincho
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.associados
      WHERE id = associado_id AND user_id = auth.uid()
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_sedes_updated_at BEFORE UPDATE ON public.sedes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_regioes_updated_at BEFORE UPDATE ON public.regioes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cotas_updated_at BEFORE UPDATE ON public.cotas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_associados_updated_at BEFORE UPDATE ON public.associados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_veiculos_updated_at BEFORE UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON public.propostas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vistorias_updated_at BEFORE UPDATE ON public.vistorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pagamentos_updated_at BEFORE UPDATE ON public.pagamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();