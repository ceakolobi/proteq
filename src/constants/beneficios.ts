export interface CategoriaBeneficio {
  emoji: string;
  titulo: string;
  itens: string[];
}

export const CATEGORIAS_BENEFICIOS: CategoriaBeneficio[] = [
  {
    emoji: '🛡️',
    titulo: 'Proteção Completa',
    itens: [
      'Colisão',
      'Roubo e furto',
      'Incêndio (somente em caso de acidente)',
      'Perda total',
      'Fenômenos da natureza (enchente, granizo, vendaval)',
    ],
  },
  {
    emoji: '🚨',
    titulo: 'Assistência 24 Horas',
    itens: [
      'Guincho/reboque - 500km (250 ida e 250 volta)',
      'Chaveiro (Máximo de R$ 120,00)',
      'Troca de pneus',
      'Pane elétrica',
      'Pane mecânica',
      'Recarga de bateria',
      'Falta de combustível',
      'Carro reserva de 15 dias',
    ],
  },
  {
    emoji: '🚕',
    titulo: 'Benefícios para Motoristas de Aplicativo e Profissionais',
    itens: [
      'Cobertura para uso profissional',
      'Auxílio por perda de renda (lucros cessantes)',
      'Veículo reserva (quando disponível no regulamento)',
    ],
  },
  {
    emoji: '👨‍👩‍👧',
    titulo: 'Tranquilidade para a Família',
    itens: [
      'Atendimento humanizado',
      'Suporte em situações de emergência',
      'Rede credenciada de oficinas',
    ],
  },
  {
    emoji: '💰',
    titulo: 'Economia',
    itens: [
      'Sem análise de perfil',
      'Sem consulta ao SPC/Serasa',
      'Mensalidades acessíveis',
      'Melhor custo-benefício para muitos veículos',
    ],
  },
  {
    emoji: '📱',
    titulo: 'Tecnologia e Facilidade',
    itens: [
      'Aplicativo do associado',
      'Acompanhamento de ocorrências',
      'Segunda via de boletos',
      'Solicitação de assistência pelo celular',
    ],
  },
  {
    emoji: '🤝',
    titulo: 'Benefícios Exclusivos',
    itens: [
      'Clube de vantagens',
      'Descontos em parceiros',
      'Descontos em pneus, oficinas e serviços automotivos',
      'Campanhas promocionais e sorteios',
    ],
  },
];

export const BENEFICIOS_WHATSAPP =
  `*Benefícios da Harmony Clube*\n\n` +
  CATEGORIAS_BENEFICIOS.map(
    (cat) => `${cat.emoji} *${cat.titulo}*\n${cat.itens.map((i) => `- ${i}`).join('\n')}`,
  ).join('\n\n');
