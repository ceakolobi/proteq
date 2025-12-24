import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Vistoria {
  id: string;
  veiculo_id: string;
  status: 'pendente' | 'em_andamento' | 'aprovada' | 'reprovada';
  data_agendada: string | null;
  data_realizada: string | null;
  observacoes: string | null;
  created_at: string;
}

const statusConfig = {
  pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
  em_andamento: { label: 'Em Andamento', variant: 'default' as const, icon: Loader2 },
  aprovada: { label: 'Aprovada', variant: 'default' as const, icon: CheckCircle },
  reprovada: { label: 'Reprovada', variant: 'destructive' as const, icon: XCircle },
};

export default function Vistorias() {
  const navigate = useNavigate();
  const { hasAnyRole, isAdminPrincipal } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('authenticated');

  // Admin Principal tem acesso total, outros verificam roles específicas
  const canAccessPage = isAdminPrincipal || hasAnyRole(['admin_regional', 'vistoriador']);

  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    document.title = 'Vistorias | MARKA CRM';
  }, []);

  useEffect(() => {
    if (isAllowed && !isChecking && canAccessPage) {
      fetchVistorias();
    }
  }, [isAllowed, isChecking, canAccessPage]);

  const fetchVistorias = async () => {
    setIsLoading(true);
    try {
      // Importante: consulta somente na tabela vistorias para respeitar permissões (evita joins que podem falhar por RLS)
      const { data, error } = await supabase
        .from('vistorias')
        .select('id, veiculo_id, status, data_agendada, data_realizada, observacoes, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVistorias((data || []) as Vistoria[]);
    } catch (error) {
      console.error('Error fetching vistorias:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!canAccessPage) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar o módulo de Vistorias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const filteredVistorias = vistorias.filter((v) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      v.id.toLowerCase().includes(search) ||
      v.veiculo_id.toLowerCase().includes(search) ||
      (v.observacoes || '').toLowerCase().includes(search);

    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vistorias.length,
    pendentes: vistorias.filter((v) => v.status === 'pendente').length,
    emAndamento: vistorias.filter((v) => v.status === 'em_andamento').length,
    aprovadas: vistorias.filter((v) => v.status === 'aprovada').length,
    reprovadas: vistorias.filter((v) => v.status === 'reprovada').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              Vistorias
            </h1>
            <p className="text-muted-foreground">Gerenciamento de vistorias</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-5" aria-label="Indicadores de vistorias">
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
              <CardTitle className="text-2xl">{stats.pendentes}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Loader2 className="h-4 w-4" /> Em Andamento
              </CardDescription>
              <CardTitle className="text-2xl">{stats.emAndamento}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Aprovadas
              </CardDescription>
              <CardTitle className="text-2xl">{stats.aprovadas}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <XCircle className="h-4 w-4" /> Reprovadas
              </CardDescription>
              <CardTitle className="text-2xl">{stats.reprovadas}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section aria-label="Filtros">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ID, veiculo_id ou observações..."
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
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="aprovada">Aprovada</SelectItem>
                    <SelectItem value="reprovada">Reprovada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        <main>
          <Card>
            <CardHeader>
              <CardTitle>Lista de Vistorias</CardTitle>
              <CardDescription>{filteredVistorias.length} vistoria(s) encontrada(s)</CardDescription>
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
                        <TableHead>ID</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Data Agendada</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVistorias.map((vistoria) => {
                        const StatusIcon = statusConfig[vistoria.status].icon;
                        return (
                          <TableRow key={vistoria.id}>
                            <TableCell className="font-mono text-xs">{vistoria.id}</TableCell>
                            <TableCell className="font-mono text-xs">{vistoria.veiculo_id}</TableCell>
                            <TableCell>
                              {vistoria.data_agendada ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {format(new Date(vistoria.data_agendada), 'dd/MM/yyyy', { locale: ptBR })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Não agendada</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={statusConfig[vistoria.status].variant}
                                className="flex items-center gap-1 w-fit"
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig[vistoria.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(vistoria.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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
        </main>
      </div>
    </DashboardLayout>
  );
}
