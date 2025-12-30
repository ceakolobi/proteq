import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  ArrowLeft,
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { diaVencimentoOptions } from '@/types/financeiro';

export default function ConfiguracoesFinanceiras() {
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl('admin_principal_only');
  const { isAdminPrincipal } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  
  const [config, setConfig] = useState({
    dia_vencimento_padrao: 10,
    dias_tolerancia: 5,
    percentual_multa: 2,
    percentual_juros_dia: 0.0333,
    chave_pix: '',
    tipo_chave_pix: '',
    enviar_lembrete_dias_antes: 3,
    enviar_cobranca_apos_dias: 1,
  });

  useEffect(() => {
    if (!isChecking && isAllowed) {
      fetchConfig();
    }
  }, [isChecking, isAllowed]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracoes_financeiras')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfigId(data.id);
        setConfig({
          dia_vencimento_padrao: data.dia_vencimento_padrao || 10,
          dias_tolerancia: data.dias_tolerancia || 5,
          percentual_multa: data.percentual_multa || 2,
          percentual_juros_dia: data.percentual_juros_dia || 0.0333,
          chave_pix: data.chave_pix || '',
          tipo_chave_pix: data.tipo_chave_pix || '',
          enviar_lembrete_dias_antes: data.enviar_lembrete_dias_antes || 3,
          enviar_cobranca_apos_dias: data.enviar_cobranca_apos_dias || 1,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      const payload = {
        ...config,
        company_id: profile?.company_id,
      };

      if (configId) {
        const { error } = await supabase
          .from('configuracoes_financeiras')
          .update(payload)
          .eq('id', configId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('configuracoes_financeiras')
          .insert(payload);

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  if (isChecking || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdminPrincipal) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Apenas administradores principais podem acessar as configurações financeiras.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/financeiro')}>Voltar</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Configurações Financeiras
            </h1>
            <p className="text-muted-foreground">
              Parâmetros globais do módulo financeiro
            </p>
          </div>
        </div>

        {/* Configurações de Vencimento */}
        <Card>
          <CardHeader>
            <CardTitle>Vencimentos e Tolerância</CardTitle>
            <CardDescription>
              Configure os parâmetros de vencimento das mensalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Dia de Vencimento Padrão</Label>
                <Select
                  value={config.dia_vencimento_padrao.toString()}
                  onValueChange={(v) => setConfig({ ...config, dia_vencimento_padrao: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {diaVencimentoOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        Dia {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Usado quando o associado não tem dia específico
                </p>
              </div>

              <div className="space-y-2">
                <Label>Dias de Tolerância</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={config.dias_tolerancia}
                  onChange={(e) => setConfig({ ...config, dias_tolerancia: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Dias após o vencimento antes de considerar atrasado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multas e Juros */}
        <Card>
          <CardHeader>
            <CardTitle>Multas e Juros</CardTitle>
            <CardDescription>
              Valores aplicados em caso de atraso no pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Percentual de Multa (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={config.percentual_multa}
                  onChange={(e) => setConfig({ ...config, percentual_multa: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Multa fixa aplicada uma vez (máx. 2% por lei)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Juros ao Dia (%)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={config.percentual_juros_dia}
                  onChange={(e) => setConfig({ ...config, percentual_juros_dia: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Juros diários (máx. 1% ao mês = ~0.0333% ao dia)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PIX */}
        <Card>
          <CardHeader>
            <CardTitle>Chave PIX</CardTitle>
            <CardDescription>
              Configuração para geração de cobranças PIX (futuro)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Chave</Label>
                <Select
                  value={config.tipo_chave_pix}
                  onValueChange={(v) => setConfig({ ...config, tipo_chave_pix: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input
                  placeholder="Digite a chave PIX..."
                  value={config.chave_pix}
                  onChange={(e) => setConfig({ ...config, chave_pix: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lembretes */}
        <Card>
          <CardHeader>
            <CardTitle>Lembretes e Cobranças</CardTitle>
            <CardDescription>
              Configuração de automação de envios (futuro)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Enviar Lembrete X Dias Antes</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={config.enviar_lembrete_dias_antes}
                  onChange={(e) => setConfig({ ...config, enviar_lembrete_dias_antes: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Dias antes do vencimento para enviar lembrete
                </p>
              </div>

              <div className="space-y-2">
                <Label>Enviar Cobrança Após X Dias</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={config.enviar_cobranca_apos_dias}
                  onChange={(e) => setConfig({ ...config, enviar_cobranca_apos_dias: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Dias após o vencimento para enviar cobrança
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}