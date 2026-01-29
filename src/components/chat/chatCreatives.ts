// Catálogo de criativos da Sofia
// Estes são os materiais que a Sofia pode enviar aos clientes

export interface Creative {
  id: string;
  type: 'image' | 'video' | 'pdf';
  category: 'beneficio' | 'banner' | 'proposta' | 'video' | 'institucional';
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  keywords: string[]; // palavras-chave para a Sofia encontrar
}

// URL base do storage público
const PUBLIC_URL = 'https://sbtfhtllzpurjprivqoi.supabase.co/storage/v1/object/public';

// Criativos disponíveis
// NOTA: Adicione as URLs reais dos criativos aqui quando estiverem no storage
export const CHAT_CREATIVES: Creative[] = [
  // Benefícios
  {
    id: 'beneficio-guincho',
    type: 'image',
    category: 'beneficio',
    title: 'Guincho 500km',
    description: 'Cobertura de guincho incluindo 250km de ida e 250km de volta',
    url: '/images/criativos/beneficio-guincho.jpg',
    keywords: ['guincho', 'reboque', 'socorro', 'pane', 'quebrou', 'km', 'quilometro'],
  },
  {
    id: 'beneficio-carro-reserva',
    type: 'image',
    category: 'beneficio',
    title: 'Carro Reserva 30 Dias',
    description: 'Veículo reserva por até 30 dias em caso de sinistro',
    url: '/images/criativos/beneficio-carro-reserva.jpg',
    keywords: ['carro reserva', 'veiculo reserva', 'substituto', 'emprestado', 'sinistro'],
  },
  {
    id: 'beneficio-vidros',
    type: 'image',
    category: 'beneficio',
    title: 'Proteção de Vidros',
    description: 'Cobertura completa de para-brisa, vidros laterais e traseiro',
    url: '/images/criativos/beneficio-vidros.jpg',
    keywords: ['vidro', 'para-brisa', 'parabrisa', 'quebrado', 'trincado', 'pedra'],
  },
  {
    id: 'beneficio-assistencia',
    type: 'image',
    category: 'beneficio',
    title: 'Assistência 24h',
    description: 'Suporte completo 24 horas por dia, 7 dias por semana',
    url: '/images/criativos/beneficio-assistencia.jpg',
    keywords: ['assistencia', '24h', '24 horas', 'suporte', 'ajuda', 'socorro'],
  },
  {
    id: 'beneficio-roubo',
    type: 'image',
    category: 'beneficio',
    title: 'Proteção contra Roubo',
    description: 'Cobertura imediata sem carência para roubo e furto',
    url: '/images/criativos/beneficio-roubo.jpg',
    keywords: ['roubo', 'furto', 'roubado', 'furtado', 'sem carencia'],
  },
  {
    id: 'beneficio-colisao',
    type: 'image',
    category: 'beneficio',
    title: 'Proteção Colisão',
    description: 'Cobertura para acidentes e colisões',
    url: '/images/criativos/beneficio-colisao.jpg',
    keywords: ['colisao', 'batida', 'acidente', 'bateu', 'colidiu'],
  },

  // Banners Promocionais
  {
    id: 'banner-promocional-1',
    type: 'image',
    category: 'banner',
    title: 'Promoção do Mês',
    description: 'Arte promocional com condições especiais',
    url: '/images/criativos/banner-promo.jpg',
    keywords: ['promocao', 'desconto', 'oferta', 'especial', 'mes'],
  },
  {
    id: 'banner-familia',
    type: 'image',
    category: 'banner',
    title: 'Proteja sua Família',
    description: 'Banner sobre proteção familiar',
    url: '/images/criativos/banner-familia.jpg',
    keywords: ['familia', 'proteger', 'seguranca', 'filhos', 'esposa'],
  },

  // Vídeos
  {
    id: 'video-explicativo',
    type: 'video',
    category: 'video',
    title: 'Como Funciona a Proteção Veicular',
    description: 'Vídeo explicando o sistema de rateio e benefícios',
    url: 'https://www.youtube.com/watch?v=example1',
    keywords: ['video', 'explicar', 'como funciona', 'entender', 'rateio'],
  },
  {
    id: 'video-depoimento',
    type: 'video',
    category: 'video',
    title: 'Depoimentos de Associados',
    description: 'Clientes contando suas experiências com a Harmony',
    url: 'https://www.youtube.com/watch?v=example2',
    keywords: ['depoimento', 'cliente', 'experiencia', 'associado', 'satisfeito'],
  },

  // PDFs / Propostas
  {
    id: 'pdf-tabela-precos',
    type: 'pdf',
    category: 'proposta',
    title: 'Tabela de Preços',
    description: 'Tabela completa com valores por faixa FIPE',
    url: '/templates/tabela-precos.pdf',
    keywords: ['tabela', 'preco', 'valor', 'quanto custa', 'mensalidade'],
  },
  {
    id: 'pdf-coberturas',
    type: 'pdf',
    category: 'proposta',
    title: 'Detalhamento de Coberturas',
    description: 'Documento completo com todas as coberturas oferecidas',
    url: '/templates/coberturas.pdf',
    keywords: ['cobertura', 'detalhe', 'inclui', 'incluso', 'beneficio'],
  },

  // Institucional
  {
    id: 'institucional-quem-somos',
    type: 'image',
    category: 'institucional',
    title: 'Quem Somos',
    description: 'Apresentação institucional da Harmony',
    url: '/images/criativos/institucional.jpg',
    keywords: ['quem somos', 'harmony', 'empresa', 'historia', 'sobre'],
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
