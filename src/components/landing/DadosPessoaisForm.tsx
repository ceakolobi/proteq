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
  const [errors, setErrors] = useState<Partial<DadosPessoais>>({});

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
    const newErrors: Partial<DadosPessoais> = {};
    
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
    if (validate()) {
      onSubmit(dados);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-16 px-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Seus dados</CardTitle>
          <CardDescription>Preencha suas informações para continuar</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  placeholder="Digite seu nome"
                  value={dados.nome}
                  onChange={(e) => setDados(prev => ({ ...prev, nome: e.target.value }))}
                  className={`pl-10 ${errors.nome ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone / WhatsApp</Label>
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

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
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

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button type="submit" className="flex-1">
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
