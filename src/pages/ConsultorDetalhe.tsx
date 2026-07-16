import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccessControl, ACCESS_CHECKING_MESSAGE } from '@/hooks/useAccessControl';
import { useReferenceData } from '@/hooks/useReferenceData';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Car,
  DollarSign,
  Phone,
  Mail,
  Building2,
  Globe,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface PlacaRow {
  veiculo_id: string;
  placa: string;
  marca: string;
  modelo: string;
  mensalidade: number;
  veiculo_status: string;
  associado_nome: string;
}

export default function ConsultorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl('admin_or_gerente_or_financeiro', { redirectOnDeny: false });
  const { getRegiaoNome } = useReferenceData({ loadRegioes: true });

  const [isLoading, setIsLoading] = useState(true);
  const [consultor, setConsultor] = useState<any>(null);
  const [detalhes, setDetalhes] = useState<any>(null);
  const [percentual, setPercentual] = useState<number | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [placas, setPlacas] = useState<PlacaRow[]>([]);

  useEffect(() => {
    if (isAllowed && !isChecking && id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed, isChecking, id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      setConsultor(prof);

      const { data: det } = await supabase
        .from('consultores_detalhes' as any)
        .select('*')
        .eq('consultor_id', id!)
        .maybeSingle();
      setDetalhes(det);

      const { data: comm } = await supabase
        .from('configuracao_comissoes' as any)
        .select('percentual_consultor')
        .eq('consultor_id', id!)
        .maybeSingle();
      setPercentual((comm as any)?.percentual_consultor ?? null);

      // Foto: signed URL temporária (1h) do bucket privado
      const fpath = (det as any)?.foto_url as string | undefined;
      if (fpath) {
        const { data: signed } = await supabase.storage
          .from('consultor-documentos')
          .createSignedUrl(fpath, 3600);
        setFotoUrl(signed?.signedUrl ?? null);
      } else {
        setFotoUrl(null);
      }

      // Associados do consultor → veículos vinculados
      const { data: assocs } = await supabase
        .from('associados')
        .select('id, nome_completo')
        .eq('consultor_id', id!);
      const assocList = assocs || [];
      const assocMap = new Map(assocList.map((a) => [a.id, a.nome_completo]));
      const assocIds = assocList.map((a) => a.id);

      let veics: any[] = [];
      if (assocIds.length > 0) {
        const { data: v } = await supabase
          .from('veiculos')
          .select('id, placa, marca, modelo, mensalidade, veiculo_status, associado_id')
          .in('associado_id', assocIds);
        veics = v || [];
      }

      setPlacas(
        veics.map((v) => ({
          veiculo_id: v.id,
          placa: v.placa || '—',
          marca: v.marca || '',
          modelo: v.modelo || '',
          mensalidade: Number(v.mensalidade || 0),
          veiculo_status: v.veiculo_status || 'cadastrado',
          associado_nome: assocMap.get(v.associado_id) || 'N/A',
        }))
      );
    } catch (e) {
      console.error('Erro ao carregar painel do consultor:', e);
      toast.error('Erro ao carregar painel do consultor');
    } finally {
      setIsLoading(false);
    }
  };

  const pct = percentual ?? 0;
  const residual = (m: number) => (m * pct) / 100;
  const ativos = placas.filter((p) => p.veiculo_status === 'ativo');
  const ganhosFuturos = ativos.reduce((s, p) => s + residual(p.mensalidade), 0);

  const telefones: string[] = Array.isArray(detalhes?.telefones)
    ? detalhes.telefones
    : consultor?.telefone
    ? [consultor.telefone]
    : [];

  if (isChecking) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{ACCESS_CHECKING_MESSAGE}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowed) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive">Acesso Negado</CardTitle>
              <CardDescription>Você não tem permissão para acessar esta página.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" onClick={() => navigate('/consultores')}>Voltar</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const iniciais = (consultor?.nome_completo || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/consultores')} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Consultores
        </Button>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !consultor ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Consultor não encontrado.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Header do consultor */}
            <Card>
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt={consultor.nome_completo} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold text-primary">{iniciais}</span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight">{consultor.nome_completo}</h1>
                    <Badge variant={consultor.ativo ? 'default' : 'secondary'}>
                      {consultor.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {getRegiaoNome(consultor.regiao_id) || '—'}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {consultor.email}</span>
                    {telefones.map((t, i) => (
                      <span key={i} className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {t}</span>
                    ))}
                    {detalhes?.site && (
                      <a href={detalhes.site} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <Globe className="h-3.5 w-3.5" /> {detalhes.site}
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Comissão do consultor</p>
                  <p className="text-2xl font-bold text-primary">
                    {percentual !== null ? `${percentual}%` : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {percentual === null && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Comissão não configurada para este consultor — os ganhos projetados aparecem como R$ 0,00 até definir o percentual no cadastro.</span>
              </div>
            )}

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Placas vinculadas</CardTitle>
                  <Car className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{placas.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">{ativos.length} ativas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ganhos futuros projetados</CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{fmtBRL(ganhosFuturos)}</div>
                  <p className="text-xs text-muted-foreground mt-1">/mês, se os ativos pagarem</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Residual médio / placa ativa</CardTitle>
                  <DollarSign className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {ativos.length > 0 ? fmtBRL(ganhosFuturos / ativos.length) : fmtBRL(0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Relatório: associado + placa + residual */}
            <Card>
              <CardHeader>
                <CardTitle>Relatório de placas</CardTitle>
                <CardDescription>Associado, placa, mensalidade e valor residual do consultor ({pct}%)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Associado</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Mensalidade</TableHead>
                        <TableHead className="text-right">Residual ({pct}%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {placas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhuma placa vinculada a este consultor.
                          </TableCell>
                        </TableRow>
                      ) : (
                        placas.map((p) => (
                          <TableRow key={p.veiculo_id}>
                            <TableCell className="font-medium">{p.associado_nome}</TableCell>
                            <TableCell className="font-mono uppercase">{p.placa}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{`${p.marca} ${p.modelo}`.trim() || '—'}</TableCell>
                            <TableCell>
                              <Badge variant={p.veiculo_status === 'ativo' ? 'default' : 'secondary'}>
                                {p.veiculo_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{fmtBRL(p.mensalidade)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {p.veiculo_status === 'ativo' ? fmtBRL(residual(p.mensalidade)) : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {placas.length > 0 && (
                  <div className="flex justify-end mt-3 text-sm">
                    <span className="text-muted-foreground mr-2">Total residual (ativos):</span>
                    <span className="font-bold text-green-600">{fmtBRL(ganhosFuturos)}/mês</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
