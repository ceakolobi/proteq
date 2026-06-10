import { forwardRef } from 'react';
import logoHarmony from '@/assets/logo-harmony-colorida.png';
import { useBeneficiosExtrasAtivos } from '@/hooks/useBeneficiosExtras';
import type { DadosPessoais, DadosVeiculo, ResultadoCotacaoPublica } from './types';

interface Props {
  dadosPessoais: DadosPessoais;
  dadosVeiculo: DadosVeiculo;
  cotacao: ResultadoCotacaoPublica;
  beneficiosSelecionadosIds?: string[];
  valorAdesao?: number;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const beneficiosInclusos = [
  { titulo: 'Proteção Total', descricao: 'Roubo e furto' },
  { titulo: 'Assistência 24h', descricao: 'Suporte integral' },
  { titulo: 'Rastreamento', descricao: 'Tempo real' },
  { titulo: '100% FIPE', descricao: 'Indenização total' },
  { titulo: 'Guincho', descricao: '500 km (250 ida e volta)' },
  { titulo: 'Carro Reserva', descricao: '30 dias inclusos' },
  { titulo: 'Chaveiro 24h', descricao: 'Gratuito' },
  { titulo: 'Pane Elétrica', descricao: 'Assistência inclusa' },
];

export const PropostaPDFView = forwardRef<HTMLDivElement, Props>(function PropostaPDFView(
  { dadosPessoais, dadosVeiculo, cotacao, beneficiosSelecionadosIds = [], valorAdesao = 0 },
  ref,
) {
  const { data: beneficiosExtras = [] } = useBeneficiosExtrasAtivos(dadosVeiculo.tipo_bem);
  const extrasSelecionados = beneficiosExtras.filter((b) =>
    beneficiosSelecionadosIds.includes(b.id),
  );

  const dataAtual = new Date().toLocaleDateString('pt-BR');

  const text = { primary: '#111827', secondary: '#6b7280', brand: '#f97316' };
  const border = '1px solid #e5e7eb';

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: '794px',
        background: '#ffffff',
        color: text.primary,
        fontFamily: 'Arial, sans-serif',
        padding: '32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: `2px solid ${text.brand}` }}>
        <img src={logoHarmony} alt="Harmony" style={{ height: '56px', objectFit: 'contain' }} />
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: text.primary }}>
          Sua cotação está pronta!
        </h1>
        <p style={{ fontSize: '13px', color: text.secondary, marginTop: '6px' }}>
          Olá <strong style={{ color: text.primary }}>{dadosPessoais.nome.split(' ')[0]}</strong>, confira os
          valores da sua proteção
        </p>
      </div>

      {/* Vehicle + benefits */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {/* Vehicle card */}
        <div
          style={{
            width: '38%',
            border,
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div style={{ background: text.brand, color: '#fff', padding: '16px' }}>
            <p style={{ margin: 0, fontSize: '11px', opacity: 0.85 }}>Veículo</p>
            <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 'bold' }}>
              {dadosVeiculo.marca} {dadosVeiculo.modelo}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.85 }}>Ano {dadosVeiculo.ano}</p>
          </div>
          <div style={{ padding: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: border,
                fontSize: '12px',
              }}
            >
              <span style={{ color: text.secondary }}>Valor FIPE</span>
              <strong>{formatBRL(cotacao.valorFipe)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: border,
                fontSize: '12px',
              }}
            >
              <span style={{ color: text.secondary }}>Participação</span>
              <strong>{formatBRL(cotacao.participacao)}</strong>
            </div>
            <div style={{ marginTop: '12px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: text.secondary }}>Mensalidade</p>
              <p style={{ margin: '2px 0 0', fontSize: '26px', fontWeight: 'bold', color: text.brand }}>
                {formatBRL(cotacao.mensalidade)}
              </p>
              <p style={{ margin: 0, fontSize: '10px', color: text.secondary }}>por mês</p>
            </div>
            {valorAdesao > 0 && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px',
                  background: '#fff7ed',
                  border: `1px solid ${text.brand}33`,
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>Taxa de Adesão</p>
                  <p style={{ margin: 0, fontSize: '10px', color: text.secondary }}>Pagamento único</p>
                </div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: text.brand }}>{formatBRL(valorAdesao)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Benefits grid */}
        <div style={{ flex: 1, border, borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px', color: text.primary }}>
            Benefícios Inclusos
          </h2>
          <p style={{ fontSize: '11px', color: text.secondary, margin: '0 0 12px' }}>
            Tudo o que você precisa para proteger seu veículo
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {beneficiosInclusos.map((b, i) => (
              <div
                key={i}
                style={{
                  border,
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: text.brand, fontWeight: 'bold' }}>✔</span>
                  <strong>{b.titulo}</strong>
                </div>
                <p style={{ margin: '2px 0 0 18px', fontSize: '11px', color: text.secondary }}>
                  {b.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected extras */}
      {extrasSelecionados.length > 0 && (
        <div style={{ border, borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px', color: text.brand }}>
            Benefícios Extras Adicionados
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {extrasSelecionados.map((b) => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderBottom: border,
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: text.brand, fontWeight: 'bold' }}>✔</span>
                  <div>
                    <strong>{b.nome}</strong>
                    {b.descricao && (
                      <p style={{ margin: 0, fontSize: '11px', color: text.secondary }}>{b.descricao}</p>
                    )}
                  </div>
                </div>
                <strong style={{ color: text.brand }}>+ {formatBRL(Number(b.valor_mensal))}/mês</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: '32px',
          paddingTop: '16px',
          borderTop: border,
          textAlign: 'center',
          fontSize: '11px',
          color: text.secondary,
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: text.primary }}>Harmony Agro</p>
        <p style={{ margin: 0 }}>contato@harmonyagro.com.br · WhatsApp (xx) xxxx-xxxx</p>
        <p style={{ margin: '4px 0 0' }}>
          Proposta válida por 7 dias | Gerado em {dataAtual}
        </p>
      </div>
    </div>
  );
});
