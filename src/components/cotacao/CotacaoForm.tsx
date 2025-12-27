import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Car,
  Truck,
  Bike,
  Calculator,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Upload,
} from 'lucide-react';
import type { Cotacao, TipoBem, MetodoValoracao } from '@/types/cotacao';
import { tipoBemLabels, metodoValoracaoLabels } from '@/types/cotacao';

// Validação
const cotacaoSchema = z.object({
  tipo_bem: z.enum(['carro', 'moto', 'pickup', 'caminhao', 'utilitario', 'maquina_agricola', 'maquina_industrial']),
  marca: z.string().min(2, 'Marca obrigatória').max(100),
  modelo: z.string().min(2, 'Modelo obrigatório').max(100),
  ano_fabricacao: z.number().min(1900).max(new Date().getFullYear() + 1),
  valor_bem: z.number().min(1000, 'Valor mínimo R$ 1.000'),
});

interface CotacaoFormProps {
  leadId?: string;
  leadNome?: string;
  onSuccess: (cotacao: Cotacao) => void;
  onCancel: () => void;
}

export default function CotacaoForm({ leadId, leadNome, onSuccess, onCancel }: CotacaoFormProps) {
  const { user, profile } = useAuth();
  const { cotas, isLoading: cotasLoading } = useReferenceData({ loadCotas: true, filterByUserAccess: false });
  
  const [formData, setFormData] = useState({
    tipo_bem: '' as TipoBem | '',
    placa: '',
    chassi: '',
    marca: '',
    modelo: '',
    ano_fabricacao: '',
    ano_modelo: '',
    categoria: '',
    cor: '',
    renavam: '',
    metodo_valoracao: 'fipe' as MetodoValoracao,
    valor_bem: '',
    codigo_fipe: '',
    carro_reserva_extra: 'nenhum',
    observacoes: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultado, setResultado] = useState<{
    cota: any;
    mensalidade: number;
    participacao: number;
  } | null>(null);

  // Cotas ativas
  const cotasAtivas = useMemo(() => cotas.filter(c => c.ativo), [cotas]);

  // Verificar se tipo precisa de FIPE ou permite manual
  const tipoTemFipe = useMemo(() => {
    const tiposComFipe: TipoBem[] = ['carro', 'moto', 'pickup', 'caminhao', 'utilitario'];
    return tiposComFipe.includes(formData.tipo_bem as TipoBem);
  }, [formData.tipo_bem]);

  // Quando tipo muda para máquina, força método manual
  useEffect(() => {
    if (!tipoTemFipe && formData.tipo_bem) {
      setFormData(prev => ({
        ...prev,
        metodo_valoracao: 'venal',
      }));
    }
  }, [formData.tipo_bem, tipoTemFipe]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCalcular = async () => {
    // Validar campos obrigatórios
    if (!formData.tipo_bem || !formData.marca || !formData.modelo || !formData.ano_fabricacao || !formData.valor_bem) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsCalculating(true);
    const valorBem = parseFloat(formData.valor_bem);

    // Encontrar cota baseada no valor
    const cotaEncontrada = cotasAtivas.find(
      (cota) => valorBem >= cota.fipe_min && valorBem <= cota.fipe_max
    );

    if (!cotaEncontrada) {
      toast.error('Não há faixa configurada para este valor. Entre em contato com o administrador.');
      setIsCalculating(false);
      return;
    }

    // Buscar mensalidade pelo tipo
    const mensalidadeMap: Record<TipoBem, keyof typeof cotaEncontrada> = {
      carro: 'mensalidade_carro',
      moto: 'mensalidade_moto',
      pickup: 'mensalidade_pickup',
      caminhao: 'mensalidade_caminhao' as keyof typeof cotaEncontrada,
      utilitario: 'mensalidade_utilitario' as keyof typeof cotaEncontrada,
      maquina_agricola: 'mensalidade_maquina_agricola' as keyof typeof cotaEncontrada,
      maquina_industrial: 'mensalidade_maquina_industrial' as keyof typeof cotaEncontrada,
    };

    let mensalidade = Number(cotaEncontrada[mensalidadeMap[formData.tipo_bem as TipoBem]]) || 0;

    // Adicionar carro reserva extra
    if (formData.carro_reserva_extra === '30dias') {
      mensalidade += 39.90;
    } else if (formData.carro_reserva_extra === '90dias') {
      mensalidade += 59.90;
    }

    // Participação (7% do valor)
    const participacao = valorBem * 0.07;

    setResultado({
      cota: cotaEncontrada,
      mensalidade,
      participacao,
    });

    setIsCalculating(false);
  };

  const handleSalvar = async () => {
    if (!resultado) {
      toast.error('Calcule a cotação primeiro');
      return;
    }

    try {
      // Validar
      const parsed = cotacaoSchema.safeParse({
        tipo_bem: formData.tipo_bem,
        marca: formData.marca,
        modelo: formData.modelo,
        ano_fabricacao: parseInt(formData.ano_fabricacao),
        valor_bem: parseFloat(formData.valor_bem),
      });

      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Corrija os erros do formulário');
        return;
      }

      // Preparar dados
      const cotacaoData: Partial<Cotacao> = {
        lead_id: leadId,
        tipo_bem: formData.tipo_bem as TipoBem,
        placa: formData.placa || undefined,
        chassi: formData.chassi || undefined,
        marca: formData.marca,
        modelo: formData.modelo,
        ano_fabricacao: parseInt(formData.ano_fabricacao),
        ano_modelo: formData.ano_modelo ? parseInt(formData.ano_modelo) : undefined,
        categoria: formData.categoria || undefined,
        cor: formData.cor || undefined,
        renavam: formData.renavam || undefined,
        metodo_valoracao: formData.metodo_valoracao,
        valor_bem: parseFloat(formData.valor_bem),
        valor_fipe: formData.metodo_valoracao === 'fipe' ? parseFloat(formData.valor_bem) : undefined,
        codigo_fipe: formData.codigo_fipe || undefined,
        usuario_informou_valor: formData.metodo_valoracao !== 'fipe' ? user?.id : undefined,
        data_valor_informado: formData.metodo_valoracao !== 'fipe' ? new Date().toISOString() : undefined,
        cota_id: resultado.cota.id,
        mensalidade: resultado.mensalidade,
        participacao: resultado.participacao,
        carro_reserva_dias: formData.carro_reserva_extra === 'nenhum' ? 15 : 
                           formData.carro_reserva_extra === '30dias' ? 45 : 105,
        carro_reserva_adicional: formData.carro_reserva_extra === 'nenhum' ? 0 : 
                                 formData.carro_reserva_extra === '30dias' ? 39.90 : 59.90,
        observacoes: formData.observacoes || undefined,
        regiao_id: profile?.regiao_id,
      };

      // Importar supabase
      const { supabase } = await import('@/integrations/supabase/client');
      
      const insertData = {
        tipo_bem: cotacaoData.tipo_bem!,
        marca: cotacaoData.marca!,
        modelo: cotacaoData.modelo!,
        ano_fabricacao: cotacaoData.ano_fabricacao!,
        valor_bem: cotacaoData.valor_bem!,
        metodo_valoracao: cotacaoData.metodo_valoracao!,
        consultor_id: user?.id!,
        regiao_id: cotacaoData.regiao_id || null,
        lead_id: cotacaoData.lead_id || null,
        placa: cotacaoData.placa || null,
        chassi: cotacaoData.chassi || null,
        ano_modelo: cotacaoData.ano_modelo || null,
        categoria: cotacaoData.categoria || null,
        cor: cotacaoData.cor || null,
        renavam: cotacaoData.renavam || null,
        valor_fipe: cotacaoData.valor_fipe || null,
        codigo_fipe: cotacaoData.codigo_fipe || null,
        usuario_informou_valor: cotacaoData.usuario_informou_valor || null,
        data_valor_informado: cotacaoData.data_valor_informado || null,
        cota_id: cotacaoData.cota_id || null,
        mensalidade: cotacaoData.mensalidade || null,
        participacao: cotacaoData.participacao || null,
        carro_reserva_dias: cotacaoData.carro_reserva_dias ?? 15,
        carro_reserva_adicional: cotacaoData.carro_reserva_adicional ?? 0,
        observacoes: cotacaoData.observacoes || null,
      };
      
      const { data: novaCotacao, error } = await supabase
        .from('cotacoes')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Cotação criada com sucesso!');
      onSuccess(novaCotacao as Cotacao);
    } catch (error: any) {
      console.error('Erro ao salvar cotação:', error);
      toast.error(error.message || 'Erro ao salvar cotação');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nova Cotação</h2>
          {leadNome && (
            <p className="text-muted-foreground">Lead: {leadNome}</p>
          )}
        </div>
        <Badge variant="outline" className="text-sm">
          <Calculator className="w-4 h-4 mr-1" />
          Simulador
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário */}
        <div className="space-y-6">
          {/* Tipo do Bem */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Tipo do Bem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo_bem}
                  onValueChange={(value) => setFormData({ ...formData, tipo_bem: value as TipoBem })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoBemLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo_bem && <p className="text-sm text-destructive">{errors.tipo_bem}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input
                    placeholder="Ex: Volkswagen"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    placeholder="Ex: Gol"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano Fabricação *</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 2020"
                    value={formData.ano_fabricacao}
                    onChange={(e) => setFormData({ ...formData, ano_fabricacao: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ano Modelo</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 2021"
                    value={formData.ano_modelo}
                    onChange={(e) => setFormData({ ...formData, ano_modelo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Placa</Label>
                  <Input
                    placeholder="ABC-1234"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    placeholder="Ex: Prata"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chassi</Label>
                  <Input
                    placeholder="Número do chassi"
                    value={formData.chassi}
                    onChange={(e) => setFormData({ ...formData, chassi: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Renavam</Label>
                  <Input
                    placeholder="Número do Renavam"
                    value={formData.renavam}
                    onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categoria/Complemento</Label>
                <Input
                  placeholder="Ex: Sedan, SUV, Bitruck..."
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Valoração */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Valoração
              </CardTitle>
              <CardDescription>
                {tipoTemFipe ? 'FIPE disponível ou valor manual' : 'Somente valor manual (sem FIPE)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Método de Valoração</Label>
                <Select
                  value={formData.metodo_valoracao}
                  onValueChange={(value) => setFormData({ ...formData, metodo_valoracao: value as MetodoValoracao })}
                  disabled={!tipoTemFipe}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoTemFipe && <SelectItem value="fipe">Tabela FIPE</SelectItem>}
                    <SelectItem value="venal">Valor Venal</SelectItem>
                    <SelectItem value="nota_fiscal">Nota Fiscal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.metodo_valoracao === 'fipe' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Integração FIPE preparada para futura API</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Valor do Bem (R$) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="pl-10"
                    value={formData.valor_bem}
                    onChange={(e) => setFormData({ ...formData, valor_bem: e.target.value })}
                    disabled={formData.metodo_valoracao === 'fipe' && false} // Será bloqueado quando FIPE estiver integrada
                  />
                </div>
              </div>

              {formData.metodo_valoracao === 'fipe' && (
                <div className="space-y-2">
                  <Label>Código FIPE (opcional)</Label>
                  <Input
                    placeholder="Ex: 001234-5"
                    value={formData.codigo_fipe}
                    onChange={(e) => setFormData({ ...formData, codigo_fipe: e.target.value })}
                  />
                </div>
              )}

              {formData.metodo_valoracao === 'nota_fiscal' && (
                <div className="space-y-2">
                  <Label>Upload Nota Fiscal (opcional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Funcionalidade de upload disponível em breve</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Carro Reserva</Label>
                <Select
                  value={formData.carro_reserva_extra}
                  onValueChange={(value) => setFormData({ ...formData, carro_reserva_extra: value })}
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

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Anotações sobre a cotação..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleCalcular} 
                className="w-full" 
                disabled={isCalculating || cotasLoading}
              >
                <Calculator className="w-4 h-4 mr-2" />
                {isCalculating ? 'Calculando...' : 'Calcular Cotação'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resultado */}
        <div className="space-y-6">
          {resultado ? (
            <Card className="border-primary">
              <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Resultado da Cotação
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  {formData.marca} {formData.modelo} {formData.ano_fabricacao}
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
                    <p className="text-sm text-muted-foreground">Valor do Bem</p>
                    <p className="font-semibold">{formatCurrency(parseFloat(formData.valor_bem))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Participação (7%)</p>
                    <p className="font-semibold">{formatCurrency(resultado.participacao)}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span>{tipoBemLabels[formData.tipo_bem as TipoBem]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método:</span>
                    <span>{metodoValoracaoLabels[formData.metodo_valoracao]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carro Reserva:</span>
                    <span>
                      {formData.carro_reserva_extra === 'nenhum' ? '15 dias' :
                       formData.carro_reserva_extra === '30dias' ? '45 dias' : '105 dias'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSalvar} className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    Salvar Cotação
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Preencha os dados e calcule para ver o resultado</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
