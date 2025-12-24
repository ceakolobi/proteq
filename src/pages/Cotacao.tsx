import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useReferenceData } from '@/hooks/useReferenceData';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Cota, VehicleType } from '@/types/database';
import { 
  Calculator, 
  Car, 
  DollarSign, 
  FileText, 
  Shield,
  Truck,
  Clock,
  Wrench,
  Key,
  Fuel,
  CloudRain,
  CheckCircle2
} from 'lucide-react';

interface CotacaoResult {
  cota: Cota;
  mensalidade: number;
  participacao: number;
}

export default function Cotacao() {
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('authenticated');
  const { cotas, isLoading } = useReferenceData({ loadCotas: true, filterByUserAccess: false });
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Cotação | MARKA CRM';
  }, []);


  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    ano: '',
    tipo: '' as VehicleType | '',
    valorFipe: '',
    carroReservaExtra: 'nenhum',
  });

  const [resultado, setResultado] = useState<CotacaoResult | null>(null);

  // Filtra apenas cotas ativas
  const cotasAtivas = cotas.filter(c => c.ativo);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCalcular = () => {
    if (!formData.marca || !formData.modelo || !formData.ano || !formData.tipo || !formData.valorFipe) {
      toast({
        variant: 'destructive',
        title: 'Dados incompletos',
        description: 'Preencha todos os campos para realizar a cotação.',
      });
      return;
    }

    setIsCalculating(true);
    const valorFipe = parseFloat(formData.valorFipe);

    // Find the correct cota based on FIPE value
    const cotaEncontrada = cotasAtivas.find(
      (cota) => valorFipe >= cota.fipe_min && valorFipe <= cota.fipe_max
    );

    if (!cotaEncontrada) {
      toast({
        variant: 'destructive',
        title: 'Faixa não encontrada',
        description: 'Não há cota configurada para este valor FIPE. Entre em contato com o administrador.',
      });
      setIsCalculating(false);
      return;
    }

    // Get mensalidade based on vehicle type
    let mensalidade = 0;
    switch (formData.tipo) {
      case 'carro':
        mensalidade = cotaEncontrada.mensalidade_carro;
        break;
      case 'moto':
        mensalidade = cotaEncontrada.mensalidade_moto;
        break;
      case 'pickup':
        mensalidade = cotaEncontrada.mensalidade_pickup;
        break;
    }

    // Add carro reserva extra if selected
    let carroReservaAdicional = 0;
    if (formData.carroReservaExtra === '30dias') {
      carroReservaAdicional = 39.90;
    } else if (formData.carroReservaExtra === '90dias') {
      carroReservaAdicional = 59.90;
    }

    // Calculate participacao (7% of FIPE)
    const participacao = valorFipe * 0.07;

    setResultado({
      cota: cotaEncontrada,
      mensalidade: mensalidade + carroReservaAdicional,
      participacao,
    });

    setIsCalculating(false);
  };

  const handleLimpar = () => {
    setFormData({
      marca: '',
      modelo: '',
      ano: '',
      tipo: '',
      valorFipe: '',
      carroReservaExtra: 'nenhum',
    });
    setResultado(null);
  };

  const beneficios = [
    { icon: Car, label: 'Carro Reserva', desc: '15 dias inclusos' },
    { icon: Truck, label: 'Guincho', desc: '50 km (até 250 km ida e volta)' },
    { icon: Shield, label: 'Vidros', desc: 'Cobertura de para-brisa' },
    { icon: Key, label: 'Chaveiro', desc: '24 horas' },
    { icon: Wrench, label: 'Pane Elétrica', desc: 'Assistência inclusa' },
    { icon: Wrench, label: 'Pane Mecânica', desc: 'Assistência inclusa' },
    { icon: Fuel, label: 'Pane Seca', desc: 'Combustível incluso' },
    { icon: CloudRain, label: 'Eventos da Natureza', desc: 'Proteção completa' },
  ];

  // Show loading while checking access
  if (isChecking) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowed) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Redirecionando...</div>
        </div>
      </DashboardLayout>
    );
  }

  const canAccessPage = hasAnyRole(['admin_regional', 'consultor_vendas']);
  if (!canAccessPage) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar o módulo de Cotações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotação</h1>
          <p className="text-muted-foreground">
            Simule a proteção veicular com base no valor FIPE
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Dados do Veículo
              </CardTitle>
              <CardDescription>
                Preencha as informações para calcular a mensalidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    placeholder="Ex: Volkswagen"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    placeholder="Ex: Gol"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ano">Ano</Label>
                  <Input
                    id="ano"
                    type="number"
                    placeholder="Ex: 2020"
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Veículo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value as VehicleType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carro">Carro</SelectItem>
                      <SelectItem value="moto">Motocicleta</SelectItem>
                      <SelectItem value="pickup">Pickup/Camionete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorFipe">Valor FIPE (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="valorFipe"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="pl-10"
                    value={formData.valorFipe}
                    onChange={(e) => setFormData({ ...formData, valorFipe: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="carroReserva">Carro Reserva Adicional</Label>
                <Select
                  value={formData.carroReservaExtra}
                  onValueChange={(value) => setFormData({ ...formData, carroReservaExtra: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">15 dias (inclusos)</SelectItem>
                    <SelectItem value="30dias">+30 dias (R$ 39,90/mês)</SelectItem>
                    <SelectItem value="90dias">+90 dias (R$ 59,90/mês)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleCalcular} className="flex-1" disabled={isCalculating || isLoading}>
                  <Calculator className="h-4 w-4 mr-2" />
                  {isCalculating ? 'Calculando...' : 'Calcular Cotação'}
                </Button>
                <Button variant="outline" onClick={handleLimpar}>
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result Card */}
          <div className="space-y-6">
            {resultado ? (
              <Card className="border-primary">
                <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Resultado da Cotação
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    {formData.marca} {formData.modelo} {formData.ano}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Mensalidade</p>
                    <p className="text-4xl font-bold text-primary">
                      {formatCurrency(resultado.mensalidade)}
                    </p>
                    <Badge className="mt-2">{resultado.cota.nome}</Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor FIPE</p>
                      <p className="font-semibold">{formatCurrency(parseFloat(formData.valorFipe))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Participação (7%)</p>
                      <p className="font-semibold">{formatCurrency(resultado.participacao)}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Carência guincho: 72 horas</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>Limite guincho: 3 acionamentos/ano</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Carro reserva: {formData.carroReservaExtra === 'nenhum' ? '15' : formData.carroReservaExtra === '30dias' ? '45' : '105'} dias
                      </span>
                    </div>
                  </div>

                  <Button className="w-full" size="lg">
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Proposta
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Preencha os dados do veículo para ver o resultado da cotação</p>
                </CardContent>
              </Card>
            )}

            {/* Benefits Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Benefícios Inclusos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {beneficios.map((beneficio) => (
                    <div key={beneficio.label} className="flex items-start gap-2">
                      <div className="p-1.5 bg-primary/10 rounded">
                        <beneficio.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{beneficio.label}</p>
                        <p className="text-xs text-muted-foreground">{beneficio.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
