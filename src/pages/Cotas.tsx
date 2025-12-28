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
import { Cota } from '@/types/database';
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react';

export default function Cotas() {
  // Access control: Only Admin Principal can access
  const { isAllowed, isChecking } = useAccessControl('admin_principal_only');
  
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCota, setEditingCota] = useState<Cota | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    cota_nome: '',
    fipe_min: '',
    fipe_max: '',
    valor_carro: '',
    valor_moto: '',
    valor_camionete: '',
    percentual_extra: '',
    ativo: true,
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
        valor_carro: cota.valor_carro.toString(),
        valor_moto: cota.valor_moto.toString(),
        valor_camionete: cota.valor_camionete.toString(),
        percentual_extra: (cota.percentual_extra || 0).toString(),
        ativo: cota.ativo,
      });
    } else {
      setEditingCota(null);
      setFormData({
        cota_nome: '',
        fipe_min: '',
        fipe_max: '',
        valor_carro: '',
        valor_moto: '',
        valor_camionete: '',
        percentual_extra: '0',
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const cotaData = {
        cota_nome: formData.cota_nome,
        fipe_min: parseFloat(formData.fipe_min),
        fipe_max: parseFloat(formData.fipe_max),
        valor_carro: parseFloat(formData.valor_carro),
        valor_moto: parseFloat(formData.valor_moto),
        valor_camionete: parseFloat(formData.valor_camionete),
        percentual_extra: parseFloat(formData.percentual_extra) || 0,
        ativo: formData.ativo,
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

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Valores por Tipo</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="valor_carro">Carro (R$)</Label>
                      <Input
                        id="valor_carro"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.valor_carro}
                        onChange={(e) => setFormData({ ...formData, valor_carro: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor_moto">Moto (R$)</Label>
                      <Input
                        id="valor_moto"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.valor_moto}
                        onChange={(e) => setFormData({ ...formData, valor_moto: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor_camionete">Camionete (R$)</Label>
                      <Input
                        id="valor_camionete"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.valor_camionete}
                        onChange={(e) => setFormData({ ...formData, valor_camionete: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="percentual_extra">Percentual Extra (%)</Label>
                  <Input
                    id="percentual_extra"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={formData.percentual_extra}
                    onChange={(e) => setFormData({ ...formData, percentual_extra: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Aumento aplicado sobre o valor base: mensalidade = valor + (valor * % / 100)
                  </p>
                </div>

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
          <CardHeader>
            <CardTitle>Tabela de Cotas</CardTitle>
            <CardDescription>
              {cotas.length} cota{cotas.length !== 1 ? 's' : ''} cadastrada{cotas.length !== 1 ? 's' : ''}
            </CardDescription>
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
                      <TableHead>Carro</TableHead>
                      <TableHead>Moto</TableHead>
                      <TableHead>Camionete</TableHead>
                      <TableHead>% Extra</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cotas.map((cota) => (
                      <TableRow key={cota.id}>
                        <TableCell className="font-medium">{cota.cota_nome}</TableCell>
                        <TableCell>
                          {formatCurrency(cota.fipe_min)} - {formatCurrency(cota.fipe_max)}
                        </TableCell>
                        <TableCell>{formatCurrency(cota.valor_carro)}</TableCell>
                        <TableCell>{formatCurrency(cota.valor_moto)}</TableCell>
                        <TableCell>{formatCurrency(cota.valor_camionete)}</TableCell>
                        <TableCell>{(cota.percentual_extra || 0).toFixed(1)}%</TableCell>
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
                    ))}
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