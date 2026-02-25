import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DadosPessoais, DadosVeiculo, ResultadoCotacaoPublica, EtapaFunil, DadosCadastro, DocumentoUploadLanding } from '@/components/landing/types';
import { calcularCotacaoCompleta } from '@/lib/cotacaoUtils';
import type { Cota } from '@/lib/cotacaoUtils';
import type { VehicleType } from '@/types/database';
import { resolvePublicCompanyId } from '@/lib/publicCompany';
import { toast } from 'sonner';

export function usePublicQuotation() {
  const [etapa, setEtapa] = useState<EtapaFunil>('hero');
  const [dadosPessoais, setDadosPessoais] = useState<DadosPessoais>({ nome: '', telefone: '', email: '' });
  const [dadosVeiculo, setDadosVeiculo] = useState<DadosVeiculo | null>(null);
  const [cotacao, setCotacao] = useState<ResultadoCotacaoPublica | null>(null);
  const [dadosCadastro, setDadosCadastro] = useState<DadosCadastro | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoUploadLanding[]>([]);
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  // Carregar cotas públicas (ativas) filtradas estritamente pela empresa pública
  useEffect(() => {
    const fetchCotas = async () => {
      const companyId = await resolvePublicCompanyId();

      if (!companyId) {
        console.error('[usePublicQuotation] Empresa pública não resolvida. Cotas não carregadas.');
        setCotas([]);
        return;
      }

      const { data, error } = await supabase
        .from('cotas')
        .select('*')
        .eq('ativo', true)
        .eq('company_id', companyId)
        .order('fipe_min', { ascending: true });

      if (error) {
        console.error('[usePublicQuotation] Erro ao buscar cotas:', error);
      }

      if (data) {
        console.log('[usePublicQuotation] Cotas carregadas para empresa:', data.length);
        setCotas(data as unknown as Cota[]);
      }
    };

    fetchCotas();
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
      beneficios: [
        'Proteção contra roubo e furto',
        'Assistência 24h',
        'Rastreamento veicular',
        'Até 100% da FIPE',
        'Guincho 500km',
        '30 dias de carro reserva',
      ],
    };
  };

  const avancarParaCotacao = () => {
    sessionStorage.setItem('in_quotation_funnel', 'true');
    setEtapa('dados_pessoais');
  };

  // Alias for backward compat
  const avancarParaDadosPessoais = avancarParaCotacao;

  // Unified submit: saves personal data + vehicle + calculates quotation in one go
  const submeterCotacaoUnificada = async (pessoais: DadosPessoais, veiculo: DadosVeiculo): Promise<ResultadoCotacaoPublica | null> => {
    setDadosPessoais(pessoais);
    setDadosVeiculo(veiculo);
    setLoading(true);

    try {
      // Check if user is authenticated (RLS requires consultor_id = auth.uid() for authenticated users)
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      // Create/update lead
      const { data: consultores } = await supabase
        .from('profiles')
        .select('id, company_id')
        .limit(1) as { data: { id: string; company_id: string | null }[] | null };

      const defaultConsultorId = consultores?.[0]?.id;
      const companyId = consultores?.[0]?.company_id;
      const consultorId = currentUserId || defaultConsultorId;

      if (consultorId) {
        const telefoneNormalizado = pessoais.telefone.replace(/\D/g, '');
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('telefone', telefoneNormalizado)
          .limit(1)
          .maybeSingle() as { data: { id: string } | null };

        if (existingLead) {
          setLeadId(existingLead.id);
        } else {
          const { data: novoLead } = await supabase
            .from('leads')
            .insert({
              nome: pessoais.nome.trim(),
              telefone: telefoneNormalizado,
              email: pessoais.email.trim().toLowerCase(),
              consultor_id: consultorId,
              company_id: companyId,
              origem: 'site' as const,
              status: 'cotado' as const,
            })
            .select('id')
            .single();
          if (novoLead) setLeadId(novoLead.id);
        }
      }

      // Calculate quotation
      const resultado = calcularCotacao(veiculo);
      setCotacao(resultado);

      if (resultado) {
        localStorage.setItem('cotacao_publica', JSON.stringify({
          pessoais, veiculo, cotacao: resultado, timestamp: new Date().toISOString(),
        }));
      }

      return resultado;
    } catch (error) {
      console.error('Erro ao processar cotação unificada:', error);
      setCotacao(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const salvarDadosPessoais = async (dados: DadosPessoais) => {
    setDadosPessoais(dados);
    
    // Criar lead automaticamente no sistema
    try {
      // Buscar um consultor padrão (primeiro ativo) para associar o lead
      const { data: consultores } = await supabase
        .from('profiles')
        .select('id, company_id')
        .limit(1) as { data: { id: string; company_id: string | null }[] | null };

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
      case 'dados_veiculo':
      case 'resultado':
        setEtapa('hero');
        break;
      case 'cadastro':
        setEtapa('dados_pessoais'); // goes back to unified form
        break;
      case 'documentos':
        setEtapa('cadastro');
        break;
      default:
        setEtapa('hero');
    }
  };

  // Novo fluxo: resultado -> cadastro
  // Ao aceitar, persiste a cotação no banco e envia WhatsApp automaticamente
  const aceitarProposta = async () => {
    if (!dadosVeiculo || !cotacao) {
      setEtapa('cadastro');
      return;
    }

    try {
      // Check auth for RLS compliance
      const { data: { session: aceitarSession } } = await supabase.auth.getSession();
      const aceitarUserId = aceitarSession?.user?.id;

      const { data: consultores } = await supabase
        .from('profiles')
        .select('id, company_id')
        .limit(1) as { data: { id: string; company_id: string | null }[] | null };

      const defaultConsultorId2 = consultores?.[0]?.id;
      const companyId = consultores?.[0]?.company_id;
      const consultorId = aceitarUserId || defaultConsultorId2;

      if (consultorId) {
        // Criar cotação no banco com status 'aceita'
        const { data: novaCotacao, error: cotacaoError } = await supabase
          .from('cotacoes')
          .insert({
            tipo_bem: dadosVeiculo.tipo_bem as any,
            marca: dadosVeiculo.marca || '',
            modelo: dadosVeiculo.modelo || '',
            ano_fabricacao: dadosVeiculo.ano || new Date().getFullYear(),
            valor_bem: dadosVeiculo.valor_fipe || 0,
            valor_fipe: dadosVeiculo.valor_fipe || null,
            codigo_fipe: dadosVeiculo.codigo_fipe || null,
            consultor_id: consultorId,
            company_id: companyId,
            lead_id: leadId,
            cliente_nome: dadosPessoais.nome,
            cliente_email: dadosPessoais.email,
            cliente_whatsapp: dadosPessoais.telefone,
            mensalidade: cotacao.mensalidade,
            participacao: cotacao.participacao,
            status: 'aceita' as any,
            metodo_valoracao: 'fipe' as any,
          })
          .select('id')
          .single();

        if (cotacaoError) {
          console.error('[usePublicQuotation] Erro ao criar cotação:', cotacaoError);
        } else if (novaCotacao) {
          console.log('[usePublicQuotation] Cotação criada e aceita:', novaCotacao.id);
          
          // Criar link único de adesão/vistoria
          const { data: adesaoLink, error: adesaoError } = await supabase
            .from('adesao_links')
            .insert({
              cotacao_id: novaCotacao.id,
              company_id: companyId,
            })
            .select('token')
            .single();

          if (adesaoError) {
            console.error('[usePublicQuotation] Erro ao criar link de adesão:', adesaoError);
          } else if (adesaoLink) {
            console.log('[usePublicQuotation] Link de adesão criado:', adesaoLink.token);
            // Armazenar para uso no WhatsApp
            sessionStorage.setItem('adesao_link', `${window.location.origin}/adesao/${novaCotacao.id}/${adesaoLink.token}`);
          }

          // Atualizar lead com status convertido
          if (leadId) {
            await supabase
              .from('leads')
              .update({ status: 'convertido' as const })
              .eq('id', leadId);
          }
        }
      }

      // Enviar automaticamente via WhatsApp
      enviarPropostaWhatsApp();

    } catch (error) {
      console.error('[usePublicQuotation] Erro ao aceitar proposta:', error);
    }

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

  // Salvar documentos e finalizar adesão (sem taxa de adesão)
  const salvarDocumentos = async (docs: DocumentoUploadLanding[]) => {
    setDocumentos(docs);
    await finalizarAdesao();
  };

  // Finalizar adesão (sem cobrança de taxa)
  const finalizarAdesao = async () => {
    setLoading(true);

    try {
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

      toast.success('Adesão finalizada! Sua proteção está ativa.');
      sessionStorage.removeItem('in_quotation_funnel');
      setEtapa('sucesso');
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      toast.error('Erro ao finalizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  const reiniciar = () => {
    sessionStorage.removeItem('in_quotation_funnel');
    setEtapa('hero');
    setDadosPessoais({ nome: '', telefone: '', email: '' });
    setDadosVeiculo(null);
    setCotacao(null);
    setDadosCadastro(null);
    setDocumentos([]);
  };

  const enviarPropostaWhatsApp = async () => {
    if (!dadosPessoais.telefone || !cotacao) return;

    // Se ainda não criou cotação/adesão, cria agora
    let adesaoUrl = sessionStorage.getItem('adesao_link') || '';
    if (!adesaoUrl && dadosVeiculo && cotacao) {
      try {
        const { data: { session: whatsSession } } = await supabase.auth.getSession();
        const whatsUserId = whatsSession?.user?.id;

        const { data: consultores } = await supabase
          .from('profiles')
          .select('id, company_id')
          .limit(1) as { data: { id: string; company_id: string | null }[] | null };

        const defaultConsultorId3 = consultores?.[0]?.id;
        const companyId = consultores?.[0]?.company_id;
        const consultorId = whatsUserId || defaultConsultorId3;

        if (consultorId) {
          const { data: novaCotacao } = await supabase
            .from('cotacoes')
            .insert({
              tipo_bem: dadosVeiculo.tipo_bem as any,
              marca: dadosVeiculo.marca || '',
              modelo: dadosVeiculo.modelo || '',
              ano_fabricacao: dadosVeiculo.ano || new Date().getFullYear(),
              valor_bem: dadosVeiculo.valor_fipe || 0,
              valor_fipe: dadosVeiculo.valor_fipe || null,
              codigo_fipe: dadosVeiculo.codigo_fipe || null,
              consultor_id: consultorId,
              company_id: companyId,
              lead_id: leadId,
              cliente_nome: dadosPessoais.nome,
              cliente_email: dadosPessoais.email,
              cliente_whatsapp: dadosPessoais.telefone,
              mensalidade: cotacao.mensalidade,
              participacao: cotacao.participacao,
              status: 'enviada' as any,
              metodo_valoracao: 'fipe' as any,
            })
            .select('id')
            .single();

          if (novaCotacao) {
            const { data: adesaoLink } = await supabase
              .from('adesao_links')
              .insert({
                cotacao_id: novaCotacao.id,
                company_id: companyId,
              })
              .select('token')
              .single();

            if (adesaoLink) {
              adesaoUrl = `${window.location.origin}/adesao/${novaCotacao.id}/${adesaoLink.token}`;
              sessionStorage.setItem('adesao_link', adesaoUrl);
            }
          }
        }
      } catch (error) {
        console.error('[usePublicQuotation] Erro ao criar cotação para WhatsApp:', error);
      }
    }
    
    const telefone = dadosPessoais.telefone.replace(/\D/g, '');
    const telefoneFormatado = telefone.startsWith('55') ? telefone : `55${telefone}`;
    
    const mensagem = encodeURIComponent(
      `Olá ${dadosPessoais.nome}! 🚗\n\n` +
      `Sua cotação de proteção veicular:\n\n` +
      `🔹 Veículo: ${dadosVeiculo?.marca} ${dadosVeiculo?.modelo}\n` +
      `🔹 Valor FIPE: R$ ${cotacao.valorFipe.toLocaleString('pt-BR')}\n` +
      `🔹 Mensalidade: R$ ${cotacao.mensalidade.toFixed(2)}\n` +
      `🔹 Participação: R$ ${cotacao.participacao.toFixed(2)}\n` +
      `🔹 Adesão: GRÁTIS ✅\n\n` +
      `✅ Benefícios inclusos:\n` +
      cotacao.beneficios.map(b => `• ${b}`).join('\n') +
      (adesaoUrl ? `\n\n📋 Conclua sua adesão pelo link:\n${adesaoUrl}` : '') +
      `\n\nPara contratar, continue pelo site ou responda esta mensagem!`
    );
    
    const url = `https://wa.me/${telefoneFormatado}?text=${mensagem}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return {
    etapa,
    setEtapa,
    dadosPessoais,
    setDadosPessoais,
    dadosVeiculo,
    cotacao,
    dadosCadastro,
    documentos,
    loading,
    
    // Actions
    avancarParaDadosPessoais,
    avancarParaCotacao,
    salvarDadosPessoais,
    salvarDadosVeiculo,
    submeterCotacaoUnificada,
    voltarEtapa,
    aceitarProposta,
    criarConta,
    salvarDocumentos,
    reiniciar,
    enviarPropostaWhatsApp,
  };
}
