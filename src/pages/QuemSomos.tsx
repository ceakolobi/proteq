import { Target, Eye, Heart, Users, Shield, Award, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LandingNavbar, LandingFooter } from '@/components/landing';
import { ChatWidget } from '@/components/chat/ChatWidget';

export default function QuemSomos() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium mb-8">
            <Users className="h-4 w-4" />
            Quem Somos
          </div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-8 leading-tight">
            Referência em Proteção Veicular<br />
            <span className="text-primary">no Brasil</span>
          </h1>
          
          {/* Main Text */}
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              A <strong className="text-foreground">Associação Harmony Clube de Benefícios</strong> (CNPJ 39.583.767/0001-26) foi planejada em 2019 
              e fundada em 2020 com o objetivo de proporcionar a proteção dos veículos de seus associados 
              por um custo mais acessível, através do sistema de cooperativismo.
            </p>
            
            <p>
              O cooperativismo enaltece a colaboração e associação de pessoas com os mesmos interesses, tendo 
              como base a colaboração recíproca de seus associados com a finalidade de prestação de assistência — no 
              nosso caso, proteção veicular — resguardando-os quanto a danos em seus veículos causados por colisão, 
              incêndio, roubo ou furto, além de assistência 24 horas em todo o território nacional. Tudo isso a um 
              excelente custo-benefício.
            </p>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Nossa Missão */}
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Nossa Missão</h3>
              <p className="text-muted-foreground leading-relaxed">
                Garantir a tranquilidade dos associados através de serviços de qualidade, proporcionando segurança e 
                conforto. E, ademais, nos comprometendo com a satisfação de todos os envolvidos.
              </p>
            </div>

            {/* Nossa Visão */}
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-secondary/20 flex items-center justify-center">
                <Eye className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Nossa Visão</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ser referência em proteção veicular no Brasil com o reconhecimento pela excelência dos serviços prestados 
                aos associados e colaboradores, garantindo tranquilidade a um número cada vez maior de pessoas.
              </p>
            </div>

            {/* Nossos Valores */}
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <Heart className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Nossos Valores</h3>
              <p className="text-muted-foreground leading-relaxed">
                Respeito, ética, compromisso, qualidade, dedicação, tranquilidade ao associado, e a busca constante 
                pela excelência em tudo que fazemos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            Por que escolher a Harmony?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'Proteção Completa',
                description: 'Cobertura para colisão, roubo, furto, incêndio e eventos da natureza.'
              },
              {
                icon: Users,
                title: 'Sistema Cooperativo',
                description: 'Modelo de colaboração mútua que reduz custos para todos os associados.'
              },
              {
                icon: Award,
                title: 'Assistência 24h',
                description: 'Guincho e socorro mecânico disponíveis em todo território nacional.'
              },
            ].map((item, index) => (
              <div key={index} className="flex gap-4 p-6 bg-card rounded-xl border border-border">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Faça parte da nossa família
          </h2>
          <p className="text-muted-foreground mb-8">
            Junte-se a milhares de associados que já confiam na Harmony para proteger seus veículos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/#cotacao">
              <Button size="lg" className="w-full sm:w-auto">
                Fazer Cotação Grátis
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Início
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
      <ChatWidget />
    </div>
  );
}
