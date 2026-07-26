import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';
import {
  useBeneficiosExtras,
  useUpsertBeneficio,
  useDeleteBeneficio,
  type BeneficioExtra,
} from '@/hooks/useBeneficiosExtras';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ICONES_DISPONIVEIS = [
  'Sparkles', 'Car', 'Truck', 'Shield', 'CircleDot', 'Wrench',
  'Key', 'Users', 'Zap', 'Star', 'Heart', 'Award', 'Gift', 'Crown',
];

export default function BeneficiosExtrasPage() {
  const { data: beneficios = [], isLoading } = useBeneficiosExtras();
  const upsert = useUpsertBeneficio();
  const remove = useDeleteBeneficio();
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Partial<BeneficioExtra> | null>(null);

  const openNew = () => {
    setEditing({
      nome: '',
      descricao: '',
      icone: 'Sparkles',
      valor_mensal: 0,
      ordem: beneficios.length + 1,
      ativo: true,
      aplica_carro: true,
      aplica_moto: true,
      aplica_caminhonete: true,
    });
    setOpenModal(true);
  };

  const openEdit = (b: BeneficioExtra) => {
    setEditing({ ...b });
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!editing?.nome || editing.valor_mensal == null) return;
    await upsert.mutateAsync(editing as any);
    setOpenModal(false);
    setEditing(null);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" />
              Benefícios Extras
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure os benefícios opcionais que o associado pode adicionar à mensalidade.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Novo Benefício
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beneficios.map(b => {
              const Icon = (Icons as any)[b.icone || 'Sparkles'] || Sparkles;
              return (
                <Card key={b.id} className={b.ativo ? '' : 'opacity-60'}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {b.nome}
                      {!b.ativo && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {b.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{b.descricao}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge className="text-sm">+ {formatBRL(Number(b.valor_mensal))}/mês</Badge>
                      <span className="text-xs text-muted-foreground">Ordem: {b.ordem}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(b)}>
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover benefício?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{b.nome}" será removido. Cotações já feitas mantêm seu histórico.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(b.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Editar' : 'Novo'} Benefício Extra</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={editing.nome || ''}
                    onChange={e => setEditing({ ...editing, nome: e.target.value })}
                    placeholder="Ex: Proteção Vidros"
                    maxLength={80}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={editing.descricao || ''}
                    onChange={e => setEditing({ ...editing, descricao: e.target.value })}
                    placeholder="Explique o que esse benefício oferece"
                    maxLength={300}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor mensal (R$) *</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={editing.valor_mensal ?? 0}
                      onChange={e => setEditing({ ...editing, valor_mensal: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Ordem</Label>
                    <Input
                      type="number" min="0"
                      value={editing.ordem ?? 0}
                      onChange={e => setEditing({ ...editing, ordem: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Ícone</Label>
                  <div className="grid grid-cols-7 gap-2 mt-1">
                    {ICONES_DISPONIVEIS.map(name => {
                      const Icon = (Icons as any)[name];
                      const sel = editing.icone === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setEditing({ ...editing, icone: name })}
                          className={`p-2 rounded border ${sel ? 'border-primary bg-primary/10' : 'border-border'}`}
                        >
                          <Icon className="h-4 w-4 mx-auto" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Aplicável a:</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={editing.aplica_carro ?? true}
                        onCheckedChange={v => setEditing({ ...editing, aplica_carro: v })}
                      /> Carro
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={editing.aplica_moto ?? true}
                        onCheckedChange={v => setEditing({ ...editing, aplica_moto: v })}
                      /> Moto
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={editing.aplica_caminhonete ?? true}
                        onCheckedChange={v => setEditing({ ...editing, aplica_caminhonete: v })}
                      /> Caminhonete
                    </label>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editing.ativo ?? true}
                    onCheckedChange={v => setEditing({ ...editing, ativo: v })}
                  />
                  Benefício ativo (visível nas cotações)
                </label>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={upsert.isPending || !editing?.nome}>
                {upsert.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
