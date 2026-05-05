import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const contactInfo = [
  {
    icon: Mail,
    title: 'E-mail',
    content: 'contato@harmonyagro.com.br',
    description: 'Envie sua mensagem',
  },
  {
    icon: Clock,
    title: 'Horário',
    content: 'Seg a Sex: 8h às 18h',
    description: 'Atendimento comercial',
  },
];

export function ContatoSection() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    mensagem: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simular envio
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    setFormData({ nome: '', email: '', telefone: '', mensagem: '' });
    setLoading(false);
  };

  return (
    <section id="contato" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-4">
            Contato
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Fale <span className="text-primary">conosco</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Estamos prontos para tirar suas dúvidas e ajudar você a proteger seu veículo.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h3 className="text-2xl font-semibold mb-6">Informações de Contato</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {contactInfo.map((info, index) => (
                <div
                  key={index}
                  className="bg-muted/50 border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <info.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{info.title}</p>
                      <p className="font-semibold">{info.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Map placeholder */}
            <div className="bg-muted/50 border border-border/50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Atendimento 100% Digital</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nossa operação é totalmente online para sua comodidade. 
                    Faça tudo pelo site ou aplicativo, sem precisar sair de casa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card border border-border/50 rounded-2xl p-8">
            <h3 className="text-2xl font-semibold mb-6">Envie uma Mensagem</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome completo</label>
                <Input
                  placeholder="Seu nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">E-mail</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Telefone</label>
                  <Input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Mensagem</label>
                <Textarea
                  placeholder="Como podemos ajudar você?"
                  rows={4}
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Mensagem
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
