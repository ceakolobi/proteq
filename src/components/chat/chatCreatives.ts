// Catálogo de criativos da Sofia
// Estes são os materiais que a Sofia pode enviar aos clientes

export interface Creative {
  id: string;
  type: 'image' | 'video' | 'pdf';
  category: 'beneficio' | 'banner' | 'proposta' | 'video' | 'institucional' | 'educativo';
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  keywords: string[]; // palavras-chave para a Sofia encontrar
}

// Criativos disponíveis
export const CHAT_CREATIVES: Creative[] = [
  // Banners de Urgência/Colisão
  {
    id: 'banner-colisao',
    type: 'image',
    category: 'banner',
    title: 'Proteção é Agora',
    description: 'Não espere o pior acontecer - proteja seu veículo hoje',
    url: '/images/criativos/banner-colisao.png',
    keywords: ['colisao', 'batida', 'acidente', 'bateu', 'colidiu', 'urgente', 'agora', 'proteger'],
  },
  {
    id: 'banner-plano-confiavel',
    type: 'image',
    category: 'banner',
    title: 'Proteja Antes que Seja Tarde',
    description: 'Conte com a tranquilidade de quem tem um plano confiável',
    url: '/images/criativos/banner-plano-confiavel.png',
    keywords: ['plano', 'confiavel', 'tranquilidade', 'seguranca', 'proteger', 'tarde'],
  },

  // Conteúdo Educativo
  {
    id: 'transferencia-veiculo',
    type: 'image',
    category: 'educativo',
    title: 'Transferência de Proteção',
    description: 'Posso transferir a proteção para outro veículo? Entenda como funciona a troca de carro',
    url: '/images/criativos/transferencia-veiculo.png',
    keywords: ['transferir', 'transferencia', 'trocar', 'troca', 'outro carro', 'novo veiculo', 'mudar'],
  },
  {
    id: 'carro-vulneravel',
    type: 'image',
    category: 'educativo',
    title: 'Seu Carro Está Vulnerável?',
    description: 'Descubra por que vale a pena se proteger agora',
    url: '/images/criativos/carro-vulneravel.png',
    keywords: ['vulneravel', 'desprotegido', 'sem protecao', 'risco', 'perigo'],
  },
  {
    id: 'protecao-crescendo',
    type: 'image',
    category: 'educativo',
    title: 'Por que a Proteção Veicular Cresce?',
    description: 'Veja o que está por trás da confiança no modelo de rateio',
    url: '/images/criativos/protecao-crescendo.png',
    keywords: ['crescendo', 'cresce', 'popular', 'confianca', 'modelo', 'rateio', 'por que'],
  },
  {
    id: 'diferenca-seguro',
    type: 'image',
    category: 'educativo',
    title: 'Proteção vs Seguro Tradicional',
    description: 'Qual a diferença entre proteção veicular e seguro tradicional? Entenda os dois modelos',
    url: '/images/criativos/diferenca-seguro.png',
    keywords: ['diferenca', 'seguro', 'tradicional', 'comparar', 'melhor', 'versus', 'vs'],
  },

  // Benefícios
  {
    id: 'vantagens-assistencia',
    type: 'image',
    category: 'beneficio',
    title: 'Assistência Veicular Completa',
    description: 'Vantagens de ter assistência veicular completa - tenha mais tranquilidade no dia a dia',
    url: '/images/criativos/vantagens-assistencia.png',
    keywords: ['assistencia', 'vantagens', 'completa', '24h', 'socorro', 'ajuda', 'tranquilidade'],
  },
  {
    id: 'ajuda-estrada',
    type: 'image',
    category: 'beneficio',
    title: 'Ajuda na Estrada',
    description: 'Precisa de ajuda na estrada? A gente resolve! Entenda como funciona o atendimento fora da cidade',
    url: '/images/criativos/ajuda-estrada.png',
    keywords: ['estrada', 'viagem', 'rodovia', 'fora', 'cidade', 'socorro', 'ajuda', 'pane'],
  },
  {
    id: 'eventos-natureza',
    type: 'image',
    category: 'beneficio',
    title: 'Proteção Contra Eventos da Natureza',
    description: 'Seu carro protegido contra enchentes e granizo',
    url: '/images/criativos/eventos-natureza.png',
    keywords: ['enchente', 'granizo', 'natureza', 'chuva', 'temporal', 'alagamento', 'clima'],
  },
  {
    id: 'protecao-furto',
    type: 'image',
    category: 'beneficio',
    title: 'Proteção em Caso de Furto',
    description: 'Como é feita a proteção em caso de furto? Saiba o que fazer se seu veículo desaparecer',
    url: '/images/criativos/protecao-furto.png',
    keywords: ['furto', 'roubo', 'roubado', 'furtado', 'ladrão', 'sumiu', 'desapareceu'],
  },
];

// Função para encontrar criativos por palavras-chave
export function findCreativesByKeywords(query: string): Creative[] {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);
  
  return CHAT_CREATIVES.filter(creative => {
    // Verifica se alguma keyword do criativo está presente na query
    return creative.keywords.some(keyword => 
      words.some(word => keyword.includes(word) || word.includes(keyword))
    );
  });
}

// Função para buscar criativo por categoria
export function getCreativesByCategory(category: Creative['category']): Creative[] {
  return CHAT_CREATIVES.filter(c => c.category === category);
}

// Função para buscar criativo por ID
export function getCreativeById(id: string): Creative | undefined {
  return CHAT_CREATIVES.find(c => c.id === id);
}

// Função para gerar a tag de mídia para inserir na resposta
export function generateMediaTag(creative: Creative): string {
  return `[MEDIA:${creative.type}|${creative.url}|${creative.title}|${creative.description}]`;
}
