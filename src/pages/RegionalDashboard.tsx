import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toLocalYMD } from '@/lib/dateUtils';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Building2,
  TrendingUp,
  FileText,
  Car,
  Search,
  Edit,
  Phone,
  Mail,
  Calendar,
  UserCheck,
  DollarSign,
  CheckCircle,
  Clock,
  Settings2,
  PlayCircle,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { format, subMonths, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Profile, Sede, Regiao } from '@/types/database';

interface ConsultorWithStats extends Profile {
  leads_count?: number;
  associados_count?: number;
}

interface RegionalStats {
  totalConsultores: number;
  totalAssociados: number;
  totalVeiculos: number;
  propostasMes: number;
  conversaoMes: number;
}

interface GrowthData {
  month: string;
  associados: number;
}

interface RecentAssociado {
  id: string;
  nome_completo: string;
  created_at: string;
  status: string;
  consultor_nome?: string;
}

interface ComissaoRow {
  id: string;
  associado_id: string;
  consultor_id: string | null;
  regional_id: string | null;
  mensalidade_base: number;
  percentual_consultor: number;
  percentual_regional: number;
  valor_consultor: number;
  valor_regional: number;
  valor_empresa: number;
  status: string;
  mes_referencia: string;
  pago_em: string | null;
  created_at: string;
  associado_nome?: string;
  consultor_nome?: string;
}

