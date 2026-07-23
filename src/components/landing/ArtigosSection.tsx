import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Artigos estáticos - em produção, viriam de um CMS ou API
const artigos = [
  {
    id: 1,
    titulo: 'Como funciona a proteção veicular e por que ela é diferente do modelo tradicional de mercado',
    resumo: 'Entenda as principais diferenças entre a proteção veicular e o modelo tradicional de mercado, e descubra qual opção é melhor para você.',
    categoria: 'Educativo',
    dataPublicacao: '2026-01-28',
    tempoLeitura: '5 min',
    imagem: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop',
  },
  {
    id: 2,
    titulo: '10 dicas para evitar o roubo do seu veículo',
    resumo: 'Confira medidas simples e eficazes que podem reduzir significativamente o risco de ter seu carro roubado.',
    categoria: 'Segurança',
    dataPublicacao: '2026-01-27',
    tempoLeitura: '7 min',
    imagem: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop',
  },
  {
    id: 3,
    titulo: 'O que fazer em caso de acidente de trânsito: guia completo',
    resumo: 'Um passo a passo de como agir corretamente em caso de acidente, desde a sinalização até a documentação necessária.',
    categoria: 'Guia Prático',
    dataPublicacao: '2026-01-26',
    tempoLeitura: '8 min',
    imagem: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=600&h=400&fit=crop',
  },
];

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ArtigosSection() {
  return (
    <section id="artigos" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-4">
              Blog & Artigos
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
              Fique por <span className="text-primary">dentro</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Dicas, novidades e informações importantes sobre proteção veicular e segurança no trânsito.
            </p>
          </div>
          <Button variant="outline" className="self-start md:self-auto gap-2">
            Ver todos os artigos
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artigos.map((artigo) => (
            <article
              key={artigo.id}
              className="group bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={artigo.imagem}
                  alt={artigo.titulo}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    {artigo.categoria}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(artigo.dataPublicacao)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {artigo.tempoLeitura}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {artigo.titulo}
                </h3>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {artigo.resumo}
                </p>

                <button className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all">
                  Ler mais
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
