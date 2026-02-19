import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, ArrowLeft, User, Phone, Mail, Car, Loader2, Search,
  CheckCircle2, Settings2, Shield, Headphones, MapPin, Percent, Truck, Key, Zap,
  MessageCircle, FileText, Link2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBrand } from '@/hooks/useBrand';
import { supabase } from '@/integrations/supabase/client';
import html2pdf from 'html2pdf.js';
import harmonyAgroLogoBranca from '@/assets/harmony-agro-logo-branca.png';
import harmonyAgroLogoColorida from '@/assets/harmony-agro-logo-colorida.png';
import { TIPOS_VEICULO_LANDING, type DadosPessoais, type DadosVeiculo, type ResultadoCotacaoPublica } from './types';

// ─── Types ───────────────────────────────────────────
interface FipeItem { id: string; nome: string; }
interface FipeValorResult {
  tipoVeiculo: string; valor: number; valorFormatado: string;
  marca: string; modelo: string; anoModelo: number;
  combustivel: string; codigoFipe: string; mesReferencia: string;
}
type PlacaStatus = 'idle' | 'loading' | 'found_fipe' | 'found_no_fipe' | 'not_found' | 'invalid' | 'error';

interface CotacaoUnificadaFormProps {
  onSubmitAll: (pessoais: DadosPessoais, veiculo: DadosVeiculo) => Promise<ResultadoCotacaoPublica | null>;
  onBack: () => void;
  onAccept: () => void;
  onWhatsApp: () => void;
  cotacao: ResultadoCotacaoPublica | null;
  dadosPessoais: DadosPessoais;
  setDadosPessoais: (d: DadosPessoais) => void;
  loading?: boolean;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const imageToBase64 = (url: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d')?.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = url;
  });

const validatePlaca = (p: string) => {
  const c = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return /^[A-Z]{3}[0-9]{4}$/.test(c) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(c);
};
const formatPlaca = (v: string) => {
  const c = v.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return c.length <= 3 ? c : c.slice(0, 3) + '-' + c.slice(3, 7);
};

