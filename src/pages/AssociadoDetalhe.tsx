import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  FileText,
  Car,
  ScrollText,
  Search,
  Loader2,
  Upload,
  Eye,
  Trash2,
  Send,
  Download,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  Heart,
  Building2,
  Image,
  ChevronDown,
  ChevronUp,
  Star,
  RefreshCw,
  CheckCircle2,
  Package,
  TrendingUp,
  Link,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Signature,
  Clock,
  Sparkles,
  Plus,
  Minus,
  Info,
} from 'lucide-react';
import ContractCard from '@/components/associado/ContractCard';
import type { AssociateStatus } from '@/types/database';
import {
  ESTADO_CIVIL_OPTIONS,
  DIA_VENCIMENTO_OPTIONS,
  ESTADOS_BRASILEIROS,
} from '@/components/associado/wizard/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  nome_completo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  estado_civil: string;
  profissao: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  dia_vencimento: number;
  status: AssociateStatus;
  regiao_id: string;
  cnh_numero: string;
  cnh_categoria: string;
  cnh_validade: string;
  cnh_estado: string;
}

interface DocumentoAssociado {
  id: string;
  tipo: string;
  nome_arquivo: string;
  url: string;
  created_at: string;
}

interface DocumentoVeiculo {
  id: string;
  tipo: string;
  nome_arquivo: string;
  url: string;
  created_at: string;
}

interface VeiculoInfo {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
  ano: number;
  cotacao_id: string | null;
  cota_id: string | null;
  tipo: string;
  mensalidade: number;
  valor_fipe: number;
}

interface CotaDisponivel {
  id: string;
  cota_nome: string;
  categoria: string | null;
  ativo: boolean;
  fipe_min: number;
  fipe_max: number;
  valor_carro: number | null;
  valor_moto: number | null;
  valor_camionete: number | null;
  mensalidade_caminhao: number | null;
  mensalidade_utilitario: number | null;
  mensalidade_maquina_agricola: number | null;
  mensalidade_maquina_industrial: number | null;
  mensalidade_carreta: number | null;
  mensalidade_implemento_agricola: number | null;
  percentual_geral: number | null;
}

interface BeneficioAtual {
  nome_snapshot: string;
  valor_snapshot: number;
}

interface PropostaPendente {
  cotacao_id: string;
  cota_nome: string;
}

interface BeneficioExtra {
  id: string;
  nome: string;
  descricao: string | null;
  valor_mensal: number;
  icone: string | null;
  ativo: boolean;
}

// A benefício extra que está ativo — pode vir de duas fontes
interface ExtraAtivo {
  id: string;
  nome_snapshot: string;
  valor_snapshot: number;
  source: 'cotacao' | 'associado'; // which table to DELETE from
}

interface VistoriaStatus {
  id: string;
  status: string;
  token_acesso: string | null;
  token_expires_at: string | null;
  assinado_em: string | null;
  contrato_url: string | null;
}

interface Contrato {
  id: string;
  contract_number: string | null;
  status: string | null;
  pdf_path: string | null;
  generated_at: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  nome_completo: '', cpf: '', rg: '', data_nascimento: '',
  telefone: '', whatsapp: '', email: '', estado_civil: '',
  profissao: '', cep: '', endereco: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: '', dia_vencimento: 10,
  status: 'ativo', regiao_id: '', cnh_numero: '', cnh_categoria: '',
  cnh_validade: '', cnh_estado: '',
};

const DOCUMENT_TYPES = [
  { tipo: 'cnh', label: 'CNH' },
  { tipo: 'rg', label: 'RG' },
  { tipo: 'cpf', label: 'CPF' },
  { tipo: 'comprovante_residencia', label: 'Comprovante de Residência' },
];

const CNH_CATEGORIAS = ['A', 'B', 'AB', 'C', 'D', 'E', 'AC', 'AD', 'AE'];

const STATUS_LABELS: Record<AssociateStatus, string> = {
  ativo: 'Ativo',
  inadimplente: 'Inadimplente',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado',
  rascunho: 'Rascunho',
};

const STATUS_COLORS: Record<AssociateStatus, string> = {
  ativo: 'bg-green-100 text-green-800 border-green-200',
  inadimplente: 'bg-red-100 text-red-800 border-red-200',
  suspenso: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelado: 'bg-gray-100 text-gray-700 border-gray-200',
  rascunho: 'bg-blue-100 text-blue-800 border-blue-200',
};

// ─── Masks ────────────────────────────────────────────────────────────────────

const maskCPF = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2')
   .replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');

const maskRG = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2')
   .replace(/(\d{3})(\d{1})/, '$1-$2').slice(0, 12);

const maskPhone = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
   .replace(/(-\d{4})\d+?$/, '$1');

