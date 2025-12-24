import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useAuth } from '@/contexts/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import {
  useReportData,
  RegionalReportItem,
  ConsultorReportItem,
  InadimplenciaReportItem,
  SinistroReportItem,
  ReportFilters,
} from '@/hooks/useReportData';
import { exportToExcel, exportToPDF, formatCurrency, formatDate, formatPercent, ExportColumn } from '@/lib/exportUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Building2, 
  Users, 
  AlertTriangle, 
  Car,
  Filter,
  Loader2,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

type ReportType = 'regional' | 'consultor' | 'inadimplencia' | 'sinistro';

export default function Relatorios() {
  const { isAllowed, isChecking } = useAccessControl('consultor_or_above');
  const { isAdminPrincipal, hasRole, profile } = useAuth();
  const { regioes, consultores } = useReferenceData({ loadRegioes: true, loadConsultores: true });
  const { isLoading, fetchRegionalReport, fetchConsultorReport, fetchInadimplenciaReport, fetchSinistroReport } = useReportData();

  const [activeTab, setActiveTab] = useState<ReportType>('regional');
  const [filters, setFilters] = useState<ReportFilters>({
    regiaoId: 'all',
    consultorId: 'all',
    dateFrom: '',
    dateTo: '',
  });

  // Report data states
  const [regionalData, setRegionalData] = useState<RegionalReportItem[]>([]);
  const [consultorData, setConsultorData] = useState<ConsultorReportItem[]>([]);
  const [inadimplenciaData, setInadimplenciaData] = useState<InadimplenciaReportItem[]>([]);
  const [sinistroData, setSinistroData] = useState<SinistroReportItem[]>([]);

  const isAdminRegional = hasRole('admin_regional') && !isAdminPrincipal;
  const isConsultor = hasRole('consultor_vendas') && !isAdminPrincipal && !isAdminRegional;

  const loadReport = async () => {
    try {
      switch (activeTab) {
        case 'regional':
          const regional = await fetchRegionalReport(filters);
          setRegionalData(regional);
          break;
        case 'consultor':
          const consultor = await fetchConsultorReport(filters);
          setConsultorData(consultor);
          break;
        case 'inadimplencia':
          const inadimplencia = await fetchInadimplenciaReport(filters);
          setInadimplenciaData(inadimplencia);
          break;
        case 'sinistro':
          const sinistro = await fetchSinistroReport(filters);
          setSinistroData(sinistro);
          break;
      }
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Erro ao carregar relatório');
    }
  };

  useEffect(() => {
    if (isAllowed && !isChecking) {
      loadReport();
    }
  }, [isAllowed, isChecking, activeTab]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
      </div>
    );
  }

  if (!isAllowed) return null;

  // Export handlers
  const handleExportExcel = () => {
    const { data, columns, filename } = getExportData();
    if (data.length === 0) {
      toast.warning('Nenhum dado para exportar');
      return;
    }
    exportToExcel(data, columns, filename);
    toast.success('Arquivo Excel gerado com sucesso');
  };

  const handleExportPDF = () => {
    const { data, columns, title } = getExportData();
    if (data.length === 0) {
      toast.warning('Nenhum dado para exportar');
      return;
    }
    exportToPDF(data, columns, title);
  };

  const getExportData = (): { data: any[]; columns: ExportColumn[]; filename: string; title: string } => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (activeTab) {
      case 'regional':
        return {
          data: regionalData,
          columns: [
            { header: 'Regional', accessor: 'regiao_nome' },
            { header: 'Total Associados', accessor: 'total_associados' },
            { header: 'Ativos', accessor: 'associados_ativos' },
            { header: 'Veículos', accessor: 'total_veiculos' },
            { header: 'Faturamento', accessor: 'faturamento_mensal', format: formatCurrency },
          ],
          filename: `relatorio-regional-${today}`,
          title: 'Relatório por Regional',
        };
      case 'consultor':
        return {
          data: consultorData,
          columns: [
            { header: 'Consultor', accessor: 'consultor_nome' },
            { header: 'Regional', accessor: 'regiao_nome' },
            { header: 'Associados', accessor: 'total_associados' },
            { header: 'Ativos', accessor: 'associados_ativos' },
            { header: 'Veículos', accessor: 'total_veiculos' },
            { header: 'Leads', accessor: 'leads_total' },
            { header: 'Convertidos', accessor: 'leads_convertidos' },
            { header: 'Taxa Conversão', accessor: 'taxa_conversao', format: formatPercent },
          ],
          filename: `relatorio-consultores-${today}`,
          title: 'Relatório por Consultor',
        };
      case 'inadimplencia':
        return {
          data: inadimplenciaData,
          columns: [
            { header: 'Associado', accessor: 'associado_nome' },
            { header: 'CPF', accessor: 'cpf' },
            { header: 'Telefone', accessor: 'telefone' },
            { header: 'Consultor', accessor: 'consultor_nome' },
            { header: 'Regional', accessor: 'regiao_nome' },
            { header: 'Valor Devido', accessor: 'valor_devido', format: formatCurrency },
            { header: 'Dias Atraso', accessor: 'dias_atraso' },
          ],
          filename: `relatorio-inadimplencia-${today}`,
          title: 'Relatório de Inadimplência',
        };
      case 'sinistro':
        return {
          data: sinistroData,
          columns: [
            { header: 'Data', accessor: 'data_acionamento', format: formatDate },
            { header: 'Associado', accessor: 'associado_nome' },
            { header: 'Veículo', accessor: 'veiculo_info' },
            { header: 'Origem', accessor: 'origem' },
            { header: 'Destino', accessor: 'destino' },
            { header: 'KM', accessor: 'km_utilizado' },
          ],
          filename: `relatorio-sinistros-${today}`,
          title: 'Relatório de Sinistros/Acionamentos',
        };
      default:
        return { data: [], columns: [], filename: '', title: '' };
    }
  };

  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(activeTab === 'regional' || activeTab === 'inadimplencia') && !isConsultor && (
            <div className="space-y-2">
              <Label>Regional</Label>
              <Select value={filters.regiaoId} onValueChange={(v) => setFilters(prev => ({ ...prev, regiaoId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {regioes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeTab === 'consultor' && !isConsultor && (
            <div className="space-y-2">
              <Label>Consultor</Label>
              <Select value={filters.consultorId} onValueChange={(v) => setFilters(prev => ({ ...prev, consultorId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {consultores.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeTab === 'sinistro' && (
            <>
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </>
          )}

          <div className="flex items-end">
            <Button onClick={loadReport} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderExportButtons = () => (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleExportExcel}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Excel
      </Button>
      <Button variant="outline" onClick={handleExportPDF}>
        <FileText className="h-4 w-4 mr-2" />
        PDF
      </Button>
    </div>
  );

  const renderRegionalReport = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Relatório por Regional
        </CardTitle>
        {renderExportButtons()}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : regionalData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum dado encontrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Regional</TableHead>
                <TableHead className="text-right">Total Associados</TableHead>
                <TableHead className="text-right">Ativos</TableHead>
                <TableHead className="text-right">Veículos</TableHead>
                <TableHead className="text-right">Faturamento Mensal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionalData.map(item => (
                <TableRow key={item.regiao_id}>
                  <TableCell className="font-medium">{item.regiao_nome}</TableCell>
                  <TableCell className="text-right">{item.total_associados}</TableCell>
                  <TableCell className="text-right">{item.associados_ativos}</TableCell>
                  <TableCell className="text-right">{item.total_veiculos}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    {formatCurrency(item.faturamento_mensal)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{regionalData.reduce((s, i) => s + i.total_associados, 0)}</TableCell>
                <TableCell className="text-right">{regionalData.reduce((s, i) => s + i.associados_ativos, 0)}</TableCell>
                <TableCell className="text-right">{regionalData.reduce((s, i) => s + i.total_veiculos, 0)}</TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(regionalData.reduce((s, i) => s + i.faturamento_mensal, 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  const renderConsultorReport = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Relatório por Consultor
        </CardTitle>
        {renderExportButtons()}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : consultorData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum dado encontrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultor</TableHead>
                <TableHead>Regional</TableHead>
                <TableHead className="text-right">Associados</TableHead>
                <TableHead className="text-right">Ativos</TableHead>
                <TableHead className="text-right">Veículos</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Convertidos</TableHead>
                <TableHead className="text-right">Taxa Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultorData.map(item => (
                <TableRow key={item.consultor_id}>
                  <TableCell className="font-medium">{item.consultor_nome}</TableCell>
                  <TableCell>{item.regiao_nome}</TableCell>
                  <TableCell className="text-right">{item.total_associados}</TableCell>
                  <TableCell className="text-right">{item.associados_ativos}</TableCell>
                  <TableCell className="text-right">{item.total_veiculos}</TableCell>
                  <TableCell className="text-right">{item.leads_total}</TableCell>
                  <TableCell className="text-right">{item.leads_convertidos}</TableCell>
                  <TableCell className="text-right">
                    <span className={item.taxa_conversao >= 50 ? 'text-green-600' : item.taxa_conversao >= 25 ? 'text-yellow-600' : 'text-red-600'}>
                      {formatPercent(item.taxa_conversao)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  const renderInadimplenciaReport = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Relatório de Inadimplência
        </CardTitle>
        {renderExportButtons()}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : inadimplenciaData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum associado inadimplente encontrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Associado</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead>Regional</TableHead>
                <TableHead className="text-right">Valor Devido</TableHead>
                <TableHead className="text-right">Dias Atraso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inadimplenciaData.map(item => (
                <TableRow key={item.associado_id}>
                  <TableCell className="font-medium">{item.associado_nome}</TableCell>
                  <TableCell>{item.cpf}</TableCell>
                  <TableCell>{item.telefone}</TableCell>
                  <TableCell>{item.consultor_nome}</TableCell>
                  <TableCell>{item.regiao_nome}</TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    {formatCurrency(item.valor_devido)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={item.dias_atraso > 30 ? 'text-red-600 font-bold' : item.dias_atraso > 15 ? 'text-orange-500' : ''}>
                      {item.dias_atraso} dias
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={5}>TOTAL ({inadimplenciaData.length} inadimplentes)</TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(inadimplenciaData.reduce((s, i) => s + i.valor_devido, 0))}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  const renderSinistroReport = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Relatório de Sinistros/Acionamentos
        </CardTitle>
        {renderExportButtons()}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sinistroData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum acionamento encontrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Associado</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">KM</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sinistroData.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.data_acionamento)}</TableCell>
                  <TableCell className="font-medium">{item.associado_nome}</TableCell>
                  <TableCell>{item.veiculo_info}</TableCell>
                  <TableCell>{item.origem || '-'}</TableCell>
                  <TableCell>{item.destino || '-'}</TableCell>
                  <TableCell className="text-right">{item.km_utilizado}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.observacoes || '-'}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={5}>TOTAL ({sinistroData.length} acionamentos)</TableCell>
                <TableCell className="text-right">
                  {sinistroData.reduce((s, i) => s + i.km_utilizado, 0)} km
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Relatórios Inteligentes
            </h1>
            <p className="text-muted-foreground">
              Visualize e exporte relatórios do sistema
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="regional" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Regional</span>
            </TabsTrigger>
            <TabsTrigger value="consultor" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Consultor</span>
            </TabsTrigger>
            <TabsTrigger value="inadimplencia" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Inadimplência</span>
            </TabsTrigger>
            <TabsTrigger value="sinistro" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Sinistro</span>
            </TabsTrigger>
          </TabsList>

          {renderFilters()}

          <TabsContent value="regional">{renderRegionalReport()}</TabsContent>
          <TabsContent value="consultor">{renderConsultorReport()}</TabsContent>
          <TabsContent value="inadimplencia">{renderInadimplenciaReport()}</TabsContent>
          <TabsContent value="sinistro">{renderSinistroReport()}</TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
