import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, User, Phone, Mail } from 'lucide-react';
import type { DadosPessoais } from './types';

interface DadosPessoaisFormProps {
  initialData: DadosPessoais;
  onSubmit: (data: DadosPessoais) => void;
  onBack: () => void;
}

export function DadosPessoaisForm({ initialData, onSubmit, onBack }: DadosPessoaisFormProps) {
  const [dados, setDados] = useState<DadosPessoais>(initialData);
  const [errors, setErrors] = useState<Partial<Record<'nome' | 'telefone' | 'email', string>>>({});
  const [consentido, setConsentido] = useState<boolean>(initialData.consentimentoLgpd ?? false);

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value);
    setDados(prev => ({ ...prev, telefone: formatted }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<'nome' | 'telefone' | 'email', string>> = {};

    if (!dados.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    const telefoneNumbers = dados.telefone.replace(/\D/g, '');
    if (!telefoneNumbers || telefoneNumbers.length < 10) {
      newErrors.telefone = 'Telefone inválido';
    }
    
    if (!dados.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
      newErrors.email = 'E-mail inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentido) return;
    if (validate()) {
      onSubmit({ ...dados, consentimentoLgpd: consentido });
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Seus Dados</h1>
          <p className="text-muted-foreground">Preencha suas informações para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ETAPA 1: Dados Pessoais */}
          <Card className="border-2 border-primary/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                Informações de Contato
              </CardTitle>
              <CardDescription>
                Precisamos dessas informações para entrar em contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nome"
                    placeholder="Digite seu nome completo"
                    value={dados.nome}
                    onChange={(e) => setDados(prev => ({ ...prev, nome: e.target.value }))}
                    className={`pl-10 ${errors.nome ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone / WhatsApp *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telefone"
                    placeholder="(00) 00000-0000"
                    value={dados.telefone}
                    onChange={handleTelefoneChange}
                    maxLength={15}
                    className={`pl-10 ${errors.telefone ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.telefone && <p className="text-sm text-destructive">{errors.telefone}</p>}
              </div>

              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={dados.email}
                    onChange={(e) => setDados(prev => ({ ...prev, email: e.target.value }))}
                    className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Consentimento LGPD */}
          <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={consentido}
              onChange={(e) => setConsentido(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              Li e concordo com a{' '}
              <a
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                Política de Privacidade
              </a>{' '}
              e autorizo o contato da Harmony sobre esta cotação.
            </span>
          </label>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button type="submit" className="flex-1" disabled={!consentido}>
              Salvar e Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