const maskCEP = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssociadoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdminPrincipal, hasRole, profile } = useAuth();
  const { regioes, isLoading: regioesLoading } = useReferenceData({ loadRegioes: true });

  const canChangeRegiao = isAdminPrincipal || hasRole('admin_nivel_basico');
  const canEditStatus = isAdminPrincipal || hasRole('admin_nivel_basico') || hasRole('admin_regional');

  const { value: formData, setValue: setFormData, clearDraft, resetValue, hasDraft } =
    useFormPersistence<FormData>(`associado-edit:${id ?? ''}`, EMPTY_FORM);

  const [savedData, setSavedData] = useState<FormData>(EMPTY_FORM);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadingVeicDoc, setUploadingVeicDoc] = useState(false);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);

  const [documentos, setDocumentos] = useState<DocumentoAssociado[]>([]);
  const [veiculo, setVeiculo] = useState<VeiculoInfo | null>(null);
  const [docsVeiculo, setDocsVeiculo] = useState<DocumentoVeiculo[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailContratoUrl, setEmailContratoUrl] = useState('');

  // Documentos accordion
  const [openDocs, setOpenDocs] = useState(false);
  const [fotosVistoria, setFotosVistoria] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Vistoria remota
  const [vistoriaAtual, setVistoriaAtual] = useState<VistoriaStatus | null>(null);
  const [isEnviandoLink, setIsEnviandoLink] = useState(false);

  // Plano & Benefícios
  const [showTrocarPlano, setShowTrocarPlano] = useState(false);
  const [beneficiosAtual, setBeneficiosAtual] = useState<BeneficioAtual[]>([]);
  const [cotaAtualNome, setCotaAtualNome] = useState<string | null>(null);
  const [cotasDisponiveis, setCotasDisponiveis] = useState<CotaDisponivel[]>([]);
  const [cotaSelecionadaId, setCotaSelecionadaId] = useState<string | null>(null);
  const [propostaPendente, setPropostaPendente] = useState<PropostaPendente | null>(null);
  const [isLoadingPlano, setIsLoadingPlano] = useState(false);
  const [isPropondoTroca, setIsPropondoTroca] = useState(false);

  // Benefícios extras
  const [beneficiosExtras, setBeneficiosExtras] = useState<BeneficioExtra[]>([]);
  const [extrasAtivos, setExtrasAtivos] = useState<ExtraAtivo[]>([]);
  const [isTogglingBeneficio, setIsTogglingBeneficio] = useState<string | null>(null);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(savedData);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchDocumentos = useCallback(async (associadoId: string) => {
    const { data } = await supabase
      .from('documentos_associado').select('*').eq('associado_id', associadoId)
      .order('created_at', { ascending: false });
    setDocumentos((data as DocumentoAssociado[]) || []);
  }, []);

  const fetchDocsVeiculo = useCallback(async (veiculoId: string) => {
    const { data } = await supabase
      .from('documentos_veiculo').select('*').eq('veiculo_id', veiculoId)
      .order('created_at', { ascending: false });
    setDocsVeiculo((data as DocumentoVeiculo[]) || []);
  }, []);

  const fetchContratos = useCallback(async (associadoId: string) => {
    const { data } = await supabase
      .from('generated_contracts').select('id,contract_number,status,pdf_path,generated_at')
      .eq('associado_id', associadoId).order('generated_at', { ascending: false });
    setContratos((data as Contrato[]) || []);
  }, []);

  const fetchPlanoAtual = useCallback(async (v: VeiculoInfo) => {
    setIsLoadingPlano(true);
    try {
      // Benefícios da cotação vinculada ao veículo
      if (v.cotacao_id) {
        const { data: bens } = await supabase
          .from('cotacao_beneficios')
          .select('nome_snapshot,valor_snapshot')
          .eq('cotacao_id', v.cotacao_id);
        setBeneficiosAtual((bens as BeneficioAtual[]) || []);
      }
      // Nome da cota atual
      if (v.cota_id) {
        const { data: cota } = await supabase
          .from('cotas').select('cota_nome').eq('id', v.cota_id).single();
        setCotaAtualNome((cota as any)?.cota_nome ?? null);
      }
      // Verificar proposta pendente
      if (v.id) {
        const { data: prop } = await supabase
          .from('cotacoes')
          .select('id,cota_id')
          .eq('veiculo_id', v.id)
          .eq('status', 'enviada')
          .order('created_at', { ascending: false })
          .limit(1);
        if (prop?.[0] && prop[0].cota_id !== v.cota_id) {
          const { data: cotaProp } = await supabase
            .from('cotas').select('cota_nome').eq('id', prop[0].cota_id).single();
          setPropostaPendente({
            cotacao_id: prop[0].id,
            cota_nome: (cotaProp as any)?.cota_nome ?? 'Novo plano',
          });
        }
      }
      // Cotas disponíveis para troca
      await fetchCotasDisponiveis();
      // Benefícios extras disponíveis para este tipo de veículo
      await fetchBeneficiosExtras(v.tipo);
      // Extras ativos: cotacao_beneficios (is_extra=true) + associado_beneficios_extras
      await fetchExtrasAtivos(v.cotacao_id, /* associadoId */ id ?? '');
    } finally {
      setIsLoadingPlano(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVistoriaAtual = useCallback(async (associadoId: string) => {
    const { data } = await supabase
      .from('vistorias')
      .select('id,status,token_acesso,token_expires_at,assinado_em,contrato_url,fotos')
      .eq('associado_id', associadoId)
      .order('created_at', { ascending: false })
      .limit(1);
    const v = data?.[0] as (VistoriaStatus & { fotos?: string[] }) ?? null;
    setVistoriaAtual(v);
    if (v?.status === 'aprovada' && Array.isArray(v.fotos)) {
      setFotosVistoria(v.fotos);
    }
  }, []);

  const fetchCotasDisponiveis = useCallback(async () => {
    const { data } = await supabase
      .from('cotas')
      .select('id,cota_nome,categoria,ativo,fipe_min,fipe_max,valor_carro,valor_moto,valor_camionete,mensalidade_caminhao,mensalidade_utilitario,mensalidade_maquina_agricola,mensalidade_maquina_industrial,mensalidade_carreta,mensalidade_implemento_agricola,percentual_geral')
      .eq('ativo', true)
      .order('cota_nome');
    setCotasDisponiveis((data as CotaDisponivel[]) || []);
  }, []);

  const fetchBeneficiosExtras = useCallback(async (tipoVeiculo: string) => {
    let query = supabase
      .from('beneficios_extras')
      .select('id,nome,descricao,valor_mensal,icone,ativo')
      .eq('ativo', true)
      .order('ordem');

    // Filter by vehicle type
    if (tipoVeiculo === 'carro') query = query.eq('aplica_carro', true);
    else if (tipoVeiculo === 'moto') query = query.eq('aplica_moto', true);
    else if (['pickup', 'caminhonete'].includes(tipoVeiculo)) query = query.eq('aplica_caminhonete', true);
    // caminhao, maquina_agricola, etc. → show all active

    const { data } = await query;
    setBeneficiosExtras((data as BeneficioExtra[]) || []);
  }, []);

  const fetchExtrasAtivos = useCallback(async (cotacaoId: string | null, associadoId: string) => {
    const results: ExtraAtivo[] = [];

    // ── Fonte 1: cotacao_beneficios (is_extra=true) ────────────────────────
    if (cotacaoId) {
      const { data } = await supabase
        .from('cotacao_beneficios')
        .select('id,nome_snapshot,valor_snapshot')
        .eq('cotacao_id', cotacaoId)
        .eq('is_extra' as any, true);
      if (data) {
        results.push(...(data as any[]).map(r => ({
          id: r.id,
          nome_snapshot: r.nome_snapshot,
          valor_snapshot: r.valor_snapshot,
          source: 'cotacao' as const,
        })));
      }
    }

    // ── Fonte 2: associado_beneficios_extras (fallback sem cotação) ────────
    if (associadoId) {
      const { data } = await supabase
        .from('associado_beneficios_extras' as any)
        .select('id,valor_snapshot,beneficios_extras(nome)')
        .eq('associado_id', associadoId)
        .eq('ativo', true);
      if (data) {
        (data as any[]).forEach(r => {
          const nome = r.beneficios_extras?.nome;
          if (nome && !results.find(e => e.nome_snapshot === nome)) {
            results.push({
              id: r.id,
              nome_snapshot: nome,
              valor_snapshot: r.valor_snapshot ?? 0,
              source: 'associado',
            });
          }
        });
      }
    }

    setExtrasAtivos(results);
  }, []);

  const handleToggleBeneficio = async (extra: BeneficioExtra) => {
    if (!id) return;
    const cotacaoId = veiculo?.cotacao_id ?? null;
    setIsTogglingBeneficio(extra.id);
    try {
      const existing = extrasAtivos.find(e => e.nome_snapshot === extra.nome);

      if (existing) {
        // ── Remover: usa a tabela de origem ───────────────────────────────────
        const table = existing.source === 'cotacao' ? 'cotacao_beneficios' : 'associado_beneficios_extras';
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        toast.success(`"${extra.nome}" removido`);
      } else if (cotacaoId) {
        // ── Adicionar via cotação ─────────────────────────────────────────────
        const { error } = await supabase.from('cotacao_beneficios').insert({
          cotacao_id: cotacaoId,
          beneficio_id: extra.id,
          nome_snapshot: extra.nome,
          valor_snapshot: extra.valor_mensal,
          selecionado_por: 'consultor',
          is_extra: true,
        } as any);
        if (error) {
          if ((error as any).code === '42703') {
            toast.error('Coluna is_extra não existe. Execute a migration no Supabase Dashboard.', { duration: 8000 });
          } else {
            throw error;
          }
          return;
        }
        toast.success(`"${extra.nome}" adicionado`);
      } else {
        // ── Adicionar via associado (sem cotação) ─────────────────────────────
        const { error } = await supabase
          .from('associado_beneficios_extras' as any)
          .insert({
            associado_id: id,
            beneficio_id: extra.id,
            ativo: true,
            valor_snapshot: extra.valor_mensal,
          });
        if (error) {
          if ((error as any).code === '42P01') {
            toast.error('Tabela não existe. Execute a migration no Supabase Dashboard.', { duration: 8000 });
          } else if ((error as any).code === '23505') {
            // Já existe inativo — reativar
            await supabase
              .from('associado_beneficios_extras' as any)
              .update({ ativo: true, valor_snapshot: extra.valor_mensal })
              .eq('associado_id', id)
              .eq('beneficio_id', extra.id);
          } else {
            throw error;
          }
        }
        toast.success(`"${extra.nome}" adicionado`);
      }

      // Sempre refetch do banco
      await fetchExtrasAtivos(cotacaoId, id);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar benefício');
    } finally {
      setIsTogglingBeneficio(null);
    }
  };

  const estimarMensalidade = (cota: CotaDisponivel, tipo: string, valorFipe: number): number | null => {
    switch (tipo) {
      case 'carro':             return cota.valor_carro;
      case 'pickup':
      case 'caminhonete':       return cota.valor_camionete;
      case 'moto':              return cota.valor_moto;
      case 'caminhao':          return cota.mensalidade_caminhao;
      case 'utilitario':        return cota.mensalidade_utilitario;
      case 'maquina_agricola':  return cota.mensalidade_maquina_agricola;
      case 'maquina_industrial':return cota.mensalidade_maquina_industrial;
      case 'carreta':           return cota.mensalidade_carreta;
      case 'implemento_agricola':return cota.mensalidade_implemento_agricola;
      default:
        return cota.percentual_geral ? valorFipe * cota.percentual_geral / 100 : null;
    }
  };

  const handleAbrirEmailModal = (url?: string) => {
    setEmailInput(formData.email || '');
    setEmailContratoUrl(url || contratos[0]?.pdf_path || '');
    setShowEmailModal(true);
  };

  const handleEnviarEmail = async () => {
    if (!id || !emailInput.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      toast.error('Email inválido'); return;
    }
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-contract-email', {
        body: { associado_id: id, contrato_url: emailContratoUrl, email: emailInput.trim() },
      });
      if (error) throw error;
      toast.success('Contrato enviado por email!');
      setShowEmailModal(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleEnviarLinkVistoria = async () => {
    if (!id || !veiculo) { toast.error('Associado ou veículo não carregado'); return; }
    setIsEnviandoLink(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { error: insertErr } = await supabase.from('vistorias').insert({
        associado_id: id,
        veiculo_id: veiculo.id,
        cotacao_id: veiculo.cotacao_id ?? null,
        status: 'pendente',
        tipo_vistoria: 'pre_adesao',
        canal_abertura: 'link_remoto',
        token_acesso: token,
        token_expires_at: expiresAt,
        consultor_id: user.id,
      } as never);
      if (insertErr) throw insertErr;

      // Notificar via edge function (WhatsApp + Email)
      await supabase.functions.invoke('send-vistoria-link', {
        body: {
          token,
          nome: formData.nome_completo,
          celular: formData.whatsapp || formData.telefone,
          email: formData.email,
          placa: veiculo.placa,
        },
      });

      await fetchVistoriaAtual(id);
      toast.success('Link de vistoria enviado por WhatsApp e e-mail!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar link de vistoria');
    } finally {
      setIsEnviandoLink(false);
    }
  };

  const handleReenviarLink = async () => {
    if (!id || !veiculo || !vistoriaAtual) return;
    setIsEnviandoLink(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await supabase.from('vistorias').update({
        token_acesso: token,
        token_expires_at: expiresAt,
        status: 'pendente',
      } as never).eq('id', vistoriaAtual.id);

      await supabase.functions.invoke('send-vistoria-link', {
        body: {
          token,
          nome: formData.nome_completo,
          celular: formData.whatsapp || formData.telefone,
          email: formData.email,
          placa: veiculo.placa,
        },
      });

      await fetchVistoriaAtual(id);
      toast.success('Link reenviado com sucesso!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao reenviar link');
    } finally {
      setIsEnviandoLink(false);
    }
  };

  const handleProporTroca = async () => {
    if (!cotaSelecionadaId || !veiculo || !id) return;
    setIsPropondoTroca(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const cotaEscolhida = cotasDisponiveis.find(c => c.id === cotaSelecionadaId);
      if (!cotaEscolhida) throw new Error('Cota não encontrada');

      const novaMensalidade = estimarMensalidade(cotaEscolhida, veiculo.tipo, veiculo.valor_fipe);

      const { data: novaCotacao, error: cotErr } = await supabase
        .from('cotacoes')
        .insert({
          associado_id: id,
          veiculo_id: veiculo.id,
          cota_id: cotaSelecionadaId,
          status: 'enviada',
          consultor_id: user.id,
          marca: veiculo.marca,
          modelo: veiculo.modelo,
          placa: veiculo.placa,
          ano_fabricacao: veiculo.ano,
          tipo_bem: veiculo.tipo as any,
          valor_bem: veiculo.valor_fipe,
          valor_fipe: veiculo.valor_fipe,
          mensalidade: novaMensalidade,
          metodo_valoracao: 'fipe',
          observacoes: `Proposta de troca de plano para: ${cotaEscolhida.cota_nome}`,
        } as never)
        .select('id')
        .single();

      if (cotErr) throw cotErr;

      // Copiar benefícios da cotação atual para a nova
      if (veiculo.cotacao_id && novaCotacao) {
        const { data: bensAtuais } = await supabase
          .from('cotacao_beneficios')
          .select('beneficio_id,nome_snapshot,valor_snapshot')
          .eq('cotacao_id', veiculo.cotacao_id);

        if (bensAtuais?.length) {
          await supabase.from('cotacao_beneficios').insert(
            bensAtuais.map(b => ({
              cotacao_id: (novaCotacao as any).id,
              beneficio_id: b.beneficio_id,
              nome_snapshot: b.nome_snapshot,
              valor_snapshot: b.valor_snapshot,
              selecionado_por: 'consultor',
            }))
          );
        }
      }

      setPropostaPendente({
        cotacao_id: (novaCotacao as any).id,
        cota_nome: cotaEscolhida.cota_nome,
      });
      setCotaSelecionadaId(null);
      toast.success(`Proposta de troca para "${cotaEscolhida.cota_nome}" criada com sucesso!`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar proposta');
    } finally {
      setIsPropondoTroca(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchAll = async () => {
      setIsPageLoading(true);
      try {
        const { data, error } = await supabase
          .from('associados').select('*').eq('id', id).single();
        if (error) throw error;

        const fetched: FormData = {
          nome_completo: data.nome_completo || '',
          cpf: data.cpf ? data.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '',
          rg: (data as any).rg || '',
          data_nascimento: data.data_nascimento || '',
          telefone: data.telefone || '',
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          estado_civil: data.estado_civil || '',
          profissao: data.profissao || '',
          cep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '',
          endereco: data.endereco || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
          dia_vencimento: data.dia_vencimento || 10,
          status: data.status as AssociateStatus,
          regiao_id: data.regiao_id || '',
          cnh_numero: (data as any).cnh_numero || '',
          cnh_categoria: (data as any).cnh_categoria || '',
          cnh_validade: (data as any).cnh_validade || '',
          cnh_estado: (data as any).cnh_estado || '',
        };

        setSavedData(fetched);

        if (!hasDraft) {
          resetValue(fetched);
        } else {
          toast.info('Rascunho restaurado — você tem alterações não salvas.');
        }

        fetchDocumentos(id);
        fetchContratos(id);
        fetchVistoriaAtual(id);

        const { data: veics } = await supabase
          .from('veiculos')
          .select('id,marca,modelo,placa,ano,cotacao_id,cota_id,tipo,mensalidade,valor_fipe')
          .eq('associado_id', id).order('created_at', { ascending: false }).limit(1);
        const v = (veics?.[0] as VeiculoInfo) ?? null;
        setVeiculo(v);
        if (v) {
          fetchDocsVeiculo(v.id);
          fetchPlanoAtual(v); // fetchExtrasAtivos chamado dentro de fetchPlanoAtual
        }
      } catch {
        toast.error('Erro ao carregar associado');
        navigate('/associados');
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchAll();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const set = (field: keyof FormData, value: string | number) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const searchCEP = async () => {
    const cepLimpo = formData.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) { toast.error('CEP deve ter 8 dígitos'); return; }
    setIsSearchingCEP(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const result = await res.json();
      if (result.erro) { toast.error('CEP não encontrado'); return; }
      setFormData(prev => ({
        ...prev,
        endereco: result.logradouro || '',
        bairro: result.bairro || '',
        cidade: result.localidade || '',
        estado: result.uf || '',
        complemento: result.complemento || prev.complemento,
      }));
      toast.success('Endereço encontrado!');
    } catch { toast.error('Erro ao buscar CEP'); }
    finally { setIsSearchingCEP(false); }
  };

  const handleCEPChange = (v: string) => {
    const masked = maskCEP(v);
    set('cep', masked);
    if (v.replace(/\D/g, '').length === 8) setTimeout(searchCEP, 100);
  };

  const handleSave = async () => {
    if (!id) return;
    if (!formData.nome_completo.trim() || !formData.cpf.trim() || !formData.email.trim() || !formData.telefone.trim()) {
      toast.error('Preencha todos os campos obrigatórios'); return;
    }
    const cpfLimpo = formData.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) { toast.error('CPF deve ter 11 dígitos'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Email inválido'); return;
    }

    setIsSaving(true);
    try {
      const updateData: Record<string, any> = {
        nome_completo: formData.nome_completo.trim(),
        cpf: cpfLimpo,
        rg: formData.rg.replace(/\D/g, '') || null,
        data_nascimento: formData.data_nascimento || null,
        telefone: formData.telefone.trim(),
        whatsapp: formData.whatsapp.trim() || null,
        email: formData.email.trim().toLowerCase(),
        estado_civil: formData.estado_civil || null,
        profissao: formData.profissao.trim() || null,
        cep: formData.cep.replace(/\D/g, '') || null,
        endereco: formData.endereco.trim() || null,
        numero: formData.numero.trim() || null,
        complemento: formData.complemento.trim() || null,
        bairro: formData.bairro.trim() || null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado || null,
        dia_vencimento: formData.dia_vencimento || 10,
        cnh_numero: formData.cnh_numero || null,
        cnh_categoria: formData.cnh_categoria || null,
        cnh_validade: formData.cnh_validade || null,
        cnh_estado: formData.cnh_estado || null,
      };
      if (canEditStatus) updateData.status = formData.status;
      if (canChangeRegiao && formData.regiao_id) updateData.regiao_id = formData.regiao_id;

      const { error } = await supabase.from('associados').update(updateData as never).eq('id', id);
      if (error) throw error;

      clearDraft();
      setSavedData({ ...formData });
      toast.success('Associado salvo com sucesso!');
    } catch (e: any) {
      toast.error(e?.message?.includes('duplicate') ? 'CPF já cadastrado' : (e?.message || 'Erro ao salvar'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (tipo: string, file: File) => {
    if (!id) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG, WebP ou PDF'); return;
    }
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10MB'); return; }
    setUploadingDoc(tipo);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${id}/${tipo}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('associado-documentos').upload(fileName, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('associado-documentos').getPublicUrl(fileName);
      const { error: dbErr } = await supabase.from('documentos_associado').insert({
        associado_id: id, tipo, nome_arquivo: file.name, url: publicUrl,
      });
      if (dbErr) throw dbErr;
      toast.success('Documento enviado!');
      fetchDocumentos(id);
    } catch (e: any) { toast.error(e?.message || 'Erro ao enviar documento'); }
    finally { setUploadingDoc(null); }
  };

  const handleDeleteDocumento = async (doc: DocumentoAssociado) => {
    if (!confirm('Excluir este documento?')) return;
    try {
      const path = doc.url.split('/').slice(-2).join('/');
      await supabase.storage.from('associado-documentos').remove([path]);
      await supabase.from('documentos_associado').delete().eq('id', doc.id);
      toast.success('Documento excluído');
      if (id) fetchDocumentos(id);
    } catch (e: any) { toast.error(e?.message || 'Erro ao excluir'); }
  };

  const handleFileUploadVeiculo = async (file: File) => {
    if (!veiculo?.id) { toast.error('Nenhum veículo vinculado'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      toast.error('Formato inválido'); return;
    }
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10MB'); return; }
    setUploadingVeicDoc(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${veiculo.id}/foto_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('veiculo-documentos').upload(fileName, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('veiculo-documentos').getPublicUrl(fileName);
      const { error: dbErr } = await supabase.from('documentos_veiculo').insert({
        veiculo_id: veiculo.id, tipo: 'foto', nome_arquivo: file.name, url: publicUrl,
      });
      if (dbErr) throw dbErr;
      toast.success('Foto enviada!');
      fetchDocsVeiculo(veiculo.id);
    } catch (e: any) { toast.error(e?.message || 'Erro ao enviar foto'); }
    finally { setUploadingVeicDoc(false); }
  };

  const handleDeleteDocVeiculo = async (doc: DocumentoVeiculo) => {
    if (!confirm('Excluir este documento?')) return;
    try {
      const path = doc.url.split('/').slice(-2).join('/');
      await supabase.storage.from('veiculo-documentos').remove([path]);
      await supabase.from('documentos_veiculo').delete().eq('id', doc.id);
      toast.success('Removido');
      if (veiculo) fetchDocsVeiculo(veiculo.id);
    } catch (e: any) { toast.error(e?.message || 'Erro ao excluir'); }
  };

  const handleGerarContrato = async () => {
    if (!id) return;
    setIsGeneratingContract(true);
    try {
      const { error } = await supabase.functions.invoke('generate-contract-manual', {
        body: { associadoId: id, veiculoId: veiculo?.id ?? null, sendEmail: true },
      });
      if (error) throw error;
      toast.success('Contrato gerado e enviado por e-mail!');
      fetchContratos(id);
    } catch (e: any) { toast.error(e?.message || 'Erro ao gerar contrato'); }
    finally { setIsGeneratingContract(false); }
  };

  const handleDownloadContrato = async (contrato: Contrato) => {
    if (!contrato.pdf_path) { toast.error('PDF não disponível'); return; }
    try {
      const { data, error } = await supabase.storage
        .from('termos-aceite').createSignedUrl(contrato.pdf_path, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (e: any) { toast.error(e?.message || 'Erro ao baixar contrato'); }
  };

  const getDocByTipo = (tipo: string) => documentos.filter(d => d.tipo === tipo);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isPageLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/associados')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-slate-800">
                  {formData.nome_completo || 'Associado'}
                </h1>
                {formData.status && (
                  <Badge className={`text-xs border ${STATUS_COLORS[formData.status]}`}>
                    {STATUS_LABELS[formData.status]}
                  </Badge>
                )}
                {(hasDraft && isDirty) && (
                  <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-50 gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Alterações não salvas
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">CPF: {formData.cpf || '—'}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleGerarContrato}
              disabled={isGeneratingContract || isSaving}
            >
              {isGeneratingContract
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>
                : <><Send className="h-4 w-4 mr-2" />Gerar Contrato</>}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isGeneratingContract}>
              {isSaving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                : 'Salvar'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* ── Seção 1: Dados Pessoais ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-orange-600" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label>Nome Completo <span className="text-destructive">*</span></Label>
                <Input value={formData.nome_completo} onChange={e => set('nome_completo', e.target.value)} placeholder="Nome completo" />
              </div>

              <div className="space-y-1.5">
                <Label>CPF <span className="text-destructive">*</span></Label>
                <Input value={formData.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
              </div>

              <div className="space-y-1.5">
                <Label>RG</Label>
                <Input value={formData.rg} onChange={e => set('rg', maskRG(e.target.value))} placeholder="00.000.000-0" maxLength={12} />
              </div>

              <div className="space-y-1.5">
                <Label>Data de Nascimento</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="pl-10" value={formData.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Estado Civil</Label>
                <Select value={formData.estado_civil} onValueChange={v => set('estado_civil', v)}>
                  <SelectTrigger><Heart className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{ESTADO_CIVIL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Profissão</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={formData.profissao} onChange={e => set('profissao', e.target.value)} placeholder="Ex: Produtor Rural" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={formData.telefone} onChange={e => set('telefone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={formData.whatsapp} onChange={e => set('whatsapp', maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>E-mail <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" className="pl-10" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Dia de Vencimento</Label>
                <Select value={String(formData.dia_vencimento)} onValueChange={v => set('dia_vencimento', Number(v))}>
                  <SelectTrigger><CreditCard className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>{DIA_VENCIMENTO_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {canChangeRegiao && (
                <div className="space-y-1.5">
                  <Label>Regional</Label>
                  <Select value={formData.regiao_id} onValueChange={v => set('regiao_id', v)} disabled={regioesLoading}>
                    <SelectTrigger><Building2 className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder={regioesLoading ? 'Carregando...' : 'Selecione'} /></SelectTrigger>
                    <SelectContent>{regioes.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {canEditStatus && (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => set('status', v as AssociateStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inadimplente">Inadimplente</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Seção 2: Endereço ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input placeholder="00000-000" value={formData.cep} onChange={e => handleCEPChange(e.target.value)} maxLength={9} />
                  <Button type="button" variant="outline" size="icon" onClick={searchCEP} disabled={isSearchingCEP}>
                    {isSearchingCEP ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="hidden md:block md:col-span-4" />

              <div className="md:col-span-4 space-y-1.5">
                <Label>Endereço</Label>
                <Input value={formData.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, Avenida..." />
              </div>
              <div className="md:col-span-1 space-y-1.5">
                <Label>Número</Label>
                <Input value={formData.numero} onChange={e => set('numero', e.target.value)} placeholder="Nº" />
              </div>
              <div className="md:col-span-1 space-y-1.5">
                <Label>Complemento</Label>
                <Input value={formData.complemento} onChange={e => set('complemento', e.target.value)} placeholder="Apto..." />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Bairro</Label>
                <Input value={formData.bairro} onChange={e => set('bairro', e.target.value)} placeholder="Bairro" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Cidade</Label>
                <Input value={formData.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Cidade" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={v => set('estado', v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{ESTADOS_BRASILEIROS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Seção 3: CNH ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-600" />
              CNH
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Número da CNH</Label>
                <Input value={formData.cnh_numero} onChange={e => set('cnh_numero', e.target.value.replace(/\D/g, ''))} placeholder="00000000000" maxLength={11} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={formData.cnh_categoria} onValueChange={v => set('cnh_categoria', v)}>
                  <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>{CNH_CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Validade</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="pl-10" value={formData.cnh_validade} onChange={e => set('cnh_validade', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Estado de Emissão</Label>
                <Select value={formData.cnh_estado} onValueChange={v => set('cnh_estado', v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{ESTADOS_BRASILEIROS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Anexe o documento da CNH na seção Documentos abaixo.</p>
          </CardContent>
        </Card>

        {/* ── Seção 4: Documentos & Fotos (accordion) ── */}
        <Card>
          <Collapsible open={openDocs} onOpenChange={setOpenDocs}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg select-none">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" />
                    Documentos &amp; Fotos
                    {(documentos.length > 0 || fotosVistoria.length > 0 || contratos.length > 0) && (
                      <Badge variant="secondary" className="text-xs ml-1">
                        {documentos.length + fotosVistoria.length + contratos.length}
                      </Badge>
                    )}
                  </CardTitle>
                  {openDocs
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-5 pt-0">
                {/* ── Sub-seção A: Documentos do Associado ── */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Documentos do Associado
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DOCUMENT_TYPES.map(docType => {
                      const docs = getDocByTipo(docType.tipo);
                      const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
                      return (
                        <div key={docType.tipo} className="border rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="font-medium text-sm">{docType.label}</Label>
                            {docs.length > 0 && (
                              <Badge variant="outline" className="text-xs">{docs.length}</Badge>
                            )}
                          </div>

                          {/* Thumbnails grid */}
                          {docs.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5">
                              {docs.map(doc => (
                                <div key={doc.id} className="relative group aspect-square rounded-md overflow-hidden border bg-muted/30">
                                  {isImage(doc.url) ? (
                                    <img
                                      src={doc.url}
                                      alt={doc.nome_arquivo}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => setLightboxUrl(doc.url)}
                                    />
                                  ) : (
                                    <button
                                      className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-muted/60 transition-colors"
                                      onClick={() => window.open(doc.url, '_blank')}
                                    >
                                      <FileText className="h-6 w-6 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground text-center px-1 truncate w-full">
                                        {doc.nome_arquivo}
                                      </span>
                                    </button>
                                  )}
                                  <button
                                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteDocumento(doc)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Upload */}
                          <label className="cursor-pointer block">
                            <div className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed rounded-md hover:bg-muted/50 transition-colors">
                              {uploadingDoc === docType.tipo
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Upload className="h-4 w-4" />}
                              <span className="text-xs text-muted-foreground">
                                {uploadingDoc === docType.tipo ? 'Enviando...' : 'Enviar'}
                              </span>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf"
                              disabled={uploadingDoc !== null}
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(docType.tipo, f); e.target.value = ''; }} />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Formatos: JPG, PNG, WebP, PDF — máx. 10MB.</p>
                </div>

                {/* ── Sub-seção B: Contratos Gerados ── */}
                {contratos.length > 0 && (
                  <div className="space-y-2 pt-3 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <ScrollText className="h-3.5 w-3.5 text-orange-500" />
                      Contratos Gerados
                    </p>
                    <div className="space-y-2">
                      {contratos.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 text-sm">
                          <div>
                            <p className="font-medium">
                              {c.contract_number ? `Contrato #${c.contract_number}` : 'Contrato'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.generated_at ? new Date(c.generated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              {c.status ? ` · ${c.status}` : ''}
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            {c.pdf_path && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleDownloadContrato(c)}>
                                  <Eye className="h-3.5 w-3.5 mr-1" />Ver
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleAbrirEmailModal(c.pdf_path || '')}>
                                  <Mail className="h-3.5 w-3.5 mr-1" />Email
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Sub-seção C: Fotos da Vistoria ── */}
                {fotosVistoria.length > 0 && (
                  <div className="space-y-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      Fotos da Vistoria
                      <Badge className="bg-green-100 text-green-800 border-green-200 border text-xs">Aprovada</Badge>
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {fotosVistoria.map((url, i) => (
                        <div key={i} className="aspect-square rounded-md overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxUrl(url)}>
                          <img src={url} alt={`Foto vistoria ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* ── Lightbox ── */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <img
              src={lightboxUrl}
              alt="Visualização"
              className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors"
              onClick={() => setLightboxUrl(null)}
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* ── Seção 5: Veículo ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-orange-600" />
              Veículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {veiculo ? (
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-medium flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  {veiculo.marca} {veiculo.modelo} ({veiculo.ano})
                </p>
                <p className="text-sm text-muted-foreground font-mono">Placa: {veiculo.placa}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum veículo vinculado a este associado.</p>
            )}

            {veiculo && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Fotos e Documentos do Veículo
                </Label>
                {docsVeiculo.length > 0 ? (
                  <div className="space-y-2">
                    {docsVeiculo.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                        <span className="truncate flex-1 mr-2">{doc.nome_arquivo}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.url, '_blank')}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteDocVeiculo(doc)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma foto adicionada.</p>
                )}
                <label className="cursor-pointer block">
                  <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-md hover:bg-muted/50 transition-colors">
                    {uploadingVeicDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span className="text-sm text-muted-foreground">
                      {uploadingVeicDoc ? 'Enviando...' : 'Adicionar foto/documento'}
                    </span>
                  </div>
                  <input type="file" className="hidden" accept="image/*,application/pdf"
                    disabled={uploadingVeicDoc}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUploadVeiculo(f); e.target.value = ''; }} />
                </label>
                <p className="text-xs text-muted-foreground">Formatos: JPG, PNG, WebP, PDF — máx. 10MB.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Seção 5.5: Plano & Benefícios ── */}
        <PlanosBeneficios
          isLoading={isLoadingPlano}
          cotaAtualNome={cotaAtualNome}
          temCotacao={!!veiculo?.cotacao_id}
          veiculo={veiculo}
          beneficiosAtual={beneficiosAtual}
          beneficiosExtras={beneficiosExtras}
          extrasAtivos={extrasAtivos}
          cotasDisponiveis={cotasDisponiveis}
          cotaSelecionadaId={cotaSelecionadaId}
          setCotaSelecionadaId={setCotaSelecionadaId}
          propostaPendente={propostaPendente}
          showTrocarPlano={showTrocarPlano}
          setShowTrocarPlano={setShowTrocarPlano}
          isTogglingBeneficio={isTogglingBeneficio}
          isPropondoTroca={isPropondoTroca}
          onToggleBeneficio={handleToggleBeneficio}
          onProporTroca={handleProporTroca}
          estimarMensalidade={estimarMensalidade}
        />

        {/* ── Seção 6: Contratos ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-orange-600" />
                Contratos
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {/* Vistoria status badge */}
                {(() => {
                  if (!vistoriaAtual) return null;
                  const expired = vistoriaAtual.token_expires_at && new Date(vistoriaAtual.token_expires_at) < new Date();
                  if (vistoriaAtual.assinado_em)
                    return <Badge className="bg-green-100 text-green-800 border-green-300 border gap-1"><ShieldCheck className="h-3 w-3" />Contrato assinado ✓</Badge>;
                  if (vistoriaAtual.status === 'aprovada')
                    return <Badge className="bg-blue-100 text-blue-800 border-blue-300 border gap-1"><Signature className="h-3 w-3" />Aguardando assinatura</Badge>;
                  if (vistoriaAtual.status === 'reprovada')
                    return <Badge className="bg-red-100 text-red-800 border-red-300 border gap-1"><ShieldAlert className="h-3 w-3" />Vistoria reprovada</Badge>;
                  if (vistoriaAtual.status === 'em_andamento')
                    return <Badge className="bg-purple-100 text-purple-800 border-purple-300 border gap-1"><ShieldCheck className="h-3 w-3" />Vistoria enviada — em revisão</Badge>;
                  if (expired)
                    return <Badge className="bg-red-100 text-red-800 border-red-300 border gap-1"><AlertCircle className="h-3 w-3" />Link expirado</Badge>;
                  return <Badge className="bg-amber-100 text-amber-800 border-amber-300 border gap-1"><Clock className="h-3 w-3" />Aguardando vistoria</Badge>;
                })()}
                {/* Enviar / Reenviar link */}
                {(() => {
                  const canSend = !vistoriaAtual || ['reprovada'].includes(vistoriaAtual.status) || (vistoriaAtual.token_expires_at && new Date(vistoriaAtual.token_expires_at) < new Date());
                  const canResend = vistoriaAtual && ['pendente', 'agendada'].includes(vistoriaAtual.status) && vistoriaAtual.token_expires_at && new Date(vistoriaAtual.token_expires_at) < new Date();
                  if (canSend)
                    return (
                      <Button size="sm" variant="outline" onClick={handleEnviarLinkVistoria} disabled={isEnviandoLink}>
                        {isEnviandoLink ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Link className="h-4 w-4 mr-1.5" />}
                        Enviar link de vistoria
                      </Button>
                    );
                  if (canResend)
                    return (
                      <Button size="sm" variant="outline" onClick={handleReenviarLink} disabled={isEnviandoLink}>
                        {isEnviandoLink ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                        Reenviar link
                      </Button>
                    );
                  return null;
                })()}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowContractPreview(v => !v)}
                >
                  {showContractPreview
                    ? <><ChevronUp className="h-4 w-4 mr-1.5" />Fechar Visualização</>
                    : <><Eye className="h-4 w-4 mr-1.5" />Visualizar Contrato</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAbrirEmailModal()}
                  disabled={contratos.length === 0 && !showContractPreview}
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  Enviar por Email
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGerarContrato}
                      disabled={isGeneratingContract || isSaving}
                    >
                      {isGeneratingContract
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>
                        : <><Send className="h-4 w-4 mr-2" />Via Servidor</>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gera o contrato diretamente pelo servidor usando o template configurado</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview visual do contrato */}
            {showContractPreview && id && (
              <div className="border rounded-lg overflow-x-auto bg-gray-50 p-2">
                <ContractCard
                  associadoId={id}
                  onPdfGenerated={() => id && fetchContratos(id)}
                />
              </div>
            )}

            {/* Histórico de contratos gerados pelo servidor */}
            {contratos.length === 0 && !showContractPreview ? (
              <p className="text-sm text-muted-foreground">
                Nenhum contrato gerado ainda. Clique em "Visualizar Contrato" para criar um PDF visual.
              </p>
            ) : contratos.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Histórico (servidor)</p>
                {contratos.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        Contrato {c.contract_number ? `#${c.contract_number}` : '(sem número)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.generated_at
                          ? new Date(c.generated_at).toLocaleString('pt-BR')
                          : '—'}
                        {c.status && ` · ${c.status}`}
                      </p>
                    </div>
                    {c.pdf_path && (
                      <Button size="sm" variant="outline" onClick={() => handleDownloadContrato(c)}>
                        <Download className="h-4 w-4 mr-1.5" />
                        Baixar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ── Modal: Enviar contrato por email ── */}
        <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-600" />
                Enviar Contrato por Email
              </DialogTitle>
              <DialogDescription>
                O link do contrato será enviado para o email informado abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Email do destinatário</Label>
                <Input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              {contratos.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Contrato</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={emailContratoUrl}
                    onChange={e => setEmailContratoUrl(e.target.value)}
                  >
                    {contratos.map(c => (
                      <option key={c.id} value={c.pdf_path || ''}>
                        {c.contract_number ? `#${c.contract_number}` : 'Contrato'}{' '}
                        {c.generated_at ? `· ${new Date(c.generated_at).toLocaleDateString('pt-BR')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEmailModal(false)}>Cancelar</Button>
              <Button onClick={handleEnviarEmail} disabled={isSendingEmail || !emailInput.trim()}>
                {isSendingEmail
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                  : <><Mail className="h-4 w-4 mr-2" />Enviar</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Sticky bottom save bar (mobile) ── */}
        <div className="sticky bottom-4 flex justify-end sm:hidden">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={isSaving}
            className="shadow-lg"
          >
            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}

// ─── PlanosBeneficios sub-component ────────────────────────────────────────────
// Extracted to avoid JSX ternary / IIFE syntax issues

interface PlanosBeneficiosProps {
  isLoading: boolean;
  cotaAtualNome: string | null;
  temCotacao: boolean;
  veiculo: VeiculoInfo | null;
  beneficiosAtual: BeneficioAtual[];
  beneficiosExtras: BeneficioExtra[];
  extrasAtivos: ExtraAtivo[];
  cotasDisponiveis: CotaDisponivel[];
  cotaSelecionadaId: string | null;
  setCotaSelecionadaId: (id: string | null) => void;
  propostaPendente: PropostaPendente | null;
  showTrocarPlano: boolean;
  setShowTrocarPlano: (fn: (v: boolean) => boolean) => void;
  isTogglingBeneficio: string | null;
  isPropondoTroca: boolean;
  onToggleBeneficio: (extra: BeneficioExtra) => void;
  onProporTroca: () => void;
  estimarMensalidade: (cota: CotaDisponivel, tipo: string, valorFipe: number) => number | null;
}

function PlanosBeneficios({
  isLoading, cotaAtualNome, temCotacao, veiculo, beneficiosAtual, beneficiosExtras,
  extrasAtivos, cotasDisponiveis, cotaSelecionadaId, setCotaSelecionadaId,
  propostaPendente, showTrocarPlano, setShowTrocarPlano, isTogglingBeneficio,
  isPropondoTroca, onToggleBeneficio, onProporTroca, estimarMensalidade,
}: PlanosBeneficiosProps) {
  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalExtras = extrasAtivos.reduce((sum, e) => sum + e.valor_snapshot, 0);
  const mensalidadeBase = veiculo?.mensalidade ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-orange-600" />
          Plano &amp; Benefícios
          {propostaPendente && (
            <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-300 border text-xs gap-1">
              <RefreshCw className="h-3 w-3" />
              Proposta pendente: {propostaPendente.cota_nome}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── Resumo financeiro ── */}
            {temCotacao ? (
              // COM cotação: plano + base + total
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-orange-50 border-orange-200 p-3">
                  <p className="text-xs text-orange-700 font-medium mb-1">Plano contratado</p>
                  <p className="text-sm font-bold text-orange-900">{cotaAtualNome ?? 'Não informado'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Mensalidade base</p>
                  <p className="text-sm font-bold">{mensalidadeBase ? fmtBRL(mensalidadeBase) : '—'}</p>
                </div>
                <div className={`rounded-lg border p-3 ${totalExtras > 0 ? 'bg-green-50 border-green-200' : ''}`}>
                  <p className="text-xs text-muted-foreground mb-1">Total c/ extras</p>
                  <p className={`text-sm font-bold ${totalExtras > 0 ? 'text-green-700' : ''}`}>
                    {mensalidadeBase ? fmtBRL(mensalidadeBase + totalExtras) : '—'}
                  </p>
                  {totalExtras > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">+ {fmtBRL(totalExtras)} em extras</p>
                  )}
                </div>
              </div>
            ) : (
              // SEM cotação: só mostra os extras diretos
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700 font-medium mb-1">Situação</p>
                  <p className="text-sm font-semibold text-amber-900">Sem cotação ativa</p>
                  <p className="text-xs text-amber-700 mt-0.5">Benefícios extras salvos diretamente no associado</p>
                </div>
                <div className={`rounded-lg border p-3 ${totalExtras > 0 ? 'bg-green-50 border-green-200' : ''}`}>
                  <p className="text-xs text-muted-foreground mb-1">Extras contratados</p>
                  <p className={`text-sm font-bold ${totalExtras > 0 ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {totalExtras > 0 ? `${fmtBRL(totalExtras)}/mês` : 'Nenhum'}
                  </p>
                  {totalExtras > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">{extrasAtivos.length} benefício(s) ativo(s)</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Coberturas incluídas ── */}
            {beneficiosAtual.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-orange-500" />
                  Coberturas Incluídas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {beneficiosAtual.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/40 border">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium leading-tight">{b.nome_snapshot}</p>
                        {b.valor_snapshot > 0 && (
                          <p className="text-xs text-muted-foreground">+ {fmtBRL(b.valor_snapshot)}/mês</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {veiculo?.cotacao_id ? 'Nenhuma cobertura registrada na cotação.' : 'Sem cotação vinculada ao veículo.'}
              </p>
            )}

            {/* ── Benefícios extras ── */}
            {beneficiosExtras.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Benefícios Extras
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {beneficiosExtras.map(extra => {
                    // Match by nome_snapshot (o que foi salvo na cotação)
                    const isAtivo = extrasAtivos.some(e => e.nome_snapshot === extra.nome);
                    const isToggling = isTogglingBeneficio === extra.id;
                    return (
                      <div
                        key={extra.id}
                        className={`rounded-lg border p-3 transition-all ${isAtivo ? 'border-green-300 bg-green-50' : 'border-border'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-tight">{extra.nome}</p>
                            {extra.descricao && (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{extra.descricao}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <Badge className="bg-orange-100 text-orange-700 border-orange-300 border text-xs">
                              + {fmtBRL(extra.valor_mensal)}/mês
                            </Badge>
                            <Button
                              size="sm"
                              variant={isAtivo ? 'outline' : 'default'}
                              onClick={() => onToggleBeneficio(extra)}
                              disabled={isToggling}
                              className={`h-7 px-2 text-xs ${isAtivo ? 'border-green-400 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600' : 'bg-orange-600 hover:bg-orange-700 text-white border-0'}`}
                            >
                              {isToggling
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : isAtivo
                                  ? <><Minus className="h-3 w-3 mr-1" />Remover</>
                                  : <><Plus className="h-3 w-3 mr-1" />Adicionar</>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Trocar de plano (Collapsible) ── */}
            {cotasDisponiveis.length > 0 && (
              <Collapsible
                open={showTrocarPlano}
                onOpenChange={() => setShowTrocarPlano(v => !v)}
                className="pt-2 border-t"
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between py-2 px-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors rounded">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Trocar de Plano
                  </span>
                  {showTrocarPlano
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Selecione um plano para ver a estimativa. A troca só é efetivada após aprovação.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cotasDisponiveis.map(cota => {
                      const isAtual = cota.id === veiculo?.cota_id;
                      const isSelecionada = cota.id === cotaSelecionadaId;
                      const estimativa = veiculo ? estimarMensalidade(cota, veiculo.tipo, veiculo.valor_fipe) : null;
                      return (
                        <button
                          key={cota.id}
                          type="button"
                          onClick={() => !isAtual && setCotaSelecionadaId(isSelecionada ? null : cota.id)}
                          disabled={isAtual}
                          className={[
                            'text-left rounded-lg border p-3 transition-all w-full',
                            isAtual ? 'border-orange-300 bg-orange-50 cursor-default'
                              : isSelecionada ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer',
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-tight truncate">{cota.cota_nome}</p>
                              {cota.categoria && <p className="text-xs text-muted-foreground mt-0.5">{cota.categoria}</p>}
                              <p className="text-xs text-muted-foreground mt-1">
                                FIPE: {fmtBRL(cota.fipe_min)} — {fmtBRL(cota.fipe_max)}
                              </p>
                            </div>
                            {isAtual && <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 border flex-shrink-0">Atual</Badge>}
                            {isSelecionada && !isAtual && <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                          </div>
                          {estimativa != null && (
                            <p className={`text-sm font-bold mt-2 ${isSelecionada ? 'text-blue-700' : 'text-slate-700'}`}>
                              {fmtBRL(estimativa)}/mês
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {cotaSelecionadaId && (() => {
                    const cota = cotasDisponiveis.find(c => c.id === cotaSelecionadaId);
                    if (!cota) return null;
                    const estimativa = veiculo ? estimarMensalidade(cota, veiculo.tipo, veiculo.valor_fipe) : null;
                    return (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                        <p className="text-sm font-semibold text-blue-900">Preview: {cota.cota_nome}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-blue-600 mb-0.5">Mensalidade estimada</p>
                            <p className="font-bold text-blue-900">{estimativa != null ? fmtBRL(estimativa) : 'A calcular'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-600 mb-0.5">Mensalidade atual</p>
                            <p className="font-bold text-slate-700">{mensalidadeBase ? fmtBRL(mensalidadeBase) : '—'}</p>
                          </div>
                        </div>
                        <p className="text-xs text-blue-600">* Valor estimado com base no tipo de veículo e tabela FIPE.</p>
                        <Button
                          onClick={onProporTroca}
                          disabled={isPropondoTroca}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isPropondoTroca
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando proposta...</>
                            : <><RefreshCw className="h-4 w-4 mr-2" />Propor troca de plano</>}
                        </Button>
                      </div>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
