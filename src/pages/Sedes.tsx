import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useSedeAssociadosCounts, useSedeProfilesCounts } from '@/hooks/useSedeRegioes';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Plus, Search, Edit, Trash2, Users, MapPin, RotateCcw } from 'lucide-react';
import type { Sede, Profile } from '@/types/database';
import { useFormPersistence } from '@/hooks/useFormPersistence';

const SEDES_FORM_INITIAL = {
  nome: '',
  tipo: 'regional' as 'matriz' | 'regional',
  endereco: '',
  telefone: '',
  email: '',
  ativo: true,
  responsavel_id: '',
};

interface SedeWithResponsavel extends Sede {
  responsavel?: Profile | null;
}

export default function Sedes() {
  // Access control: Admin Principal e Admin Básico
  const { isAllowed, isChecking, userSedeId } = useAccessControl('admin_or_basico');
  const { isAdminPrincipal, hasRole, profile } = useAuth();
  const isAdminRegional = hasRole('admin_regional') && !isAdminPrincipal;
  
  const [sedes, setSedes] = useState<SedeWithResponsavel[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSede, setSelectedSede] = useState<SedeWithResponsavel | null>(null);
  // Persistência automática do formulário em localStorage (somente p/ nova regional)
  const {
    value: formData,
    setValue: setFormData,
    clearDraft: clearFormDraft,
    resetValue: resetFormData,
    hasDraft: hasFormDraft,
  } = useFormPersistence('sedes:form', SEDES_FORM_INITIAL, {
    enabled: isDialogOpen && !selectedSede,
  });

  // Hooks para contar consultores e associados por sede (batch)
  const sedeIds = useMemo(() => sedes.map(s => s.id), [sedes]);
  const { getCount: getConsultoresCount } = useSedeProfilesCounts(sedeIds);
  const { getCount: getAssociadosCount } = useSedeAssociadosCounts(sedeIds);

  // Totais calculados
  const totalConsultores = useMemo(() => sedeIds.reduce((acc, id) => acc + getConsultoresCount(id), 0), [sedeIds, getConsultoresCount]);
  const totalAssociados = useMemo(() => sedeIds.reduce((acc, id) => acc + getAssociadosCount(id), 0), [sedeIds, getAssociadosCount]);

  const fetchSedes = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      
      // Admin Regional can only see their own sede
      let query = supabase.from('sedes').select('*').order('nome');
      
      if (isAdminRegional && profile?.sede_id) {
        query = query.eq('id', profile.sede_id);
      }
      
      const { data: sedesData, error } = await query;

      if (error) throw error;

      // Mapeia sedes com tipo correto
      const sedesTyped = (sedesData || []).map(sede => ({
        ...sede,
        tipo: sede.tipo as 'matriz' | 'regional',
      }));

      setSedes(sedesTyped);
    } catch (error) {
      console.error('Error fetching sedes:', error);
      setFetchError('Erro ao carregar sedes. Verifique suas permissões.');
      toast.error('Erro ao carregar sedes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('ativo', true)
        .order('nome_completo');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  // Fetch data when allowed
  useEffect(() => {
    if (isAllowed && !isChecking) {
      fetchSedes();
      fetchProfiles();
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


  const handleOpenDialog = (sede?: SedeWithResponsavel) => {
    if (sede) {
      setSelectedSede(sede);
      // Edição: substitui valor sem mexer em rascunho de "nova regional"
      resetFormData({
        nome: sede.nome,
        tipo: sede.tipo as 'matriz' | 'regional',
        endereco: sede.endereco || '',
        telefone: sede.telefone || '',
        email: sede.email || '',
        ativo: sede.ativo,
        responsavel_id: '',
      });
    } else {
      setSelectedSede(null);
      // Nova: se houver rascunho salvo, mantém; senão começa em branco.
      // O hook já carrega o draft automaticamente quando isDialogOpen abre.
      if (!hasFormDraft) {
        setFormData(SEDES_FORM_INITIAL);
      }
    }
    setIsDialogOpen(true);
  };

  const handleDiscardDraft = () => {
    resetFormData(SEDES_FORM_INITIAL);
    toast.info('Rascunho descartado');
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const sedeData = {
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        endereco: formData.endereco.trim() || null,
        telefone: formData.telefone.trim() || null,
        email: formData.email.trim() || null,
        ativo: formData.ativo,
      };

      if (selectedSede) {
        const { error } = await supabase
          .from('sedes')
          .update(sedeData)
          .eq('id', selectedSede.id);

        if (error) throw error;
        toast.success('Regional atualizada com sucesso');
      } else {
        const { data: newSede, error } = await supabase
          .from('sedes')
          .insert(sedeData)
          .select()
          .single();

        if (error) throw error;

        // Create default region for the sede
        const { error: regiaoError } = await supabase
          .from('regioes')
          .insert({
            nome: `Região ${formData.nome}`,
            sede_id: newSede.id,
            ativo: true,
          });

        if (regiaoError) {
          console.error('Error creating default region:', regiaoError);
        }

        // If responsavel is selected, update their profile
        if (formData.responsavel_id) {
          await supabase
            .from('profiles')
            .update({ sede_id: newSede.id })
            .eq('id', formData.responsavel_id);

          // Add admin_regional role
          await supabase
            .from('user_roles')
            .insert({
              user_id: formData.responsavel_id,
              role: 'admin_regional',
            });
        }

        toast.success('Regional criada com sucesso');
      }

      // Limpa rascunho ao salvar com sucesso
      clearFormDraft();
      setIsDialogOpen(false);
      fetchSedes();
    } catch (error: any) {
      console.error('Error saving sede:', error);
      toast.error(error.message || 'Erro ao salvar regional');
    }
  };

  const handleDelete = async () => {
    if (!selectedSede) return;

    try {
      const { error } = await supabase
        .from('sedes')
        .delete()
        .eq('id', selectedSede.id);

      if (error) throw error;

      toast.success('Regional excluída com sucesso');
      setIsDeleteDialogOpen(false);
      setSelectedSede(null);
      fetchSedes();
    } catch (error: any) {
      console.error('Error deleting sede:', error);
      toast.error(error.message || 'Erro ao excluir regional');
    }
  };

  const filteredSedes = sedes.filter(
    (sede) =>
      sede.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sede.endereco?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Admin Regional sees only their sede (read-only), Admin Principal has full control
  const canCreate = isAdminPrincipal;
  const canEdit = isAdminPrincipal;
  const canDelete = isAdminPrincipal;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isAdminRegional ? 'Minha Regional' : 'Sedes / Regionais'}
            </h1>
            <p className="text-muted-foreground">
              {isAdminRegional ? 'Visualize os dados da sua regional' : 'Gerencie as regionais da associação'}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Regional
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Regionais
              </CardTitle>
              <Building2 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sedes.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {sedes.filter(s => s.ativo).length} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Consultores
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalConsultores}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Associados
              </CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalAssociados}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <CardTitle>Regionais Cadastradas</CardTitle>
            <CardDescription>
              Lista de todas as regionais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar regional..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Regional</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Consultores</TableHead>
                    <TableHead>Associados</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : fetchError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-destructive">
                          <Building2 className="h-8 w-8" />
                          <p>{fetchError}</p>
                          <Button variant="outline" size="sm" onClick={fetchSedes}>
                            Tentar novamente
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSedes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhuma regional encontrada</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSedes.map((sede) => (
                      <TableRow key={sede.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{sede.nome}</p>
                              {sede.endereco && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {sede.endereco}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sede.tipo === 'matriz' ? 'default' : 'secondary'}>
                            {sede.tipo === 'matriz' ? 'Matriz' : 'Regional'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{getConsultoresCount(sede.id)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{getAssociadosCount(sede.id)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sede.ativo ? 'default' : 'secondary'}>
                            {sede.ativo ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(sede.created_at)}</TableCell>
                        <TableCell className="text-right">
                          {(canEdit || canDelete) && (
                            <div className="flex justify-end gap-2">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDialog(sede)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedSede(sede);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedSede ? 'Editar Regional' : 'Nova Regional'}
              </DialogTitle>
              <DialogDescription>
                {selectedSede
                  ? 'Atualize os dados da regional'
                  : 'Cadastre uma nova regional no sistema'}
              </DialogDescription>
            </DialogHeader>

            {!selectedSede && hasFormDraft && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  Rascunho restaurado automaticamente. Você pode continuar de onde parou.
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={handleDiscardDraft}
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpar
                </Button>
              </div>
            )}


            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Regional *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Regional São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: 'matriz' | 'regional') =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matriz">Matriz</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) =>
                    setFormData({ ...formData, endereco: e.target.value })
                  }
                  placeholder="Endereço completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({ ...formData, telefone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {!selectedSede && (
                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável (Admin Regional)</Label>
                  <Select
                    value={formData.responsavel_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, responsavel_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="ativo">Regional Ativa</Label>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, ativo: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {selectedSede ? 'Salvar' : 'Criar Regional'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Regional</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a regional "{selectedSede?.nome}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
