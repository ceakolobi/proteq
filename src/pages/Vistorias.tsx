import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ClipboardCheck, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Calendar,
  Car,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Vistoria {
  id: string;
  status: 'pendente' | 'em_andamento' | 'aprovada' | 'reprovada';
  data_agendada: string | null;
  data_realizada: string | null;
  observacoes: string | null;
  created_at: string;
  veiculo: {
    placa: string;
    marca: string;
    modelo: string;
    ano: number;
    associado: {
      nome_completo: string;
      telefone: string;
    };
  };
}

const statusConfig = {
  pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
  em_andamento: { label: 'Em Andamento', variant: 'default' as const, icon: Loader2 },
  aprovada: { label: 'Aprovada', variant: 'default' as const, icon: CheckCircle },
  reprovada: { label: 'Reprovada', variant: 'destructive' as const, icon: XCircle },
};

export default function Vistorias() {
  const { isAllowed, isChecking } = useAccessControl('consultor_or_above');
  const { isAdminPrincipal, hasRole } = useAuth();
  
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isVistoriador = hasRole('vistoriador');

  useEffect(() => {
    if (isAllowed && !isChecking) {
      fetchVistorias();
    }
  }, [isAllowed, isChecking]);

  const fetchVistorias = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vistorias')
        .select(`
          id,
          status,
          data_agendada,
          data_realizada,
          observacoes,
          created_at,
          veiculo:veiculos (
            placa,
            marca,
            modelo,
            ano,
            associado:associados (
              nome_completo,
              telefone
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        ...item,
        veiculo: {
          placa: item.veiculo?.placa || '',
          marca: item.veiculo?.marca || '',
          modelo: item.veiculo?.modelo || '',
          ano: item.veiculo?.ano || 0,
          associado: {
            nome_completo: item.veiculo?.associado?.nome_completo || '',
            telefone: item.veiculo?.associado?.telefone || '',
          }
        }
      })) as Vistoria[];
      
      setVistorias(transformedData);
    } catch (error) {
      console.error('Error fetching vistorias:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
      </div>
    );
  }

  if (!isAllowed) return null;

  const filteredVistorias = vistorias.filter(v => {
    const matchesSearch = 
      v.veiculo.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.veiculo.associado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${v.veiculo.marca} ${v.veiculo.modelo}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vistorias.length,
    pendentes: vistorias.filter(v => v.status === 'pendente').length,
    emAndamento: vistorias.filter(v => v.status === 'em_andamento').length,
    aprovadas: vistorias.filter(v => v.status === 'aprovada').length,
    reprovadas: vistorias.filter(v => v.status === 'reprovada').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              Vistorias
            </h1>
            <p className="text-muted-foreground">
              Gerenciamento de vistorias de veículos
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Pendentes
              </CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{stats.pendentes}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Loader2 className="h-4 w-4" /> Em Andamento
              </CardDescription>
              <CardTitle className="text-2xl text-blue-600">{stats.emAndamento}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Aprovadas
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.aprovadas}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <XCircle className="h-4 w-4" /> Reprovadas
              </CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.reprovadas}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, associado ou veículo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="reprovada">Reprovada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Vistorias</CardTitle>
            <CardDescription>
              {filteredVistorias.length} vistoria(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredVistorias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma vistoria encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Associado</TableHead>
                      <TableHead>Data Agendada</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVistorias.map((vistoria) => {
                      const StatusIcon = statusConfig[vistoria.status].icon;
                      return (
                        <TableRow key={vistoria.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{vistoria.veiculo.placa}</p>
                                <p className="text-sm text-muted-foreground">
                                  {vistoria.veiculo.marca} {vistoria.veiculo.modelo} {vistoria.veiculo.ano}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{vistoria.veiculo.associado.nome_completo}</p>
                              <p className="text-sm text-muted-foreground">{vistoria.veiculo.associado.telefone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {vistoria.data_agendada ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(vistoria.data_agendada), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Não agendada</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig[vistoria.status].variant} className="flex items-center gap-1 w-fit">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig[vistoria.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(vistoria.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
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