interface HistoricoComissao {
  mes: string;
  previsto: number;
  confirmado: number;
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RegionalDashboard() {
  const { user, profile, isAdminPrincipal } = useAuth();
  const { isAllowed, isChecking } = useAccessControl('admin_or_gerente');

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string | null>(null);
  const [selectedRegiaoId, setSelectedRegiaoId] = useState<string | null>(null);

  const [sede, setSede] = useState<Sede | null>(null);
  const [regiao, setRegiao] = useState<Regiao | null>(null);
  const [consultores, setConsultores] = useState<ConsultorWithStats[]>([]);
  const [stats, setStats] = useState<RegionalStats>({
    totalConsultores: 0,
    totalAssociados: 0,
    totalVeiculos: 0,
    propostasMes: 0,
    conversaoMes: 0,
  });
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [recentAssociados, setRecentAssociados] = useState<RecentAssociado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConsultor, setSelectedConsultor] = useState<ConsultorWithStats | null>(null);
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf: '',
    ativo: true,
  });

  // Comissões
  const [comissoes, setComissoes] = useState<ComissaoRow[]>([]);
  const [historicoComissoes, setHistoricoComissoes] = useState<HistoricoComissao[]>([]);
  const [mesReferencia, setMesReferencia] = useState(() => format(new Date(), 'yyyy-MM'));
  const [configRegional, setConfigRegional] = useState({ percentual_regional: 25, percentual_consultor: 15 });
  const [configConsultores, setConfigConsultores] = useState<Record<string, number>>({});
  const [isLoadingComissoes, setIsLoadingComissoes] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isGerandoComissoes, setIsGerandoComissoes] = useState(false);
  const [comissoesStats, setComissoesStats] = useState({ previsto: 0, confirmado: 0 });

  useEffect(() => {
    if (isAdminPrincipal) {
      fetchSedesAndRegioes();
    } else if (profile?.regiao_id) {
      setSelectedRegiaoId(profile.regiao_id);
      setSelectedSedeId(profile.sede_id || null);
    }
  }, [isAdminPrincipal, profile]);

  useEffect(() => {
    if (selectedRegiaoId) {
      fetchAllData();
    }
  }, [selectedRegiaoId]);

  useEffect(() => {
    if (selectedSedeId) {
      fetchComissoes();
      fetchConfigComissoes();
      fetchHistoricoComissoes();
    }
  }, [mesReferencia, selectedSedeId]);

  const fetchSedesAndRegioes = async () => {
    try {
      const { data: sedesData } = await supabase
        .from('sedes')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      setSedes((sedesData || []).map(s => ({ ...s, tipo: s.tipo as 'matriz' | 'regional' })));

      const { data: regioesData } = await supabase
        .from('regioes')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      setRegioes(regioesData || []);
    } catch (error) {
      console.error('Error fetching sedes/regioes:', error);
    }
  };

  const fetchAllData = async () => {
    if (!selectedRegiaoId) return;
    setIsLoading(true);
    await Promise.all([
      fetchRegiaoData(),
      fetchConsultores(),
      fetchStats(),
      fetchGrowthData(),
      fetchRecentAssociados(),
    ]);
    setIsLoading(false);
  };

  const fetchRegiaoData = async () => {
    if (!selectedRegiaoId) return;
    try {
      const { data: regiaoData } = await supabase
        .from('regioes')
        .select('*, sedes(*)')
        .eq('id', selectedRegiaoId)
        .single();
      if (regiaoData) {
        setRegiao(regiaoData);
        if (regiaoData.sedes) {
          setSede({ ...regiaoData.sedes, tipo: regiaoData.sedes.tipo as 'matriz' | 'regional' });
        }
      }
    } catch (error) {
      console.error('Error fetching regiao:', error);
    }
  };

  const fetchConsultores = async () => {
    if (!selectedRegiaoId) return;
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('regiao_id', selectedRegiaoId)
        .order('nome_completo');
      if (error) throw error;

      const consultoresWithStats = await Promise.all(
        (profilesData || []).map(async (consultor) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', consultor.id);
          const isConsultor = roles?.some(r => r.role === 'consultor_vendas');
          if (!isConsultor) return null;

          const { count: leadsCount } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('consultor_id', consultor.id);

          const { count: associadosCount } = await supabase
            .from('associados')
            .select('*', { count: 'exact', head: true })
            .eq('consultor_id', consultor.id);

          return { ...consultor, leads_count: leadsCount || 0, associados_count: associadosCount || 0 };
        })
      );
      setConsultores(consultoresWithStats.filter(Boolean) as ConsultorWithStats[]);
    } catch (error) {
      console.error('Error fetching consultores:', error);
      toast.error('Erro ao carregar consultores');
    }
  };

  const fetchStats = async () => {
    if (!selectedRegiaoId) return;
    try {
      const { count: consultoresCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('regiao_id', selectedRegiaoId);

      const { count: associadosCount } = await supabase
        .from('associados')
        .select('*', { count: 'exact', head: true })
        .eq('regiao_id', selectedRegiaoId);

      const { data: associadosIds } = await supabase
        .from('associados')
        .select('id')
        .eq('regiao_id', selectedRegiaoId);

      let veiculosCount = 0;
      if (associadosIds && associadosIds.length > 0) {
        const { count } = await supabase
          .from('veiculos')
          .select('*', { count: 'exact', head: true })
          .in('associado_id', associadosIds.map(a => a.id));
        veiculosCount = count || 0;
      }

      const startOfCurrentMonth = new Date();
      startOfCurrentMonth.setDate(1);
      startOfCurrentMonth.setHours(0, 0, 0, 0);

      const { data: consultoresData } = await supabase
        .from('profiles')
        .select('id')
        .eq('regiao_id', selectedRegiaoId);

      let propostasMes = 0;
      if (consultoresData && consultoresData.length > 0) {
        const { count } = await supabase
          .from('propostas')
          .select('*', { count: 'exact', head: true })
          .in('consultor_id', consultoresData.map(c => c.id))
          .gte('created_at', startOfCurrentMonth.toISOString());
        propostasMes = count || 0;
      }

      setStats({
        totalConsultores: consultoresCount || 0,
        totalAssociados: associadosCount || 0,
        totalVeiculos: veiculosCount,
        propostasMes,
        conversaoMes: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchGrowthData = async () => {
    if (!selectedRegiaoId) return;
    try {
      const months: GrowthData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const end = endOfMonth(date);
        const { count } = await supabase
          .from('associados')
          .select('*', { count: 'exact', head: true })
          .eq('regiao_id', selectedRegiaoId)
          .lte('created_at', end.toISOString());
        months.push({ month: format(date, 'MMM', { locale: ptBR }), associados: count || 0 });
      }
      setGrowthData(months);
    } catch (error) {
      console.error('Error fetching growth data:', error);
    }
  };

  const fetchRecentAssociados = async () => {
    if (!selectedRegiaoId) return;
    try {
      const { data } = await supabase
        .from('associados')
        .select('id, nome_completo, created_at, status, consultor_id')
        .eq('regiao_id', selectedRegiaoId)
        .order('created_at', { ascending: false })
        .limit(5);

      const associadosWithConsultor = await Promise.all(
        (data || []).map(async (associado) => {
          if (associado.consultor_id) {
            const { data: consultorData } = await supabase
              .from('profiles')
              .select('nome_completo')
              .eq('id', associado.consultor_id)
              .single();
            return { ...associado, consultor_nome: consultorData?.nome_completo || 'N/A' };
          }
          return { ...associado, consultor_nome: 'N/A' };
        })
      );
      setRecentAssociados(associadosWithConsultor);
    } catch (error) {
      console.error('Error fetching recent associados:', error);
    }
  };

  // ── Comissões ────────────────────────────────────────────────────────────────

  const fetchComissoes = async () => {
    if (!selectedSedeId) return;
    setIsLoadingComissoes(true);
    try {
      const mesStart = `${mesReferencia}-01`;
      const [ano, mes] = mesReferencia.split('-').map(Number);
      const mesEnd = toLocalYMD(new Date(ano, mes, 0));

      const { data, error } = await supabase
        .from('comissoes' as any)
        .select('*')
        .eq('regional_id', selectedSedeId)
        .gte('mes_referencia', mesStart)
        .lte('mes_referencia', mesEnd)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched: ComissaoRow[] = await Promise.all(
        ((data as unknown as ComissaoRow[]) || []).map(async (c) => {
          const { data: assoc } = await supabase
            .from('associados').select('nome_completo').eq('id', c.associado_id).single();
          const { data: cons } = c.consultor_id
            ? await supabase.from('profiles').select('nome_completo').eq('id', c.consultor_id).single()
            : { data: null };
          return { ...c, associado_nome: assoc?.nome_completo || 'N/A', consultor_nome: (cons as any)?.nome_completo || 'N/A' };
        })
      );

      setComissoes(enriched);
      const previsto = enriched.reduce((s, c) => s + (c.valor_regional || 0), 0);
      const confirmado = enriched.filter(c => c.status === 'confirmada').reduce((s, c) => s + (c.valor_regional || 0), 0);
      setComissoesStats({ previsto, confirmado });
    } catch (e: any) {
      toast.error('Erro ao buscar comissões');
    } finally {
      setIsLoadingComissoes(false);
    }
  };

  const fetchConfigComissoes = async () => {
    if (!selectedSedeId) return;
    try {
      const { data: configReg } = await supabase
        .from('configuracao_comissoes' as any)
        .select('*')
        .eq('regional_id', selectedSedeId)
        .is('consultor_id', null)
        .maybeSingle();

      if (configReg) {
        setConfigRegional({
          percentual_regional: (configReg as any).percentual_regional ?? 25,
          percentual_consultor: (configReg as any).percentual_consultor ?? 15,
        });
      }

      const { data: configCons } = await supabase
        .from('configuracao_comissoes' as any)
        .select('consultor_id, percentual_consultor')
        .eq('regional_id', selectedSedeId)
        .not('consultor_id', 'is', null);

      if (configCons) {
        const map: Record<string, number> = {};
        (configCons as any[]).forEach(c => { if (c.consultor_id) map[c.consultor_id] = c.percentual_consultor ?? 15; });
        setConfigConsultores(map);
      }
    } catch (e) {
      console.error('Error fetching config comissoes:', e);
    }
  };

  const fetchHistoricoComissoes = async () => {
    if (!selectedSedeId) return;
    try {
      const months: HistoricoComissao[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const mesStart = format(date, 'yyyy-MM-01');
        const mesEnd = format(endOfMonth(date), 'yyyy-MM-dd');

        const { data } = await supabase
          .from('comissoes' as any)
          .select('status, valor_regional')
          .eq('regional_id', selectedSedeId)
          .gte('mes_referencia', mesStart)
          .lte('mes_referencia', mesEnd);

        const rows = (data as any[]) || [];
        months.push({
          mes: format(date, 'MMM', { locale: ptBR }),
          previsto: rows.reduce((s: number, c: any) => s + (c.valor_regional || 0), 0),
          confirmado: rows.filter((c: any) => c.status === 'confirmada').reduce((s: number, c: any) => s + (c.valor_regional || 0), 0),
        });
      }
      setHistoricoComissoes(months);
    } catch (e) {
      console.error('Error fetching historico comissoes:', e);
    }
  };

  const salvarConfig = async () => {
    if (!selectedSedeId) return;
    setIsSavingConfig(true);
    try {
      const { data: existing } = await supabase
        .from('configuracao_comissoes' as any)
        .select('id')
        .eq('regional_id', selectedSedeId)
        .is('consultor_id', null)
        .maybeSingle();

      if ((existing as any)?.id) {
        await supabase.from('configuracao_comissoes' as any).update({
          percentual_regional: configRegional.percentual_regional,
          percentual_consultor: configRegional.percentual_consultor,
          updated_at: new Date().toISOString(),
        }).eq('id', (existing as any).id);
      } else {
        await supabase.from('configuracao_comissoes' as any).insert({
          regional_id: selectedSedeId,
          consultor_id: null,
          percentual_regional: configRegional.percentual_regional,
          percentual_consultor: configRegional.percentual_consultor,
          created_by: user?.id,
        });
      }

      for (const [consultorId, pct] of Object.entries(configConsultores)) {
        const { data: existingCons } = await supabase
          .from('configuracao_comissoes' as any)
          .select('id')
          .eq('regional_id', selectedSedeId)
          .eq('consultor_id', consultorId)
          .maybeSingle();

        if ((existingCons as any)?.id) {
          await supabase.from('configuracao_comissoes' as any)
            .update({ percentual_consultor: pct, updated_at: new Date().toISOString() })
            .eq('id', (existingCons as any).id);
        } else {
          await supabase.from('configuracao_comissoes' as any).insert({
            regional_id: selectedSedeId,
            consultor_id: consultorId,
            percentual_consultor: pct,
            percentual_regional: configRegional.percentual_regional,
            created_by: user?.id,
          });
        }
      }

      toast.success('Configuração salva');
    } catch (e: any) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const gerarComissoes = async () => {
    if (!selectedSedeId || !selectedRegiaoId) return;
    setIsGerandoComissoes(true);
    try {
      const mesStart = `${mesReferencia}-01`;

      const { data: assocData } = await supabase
        .from('associados')
        .select('id, consultor_id')
        .eq('regiao_id', selectedRegiaoId)
        .eq('status', 'ativo');

      if (!assocData?.length) {
        toast.info('Nenhum associado ativo na regional');
        return;
      }

      const { data: existing } = await supabase
        .from('comissoes' as any)
        .select('associado_id')
        .eq('regional_id', selectedSedeId)
        .eq('mes_referencia', mesStart);

      const existingIds = new Set(((existing as any[]) || []).map(e => e.associado_id));
      const novos = assocData.filter(a => !existingIds.has(a.id));

      if (!novos.length) {
        toast.info('Comissões já geradas para este mês');
        return;
      }

      let gerados = 0;
      for (const assoc of novos) {
        const { data: veiculo } = await supabase
          .from('veiculos')
          .select('mensalidade')
          .eq('associado_id', assoc.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const mensalidade = (veiculo as any)?.mensalidade || 0;
        if (!mensalidade) continue;

        const pctConsultor = (assoc.consultor_id && configConsultores[assoc.consultor_id])
          ? configConsultores[assoc.consultor_id]
          : configRegional.percentual_consultor;
        const pctRegional = configRegional.percentual_regional;

        const valorConsultor = mensalidade * pctConsultor / 100;
        const valorRegional = mensalidade * pctRegional / 100;
        const valorEmpresa = mensalidade - valorConsultor - valorRegional;

        await supabase.from('comissoes' as any).insert({
          associado_id: assoc.id,
          consultor_id: assoc.consultor_id,
          regional_id: selectedSedeId,
          mensalidade_base: mensalidade,
          percentual_consultor: pctConsultor,
          percentual_regional: pctRegional,
          valor_consultor: valorConsultor,
          valor_regional: valorRegional,
          valor_empresa: valorEmpresa,
          status: 'prevista',
          mes_referencia: mesStart,
        });
        gerados++;
      }

      toast.success(`${gerados} comissão(ões) gerada(s)`);
      fetchComissoes();
      fetchHistoricoComissoes();
    } catch (e: any) {
      toast.error('Erro ao gerar comissões');
    } finally {
      setIsGerandoComissoes(false);
    }
  };

  const confirmarPagamento = async (comissaoId: string) => {
    try {
      await supabase.from('comissoes' as any)
        .update({ status: 'confirmada', pago_em: new Date().toISOString() })
        .eq('id', comissaoId);
      toast.success('Pagamento confirmado');
      fetchComissoes();
      fetchHistoricoComissoes();
    } catch (e: any) {
      toast.error('Erro ao confirmar pagamento');
    }
  };

  // ── Dialog helpers ────────────────────────────────────────────────────────────

  const handleOpenDialog = (consultor?: ConsultorWithStats) => {
    if (consultor) {
      setSelectedConsultor(consultor);
      setFormData({ nome_completo: consultor.nome_completo, email: consultor.email, telefone: consultor.telefone || '', cpf: consultor.cpf || '', ativo: consultor.ativo });
    } else {
      setSelectedConsultor(null);
      setFormData({ nome_completo: '', email: '', telefone: '', cpf: '', ativo: true });
    }
    setIsDialogOpen(true);
  };

  const handleSaveConsultor = async () => {
    if (!formData.nome_completo.trim() || !formData.email.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    try {
      if (selectedConsultor) {
        const { error } = await supabase
          .from('profiles')
          .update({ nome_completo: formData.nome_completo.trim(), telefone: formData.telefone.trim() || null, cpf: formData.cpf.trim() || null, ativo: formData.ativo })
          .eq('id', selectedConsultor.id);
        if (error) throw error;
        toast.success('Consultor atualizado com sucesso');
      } else {
        toast.info('Para criar um novo consultor, o usuário deve se cadastrar e você poderá atribuir a permissão.');
      }
      setIsDialogOpen(false);
      fetchConsultores();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar consultor');
    }
  };

  const handleSedeChange = (sedeId: string) => {
    setSelectedSedeId(sedeId);
    setSelectedRegiaoId(null);
    setConsultores([]);
    setRecentAssociados([]);
    setGrowthData([]);
    setComissoes([]);
    setStats({ totalConsultores: 0, totalAssociados: 0, totalVeiculos: 0, propostasMes: 0, conversaoMes: 0 });
  };

  const filteredConsultores = consultores.filter(
    c => c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredRegioes = selectedSedeId ? regioes.filter(r => r.sede_id === selectedSedeId) : regioes;

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</div>
      </div>
    );
  }
  if (!isAllowed) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Painel Regional</h1>
              <p className="text-muted-foreground">
                {isAdminPrincipal ? 'Visualize dados de qualquer regional' : `Gerencie sua regional - ${regiao?.nome || ''}`}
              </p>
            </div>
          </div>
          <Badge variant="default" className="w-fit">
            {isAdminPrincipal ? 'Admin Principal' : 'Admin Regional'}
          </Badge>
        </div>

        {/* Seletor para Admin Principal */}
        {isAdminPrincipal && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecione uma Regional</CardTitle>
              <CardDescription>Escolha a sede e região para visualizar os dados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sede</Label>
                  <Select value={selectedSedeId || ''} onValueChange={handleSedeChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma sede" /></SelectTrigger>
                    <SelectContent>
                      {sedes.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Região</Label>
                  <Select value={selectedRegiaoId || ''} onValueChange={v => setSelectedRegiaoId(v)} disabled={!selectedSedeId}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma região" /></SelectTrigger>
                    <SelectContent>
                      {filteredRegioes.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedRegiaoId ? (
          <>
            {regiao && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{sede?.nome}</span>
                <span>•</span>
                <span className="font-medium text-foreground">{regiao.nome}</span>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Consultores</CardTitle>
                  <Users className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalConsultores}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ativos na regional</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Associados</CardTitle>
                  <Users className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalAssociados}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total da regional</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Veículos Protegidos</CardTitle>
                  <Car className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalVeiculos}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Propostas (Mês)</CardTitle>
                  <FileText className="h-5 w-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.propostasMes}</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="consultores" className="space-y-4">
              <TabsList>
                <TabsTrigger value="consultores">Consultores</TabsTrigger>
                <TabsTrigger value="comissoes">Comissões</TabsTrigger>
                <TabsTrigger value="relatorio">Relatório</TabsTrigger>
              </TabsList>

              {/* ── Tab: Consultores ── */}
              <TabsContent value="consultores">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle>Consultores da Regional</CardTitle>
                        <CardDescription>Gerencie os consultores vinculados à regional</CardDescription>
                      </div>
                      <Button onClick={() => handleOpenDialog()}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Novo Consultor
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar consultor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Consultor</TableHead>
                            <TableHead>Contato</TableHead>
                            <TableHead>Leads</TableHead>
                            <TableHead>Associados</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                          ) : filteredConsultores.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8">Nenhum consultor encontrado</TableCell></TableRow>
                          ) : filteredConsultores.map(consultor => (
                            <TableRow key={consultor.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-medium text-primary">
                                      {consultor.nome_completo.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="font-medium">{consultor.nome_completo}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="text-sm flex items-center gap-1"><Mail className="h-3 w-3" />{consultor.email}</p>
                                  {consultor.telefone && <p className="text-sm flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{consultor.telefone}</p>}
                                </div>
                              </TableCell>
                              <TableCell><span className="font-medium">{consultor.leads_count || 0}</span></TableCell>
                              <TableCell><span className="font-medium">{consultor.associados_count || 0}</span></TableCell>
                              <TableCell><Badge variant={consultor.ativo ? 'default' : 'secondary'}>{consultor.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(consultor)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Tab: Comissões ── */}
              <TabsContent value="comissoes" className="space-y-6">
                {/* Cards resumo financeiro */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Previsto (mês)</CardTitle>
                      <Clock className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">{fmtBRL(comissoesStats.previsto)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Aguardando confirmação</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Confirmado (mês)</CardTitle>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{fmtBRL(comissoesStats.confirmado)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Pagamentos confirmados</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Associados ativos</CardTitle>
                      <Users className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalAssociados}</div>
                      <p className="text-xs text-muted-foreground mt-1">Na regional</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Consultores</CardTitle>
                      <Users className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalConsultores}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Configuração de comissões */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Settings2 className="h-4 w-4 text-orange-500" />
                      Configuração de Comissões
                    </CardTitle>
                    <CardDescription>Defina os percentuais para esta regional</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>% Regional (padrão)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={configRegional.percentual_regional}
                            onChange={e => setConfigRegional(p => ({ ...p, percentual_regional: Number(e.target.value) }))}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>% Consultor (padrão)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={configRegional.percentual_consultor}
                            onChange={e => setConfigRegional(p => ({ ...p, percentual_consultor: Number(e.target.value) }))}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>

                    {consultores.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">% Individual por Consultor</Label>
                        <div className="space-y-2">
                          {consultores.map(c => (
                            <div key={c.id} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-muted/40">
                              <span className="text-sm font-medium">{c.nome_completo}</span>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={5}
                                  max={20}
                                  value={configConsultores[c.id] ?? configRegional.percentual_consultor}
                                  onChange={e => setConfigConsultores(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                                  className="w-20 h-8 text-sm"
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button onClick={salvarConfig} disabled={isSavingConfig} className="bg-orange-600 hover:bg-orange-700 text-white">
                      {isSavingConfig ? 'Salvando...' : 'Salvar Configuração'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Tabela de comissões */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          Comissões do Mês
                        </CardTitle>
                        <CardDescription>Gerencie e confirme os pagamentos</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="month"
                          value={mesReferencia}
                          onChange={e => setMesReferencia(e.target.value)}
                          className="w-40"
                        />
                        <Button
                          onClick={gerarComissoes}
                          disabled={isGerandoComissoes || !selectedRegiaoId}
                          variant="outline"
                          size="sm"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          {isGerandoComissoes ? 'Gerando...' : 'Gerar'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Associado</TableHead>
                            <TableHead>Consultor</TableHead>
                            <TableHead className="text-right">Mensalidade</TableHead>
                            <TableHead className="text-right">Regional</TableHead>
                            <TableHead className="text-right">Consultor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingComissoes ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
                          ) : comissoes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                Nenhuma comissão para este mês. Clique em "Gerar" para criar.
                              </TableCell>
                            </TableRow>
                          ) : comissoes.map(c => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.associado_nome}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{c.consultor_nome}</TableCell>
                              <TableCell className="text-right">{fmtBRL(c.mensalidade_base)}</TableCell>
                              <TableCell className="text-right text-orange-600 font-medium">{fmtBRL(c.valor_regional)}</TableCell>
                              <TableCell className="text-right text-blue-600 font-medium">{fmtBRL(c.valor_consultor)}</TableCell>
                              <TableCell>
                                <Badge className={c.status === 'confirmada'
                                  ? 'bg-green-100 text-green-800 border-green-300 border'
                                  : 'bg-amber-100 text-amber-800 border-amber-300 border'}>
                                  {c.status === 'confirmada' ? 'Confirmada' : 'Prevista'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {c.pago_em ? format(new Date(c.pago_em), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                              </TableCell>
                              <TableCell>
                                {c.status === 'prevista' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-green-400 text-green-700 hover:bg-green-50"
                                    onClick={() => confirmarPagamento(c.id)}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Confirmar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico histórico */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Histórico de Comissões (6 meses)
                    </CardTitle>
                    <CardDescription>Previsto vs confirmado por mês</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {historicoComissoes.every(m => m.previsto === 0) ? (
                      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                        Sem dados de comissões ainda
                      </div>
                    ) : (
                      <ChartContainer
                        config={{
                          previsto: { label: 'Previsto', color: '#f59e0b' },
                          confirmado: { label: 'Confirmado', color: '#22c55e' },
                        }}
                        className="h-48 w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={historicoComissoes} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                            <ChartTooltip content={<ChartTooltipContent />} formatter={(v: any) => fmtBRL(v)} />
                            <Legend />
                            <Bar dataKey="previsto" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="confirmado" fill="#22c55e" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Tab: Relatório ── */}
              <TabsContent value="relatorio">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Evolução de Associados
                      </CardTitle>
                      <CardDescription>Crescimento nos últimos 6 meses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {growthData.length === 0 ? (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sem dados disponíveis</div>
                      ) : (
                        <ChartContainer config={{ associados: { label: 'Associados', color: 'hsl(var(--primary))' } }} className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorAssociadosRegional" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Area type="monotone" dataKey="associados" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorAssociadosRegional)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-green-600" />
                          Últimos Associados
                        </CardTitle>
                        <CardDescription>Cadastrados recentemente na regional</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {recentAssociados.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">Nenhum associado cadastrado</p>
                        ) : (
                          <div className="space-y-3">
                            {recentAssociados.map(associado => (
                              <div key={associado.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-green-500/10 rounded-md"><Users className="h-4 w-4 text-green-600" /></div>
                                  <div>
                                    <span className="font-medium">{associado.nome_completo}</span>
                                    <p className="text-xs text-muted-foreground">Consultor: {associado.consultor_nome}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant={associado.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">{associado.status}</Badge>
                                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(associado.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-primary" />
                          Ranking de Consultores
                        </CardTitle>
                        <CardDescription>Por número de associados</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {consultores
                            .sort((a, b) => (b.associados_count || 0) - (a.associados_count || 0))
                            .slice(0, 5)
                            .map((consultor, index) => (
                              <div key={consultor.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">{index + 1}</div>
                                  <span className="font-medium">{consultor.nome_completo}</span>
                                </div>
                                <Badge variant="secondary">{consultor.associados_count || 0} associados</Badge>
                              </div>
                            ))}
                          {consultores.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">Nenhum consultor cadastrado</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader><CardTitle className="text-lg">Resumo de Performance</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {[
                          { label: 'Consultores', value: stats.totalConsultores },
                          { label: 'Associados', value: stats.totalAssociados },
                          { label: 'Veículos', value: stats.totalVeiculos },
                          { label: 'Propostas/Mês', value: stats.propostasMes },
                          { label: 'Média/Consultor', value: stats.totalConsultores > 0 ? (stats.totalAssociados / stats.totalConsultores).toFixed(1) : 0 },
                        ].map(item => (
                          <div key={item.label} className="p-4 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{item.value}</p>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Selecione uma regional para visualizar os dados</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Consultor Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedConsultor ? 'Editar Consultor' : 'Novo Consultor'}</DialogTitle>
              <DialogDescription>
                {selectedConsultor ? 'Atualize os dados do consultor' : 'Para adicionar um novo consultor, o usuário deve se cadastrar no sistema primeiro'}
              </DialogDescription>
            </DialogHeader>
            {selectedConsultor ? (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input id="nome" value={formData.nome_completo} onChange={e => setFormData({ ...formData, nome_completo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={formData.email} disabled className="bg-muted" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo">Consultor Ativo</Label>
                  <Switch id="ativo" checked={formData.ativo} onCheckedChange={checked => setFormData({ ...formData, ativo: checked })} />
                </div>
              </div>
            ) : (
              <div className="py-4">
                <p className="text-muted-foreground">Para vincular um novo consultor à sua regional:</p>
                <ol className="list-decimal list-inside mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>Solicite que o usuário se cadastre no sistema</li>
                  <li>Acesse a página de Usuários (se Admin Principal)</li>
                  <li>Atribua o papel de Consultor ao usuário</li>
                  <li>Defina a regional do consultor</li>
                </ol>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              {selectedConsultor && <Button onClick={handleSaveConsultor}>Salvar</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
