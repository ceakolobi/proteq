import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DadosPessoais, DadosVeiculo, ResultadoCotacaoPublica, EtapaFunil } from '@/components/landing/types';
import { calcularCotacaoCompleta, getCategoriaByTipoVeiculo } from '@/lib/cotacaoUtils';
import type { Cota } from '@/lib/cotacaoUtils';
import type { VehicleType } from '@/types/database';

interface ConfiguracaoFinanceira {
  chave_pix: string | null;
  tipo_chave_pix: string | null;
}

export function usePublicQuotation() {
  const [etapa, setEtapa] = useState<EtapaFunil>('hero');
  const [dadosPessoais, setDadosPessoais] = useState<DadosPessoais>({ nome: '', telefone: '', email: '' });
  const [dadosVeiculo, setDadosVeiculo] = useState<DadosVeiculo | null>(null);
  const [cotacao, setCotacao] = useState<ResultadoCotacaoPublica | null>(null);
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [configFinanceira, setConfigFinanceira] = useState<ConfiguracaoFinanceira | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [cotacaoId, setCotacaoId] = useState<string | null>(null);

  // Carregar cotas públicas (ativas)
  useEffect(() => {
    const fetchCotas = async () => {
      const { data } = await supabase
        .from('cotas')
        .select('*')
        .eq('ativo', true);
      
      if (data) {
        setCotas(data as unknown as Cota[]);
      }
    };

    const fetchConfig = async () => {
      // Buscar configuração financeira da empresa padrão
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
    if (!veiculo.valor_fipe || cotas.length === 0) return null;

    const resultado = calcularCotacaoCompleta(
      veiculo.valor_fipe,
      veiculo.tipo_bem as VehicleType,
      cotas
    );

    if (!resultado) return null;

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

  const avancarParaDadosPessoais = () => {
    setEtapa('dados_pessoais');
  };

  const salvarDadosPessoais = (dados: DadosPessoais) => {
    setDadosPessoais(dados);
    setEtapa('dados_veiculo');
  };

  const salvarDadosVeiculo = async (veiculo: DadosVeiculo) => {
    setDadosVeiculo(veiculo);
    setLoading(true);

    try {
      // Calcular cotação
      const resultadoCotacao = calcularCotacao(veiculo);
      setCotacao(resultadoCotacao);

      // Para landing pública, armazenamos os dados localmente
      // O lead será criado apenas se o usuário decidir continuar com o cadastro
      // Isso evita problemas com RLS e consultor_id obrigatório
      
      // Salvar no localStorage para persistência entre etapas
      localStorage.setItem('cotacao_publica', JSON.stringify({
        pessoais: dadosPessoais,
        veiculo,
        cotacao: resultadoCotacao,
        timestamp: new Date().toISOString(),
      }));

      setEtapa('resultado');
    } catch (error) {
      console.error('Erro ao processar cotação:', error);
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
      case 'pagamento':
        setEtapa('resultado');
        break;
      default:
        setEtapa('hero');
    }
  };

  const avancarParaPagamento = () => {
    setEtapa('pagamento');
  };

  const confirmarPagamento = () => {
    setEtapa('contrato');
  };

  const finalizarCadastro = () => {
    setEtapa('finalizado');
  };

  const reiniciar = () => {
    setEtapa('hero');
    setDadosPessoais({ nome: '', telefone: '', email: '' });
    setDadosVeiculo(null);
    setCotacao(null);
    setLeadId(null);
    setCotacaoId(null);
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
      `\n\nPara contratar, continue pelo site ou responda esta mensagem!`
    );
    
    const url = `https://api.whatsapp.com/send?phone=${telefoneFormatado}&text=${mensagem}`;
    window.open(url, '_blank');
  };

  return {
    etapa,
    dadosPessoais,
    dadosVeiculo,
    cotacao,
    configFinanceira,
    loading,
    leadId,
    
    // Actions
    avancarParaDadosPessoais,
    salvarDadosPessoais,
    salvarDadosVeiculo,
    voltarEtapa,
    avancarParaPagamento,
    confirmarPagamento,
    finalizarCadastro,
    reiniciar,
    enviarPropostaWhatsApp,
  };
}
