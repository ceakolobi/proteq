import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DadosPessoais, DadosVeiculo, ResultadoCotacaoPublica, EtapaFunil, DadosCadastro, DocumentoUploadLanding } from '@/components/landing/types';
import { calcularCotacaoCompleta } from '@/lib/cotacaoUtils';
import type { Cota } from '@/lib/cotacaoUtils';
import type { BeneficioExtra } from '@/hooks/useBeneficiosExtras';
import type { VehicleType } from '@/types/database';
import { toast } from 'sonner';

interface ConfiguracaoFinanceira {
  chave_pix: string | null;
  tipo_chave_pix: string | null;
}

export function usePublicQuotation() {
  const [etapa, setEtapa] = useState<EtapaFunil>('hero');
  const [dadosPessoais, setDadosPessoais] = useState<DadosPessoais>({ nome: '', telefone: '', email: '' });
  const [dadosVeiculo, setDadosVeiculo] = useState<DadosVeiculo | null>(null);
  const [cotacao, setCotacao] = useState<ResultadoCotacaoPublica | null>(null);
  const [dadosCadastro, setDadosCadastro] = useState<DadosCadastro | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoUploadLanding[]>([]);
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [configFinanceira, setConfigFinanceira] = useState<ConfiguracaoFinanceira | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  
  // Benefícios extras selecionados
  const [beneficiosSelecionadosIds, setBeneficiosSelecionadosIds] = useState<string[]>([]);
  const [beneficiosSelecionadosObjs, setBeneficiosSelecionadosObjs] = useState<BeneficioExtra[]>([]);

  // Carregar cotas públicas (ativas)
  useEffect(() => {
    const fetchCotas = async () => {
      const { data, error } = await supabase
        .from('cotas')
        .select('*')
        .eq('ativo', true)
        .order('fipe_min', { ascending: true });
      
      if (error) {
        console.error('[usePublicQuotation] Erro ao buscar cotas:', error);
      }
      
      if (data) {
        console.log('[usePublicQuotation] Cotas carregadas:', data.length);
        setCotas(data as unknown as Cota[]);
      }
    };

    const fetchConfig = async () => {
      const { data } = await supabase
        .from('configuracoes_financeiras')
        .select('chave_pix, tipo_chave_pix')
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setConfigFinanceira(data);
      }
    };

    fetchCotas();
    fetchConfig();
  }, []);

  const calcularCotacao = (veiculo: DadosVeiculo): ResultadoCotacaoPublica | null => {
    if (!veiculo.valor_fipe || cotas.length === 0) {
      return null;
    }

    const resultado = calcularCotacaoCompleta(
      veiculo.valor_fipe,
      veiculo.tipo_bem as VehicleType,
      cotas
    );

    if (!resultado) {
      return null;
    }

    return {
      mensalidade: resultado.valorFinal,
      participacao: resultado.participacao,
      valorFipe: veiculo.valor_fipe,
      cotaNome: resultado.cotaNome,
      valorMensalBase: resultado.valorFinal,
      beneficios: [
        'Proteção contra roubo e furto',
        'Assistência 24h',
        'Rastreamento veicular',
        'Até 100% da FIPE',
        'Guincho 250 km',
        '30 dias de carro reserva',
      ],
    };
  };

  const avancarParaDadosPessoais = () => {
    setEtapa('dados_pessoais');
  };

  const salvarDadosPessoais = async (dados: DadosPessoais) => {
    setDadosPessoais(dados);
    
    // Criar lead automaticamente no sistema
    try {
      // Buscar um consultor padrão (primeiro ativo) para associar o lead
      const { data: consultores } = await supabase
        .rpc('get_default_consultor_publico') as { data: { id: string; company_id: string | null }[] | null };

      const consultorId = consultores?.[0]?.id;
      const companyId = consultores?.[0]?.company_id;

      if (consultorId) {
        // Verificar se já existe um lead com esse telefone/email
        const telefoneNormalizado = dados.telefone.replace(/\D/g, '');
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('telefone', telefoneNormalizado)
          .limit(1)
          .maybeSingle() as { data: { id: string } | null };

        if (existingLead) {
          // Lead existente encontrado
          setLeadId(existingLead.id);
          console.log('[usePublicQuotation] Lead existente encontrado:', existingLead.id);
        } else {
          // Criar novo lead
          const { data: novoLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              nome: dados.nome.trim(),
              telefone: telefoneNormalizado,
              email: dados.email.trim().toLowerCase(),
              consultor_id: consultorId,
              company_id: companyId,
              origem: 'site' as const,
              status: 'novo' as const,
            })
            .select('id')
            .single();

          if (leadError) {
            console.error('[usePublicQuotation] Erro ao criar lead:', leadError);
          } else if (novoLead) {
            setLeadId(novoLead.id);
            console.log('[usePublicQuotation] Lead criado com sucesso:', novoLead.id);
          }
        }
      } else {
        console.warn('[usePublicQuotation] Nenhum consultor encontrado para associar o lead');
      }
    } catch (error) {
      console.error('[usePublicQuotation] Erro ao processar lead:', error);
    }
    
    setEtapa('dados_veiculo');
  };

  const salvarDadosVeiculo = async (veiculo: DadosVeiculo) => {
    setDadosVeiculo(veiculo);
    setLoading(true);

    try {
      const resultadoCotacao = calcularCotacao(veiculo);
      
      // Atualizar lead com dados do veículo
      if (leadId) {
        await supabase
          .from('leads')
          .update({
            tipo_veiculo: veiculo.tipo_bem as any,
            status: 'cotado' as const,
          })
          .eq('id', leadId);
        console.log('[usePublicQuotation] Lead atualizado com veículo');
      }
      
      if (!resultadoCotacao) {
        setCotacao(null);
        setEtapa('resultado');
        return;
      }
      
      setCotacao(resultadoCotacao);
      localStorage.setItem('cotacao_publica', JSON.stringify({
        pessoais: dadosPessoais,
        veiculo,
        cotacao: resultadoCotacao,
        timestamp: new Date().toISOString(),
      }));

      setEtapa('resultado');
    } catch (error) {
      console.error('Erro ao processar cotação:', error);
      setCotacao(null);
      setEtapa('resultado');
    } finally {
      setLoading(false);
    }
  };

  const voltarEtapa = () => {
    switch (etapa) {
      case 'dados_pessoais':
        setEtapa('hero');
        break;
      case 'dados_veiculo':
        setEtapa('dados_pessoais');
        break;
      case 'resultado':
        setEtapa('dados_veiculo');
        break;
      case 'cadastro':
        setEtapa('resultado');
        break;
      case 'documentos':
        setEtapa('cadastro');
        break;
      case 'pagamento':
        setEtapa('documentos');
        break;
      default:
        setEtapa('hero');
    }
  };

  // Novo fluxo: resultado -> cadastro
  const aceitarProposta = () => {
    setEtapa('cadastro');
  };

  // Criar conta no sistema
  const criarConta = async (dados: DadosCadastro) => {
    setLoading(true);
    setDadosCadastro(dados);

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dadosPessoais.email,
        password: dados.senha,
        options: {
          data: {
            nome_completo: dadosPessoais.nome,
            telefone: dadosPessoais.telefone,
          },
        },
      });

      if (authError) {
        console.error('Erro ao criar conta:', authError);
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado. Faça login.');
        } else {
          toast.error('Erro ao criar conta: ' + authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar conta. Tente novamente.');
        return;
      }

      toast.success('Conta criada! Continue enviando seus documentos.');
      setEtapa('documentos');
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar documentos
  const salvarDocumentos = async (docs: DocumentoUploadLanding[]) => {
    setDocumentos(docs);
    // Por enquanto, documentos são salvos após pagamento
    // Avança para pagamento
    setEtapa('pagamento');
  };

  // Confirmar pagamento e finalizar
  const confirmarPagamento = async () => {
    setLoading(true);

    try {
      // Criar associado no sistema
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !dadosCadastro || !dadosVeiculo || !cotacao) {
        toast.error('Dados incompletos. Tente novamente.');
        return;
      }

      // Inserir associado com status 'rascunho' (será ativado após análise dos docs)
      const { data: associado, error: associadoError } = await supabase
        .from('associados')
        .insert({
          nome_completo: dadosPessoais.nome,
          email: dadosPessoais.email,
          telefone: dadosPessoais.telefone,
          cpf: dadosCadastro.cpf.replace(/\D/g, ''),
          data_nascimento: dadosCadastro.dataNascimento,
          cep: dadosCadastro.cep.replace(/\D/g, ''),
          endereco: dadosCadastro.endereco,
          numero: dadosCadastro.numero,
          bairro: dadosCadastro.bairro,
          cidade: dadosCadastro.cidade,
          estado: dadosCadastro.estado,
          dia_vencimento: dadosCadastro.diaVencimento,
          status: 'rascunho',
        })
        .select()
        .single();

      if (associadoError) {
        console.error('Erro ao criar associado:', associadoError);
        toast.error('Erro ao finalizar cadastro');
        return;
      }

      // Inserir veículo
      const { error: veiculoError } = await supabase
        .from('veiculos')
        .insert({
          associado_id: associado.id,
          tipo: dadosVeiculo.tipo_bem,
          marca: dadosVeiculo.marca,
          modelo: dadosVeiculo.modelo,
          ano: dadosVeiculo.ano,
          placa: dadosVeiculo.placa || '',
          valor_fipe: dadosVeiculo.valor_fipe,
          codigo_fipe: dadosVeiculo.codigo_fipe,
          mensalidade: cotacao.mensalidade,
          veiculo_status: 'aguardando_vistoria',
        });

      if (veiculoError) {
        console.error('Erro ao criar veículo:', veiculoError);
      }

      // TODO: Upload de documentos para storage
      // TODO: Registrar pagamento da adesão

      toast.success('Cadastro finalizado! Sua proteção será ativada em até 72h.');
      setEtapa('sucesso');
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      toast.error('Erro ao finalizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  const reiniciar = () => {
    setEtapa('hero');
    setDadosPessoais({ nome: '', telefone: '', email: '' });
    setDadosVeiculo(null);
    setCotacao(null);
    setDadosCadastro(null);
    setDocumentos([]);
    setBeneficiosSelecionadosIds([]);
    setBeneficiosSelecionadosObjs([]);
  };

  const enviarPropostaWhatsApp = () => {
    if (!dadosPessoais.telefone || !cotacao) return;
    
    const telefone = dadosPessoais.telefone.replace(/\D/g, '');
    const telefoneFormatado = telefone.startsWith('55') ? telefone : `55${telefone}`;
    
    const mensagem = encodeURIComponent(
      `Olá ${dadosPessoais.nome}! 🚗\n\n` +
      `Sua cotação de proteção veicular:\n\n` +
      `🔹 Veículo: ${dadosVeiculo?.marca} ${dadosVeiculo?.modelo}\n` +
      `🔹 Valor FIPE: R$ ${cotacao.valorFipe.toLocaleString('pt-BR')}\n` +
      `🔹 Mensalidade: R$ ${cotacao.mensalidade.toFixed(2)}\n` +
      `🔹 Participação: R$ ${cotacao.participacao.toFixed(2)}\n\n` +
      `✅ Benefícios inclusos:\n` +
      cotacao.beneficios.map(b => `• ${b}`).join('\n') +
      (beneficiosSelecionadosObjs.length > 0 ? 
        `\n\n➕ Benefícios Extras:\n` + beneficiosSelecionadosObjs.map(b => `• ${b.nome} (+ R$ ${Number(b.valor_mensal).toFixed(2)})`).join('\n') 
        : '') +
      `\n\n💰 Valor Total: R$ ${cotacao.mensalidade.toFixed(2)}` +
      `\n\nPara contratar, continue pelo site ou responda esta mensagem!`
    );
    
    const url = `https://wa.me/${telefoneFormatado}?text=${mensagem}`;
    window.open(url, '_blank');
  };

  const setBeneficiosExtras = (ids: string[], objs: BeneficioExtra[]) => {
    setBeneficiosSelecionadosIds(ids);
    setBeneficiosSelecionadosObjs(objs);
    
    if (cotacao) {
      const valorBase = cotacao.valorMensalBase || cotacao.mensalidade;
      const extraTotal = objs.reduce((acc, b) => acc + Number(b.valor_mensal || 0), 0);
      
      setCotacao({
        ...cotacao,
        mensalidade: valorBase + extraTotal,
        beneficiosExtras: ids,
        valorMensalBase: valorBase
      });
    }
  };

  return {
    etapa,
    dadosPessoais,
    dadosVeiculo,
    cotacao,
    dadosCadastro,
    documentos,
    configFinanceira,
    loading,
    beneficiosSelecionadosIds,
    beneficiosSelecionadosObjs,
    
    // Actions
    avancarParaDadosPessoais,
    salvarDadosPessoais,
    salvarDadosVeiculo,
    voltarEtapa,
    aceitarProposta,
    criarConta,
    salvarDocumentos,
    confirmarPagamento,
    reiniciar,
    enviarPropostaWhatsApp,
    setBeneficiosExtras,
  };
}