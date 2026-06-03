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
} from 'lucide-react';
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
  const { isAdminPrincipal, hasRole } = useAuth();
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

  const [documentos, setDocumentos] = useState<DocumentoAssociado[]>([]);
  const [veiculo, setVeiculo] = useState<VeiculoInfo | null>(null);
  const [docsVeiculo, setDocsVeiculo] = useState<DocumentoVeiculo[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);

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

        const { data: veics } = await supabase
          .from('veiculos').select('id,marca,modelo,placa,ano')
          .eq('associado_id', id).order('created_at', { ascending: false }).limit(1);
        const v = (veics?.[0] as VeiculoInfo) ?? null;
        setVeiculo(v);
        if (v) fetchDocsVeiculo(v.id);
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

        {/* ── Seção 4: Documentos ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-600" />
              Documentos do Associado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCUMENT_TYPES.map(docType => {
                const docs = getDocByTipo(docType.tipo);
                return (
                  <div key={docType.tipo} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">{docType.label}</Label>
                      {docs.length > 0 && <Badge variant="outline" className="text-xs">{docs.length} arquivo(s)</Badge>}
                    </div>
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                        <span className="truncate flex-1 mr-2">{doc.nome_arquivo}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.url, '_blank')}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteDocumento(doc)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <label className="cursor-pointer block">
                      <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-md hover:bg-muted/50 transition-colors">
                        {uploadingDoc === docType.tipo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        <span className="text-sm text-muted-foreground">
                          {uploadingDoc === docType.tipo ? 'Enviando...' : 'Enviar documento'}
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
            <p className="text-xs text-muted-foreground mt-3">Formatos: JPG, PNG, WebP, PDF — máx. 10MB.</p>
          </CardContent>
        </Card>

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

        {/* ── Seção 6: Contratos ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-orange-600" />
                Contratos Gerados
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGerarContrato}
                disabled={isGeneratingContract || isSaving}
              >
                {isGeneratingContract
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>
                  : <><Send className="h-4 w-4 mr-2" />Gerar Contrato PDF</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {contratos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum contrato gerado ainda.</p>
            ) : (
              <div className="space-y-2">
                {contratos.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        Contrato {c.contract_number ? `#${c.contract_number}` : ''}
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
            )}
          </CardContent>
        </Card>

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
