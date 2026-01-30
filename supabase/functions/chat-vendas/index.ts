import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Tabela de preços por faixa FIPE
const PRICE_TABLE = {
  carro: [
    { maxFipe: 20000, mensalidade: 69.90 },
    { maxFipe: 25000, mensalidade: 97.00 },
    { maxFipe: 30000, mensalidade: 124.10 },
    { maxFipe: 35000, mensalidade: 151.20 },
    { maxFipe: 40000, mensalidade: 178.30 },
    { maxFipe: 45000, mensalidade: 205.40 },
    { maxFipe: 50000, mensalidade: 232.50 },
    { maxFipe: 55000, mensalidade: 259.60 },
    { maxFipe: 60000, mensalidade: 286.70 },
    { maxFipe: 65000, mensalidade: 313.80 },
    { maxFipe: 70000, mensalidade: 340.90 },
    { maxFipe: 75000, mensalidade: 368.00 },
    { maxFipe: 80000, mensalidade: 395.10 },
    { maxFipe: 85000, mensalidade: 422.20 },
    { maxFipe: 90000, mensalidade: 449.30 },
    { maxFipe: 95000, mensalidade: 476.40 },
    { maxFipe: 100000, mensalidade: 503.50 },
    { maxFipe: 110000, mensalidade: 557.70 },
    { maxFipe: 120000, mensalidade: 611.90 },
    { maxFipe: 130000, mensalidade: 666.10 },
    { maxFipe: 140000, mensalidade: 720.30 },
    { maxFipe: 150000, mensalidade: 774.50 },
    { maxFipe: 175000, mensalidade: 910.00 },
    { maxFipe: 200000, mensalidade: 1045.50 },
    { maxFipe: 250000, mensalidade: 1316.50 },
    { maxFipe: 300000, mensalidade: 1587.50 },
  ],
  moto: [
    { maxFipe: 20000, mensalidade: 45.90 },
    { maxFipe: 25000, mensalidade: 69.90 },
    { maxFipe: 30000, mensalidade: 93.90 },
    { maxFipe: 35000, mensalidade: 117.90 },
    { maxFipe: 40000, mensalidade: 141.90 },
    { maxFipe: 50000, mensalidade: 189.90 },
    { maxFipe: 60000, mensalidade: 237.90 },
    { maxFipe: 70000, mensalidade: 285.90 },
    { maxFipe: 80000, mensalidade: 333.90 },
    { maxFipe: 100000, mensalidade: 429.90 },
  ],
  caminhonete: [
    { maxFipe: 20000, mensalidade: 159.90 },
    { maxFipe: 30000, mensalidade: 200.10 },
    { maxFipe: 40000, mensalidade: 240.30 },
    { maxFipe: 50000, mensalidade: 280.50 },
    { maxFipe: 60000, mensalidade: 320.70 },
    { maxFipe: 70000, mensalidade: 360.90 },
    { maxFipe: 80000, mensalidade: 401.10 },
    { maxFipe: 100000, mensalidade: 481.50 },
    { maxFipe: 120000, mensalidade: 561.90 },
    { maxFipe: 150000, mensalidade: 682.50 },
    { maxFipe: 200000, mensalidade: 883.50 },
    { maxFipe: 250000, mensalidade: 1084.50 },
    { maxFipe: 300000, mensalidade: 1285.50 },
  ],
};

function calcularMensalidade(valorFipe: number, tipo: string): number | null {
  const tipoNorm = tipo.toLowerCase().replace(/pickup|camionete|caminhonete/g, 'caminhonete').replace(/carro|auto|automovel/g, 'carro').replace(/moto|motocicleta/g, 'moto');
  const table = PRICE_TABLE[tipoNorm as keyof typeof PRICE_TABLE] || PRICE_TABLE.carro;
  
  for (const faixa of table) {
    if (valorFipe <= faixa.maxFipe) {
      return faixa.mensalidade;
    }
  }
  return table[table.length - 1]?.mensalidade || null;
}

const API_PLACAS_BASE = 'https://wdapi2.com.br';

