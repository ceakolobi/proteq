import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, User, Lock, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface DadosCadastro {
  cpf: string;
  dataNascimento: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  diaVencimento: number;
  senha: string;
  confirmarSenha: string;
}

interface CadastroContaFormProps {
  dadosPessoais: { nome: string; telefone: string; email: string };
  onSubmit: (dados: DadosCadastro) => void;
  onBack: () => void;
  loading?: boolean;
}

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const DIAS_VENCIMENTO = [5, 10, 15, 20, 25, 30];

export function CadastroContaForm({ dadosPessoais, onSubmit, onBack, loading }: CadastroContaFormProps) {
  const [dados, setDados] = useState<DadosCadastro>({
    cpf: '',
    dataNascimento: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    diaVencimento: 10,
    senha: '',
    confirmarSenha: '',
  });
  const [buscandoCep, setBuscandoCep] = useState(false);

  const formatarCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatarCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
  };

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setDados(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cpfLimpo = dados.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      toast.error('CPF inválido');
      return;
    }
    
    if (!dados.dataNascimento) {
      toast.error('Data de nascimento é obrigatória');
      return;
    }
    
    if (!dados.cep || !dados.cidade || !dados.estado) {
      toast.error('Endereço incompleto');
      return;
    }
    
    if (dados.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (dados.senha !== dados.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    onSubmit(dados);
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 py-16 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Crie sua conta</h2>
          <p className="text-muted-foreground">
            Olá <span className="font-semibold">{dadosPessoais.nome.split(' ')[0]}</span>! 
            Complete seu cadastro para continuar
          </p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>
              Estas informações são usadas para sua proteção
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* CPF e Data de Nascimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cpf" className="text-sm">CPF *</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={dados.cpf}
                    onChange={(e) => setDados({ ...dados, cpf: formatarCPF(e.target.value) })}
                    maxLength={14}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataNascimento" className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Nascimento *
                  </Label>
                  <Input
                    id="dataNascimento"
                    type="date"
                    value={dados.dataNascimento}
                    onChange={(e) => setDados({ ...dados, dataNascimento: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* CEP */}
              <div>
                <Label htmlFor="cep" className="text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  CEP *
                </Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={dados.cep}
                  onChange={(e) => {
                    const cep = formatarCEP(e.target.value);
                    setDados({ ...dados, cep });
                    if (cep.replace(/\D/g, '').length === 8) {
                      buscarCEP(cep);
                    }
                  }}
                  maxLength={9}
                  required
                />
                {buscandoCep && (
                  <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>
                )}
              </div>

              {/* Endereço e Número */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="endereco" className="text-sm">Endereço</Label>
                  <Input
                    id="endereco"
                    placeholder="Rua, Avenida..."
                    value={dados.endereco}
                    onChange={(e) => setDados({ ...dados, endereco: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="numero" className="text-sm">Número</Label>
                  <Input
                    id="numero"
                    placeholder="Nº"
                    value={dados.numero}
                    onChange={(e) => setDados({ ...dados, numero: e.target.value })}
                  />
                </div>
              </div>

              {/* Bairro, Cidade, Estado */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="bairro" className="text-sm">Bairro</Label>
                  <Input
                    id="bairro"
                    value={dados.bairro}
                    onChange={(e) => setDados({ ...dados, bairro: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cidade" className="text-sm">Cidade *</Label>
                  <Input
                    id="cidade"
                    value={dados.cidade}
                    onChange={(e) => setDados({ ...dados, cidade: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="estado" className="text-sm">UF *</Label>
                  <Select 
                    value={dados.estado} 
                    onValueChange={(value) => setDados({ ...dados, estado: value })}
                  >
                    <SelectTrigger id="estado">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASIL.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dia de vencimento */}
              <div>
                <Label htmlFor="diaVencimento" className="text-sm">Dia de vencimento da mensalidade *</Label>
                <Select 
                  value={String(dados.diaVencimento)} 
                  onValueChange={(value) => setDados({ ...dados, diaVencimento: Number(value) })}
                >
                  <SelectTrigger id="diaVencimento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_VENCIMENTO.map((dia) => (
                      <SelectItem key={dia} value={String(dia)}>Dia {dia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Senha */}
              <div className="pt-2 border-t border-border/50">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Crie sua senha de acesso
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="senha" className="text-sm">Senha *</Label>
                    <Input
                      id="senha"
                      type="password"
                      placeholder="••••••"
                      value={dados.senha}
                      onChange={(e) => setDados({ ...dados, senha: e.target.value })}
                      minLength={6}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmarSenha" className="text-sm">Confirmar *</Label>
                    <Input
                      id="confirmarSenha"
                      type="password"
                      placeholder="••••••"
                      value={dados.confirmarSenha}
                      onChange={(e) => setDados({ ...dados, confirmarSenha: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Mínimo 6 caracteres. Você usará o email <span className="font-medium">{dadosPessoais.email}</span> para acessar.
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 flex-grow-[2]">
                  {loading ? 'Criando conta...' : 'Criar conta e continuar'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
