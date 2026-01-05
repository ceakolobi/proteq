import { useEffect, useState } from 'react';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Cota, CotaCategoria } from '@/types/database';
import { Plus, Pencil, Trash2, DollarSign, Filter, Car, Bike } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const categoriaLabels: Record<CotaCategoria, string> = {
  CARRO: 'Carro',
  MOTO: 'Moto',
  CAMINHONETE: 'Caminhonete',
};

export default function Cotas() {
  // Access control: Admin Principal e Admin Básico podem gerenciar cotas
  const { isAllowed, isChecking } = useAccessControl('admin_or_basico');
  
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCota, setEditingCota] = useState<Cota | null>(null);
  const [categoriaFilter, setCategoriaFilter] = useState<CotaCategoria | 'TODAS'>('CARRO');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    cota_nome: '',
    fipe_min: '',
    fipe_max: '',
    valor_carro: '',
    valor_moto: '',
    valor_camionete: '',
    percentual_geral: '',
    percentual_extra: '',
    // Novos campos de acréscimo em R$
    acrescimo_individual: '',
    acrescimo_global: '',
    ativo: true,
    categoria: 'CARRO' as CotaCategoria,
    // Checkboxes para aplicabilidade por categoria
    aplica_carro: true,
    aplica_moto: true,
    aplica_caminhonete: true,
  });

  const fetchCotas = async () => {
    try {
      const { data, error } = await supabase
        .from('cotas')
        .select('*')
        .order('fipe_min', { ascending: true });

      if (error) throw error;
      setCotas(data as Cota[]);
    } catch (error) {
      console.error('Error fetching cotas:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar cotas',
        description: 'Não foi possível carregar a lista de cotas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed && !isChecking) {
      fetchCotas();
    }
  }, [isAllowed, isChecking]);

  // Show loading while checking access
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleOpenDialog = (cota?: Cota) => {
    if (cota) {
      setEditingCota(cota);
      setFormData({
        cota_nome: cota.cota_nome,
        fipe_min: cota.fipe_min.toString(),
        fipe_max: cota.fipe_max.toString(),
        valor_carro: (cota.valor_carro || 0).toString(),
        valor_moto: (cota.valor_moto || 0).toString(),
        valor_camionete: (cota.valor_camionete || 0).toString(),
        percentual_geral: (cota.percentual_geral || 0).toString(),
        percentual_extra: (cota.percentual_extra || 0).toString(),
        acrescimo_individual: (cota.acrescimo_individual || 0).toString(),
        acrescimo_global: (cota.acrescimo_global || 0).toString(),
        ativo: cota.ativo,
        categoria: (cota.categoria || 'CARRO') as CotaCategoria,
        aplica_carro: cota.aplica_carro !== false,
        aplica_moto: cota.aplica_moto !== false,
        aplica_caminhonete: cota.aplica_caminhonete !== false,
      });
    } else {
      setEditingCota(null);
      // Ao criar nova cota, inicializar apenas a categoria do filtro selecionado (ou CARRO se 'TODAS')
      const defaultCategoria = categoriaFilter !== 'TODAS' ? categoriaFilter : 'CARRO';
      setFormData({
        cota_nome: '',
        fipe_min: '',
        fipe_max: '',
        valor_carro: '',
        valor_moto: '',
        valor_camionete: '',
        percentual_geral: '0',
        percentual_extra: '0',
        acrescimo_individual: '0',
        acrescimo_global: '0',
        ativo: true,
        categoria: defaultCategoria,
        aplica_carro: defaultCategoria === 'CARRO',
        aplica_moto: defaultCategoria === 'MOTO',
        aplica_caminhonete: defaultCategoria === 'CAMINHONETE',
      });
    }
    setIsDialogOpen(true);
  };

  // Filtered cotas based on category
  const filteredCotas = categoriaFilter === 'TODAS' 
    ? cotas 
    : cotas.filter(c => c.categoria === categoriaFilter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limites máximos para evitar overflow no banco
    const MAX_FIPE = 50000000; // R$ 50 milhões
    const MAX_MENSALIDADE = 100000; // R$ 100 mil
    
    // Validação: pelo menos uma categoria deve estar selecionada
    if (!formData.aplica_carro && !formData.aplica_moto && !formData.aplica_caminhonete) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'Selecione pelo menos uma categoria (Carro, Moto ou Caminhonete).',
      });
      return;
    }

    // Validação de limites FIPE
    const fipeMin = parseFloat(formData.fipe_min) || 0;
    const fipeMax = parseFloat(formData.fipe_max) || 0;
    if (fipeMin > MAX_FIPE || fipeMax > MAX_FIPE) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: `Os valores FIPE devem ser no máximo R$ ${MAX_FIPE.toLocaleString('pt-BR')}.`,
      });
      return;
    }

    // Validação: campos de valor obrigatórios conforme categorias selecionadas
    if (formData.aplica_carro) {
      const valor = parseFloat(formData.valor_carro) || 0;
      if (valor <= 0) {
        toast({ variant: 'destructive', title: 'Erro de validação', description: 'Informe o valor para Carro.' });
        return;
      }
      if (valor > MAX_MENSALIDADE) {
        toast({ variant: 'destructive', title: 'Erro de validação', description: `Valor Carro máximo: R$ ${MAX_MENSALIDADE.toLocaleString('pt-BR')}.` });
        return;
      }
    }
    if (formData.aplica_moto) {
      const valor = parseFloat(formData.valor_moto) || 0;
      if (valor <= 0) {
        toast({ variant: 'destructive', title: 'Erro de validação', description: 'Informe o valor para Moto.' });
        return;
      }
      if (valor > MAX_MENSALIDADE) {
        toast({ variant: 'destructive', title: 'Erro de validação', description: `Valor Moto máximo: R$ ${MAX_MENSALIDADE.toLocaleString('pt-BR')}.` });
        return;
      }
    }
    if (formData.aplica_caminhonete) {
      const valor = parseFloat(formData.valor_camionete) || 0;
      if (valor <= 0) {
        toast({ variant: 'destructive', title: 'Erro de validação', description: 'Informe o valor para Caminhonete.' });
        return;
      }
      if (valor > MAX_MENSALIDADE) {
        toast({ variant: 'destructive', title: 'Erro de validação', description: `Valor Caminhonete máximo: R$ ${MAX_MENSALIDADE.toLocaleString('pt-BR')}.` });
        return;
      }
    }

    try {
      const cotaData = {
        cota_nome: formData.cota_nome,
        fipe_min: parseFloat(formData.fipe_min),
        fipe_max: parseFloat(formData.fipe_max),
        valor_carro: formData.aplica_carro ? parseFloat(formData.valor_carro) || 0 : null,
        valor_moto: formData.aplica_moto ? parseFloat(formData.valor_moto) || 0 : null,
        valor_camionete: formData.aplica_caminhonete ? parseFloat(formData.valor_camionete) || 0 : null,
        percentual_geral: parseFloat(formData.percentual_geral) || 0,
        percentual_extra: parseFloat(formData.percentual_extra) || 0,
        acrescimo_individual: parseFloat(formData.acrescimo_individual) || 0,
        acrescimo_global: parseFloat(formData.acrescimo_global) || 0,
        ajuste_geral_valor: parseFloat(formData.acrescimo_global) || 0, // Novo campo
        ativo: formData.ativo,
        categoria: formData.categoria,
        aplica_carro: formData.aplica_carro,
        aplica_moto: formData.aplica_moto,
        aplica_caminhonete: formData.aplica_caminhonete,
      };

      if (editingCota) {
        const { error } = await supabase
          .from('cotas')
          .update(cotaData)
          .eq('id', editingCota.id);

        if (error) throw error;
        toast({
          title: 'Cota atualizada',
          description: 'A cota foi atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('cotas')
          .insert(cotaData);

        if (error) throw error;
        toast({
          title: 'Cota criada',
          description: 'A nova cota foi criada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      fetchCotas();
    } catch (error: any) {
      console.error('Error saving cota:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar a cota.',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cotas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Cota excluída',
        description: 'A cota foi excluída com sucesso.',
      });
      fetchCotas();
    } catch (error: any) {
      console.error('Error deleting cota:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir a cota.',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cotas</h1>
            <p className="text-muted-foreground">
              Configure as faixas de valor FIPE e mensalidades
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Cota
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingCota ? 'Editar Cota' : 'Nova Cota'}
                </DialogTitle>
                <DialogDescription>
                  Configure a faixa de valor FIPE e as mensalidades por tipo de veículo.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cota_nome">Nome da Cota</Label>
                  <Input
                    id="cota_nome"
                    placeholder="Ex: Cota Bronze, Cota Prata..."
                    value={formData.cota_nome}
                    onChange={(e) => setFormData({ ...formData, cota_nome: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fipe_min">FIPE Mínimo (R$)</Label>
                    <Input
                      id="fipe_min"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.fipe_min}
                      onChange={(e) => setFormData({ ...formData, fipe_min: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fipe_max">FIPE Máximo (R$)</Label>
                    <Input
                      id="fipe_max"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.fipe_max}
                      onChange={(e) => setFormData({ ...formData, fipe_max: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Seleção de Categorias */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium text-sm">Categorias que esta cota se aplica</h4>
                  <p className="text-xs text-muted-foreground">
                    Selecione as categorias e preencha apenas os valores correspondentes.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="aplica_carro"
                        checked={formData.aplica_carro}
                        onCheckedChange={(checked) => setFormData({ ...formData, aplica_carro: checked === true })}
                      />
                      <Label htmlFor="aplica_carro" className="text-sm cursor-pointer">Carro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="aplica_moto"
                        checked={formData.aplica_moto}
                        onCheckedChange={(checked) => setFormData({ ...formData, aplica_moto: checked === true })}
                      />
                      <Label htmlFor="aplica_moto" className="text-sm cursor-pointer">Moto</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="aplica_caminhonete"
                        checked={formData.aplica_caminhonete}
                        onCheckedChange={(checked) => setFormData({ ...formData, aplica_caminhonete: checked === true })}
                      />
                      <Label htmlFor="aplica_caminhonete" className="text-sm cursor-pointer">Caminhonete</Label>
                    </div>
                  </div>
                </div>

                {/* Valores por Tipo - somente categorias selecionadas */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Valores por Tipo</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {formData.aplica_carro && (
                      <div className="space-y-2">
                        <Label htmlFor="valor_carro">Carro (R$) *</Label>
                        <Input
                          id="valor_carro"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.valor_carro}
                          onChange={(e) => setFormData({ ...formData, valor_carro: e.target.value })}
                        />
                      </div>
                    )}
                    {formData.aplica_moto && (
                      <div className="space-y-2">
                        <Label htmlFor="valor_moto">Moto (R$) *</Label>
                        <Input
                          id="valor_moto"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.valor_moto}
                          onChange={(e) => setFormData({ ...formData, valor_moto: e.target.value })}
                        />
                      </div>
                    )}
                    {formData.aplica_caminhonete && (
                      <div className="space-y-2">
                        <Label htmlFor="valor_camionete">Caminhonete (R$) *</Label>
                        <Input
                          id="valor_camionete"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.valor_camionete}
                          onChange={(e) => setFormData({ ...formData, valor_camionete: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                  {!formData.aplica_carro && !formData.aplica_moto && !formData.aplica_caminhonete && (
                    <p className="text-sm text-destructive">Selecione ao menos uma categoria acima.</p>
                  )}
                </div>

                {/* Ajuste Geral em R$ - SEÇÃO PRINCIPAL */}
                <div className="space-y-4 border rounded-lg p-4 bg-primary/5">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Ajuste Geral em Reais (R$)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Valor fixo somado à mensalidade base. Fórmula: <strong>Valor Final = Base + Ajuste Geral + Ajuste Individual</strong>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="acrescimo_global">Ajuste Geral (R$)</Label>
                    <Input
                      id="acrescimo_global"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.acrescimo_global}
                      onChange={(e) => setFormData({ ...formData, acrescimo_global: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Aplicado automaticamente a TODAS as cotações que usarem esta cota. Pode ser positivo ou negativo.
                    </p>
                  </div>
                </div>

                {/* Percentuais - OCULTO (mantido para compatibilidade mas não visível) */}
                {/* Campos percentuais removidos da interface - sistema usa apenas valores fixos */}

                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo">Cota ativa</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingCota ? 'Salvar Alterações' : 'Criar Cota'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="bg-accent/50">
          <CardContent className="flex items-start gap-4 p-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Como funciona a cotação</h3>
              <p className="text-sm text-muted-foreground mt-1">
                O sistema identifica automaticamente a cota correta baseado no valor FIPE do veículo.
                Configure as faixas de valor e as mensalidades correspondentes para cada tipo de veículo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cotas Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Tabela de Cotas</CardTitle>
              <CardDescription>
                {filteredCotas.length} cota{filteredCotas.length !== 1 ? 's' : ''} na categoria selecionada
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={categoriaFilter} onValueChange={(value) => setCategoriaFilter(value as CotaCategoria | 'TODAS')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  <SelectItem value="CARRO">Carro</SelectItem>
                  <SelectItem value="MOTO">Moto</SelectItem>
                  <SelectItem value="CAMINHONETE">Caminhonete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : cotas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma cota cadastrada. Clique em "Nova Cota" para começar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Faixa FIPE</TableHead>
                      <TableHead>Valor Base</TableHead>
                      <TableHead>Acréscimos (R$)</TableHead>
                      <TableHead className="text-primary font-semibold">Valor Final</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCotas.map((cota) => {
                      const valorBase = categoriaFilter === 'MOTO' 
                        ? (cota.valor_moto || 0)
                        : categoriaFilter === 'CAMINHONETE'
                          ? (cota.valor_camionete || 0)
                          : (cota.valor_carro || 0);
                      // Usar novo campo ajuste_geral_valor com fallback
                      const ajusteGeralValor = (cota as any).ajuste_geral_valor || cota.acrescimo_global || 0;
                      const valorFinal = valorBase + ajusteGeralValor;
                      
                      return (
                      <TableRow key={cota.id}>
                        <TableCell className="font-medium">{cota.cota_nome}</TableCell>
                        <TableCell>
                          {formatCurrency(cota.fipe_min)} - {formatCurrency(cota.fipe_max)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(valorBase)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            {ajusteGeralValor !== 0 && (
                              <div className="text-muted-foreground">
                                Ajuste Geral: <span className={ajusteGeralValor > 0 ? 'text-primary' : 'text-green-500'}>{ajusteGeralValor > 0 ? '+' : ''}{formatCurrency(ajusteGeralValor)}</span>
                              </div>
                            )}
                            {ajusteGeralValor === 0 && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(valorFinal)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cota.ativo ? 'default' : 'secondary'}>
                            {cota.ativo ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(cota)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir cota?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. A cota será permanentemente
                                    excluída do sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(cota.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}