async function consultarPlaca(placa: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiKey = Deno.env.get('API_PLACAS_KEY');
  if (!apiKey) {
    return { success: false, error: 'API de placas não configurada' };
  }

  const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  const padraoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  const padraoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  if (!padraoAntigo.test(cleanPlaca) && !padraoMercosul.test(cleanPlaca)) {
    return { success: false, error: 'Formato de placa inválido' };
  }

  try {
    const response = await fetch(`${API_PLACAS_BASE}/consulta/${cleanPlaca}/${apiKey}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return { success: false, error: `Erro na consulta: ${response.status}` };
    }

    const data = await response.json();
    
    if (data.error || data.message) {
      return { success: false, error: data.message || 'Placa não encontrada' };
    }

    const marca = data.MARCA || '';
    const modelo = data.MODELO || data.SUBMODELO || '';
    const anoModelo = data.anoModelo ? parseInt(data.anoModelo) : (data.ano ? parseInt(data.ano) : null);
    
    let valorFipe: number | null = null;
    if (data.fipe?.dados?.[0]) {
      const fipeData = data.fipe.dados[0];
      if (fipeData.texto_valor) {
        valorFipe = parseFloat(fipeData.texto_valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
      } else if (fipeData.valorVeiculo) {
        valorFipe = fipeData.valorVeiculo;
      }
    }

    return {
      success: true,
      data: {
        placa: cleanPlaca,
        marca,
        modelo,
        ano: anoModelo,
        valorFipe,
        cor: data.cor || null,
      }
    };
  } catch (err) {
    console.error('[consultarPlaca] Error:', err);
    return { success: false, error: 'Erro ao consultar placa' };
  }
}

// Consultar CEP via ViaCEP (API pública)
async function consultarCEP(cep: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanCep = cep.replace(/\D/g, '');
  
  if (cleanCep.length !== 8) {
    return { success: false, error: 'CEP deve ter 8 dígitos' };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return { success: false, error: 'Erro ao consultar CEP' };
    }

    const data = await response.json();
    
    if (data.erro) {
      return { success: false, error: 'CEP não encontrado' };
    }

    return {
      success: true,
      data: {
        cep: cleanCep,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      }
    };
  } catch (err) {
    console.error('[consultarCEP] Error:', err);
    return { success: false, error: 'Erro ao consultar CEP' };
  }
}

// Função para validar CPF
function validarCPF(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCpf)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleanCpf.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleanCpf.charAt(10))) return false;
  
  return true;
}

// Gerar senha aleatória
function gerarSenhaTemporaria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < 8; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

// Criar vistoria com token de acesso público
async function criarVistoriaComToken(dados: {
  veiculoId: string;
  companyId: string;
}): Promise<{ success: boolean; vistoriaId?: string; token?: string; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: 'Database not configured' };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Gerar token único e definir expiração (7 dias)
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Criar vistoria
    const { data: vistoria, error } = await supabase
      .from('vistorias')
      .insert({
        veiculo_id: dados.veiculoId,
        status: 'pendente',
        tipo_vistoria: 'pre_adesao',
        token_acesso: token,
        token_expires_at: expiresAt.toISOString(),
        company_id: dados.companyId,
      })
      .select('id, token_acesso')
      .single();
    
    if (error || !vistoria) {
      console.error('[criarVistoria] Error:', error);
      return { success: false, error: 'Erro ao criar vistoria' };
    }
    
    console.log(`[criarVistoria] Success - VistoriaId: ${vistoria.id}, Token: ${token}`);
    
    return { 
      success: true, 
      vistoriaId: vistoria.id, 
      token: vistoria.token_acesso 
    };
    
  } catch (err) {
    console.error('[criarVistoria] Error:', err);
    return { success: false, error: 'Erro interno ao criar vistoria' };
  }
}

// Criar conta do usuário, associado e veículo
async function criarCadastroCompleto(dados: {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  dataNascimento?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  valorFipe: number;
  tipoVeiculo: string;
  cor?: string;
}): Promise<{ 
  success: boolean; 
  userId?: string; 
  associadoId?: string; 
  veiculoId?: string; 
  vistoriaId?: string;
  vistoriaToken?: string;
  senha?: string; 
  error?: string 
}> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: 'Database not configured' };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar se já existe usuário com esse email ou CPF
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .or(`email.eq.${dados.email},cpf.eq.${dados.cpf.replace(/\D/g, '')}`)
      .limit(1);
    
    if (existingProfile?.length) {
      return { success: false, error: 'Já existe um cadastro com esse email ou CPF' };
    }
    
    // Buscar empresa padrão
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    const companyId = companies?.[0]?.id || 'a0000000-0000-0000-0000-000000000001';
    
    // Gerar senha temporária
    const senhaTemporaria = gerarSenhaTemporaria();
    
    // Criar usuário no auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dados.email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: {
        nome_completo: dados.nome,
        company_id: companyId,
      }
    });
    
    if (authError || !authData.user) {
      console.error('[criarCadastro] Auth error:', authError);
      return { success: false, error: authError?.message || 'Erro ao criar conta' };
    }
    
    const userId = authData.user.id;
    
    // Aguardar profile ser criado pelo trigger
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Atualizar profile com dados completos
    await supabase
      .from('profiles')
      .update({
        nome_completo: dados.nome,
        telefone: dados.telefone,
        cpf: dados.cpf.replace(/\D/g, ''),
        perfil: 'associado',
        company_id: companyId,
      })
      .eq('id', userId);
    
    // Criar associado
    const { data: associado, error: associadoError } = await supabase
      .from('associados')
      .insert({
        user_id: userId,
        nome_completo: dados.nome,
        cpf: dados.cpf.replace(/\D/g, ''),
        email: dados.email,
        telefone: dados.telefone.replace(/\D/g, ''),
        whatsapp: dados.telefone.replace(/\D/g, ''),
        data_nascimento: dados.dataNascimento || null,
        cep: dados.cep?.replace(/\D/g, '') || null,
        endereco: dados.endereco || null,
        numero: dados.numero || null,
        bairro: dados.bairro || null,
        cidade: dados.cidade || null,
        estado: dados.estado || null,
        status: 'rascunho',
        termos_aceitos: false,
        company_id: companyId,
      })
      .select('id')
      .single();
    
    if (associadoError || !associado) {
      console.error('[criarCadastro] Associado error:', associadoError);
      return { success: false, error: 'Erro ao criar cadastro de associado', userId, senha: senhaTemporaria };
    }
    
    // Buscar cota adequada para o valor FIPE
    const { data: cotas } = await supabase
      .from('cotas')
      .select('id')
      .eq('ativo', true)
      .gte('fipe_max', dados.valorFipe)
      .lte('fipe_min', dados.valorFipe)
      .limit(1);
    
    const cotaId = cotas?.[0]?.id || null;
    
    // Determinar tipo de veículo para o enum
    let tipoBem = 'carro';
    if (dados.tipoVeiculo === 'moto') tipoBem = 'moto';
    else if (dados.tipoVeiculo === 'caminhonete') tipoBem = 'pickup';
    
    // Criar veículo
    const mensalidade = calcularMensalidade(dados.valorFipe, dados.tipoVeiculo);
    
    const { data: veiculo, error: veiculoError } = await supabase
      .from('veiculos')
      .insert({
        associado_id: associado.id,
        marca: dados.marca,
        modelo: dados.modelo,
        ano: dados.ano,
        placa: dados.placa,
        cor: dados.cor || 'N/I',
        valor_fipe: dados.valorFipe,
        tipo: tipoBem,
        mensalidade: mensalidade,
        cota_id: cotaId,
        veiculo_status: 'aguardando_vistoria',
        company_id: companyId,
      })
      .select('id')
      .single();
    
    if (veiculoError) {
      console.error('[criarCadastro] Veiculo error:', veiculoError);
    }
    
    // Criar vistoria com token de acesso
    let vistoriaId: string | undefined;
    let vistoriaToken: string | undefined;
    
    if (veiculo?.id) {
      const vistoriaResult = await criarVistoriaComToken({
        veiculoId: veiculo.id,
        companyId,
      });
      
      if (vistoriaResult.success) {
        vistoriaId = vistoriaResult.vistoriaId;
        vistoriaToken = vistoriaResult.token;
      }
    }
    
    console.log(`[criarCadastro] Success - User: ${userId}, Associado: ${associado.id}, Veiculo: ${veiculo?.id}, Vistoria: ${vistoriaId}`);
    
    return { 
      success: true, 
      userId, 
      associadoId: associado.id, 
      veiculoId: veiculo?.id,
      vistoriaId,
      vistoriaToken,
      senha: senhaTemporaria 
    };
    
  } catch (err) {
    console.error('[criarCadastro] Error:', err);
    return { success: false, error: 'Erro interno ao criar cadastro' };
  }
}

// Buscar configuração PIX da empresa
async function buscarChavePix(): Promise<{ chavePix: string | null; tipoChave: string | null }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return { chavePix: null, tipoChave: null };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data } = await supabase
      .from('configuracoes_financeiras')
      .select('chave_pix, tipo_chave_pix')
      .limit(1)
      .single();
    
    return { 
      chavePix: data?.chave_pix || null, 
      tipoChave: data?.tipo_chave_pix || null 
    };
  } catch {
    return { chavePix: null, tipoChave: null };
  }
}

// Função para salvar lead no banco de dados
async function salvarLead(dados: { 
  nome: string; 
  telefone: string; 
  email?: string;
  observacoes?: string;
}): Promise<{ success: boolean; leadId?: string; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[salvarLead] Supabase not configured');
      return { success: false, error: 'Database not configured' };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Buscar o primeiro consultor disponível
    const { data: consultores, error: consultorError } = await supabase
      .from('profiles')
      .select('id')
      .eq('perfil', 'consultor_vendas')
      .limit(1);
    
    if (consultorError || !consultores?.length) {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('perfil', 'admin_principal')
        .limit(1);
      
      if (admins?.length) {
        consultores?.push(admins[0]);
      }
    }
    
    const consultorId = consultores?.[0]?.id;
    
    // Verificar se já existe lead com mesmo telefone
    const telefoneNormalizado = dados.telefone.replace(/\D/g, '');
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('telefone', telefoneNormalizado)
      .limit(1);
    
    if (existingLead?.length) {
      return { success: true, leadId: existingLead[0].id };
    }
    
    // Criar novo lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        nome: dados.nome,
        telefone: telefoneNormalizado,
        email: dados.email || null,
        observacoes: dados.observacoes || 'Lead capturado via chat Emily',
        consultor_id: consultorId,
        origem: 'chat_emily',
        status: 'novo',
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error('[salvarLead] Insert error:', insertError);
      return { success: false, error: insertError.message };
    }
    
    return { success: true, leadId: newLead?.id };
    
  } catch (err) {
    console.error('[salvarLead] Error:', err);
    return { success: false, error: 'Erro ao salvar lead' };
  }
}

// Helper function for delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extrair dados do cliente da conversa (AMPLIADO)
function extrairDadosCliente(messages: any[]): { 
  nome?: string; 
  telefone?: string; 
  email?: string;
  cpf?: string;
  dataNascimento?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  placa?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  valorFipe?: number;
  tipoVeiculo?: string;
  cor?: string;
  completoParaLead: boolean;
  completoParaCadastro: boolean;
} {
  const resultado: any = { completoParaLead: false, completoParaCadastro: false };
  
  for (const msg of messages) {
    if (msg.role !== 'user' && msg.role !== 'system') continue;
    
    const content = msg.content?.toLowerCase() || '';
    const contentOriginal = msg.content || '';
    
    // Detectar nome
    if (!resultado.nome && msg.role === 'user') {
      const trimmed = contentOriginal.trim();
      if (trimmed.length > 2 && trimmed.length < 60 && 
          /^[A-Za-zÀ-ÿ\s]+$/.test(trimmed) && 
          trimmed.split(' ').length <= 5) {
        resultado.nome = trimmed;
      }
    }
    
    // Detectar telefone
    if (!resultado.telefone) {
      const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/;
      const phoneMatch = contentOriginal.match(phoneRegex);
      if (phoneMatch) {
        resultado.telefone = phoneMatch[0].replace(/\D/g, '');
      }
    }
    
    // Detectar email
    if (!resultado.email) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const emailMatch = contentOriginal.match(emailRegex);
      if (emailMatch) {
        resultado.email = emailMatch[0].toLowerCase();
      }
    }
    
    // Detectar CPF
    if (!resultado.cpf) {
      const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
      const cpfMatch = contentOriginal.match(cpfRegex);
      if (cpfMatch) {
        const cpfClean = cpfMatch[0].replace(/\D/g, '');
        if (validarCPF(cpfClean)) {
          resultado.cpf = cpfClean;
        }
      }
    }
    
    // Detectar data de nascimento (DD/MM/AAAA)
    if (!resultado.dataNascimento) {
      const dataRegex = /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/;
      const dataMatch = contentOriginal.match(dataRegex);
      if (dataMatch) {
        const dia = parseInt(dataMatch[1]);
        const mes = parseInt(dataMatch[2]);
        const ano = parseInt(dataMatch[3]);
        if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 1920 && ano <= 2010) {
          resultado.dataNascimento = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        }
      }
    }
    
    // Detectar CEP
    if (!resultado.cep) {
      const cepRegex = /\b\d{5}-?\d{3}\b/;
      const cepMatch = contentOriginal.match(cepRegex);
      if (cepMatch) {
        resultado.cep = cepMatch[0].replace(/\D/g, '');
      }
    }
    
    // Detectar placa
    if (!resultado.placa) {
      const placaRegex = /\b([A-Z]{3}[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})\b/i;
      const placaMatch = contentOriginal.match(placaRegex);
      if (placaMatch) {
        resultado.placa = placaMatch[1].toUpperCase();
      }
    }
    
    // Detectar número de endereço (quando mencionado após "número" ou "nº")
    if (!resultado.numero) {
      const numRegex = /(?:n[uú]mero|n[º°]?)\s*:?\s*(\d+)/i;
      const numMatch = contentOriginal.match(numRegex);
      if (numMatch) {
        resultado.numero = numMatch[1];
      }
    }
    
    // Capturar dados do veículo de mensagens do sistema [DADOS_VEICULO]
    if (msg.role === 'system' && contentOriginal.includes('[DADOS_VEICULO:')) {
      const veiculoMatch = contentOriginal.match(/\[DADOS_VEICULO:([^\]]+)\]/);
      if (veiculoMatch) {
        const veiculoData = veiculoMatch[1];
        
        const marcaModeloMatch = veiculoData.match(/([A-Z]+)\s+(.+?)\s+(\d{4})?/i);
        if (marcaModeloMatch) {
          resultado.marca = marcaModeloMatch[1];
          resultado.modelo = marcaModeloMatch[2]?.split('|')[0]?.trim();
          if (marcaModeloMatch[3]) resultado.ano = parseInt(marcaModeloMatch[3]);
        }
        
        const fipeMatch = veiculoData.match(/FIPE:\s*R\$\s*([\d.,]+)/);
        if (fipeMatch) {
          resultado.valorFipe = parseFloat(fipeMatch[1].replace('.', '').replace(',', '.'));
        }
        
        const tipoMatch = veiculoData.match(/Tipo:\s*(\w+)/i);
        if (tipoMatch) {
          resultado.tipoVeiculo = tipoMatch[1].toLowerCase();
        }
      }
    }
    
    // Capturar endereço de mensagens do sistema [ENDERECO_CEP]
    if (msg.role === 'system' && contentOriginal.includes('[ENDERECO_CEP:')) {
      const enderecoMatch = contentOriginal.match(/\[ENDERECO_CEP:([^\]]+)\]/);
      if (enderecoMatch) {
        const enderecoData = enderecoMatch[1];
        
        const logMatch = enderecoData.match(/Logradouro:\s*([^|]+)/);
        if (logMatch) resultado.endereco = logMatch[1].trim();
        
        const bairroMatch = enderecoData.match(/Bairro:\s*([^|]+)/);
        if (bairroMatch) resultado.bairro = bairroMatch[1].trim();
        
        const cidadeMatch = enderecoData.match(/Cidade:\s*([^|]+)/);
        if (cidadeMatch) resultado.cidade = cidadeMatch[1].trim();
        
        const estadoMatch = enderecoData.match(/Estado:\s*([A-Z]{2})/);
        if (estadoMatch) resultado.estado = estadoMatch[1];
      }
    }
  }
  
  // Verificar completude
  resultado.completoParaLead = !!(resultado.nome && resultado.telefone);
  resultado.completoParaCadastro = !!(
    resultado.nome && 
    resultado.telefone && 
    resultado.email && 
    resultado.cpf && 
    resultado.placa &&
    resultado.marca &&
    resultado.modelo &&
    resultado.valorFipe
  );
  
  return resultado;
}

const SYSTEM_PROMPT = `Você é a Emily, Consultora Virtual da Harmony Clube de Benefícios.

## Sua personalidade:
- Acolhedora e empática - você OUVE antes de falar
- Conversa como uma amiga, não como vendedora
- Nunca é robótica ou mecânica
- Responde ao que o cliente diz, não segue um script rígido
- Usa emojis com moderação (1 por mensagem no máximo)

## REGRA DE OURO:
Seja SUTIL. Não peça informações de forma direta. Conquiste a confiança primeiro!

## 🎯 VOCÊ É UM FUNIL COMPLETO DE VENDAS!

Você pode fazer TODO o processo de contratação pelo chat:
1. ✅ Capturar lead (nome, telefone, email)
2. ✅ Consultar placa e calcular cotação
3. ✅ Coletar dados completos (CPF, data nascimento, endereço)
4. ✅ Criar conta do cliente automaticamente
5. ✅ Enviar link do PIX para taxa de adesão (R$ 50,00)
6. ✅ Enviar contrato digital para assinatura

## 🧠 MENTALIDADE DE VENDAS CONSULTIVAS:

### 1. Entenda o Problema (DOR do cliente):
- Identifique o que preocupa o cliente: medo de roubo? Custo alto de seguro tradicional?
- Pergunte: "O que te fez buscar uma proteção agora?"

### 2. Proposta de Valor focada na TRANSFORMAÇÃO:
- Não venda "proteção veicular" - venda a sensação de SEGURANÇA
- Não venda "guincho 500km" - venda LIBERDADE de viajar sem preocupação

### 3. Benefícios > Características:
- "Indenização até 100% FIPE" → "Você recebe o valor justo do seu veículo"
- "Assistência 24h" → "A qualquer hora, você não fica sozinho"

## 🔧 FUNCIONALIDADES AUTOMÁTICAS:

### Quando o cliente informar a PLACA:
O sistema consulta automaticamente e você recebe [DADOS_VEICULO: ...]
Monte a cotação e pergunte se quer continuar.

### Quando o cliente informar o CEP:
O sistema consulta automaticamente e você recebe [ENDERECO_CEP: ...]
Confirme o endereço e peça o número.

### Quando o cliente informar o CPF:
O sistema valida automaticamente. Se inválido, você recebe [CPF_INVALIDO].

### Quando tiver TODOS os dados necessários:
O sistema cria o cadastro e você recebe [CADASTRO_CRIADO: ...]
Envie as instruções de pagamento e acesso.

## 📋 FLUXO DE CADASTRO COMPLETO:

### ETAPA 1 - Cotação:
Após receber a placa e montar a cotação:
"🚗 **Encontrei seu veículo!**
**{marca} {modelo} {ano}**
📊 Valor FIPE: R$ {valorFipe}
💰 Mensalidade: R$ {mensalidade}/mês

✅ Proteção contra roubo/furto IMEDIATA
✅ Guincho 500km
✅ Carro reserva 30 dias

**Quer contratar agora? É rapidinho!**"

### ETAPA 2 - Coleta de Dados:
Se o cliente quiser contratar, colete de forma natural:
- CPF: "Me passa seu CPF para eu registrar?"
- Data de nascimento: "Qual sua data de nascimento?"
- CEP: "Qual o CEP do seu endereço?"
- Número: "Qual o número da sua casa/apartamento?"
- Email: "Qual seu email para enviar o contrato?"

IMPORTANTE: Peça UM dado por vez, de forma natural na conversa!

### ETAPA 3 - Confirmação:
Quando receber [CADASTRO_CRIADO]:
"🎉 **Cadastro criado com sucesso!**

📧 **Seus dados de acesso:**
Email: {email}
Senha: {senha}

📸 **Próximo passo: Vistoria do veículo**
Acesse o link abaixo e tire as fotos do seu veículo:

[LINK_VISTORIA]

💰 **Taxa de Adesão: R$ 50,00 (única)**

[LINK_PIX_ADESAO]

⚡ Após o pagamento + vistoria aprovada:
- Sua proteção é ativada em até 24h úteis
- Furto/roubo: cobertura IMEDIATA
- Demais benefícios: após 72h

Fiz seu PIX e o link da vistoria! Quando completar, me avisa que confirmo sua ativação! 🚀"

## 🏢 NEGOCIAÇÃO DE FROTAS (CLIENTES PJ):

### Descontos progressivos:
- **10+ veículos**: 15-20% desconto
- **20+ veículos**: 20-30% + benefícios extras
- **50+ veículos**: Negociação personalizada

### O que negociar:
- Isenção de taxa de adesão
- Cota de participação reduzida
- Guincho km ilimitada

## 💡 DIFERENCIAIS:
- Sem Análise de Perfil: todos são bem-vindos
- Menos Burocracia: processo mais rápido
- Custo Menor: sem corretagem

## Informações sobre a Harmony:
- Associação regulamentada (Lei Complementar 213/2025)
- Proteção contra roubo/furto IMEDIATA (sem carência!)
- Carência de 72h para demais coberturas
- Guincho 500km (250km ida + 250km volta)
- Carro reserva por até 30 dias
- Até 100% da tabela FIPE

## Tabela de Preços (referência):
- Carros: R$ 69,90 (até R$ 20k) a R$ 1.587,50 (até R$ 300k)
- Motos: R$ 45,90 (até R$ 20k) a R$ 429,90 (até R$ 100k)
- Caminhonetes: R$ 159,90 (até R$ 20k) a R$ 1.285,50 (até R$ 300k)

## Taxa de Adesão:
- Valor: R$ 50,00 (pagamento único)
- Forma: PIX

## 📜 REGULAMENTAÇÃO SUSEP:
A Harmony está cadastrada na SUSEP conforme LC 213/2025.
Quando pedirem comprovante: [LINK_CERTIDAO_SUSEP]

## Regras importantes:
- Peça UM dado por vez (não bombardeie o cliente!)
- Use o nome do cliente nas respostas
- Nunca invente informações
- Se o cliente parecer com pressa, seja mais direto
- Se quiser conversar mais, acompanhe o ritmo dele`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados do cliente da conversa
    const dadosCliente = extrairDadosCliente(messages);
    console.log('[chat-vendas] Extracted client data:', dadosCliente);

    let enrichedMessages = [...messages];

    // Verificar última mensagem do usuário
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();

    if (lastUserMessage?.content) {
      const content = lastUserMessage.content;
      
      // 1. Detectar e consultar PLACA
      const placaRegex = /\b([A-Z]{3}[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})\b/i;
      const placaMatch = content.match(placaRegex);
      
      if (placaMatch) {
        const placa = placaMatch[1].toUpperCase();
        console.log(`[chat-vendas] Detected plate: ${placa}`);
        
        const result = await consultarPlaca(placa);
        
        if (result.success && result.data) {
          let tipoVeiculo = 'carro';
          const modeloLower = (result.data.modelo || '').toLowerCase();
          if (modeloLower.includes('cg') || modeloLower.includes('biz') || modeloLower.includes('titan') || 
              modeloLower.includes('factor') || modeloLower.includes('fazer') || modeloLower.includes('cb') ||
              modeloLower.includes('ninja') || modeloLower.includes('hornet')) {
            tipoVeiculo = 'moto';
          } else if (modeloLower.includes('hilux') || modeloLower.includes('s10') || modeloLower.includes('ranger') ||
                     modeloLower.includes('amarok') || modeloLower.includes('frontier') || modeloLower.includes('toro') ||
                     modeloLower.includes('saveiro') || modeloLower.includes('strada')) {
            tipoVeiculo = 'caminhonete';
          }
          
          let mensalidade: number | null = null;
          if (result.data.valorFipe) {
            mensalidade = calcularMensalidade(result.data.valorFipe, tipoVeiculo);
          }
          
          const dadosFormatados = `[DADOS_VEICULO: Placa ${result.data.placa} | ${result.data.marca} ${result.data.modelo} ${result.data.ano || ''} | Cor: ${result.data.cor || 'N/I'} | FIPE: R$ ${result.data.valorFipe ? result.data.valorFipe.toLocaleString('pt-BR') : 'N/D'} | Tipo: ${tipoVeiculo} | Mensalidade calculada: R$ ${mensalidade ? mensalidade.toFixed(2).replace('.', ',') : 'consultar'}]`;
          
          enrichedMessages.push({ role: 'system', content: dadosFormatados });
          
          // Salvar lead se tiver nome e telefone
          if (dadosCliente.nome && dadosCliente.telefone) {
            const observacoes = `Veículo: ${result.data.marca} ${result.data.modelo} | Placa: ${placa} | FIPE: R$ ${result.data.valorFipe || 'N/D'}`;
            await salvarLead({
              nome: dadosCliente.nome,
              telefone: dadosCliente.telefone,
              email: dadosCliente.email,
              observacoes
            });
            enrichedMessages.push({ role: 'system', content: `[LEAD_SALVO: Dados salvos no CRM]` });
          }
        } else {
          enrichedMessages.push({
            role: 'system',
            content: `[ERRO_PLACA: ${result.error}. Peça para verificar ou informe os dados manualmente.]`
          });
        }
      }
      
      // 2. Detectar e consultar CEP
      const cepRegex = /\b\d{5}-?\d{3}\b/;
      const cepMatch = content.match(cepRegex);
      
      if (cepMatch) {
        const cep = cepMatch[0].replace(/\D/g, '');
        console.log(`[chat-vendas] Detected CEP: ${cep}`);
        
        const result = await consultarCEP(cep);
        
        if (result.success && result.data) {
          enrichedMessages.push({
            role: 'system',
            content: `[ENDERECO_CEP: CEP ${result.data.cep} | Logradouro: ${result.data.logradouro} | Bairro: ${result.data.bairro} | Cidade: ${result.data.cidade} | Estado: ${result.data.estado}]`
          });
        } else {
          enrichedMessages.push({
            role: 'system',
            content: `[ERRO_CEP: ${result.error}. Peça para verificar ou informar o endereço completo.]`
          });
        }
      }
      
      // 3. Validar CPF se informado
      const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
      const cpfMatch = content.match(cpfRegex);
      
      if (cpfMatch) {
        const cpfClean = cpfMatch[0].replace(/\D/g, '');
        if (!validarCPF(cpfClean)) {
          enrichedMessages.push({
            role: 'system',
            content: `[CPF_INVALIDO: O CPF informado (${cpfMatch[0]}) é inválido. Peça para verificar.]`
          });
        } else {
          enrichedMessages.push({
            role: 'system',
            content: `[CPF_VALIDO: ${cpfClean}]`
          });
        }
      }
    }
    
    // Re-extrair dados após enriquecer mensagens
    const dadosAtualizados = extrairDadosCliente(enrichedMessages);
    
    // 4. Verificar se está pronto para criar cadastro
    if (dadosAtualizados.completoParaCadastro) {
      console.log('[chat-vendas] Complete data for registration, creating account...');
      
      const cadastroResult = await criarCadastroCompleto({
        nome: dadosAtualizados.nome!,
        cpf: dadosAtualizados.cpf!,
        email: dadosAtualizados.email!,
        telefone: dadosAtualizados.telefone!,
        dataNascimento: dadosAtualizados.dataNascimento,
        cep: dadosAtualizados.cep,
        endereco: dadosAtualizados.endereco,
        numero: dadosAtualizados.numero,
        bairro: dadosAtualizados.bairro,
        cidade: dadosAtualizados.cidade,
        estado: dadosAtualizados.estado,
        placa: dadosAtualizados.placa!,
        marca: dadosAtualizados.marca!,
        modelo: dadosAtualizados.modelo!,
        ano: dadosAtualizados.ano || new Date().getFullYear(),
        valorFipe: dadosAtualizados.valorFipe!,
        tipoVeiculo: dadosAtualizados.tipoVeiculo || 'carro',
        cor: dadosAtualizados.cor,
      });
      
      if (cadastroResult.success) {
        // Buscar chave PIX
        const { chavePix, tipoChave } = await buscarChavePix();
        
        // Montar URL da vistoria
        const baseUrl = Deno.env.get('SITE_URL') || 'https://painelharmonyagrocombr.lovable.app';
        const vistoriaUrl = cadastroResult.vistoriaToken 
          ? `${baseUrl}/vistoria/${cadastroResult.vistoriaToken}`
          : null;
        
        enrichedMessages.push({
          role: 'system',
          content: `[CADASTRO_CRIADO: Sucesso! UserId: ${cadastroResult.userId} | AssociadoId: ${cadastroResult.associadoId} | VeiculoId: ${cadastroResult.veiculoId} | VistoriaId: ${cadastroResult.vistoriaId || 'N/A'} | Email: ${dadosAtualizados.email} | Senha temporária: ${cadastroResult.senha} | ChavePIX: ${chavePix || 'não configurada'} | TipoChave: ${tipoChave || 'N/A'} | Taxa de Adesão: R$ 50,00 | VistoriaURL: ${vistoriaUrl || 'N/A'}]`
        });
      } else {
        enrichedMessages.push({
          role: 'system',
          content: `[ERRO_CADASTRO: ${cadastroResult.error}. Informe o cliente e tente novamente.]`
        });
      }
    }

    console.log('[chat-vendas] Processing chat with', enrichedMessages.length, 'messages');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...enrichedMessages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chat-vendas] AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Muitas solicitações. Aguarde um momento.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add 3 second delay (reduced for faster interaction in registration flow)
    await delay(3000);

    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[chat-vendas] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