export function CotacaoUnificadaForm({
  onSubmitAll, onBack, onAccept, onWhatsApp,
  cotacao, dadosPessoais, setDadosPessoais,
  loading,
}: CotacaoUnificadaFormProps) {
  const { getLogoForContext } = useBrand();
  const logo = getLogoForContext('login');

  // ─── Personal data ─────────────────────────
  const [dados, setDados] = useState<DadosPessoais>(dadosPessoais);
  const [errors, setErrors] = useState<Partial<DadosPessoais>>({});

  // ─── Vehicle data ──────────────────────────
  const [tipoVeiculo, setTipoVeiculo] = useState<'carro' | 'moto' | 'pickup' | 'caminhao' | 'utilitario'>('carro');
  const [placa, setPlaca] = useState('');
  const [placaStatus, setPlacaStatus] = useState<PlacaStatus>('idle');
  const [placaMessage, setPlacaMessage] = useState('');
  const [marcas, setMarcas] = useState<FipeItem[]>([]);
  const [modelos, setModelos] = useState<FipeItem[]>([]);
  const [anos, setAnos] = useState<FipeItem[]>([]);
  const [selectedMarcaId, setSelectedMarcaId] = useState('');
  const [selectedModeloId, setSelectedModeloId] = useState('');
  const [selectedAnoId, setSelectedAnoId] = useState('');
  const [valorEncontrado, setValorEncontrado] = useState<FipeValorResult | null>(null);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingAnos, setLoadingAnos] = useState(false);
  const [loadingValor, setLoadingValor] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  // ─── FIPE API ──────────────────────────────
  const fetchFipe = async (endpoint: string, params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/fipe/${endpoint}?${qs}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', 'x-origem': 'landing' } });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Erro ${res.status}`); }
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro desconhecido');
    return data;
  };

  const fetchMarcas = useCallback(async () => {
    setLoadingMarcas(true);
    setMarcas([]); setModelos([]); setAnos([]);
    setSelectedMarcaId(''); setSelectedModeloId(''); setSelectedAnoId('');
    setValorEncontrado(null);
    try {
      const r = await fetchFipe('marcas', { tipo: tipoVeiculo });
      setMarcas(r.data as FipeItem[]);
    } catch { toast.error('Erro ao carregar marcas'); }
    finally { setLoadingMarcas(false); }
  }, [tipoVeiculo]);

  const fetchModelos = useCallback(async (marcaId: string) => {
    if (!marcaId) return;
    setLoadingModelos(true); setModelos([]); setAnos([]);
    setSelectedModeloId(''); setSelectedAnoId(''); setValorEncontrado(null);
    try {
      const r = await fetchFipe('modelos', { tipo: tipoVeiculo, marcaId });
      setModelos(r.data as FipeItem[]);
    } catch { toast.error('Erro ao carregar modelos'); }
    finally { setLoadingModelos(false); }
  }, [tipoVeiculo]);

  const fetchAnos = useCallback(async (modeloId: string) => {
    if (!selectedMarcaId || !modeloId) return;
    setLoadingAnos(true); setAnos([]); setSelectedAnoId(''); setValorEncontrado(null);
    try {
      const r = await fetchFipe('anos', { tipo: tipoVeiculo, marcaId: selectedMarcaId, modeloId });
      setAnos(r.data as FipeItem[]);
    } catch { toast.error('Erro ao carregar anos'); }
    finally { setLoadingAnos(false); }
  }, [tipoVeiculo, selectedMarcaId]);

  const fetchValor = useCallback(async () => {
    if (!selectedMarcaId || !selectedModeloId || !selectedAnoId) return;
    setLoadingValor(true); setValorEncontrado(null);
    try {
      const r = await fetchFipe('valor', { tipo: tipoVeiculo, marcaId: selectedMarcaId, modeloId: selectedModeloId, anoId: selectedAnoId });
      setValorEncontrado(r.data as FipeValorResult);
      toast.success('Valor FIPE encontrado!');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao buscar valor FIPE'); }
    finally { setLoadingValor(false); }
  }, [tipoVeiculo, selectedMarcaId, selectedModeloId, selectedAnoId]);

  useEffect(() => { fetchMarcas(); }, [tipoVeiculo, fetchMarcas]);

  // ─── Placa lookup ──────────────────────────
  const handlePlacaSearch = async () => {
    if (placa.length < 7) return;
    const clean = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (!validatePlaca(clean)) { setPlacaStatus('invalid'); setPlacaMessage('Formato inválido.'); return; }
    setPlacaStatus('loading'); setPlacaMessage('Consultando veículo...');
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-origem': 'landing' },
        body: JSON.stringify({ route: 'placa', placa: clean }),
      });
      const result = await res.json();
      if (!result?.success) { setPlacaStatus('not_found'); setPlacaMessage('Veículo não encontrado. Use a FIPE abaixo.'); return; }
      const v = result.data;
      if (v.fipeEncontrado && v.valor_fipe) {
        setPlacaStatus('found_fipe');
        setPlacaMessage(`${v.marca} ${v.modelo} - FIPE: R$ ${v.valor_fipe.toLocaleString('pt-BR')}`);
        setValorEncontrado({
          tipoVeiculo, valor: v.valor_fipe,
          valorFormatado: `R$ ${v.valor_fipe.toLocaleString('pt-BR')}`,
          marca: v.marca || '', modelo: v.modelo || '',
          anoModelo: v.ano_modelo || v.ano_fabricacao,
          combustivel: v.combustivel || '', codigoFipe: v.codigo_fipe || '',
          mesReferencia: v.mes_referencia || '',
        });
        setSelectedMarcaId(''); setSelectedModeloId(''); setSelectedAnoId('');
        toast.success('Veículo encontrado com valor FIPE!');
      } else {
        setPlacaStatus('found_no_fipe');
        setPlacaMessage(`${v.marca} ${v.modelo} encontrado. Use a FIPE abaixo.`);
      }
    } catch { setPlacaStatus('error'); setPlacaMessage('Erro ao consultar.'); }
  };

  // ─── Telefone formatter ────────────────────
  const formatTelefone = (v: string) => {
    const n = v.replace(/\D/g, '');
    if (n.length <= 2) return `(${n}`;
    if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7, 11)}`;
  };

  // ─── Validate personal data ────────────────
  const validateDados = (): boolean => {
    const e: Partial<DadosPessoais> = {};
    if (!dados.nome.trim()) e.nome = 'Nome é obrigatório';
    if (dados.telefone.replace(/\D/g, '').length < 10) e.telefone = 'Telefone inválido';
    if (!dados.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) e.email = 'E-mail inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit: calculate quotation ───────────
  const handleCalcular = async () => {
    if (!validateDados()) { toast.error('Preencha seus dados pessoais corretamente'); return; }
    if (!valorEncontrado) { toast.error('Busque o valor FIPE antes de continuar'); return; }

    setCalculando(true);
    setDadosPessoais(dados);

    const veiculo: DadosVeiculo = {
      tipo_bem: tipoVeiculo,
      marca: valorEncontrado.marca,
      modelo: valorEncontrado.modelo,
      ano: valorEncontrado.anoModelo,
      placa: placa ? placa.replace(/-/g, '') : undefined,
      valor_fipe: valorEncontrado.valor,
      codigo_fipe: valorEncontrado.codigoFipe,
    };

    try {
      await onSubmitAll(dados, veiculo);
    } finally {
      setCalculando(false);
    }
  };

  const isComplete = selectedMarcaId && selectedModeloId && selectedAnoId;

  const getPlacaStatusBadge = () => {
    switch (placaStatus) {
      case 'loading': return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Consultando</Badge>;
      case 'found_fipe': return <Badge className="gap-1 bg-green-600 text-green-50"><CheckCircle2 className="w-3 h-3" />FIPE encontrada</Badge>;
      case 'found_no_fipe': return <Badge variant="secondary" className="gap-1 bg-yellow-600 text-yellow-50">Sem FIPE</Badge>;
      case 'not_found': return <Badge variant="secondary" className="gap-1">Não encontrado</Badge>;
      case 'invalid': return <Badge variant="outline" className="gap-1">Formato inválido</Badge>;
      case 'error': return <Badge variant="destructive" className="gap-1">Erro</Badge>;
      default: return null;
    }
  };

  const beneficiosIcons = [
    { icon: Shield, titulo: 'Proteção Total', descricao: 'Roubo e furto' },
    { icon: Headphones, titulo: 'Assistência 24h', descricao: 'Suporte integral' },
    { icon: MapPin, titulo: 'Rastreamento', descricao: 'Tempo real' },
    { icon: Percent, titulo: '100% FIPE', descricao: 'Indenização total' },
    { icon: Truck, titulo: 'Guincho 500km', descricao: '250km ida/volta' },
    { icon: Car, titulo: 'Carro Reserva', descricao: '30 dias inclusos' },
    { icon: Key, titulo: 'Chaveiro 24h', descricao: 'Gratuito' },
    { icon: Zap, titulo: 'Pane Elétrica', descricao: 'Assistência inclusa' },
  ];

  // ─── PDF Generation ────────────────────────
  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!valorEncontrado || !cotacao) return null;
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const [logoBrancaB64] = await Promise.all([imageToBase64(harmonyAgroLogoBranca)]);

    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;background:#fff;padding:0;">
        <div style="background:linear-gradient(135deg,#F97316,#ea580c);padding:24px 32px;border-radius:0 0 16px 16px;">
          <table style="width:100%;"><tr>
            <td>${logoBrancaB64 ? `<img src="${logoBrancaB64}" style="height:48px;" />` : ''}</td>
            <td style="text-align:right;color:#fff;font-size:12px;">Atendimento Nacional</td>
          </tr></table>
          <div style="text-align:center;color:#fff;padding:8px 0;">
            <h1 style="font-size:22px;font-weight:bold;margin:0;">PROPOSTA DE COTAÇÃO</h1>
          </div>
        </div>
        <div style="padding:20px 32px;">
          <table style="width:100%;"><tr>
            <td><p style="font-size:10px;color:#888;margin:0;">Cliente</p><p style="font-size:14px;font-weight:bold;margin:2px 0;">${dados.nome}</p></td>
            <td style="text-align:center;"><p style="font-size:10px;color:#888;margin:0;">Telefone</p><p style="font-size:14px;font-weight:bold;margin:2px 0;">${dados.telefone}</p></td>
            <td style="text-align:right;"><p style="font-size:10px;color:#888;margin:0;">Data</p><p style="font-size:14px;font-weight:bold;margin:2px 0;">${dataAtual}</p></td>
          </tr></table>
        </div>
        <div style="padding:0 32px;">
          <table style="width:100%;border-spacing:16px 0;"><tr>
            <td style="width:50%;vertical-align:top;border:1px solid #fed7aa;border-radius:16px;padding:16px;">
              <p style="font-weight:bold;font-size:14px;margin:0 0 8px;">Dados do Veículo</p>
              <p style="font-size:12px;margin:2px 0;"><strong>Marca:</strong> ${valorEncontrado.marca}</p>
              <p style="font-size:12px;margin:2px 0;"><strong>Modelo:</strong> ${valorEncontrado.modelo}</p>
              <p style="font-size:12px;margin:2px 0;"><strong>Ano:</strong> ${valorEncontrado.anoModelo}</p>
              <p style="font-size:12px;margin:2px 0;"><strong>FIPE:</strong> ${formatCurrency(cotacao.valorFipe)}</p>
            </td>
            <td style="width:50%;vertical-align:top;border:1px solid #bbf7d0;border-radius:16px;padding:16px;">
              <p style="font-weight:bold;font-size:14px;margin:0 0 8px;">Valores</p>
              <div style="background:linear-gradient(135deg,#F97316,#ea580c);border-radius:12px;padding:16px;text-align:center;color:#fff;margin-bottom:8px;">
                <p style="font-size:11px;opacity:0.9;margin:0;">Mensalidade</p>
                <p style="font-size:28px;font-weight:bold;margin:4px 0;">${formatCurrency(cotacao.mensalidade)}</p>
              </div>
              <p style="font-size:12px;margin:2px 0;"><strong>Participação:</strong> ${formatCurrency(cotacao.participacao)}</p>
              <p style="font-size:12px;margin:2px 0;color:#15803d;font-weight:bold;">Adesão: GRÁTIS ✅</p>
            </td>
          </tr></table>
        </div>
        <div style="padding:20px 32px;background:#F97316;margin-top:20px;">
          <table style="width:100%;"><tr>
            <td>${logoBrancaB64 ? `<img src="${logoBrancaB64}" style="height:32px;" />` : ''}</td>
            <td style="text-align:right;color:#fff;font-size:12px;">www.harmonyagro.com.br</td>
          </tr></table>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.zIndex = '-9999';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    // Wait for images
    const imgs = container.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map(img =>
      img.complete ? Promise.resolve() : new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); })
    ));

    // Small delay to ensure rendering
    await new Promise(r => setTimeout(r, 300));

    try {
      const opt = {
        margin: 0,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: true, 
          allowTaint: true, 
          backgroundColor: '#ffffff',
          width: 800,
          windowWidth: 800,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true },
        pagebreak: { mode: ['css', 'legacy'] },
      };
      const pdfInstance = html2pdf().set(opt).from(container);
      const blob: Blob = await pdfInstance.outputPdf('blob');
      console.log('[PDF Landing] blob size:', blob.size);
      return blob;
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleDownloadPdf = async () => {
    if (!valorEncontrado || !cotacao) return;
    setLoadingPdf(true);
    try {
      const blob = await generatePdfBlob();
      if (!blob) { toast.error('Erro ao gerar PDF'); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proposta_${valorEncontrado.marca}_${valorEncontrado.modelo}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PDF baixado!');
    } catch { toast.error('Erro ao gerar PDF'); }
    finally { setLoadingPdf(false); }
  };

  const handleSendEmail = async () => {
    if (!valorEncontrado || !cotacao || !dados.email) { toast.error('E-mail não informado'); return; }
    setLoadingEmail(true);
    try {
      const blob = await generatePdfBlob();
      if (!blob) { toast.error('Erro ao gerar PDF'); return; }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { data, error } = await supabase.functions.invoke('send-proposta-email', {
        body: {
          to: dados.email, clienteNome: dados.nome,
          modelo: `${valorEncontrado.marca} ${valorEncontrado.modelo}`,
          mensalidade: formatCurrency(cotacao.mensalidade), validadeDias: 7,
          pdfBase64: base64, filename: `Proposta_${valorEncontrado.marca}_${valorEncontrado.modelo}.pdf`,
          empresaNome: 'Harmony Agro',
        },
      });
      if (error) { toast.error('Erro ao enviar e-mail'); return; }
      if (data?.success) toast.success(`Proposta enviada para ${dados.email}!`);
      else toast.error(data?.error || 'Erro ao enviar');
    } catch { toast.error('Erro ao enviar e-mail'); }
    finally { setLoadingEmail(false); }
  };

  const handleCopyLink = async () => {
    try {
      if (!valorEncontrado || !cotacao) { toast.error('Calcule a cotação primeiro'); return; }
      const payload = {
        n: dados.nome, t: dados.telefone, e: dados.email,
        m: valorEncontrado.marca, mo: valorEncontrado.modelo,
        a: valorEncontrado.anoModelo, tb: tipoVeiculo,
        vf: valorEncontrado.valor, cf: valorEncontrado.codigoFipe,
        me: cotacao.mensalidade, pa: cotacao.participacao, cn: cotacao.cotaNome,
      };
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
      const url = `${window.location.origin}/?cotacao=${encoded}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link da cotação copiado!');
    } catch { toast.error('Erro ao copiar link'); }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* ═══ BANNER INSTITUCIONAL ═══ */}
      <div className="relative bg-gradient-to-r from-primary via-primary to-secondary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-8 md:py-10 relative z-10">
          <div className="flex flex-col items-center text-center gap-4">
            <img src={logo} alt="Logo" className="h-12 md:h-14 object-contain brightness-0 invert" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-1">
                Faça sua Cotação
              </h1>
              <p className="text-primary-foreground/80 text-sm md:text-base">
                Preencha seus dados e do veículo para receber a cotação na hora
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              <span className="inline-flex items-center gap-1.5 bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                <Shield className="h-3.5 w-3.5" /> Proteção completa
              </span>
              <span className="inline-flex items-center gap-1.5 bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                <Zap className="h-3.5 w-3.5" /> Sem burocracia
              </span>
              <span className="inline-flex items-center gap-1.5 bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                <Headphones className="h-3.5 w-3.5" /> Assistência 24h
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8">

        <div className="space-y-6">
          {/* ═══ SEÇÃO 1: DADOS PESSOAIS ═══ */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                Seus Dados
              </CardTitle>
              <CardDescription>Informações para contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="nome" placeholder="Seu nome completo" value={dados.nome}
                      onChange={e => setDados(p => ({ ...p, nome: e.target.value }))}
                      className={`pl-10 ${errors.nome ? 'border-destructive' : ''}`} />
                  </div>
                  {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone / WhatsApp *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="telefone" placeholder="(00) 00000-0000" value={dados.telefone}
                      onChange={e => setDados(p => ({ ...p, telefone: formatTelefone(e.target.value) }))}
                      maxLength={15} className={`pl-10 ${errors.telefone ? 'border-destructive' : ''}`} />
                  </div>
                  {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="seu@email.com" value={dados.email}
                      onChange={e => setDados(p => ({ ...p, email: e.target.value }))}
                      className={`pl-10 ${errors.email ? 'border-destructive' : ''}`} />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══ SEÇÃO 2: DADOS DO VEÍCULO ═══ */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                Dados do Veículo
              </CardTitle>
              <CardDescription>Informe o tipo e busque o valor FIPE</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo do Veículo</Label>
                <Select value={tipoVeiculo} onValueChange={v => {
                  setTipoVeiculo(v as typeof tipoVeiculo);
                  setValorEncontrado(null);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_VEICULO_LANDING.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Placa */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Car className="w-4 h-4" /> Placa (opcional)</Label>
                  {getPlacaStatusBadge()}
                </div>
                <div className="flex gap-2">
                  <Input value={placa} onChange={e => { setPlaca(formatPlaca(e.target.value)); if (placaStatus !== 'idle' && placaStatus !== 'loading') { setPlacaStatus('idle'); setPlacaMessage(''); } }}
                    placeholder="ABC-1234" maxLength={8} disabled={placaStatus === 'loading'}
                    className={cn("text-lg font-mono tracking-wider h-12 text-center uppercase border-2",
                      placaStatus === 'found_fipe' && "border-green-500 bg-green-50 dark:bg-green-950")} />
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={handlePlacaSearch}
                    disabled={placaStatus === 'loading' || placa.length < 7}>
                    {placaStatus === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </Button>
                </div>
                {placaMessage && <p className="text-xs text-muted-foreground">{placaMessage}</p>}
              </div>

              {/* FIPE Manual */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium">Buscar na Tabela FIPE</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Marca</Label>
                    <Select value={selectedMarcaId} onValueChange={v => { setSelectedMarcaId(v); fetchModelos(v); }} disabled={loadingMarcas}>
                      <SelectTrigger><SelectValue placeholder={loadingMarcas ? "Carregando..." : "Selecione..."} /></SelectTrigger>
                      <SelectContent>{marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Modelo</Label>
                    <Select value={selectedModeloId} onValueChange={v => { setSelectedModeloId(v); fetchAnos(v); }} disabled={!selectedMarcaId || loadingModelos}>
                      <SelectTrigger><SelectValue placeholder={loadingModelos ? "Carregando..." : "Selecione..."} /></SelectTrigger>
                      <SelectContent>{modelos.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Ano</Label>
                    <Select value={selectedAnoId} onValueChange={setSelectedAnoId} disabled={!selectedModeloId || loadingAnos}>
                      <SelectTrigger><SelectValue placeholder={loadingAnos ? "Carregando..." : "Selecione..."} /></SelectTrigger>
                      <SelectContent>{anos.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="button" variant="secondary" className="w-full" onClick={fetchValor}
                  disabled={!isComplete || loadingValor}>
                  {loadingValor ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</> : <><Search className="w-4 h-4 mr-2" />Buscar Valor FIPE</>}
                </Button>
                {valorEncontrado && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">{valorEncontrado.marca} {valorEncontrado.modelo}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">Ano: {valorEncontrado.anoModelo} | Código: {valorEncontrado.codigoFipe}</p>
                      </div>
                      <p className="text-xl font-bold text-green-700 dark:text-green-300">{valorEncontrado.valorFormatado}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ═══ BOTÃO CALCULAR ═══ */}
          {!cotacao && (
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onBack} className="px-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleCalcular} className="flex-1 py-6 text-lg"
                disabled={!valorEncontrado || calculando || loading}>
                {calculando || loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Calculando...</> :
                  <><Sparkles className="mr-2 h-5 w-5" />Calcular Cotação</>}
              </Button>
            </div>
          )}

          {/* ═══ SEÇÃO 3: RESULTADO DA COTAÇÃO ═══ */}
          {cotacao && valorEncontrado && (
            <>
              <Card className="shadow-2xl border-primary/20 overflow-hidden">
                <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 text-center">
                  <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-80" />
                  <h2 className="text-2xl font-bold">Sua cotação está pronta!</h2>
                  <p className="text-sm opacity-80 mt-1">
                    {valorEncontrado.marca} {valorEncontrado.modelo} — Ano {valorEncontrado.anoModelo}
                  </p>
                </div>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4 text-center mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor FIPE</p>
                      <p className="font-semibold">{formatCurrency(cotacao.valorFipe)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Participação</p>
                      <p className="font-semibold">{formatCurrency(cotacao.participacao)}</p>
                    </div>
                    <div className="bg-primary/5 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Mensalidade</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(cotacao.mensalidade)}</p>
                      <p className="text-[10px] text-muted-foreground">por mês</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold text-primary">Adesão gratuita — sem taxa!</p>
                  </div>

                  {/* Benefícios */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {beneficiosIcons.map((b, i) => (
                      <div key={i} className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/30">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center mb-1">
                          <b.icon className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-xs font-medium">{b.titulo}</p>
                        <p className="text-[10px] text-muted-foreground">{b.descricao}</p>
                      </div>
                    ))}
                  </div>

                  {/* Ações */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    <Button variant="outline" className="flex-col h-auto py-3 gap-1 border-2 hover:border-primary/50" onClick={onWhatsApp}>
                      <MessageCircle className="h-5 w-5 text-primary" /><span className="text-xs">WhatsApp</span>
                    </Button>
                    <Button variant="outline" className="flex-col h-auto py-3 gap-1 border-2 hover:border-primary/50"
                      onClick={handleSendEmail} disabled={loadingEmail}>
                      {loadingEmail ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Mail className="h-5 w-5 text-primary" />}
                      <span className="text-xs">{loadingEmail ? 'Enviando...' : 'E-mail'}</span>
                    </Button>
                    <Button variant="outline" className="flex-col h-auto py-3 gap-1 border-2 hover:border-primary/50"
                      onClick={handleDownloadPdf} disabled={loadingPdf}>
                      {loadingPdf ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <FileText className="h-5 w-5 text-primary" />}
                      <span className="text-xs">{loadingPdf ? 'Gerando...' : 'PDF'}</span>
                    </Button>
                    <Button variant="outline" className="flex-col h-auto py-3 gap-1 border-2 hover:border-primary/50" onClick={handleCopyLink}>
                      <Link2 className="h-5 w-5 text-primary" /><span className="text-xs">Link</span>
                    </Button>
                  </div>

                  {/* Aceitar */}
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={onBack} className="px-6">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                    <Button onClick={() => { handleDownloadPdf(); onAccept(); }} className="flex-1 py-6 text-lg">
                      Aceitar proposta <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
