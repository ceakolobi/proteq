import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  MessageCircle, 
  Mail, 
  FileText,
  Shield,
  Headphones,
  MapPin,
  Percent,
  Truck,
  Car,
  Key,
  Zap,
  Sparkles,
  Loader2,
  Link2,
  Copy
} from 'lucide-react';
import { StepIndicator } from './StepIndicator';
import type { DadosPessoais, DadosVeiculo, ResultadoCotacaoPublica } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoColorida from '@/assets/logo-harmony-colorida.png';
import logoBranca from '@/assets/logo-harmony-branca.png';
import harmonyAgroLogoColorida from '@/assets/harmony-agro-logo-colorida.png';
import harmonyAgroLogoBranca from '@/assets/harmony-agro-logo-branca.png';
import html2pdf from 'html2pdf.js';

// Helper: convert any image URL to base64 data URI
const imageToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      console.warn('[PDF] Failed to load image:', url);
      resolve(''); // return empty string on failure instead of rejecting
    };
    img.src = url;
  });
};

const QUOTATION_STEPS = [
  { number: 1, label: 'Seus Dados' },
  { number: 2, label: 'Veículo' },
  { number: 3, label: 'Proposta' },
];

interface ResultadoCotacaoProps {
  dadosPessoais: DadosPessoais;
  dadosVeiculo: DadosVeiculo | null;
  cotacao: ResultadoCotacaoPublica | null;
  onBack: () => void;
  onContinue: () => void;
  onWhatsApp: () => void;
}

interface CompanyData {
  settings: {
    empresa_nome?: string;
    empresa_logo?: string;
    empresa_logo_branca?: string;
    cor_primaria?: string;
    cor_secundaria?: string;
    texto_institucional?: string;
    telefone?: string;
    email?: string;
    site?: string;
    cover_mode?: string;
    cover_fixed_index?: number;
    pdf_contracapa?: string;
  };
  covers: { id: string; public_url: string }[];
  contractTemplate: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Convert markdown to simple HTML
const markdownToHtml = (md: string, vars: Record<string, string>): string => {
  let html = md;
  // Replace variables
  Object.entries(vars).forEach(([key, value]) => {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  });
  // Convert markdown to HTML
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:14px;font-weight:bold;color:#1e3a5f;margin:18px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:bold;color:#1e3a5f;margin:0 0 6px;text-align:center;">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left:20px;font-size:11px;line-height:1.6;">$1</li>');
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;">');
  html = html.replace(/\n\n/g, '<br>');
  return html;
};

export function ResultadoCotacao({ 
  dadosPessoais, 
  dadosVeiculo, 
  cotacao, 
  onBack, 
  onContinue,
  onWhatsApp 
}: ResultadoCotacaoProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Fetch company data (covers, contract, settings)
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-company-data`;
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (result.success) {
          setCompanyData(result.data);
        }
      } catch (error) {
        console.error('Erro ao buscar dados da empresa:', error);
      } finally {
        setLoadingCompany(false);
      }
    };
    fetchCompanyData();
  }, []);

  // Get cover URL
  const getCoverUrl = (): string | null => {
    if (!companyData) return null;
    const { covers, settings } = companyData;
    if (covers.length === 0) return null;
    const mode = settings.cover_mode || 'fixed';
    if (mode === 'random') {
      return covers[Math.floor(Math.random() * covers.length)]?.public_url || null;
    }
    const idx = Math.max(0, (settings.cover_fixed_index || 1) - 1);
    return covers[idx]?.public_url || covers[0]?.public_url || null;
  };

  const empresaNome = companyData?.settings?.empresa_nome || 'HARMONY AGRO';
  const siteEmpresa = companyData?.settings?.site || 'www.harmonyagro.com.br';

  // Generate professional PDF with covers + proposal + contract
  const generateProfessionalPdf = async (): Promise<Blob | null> => {
    if (!dadosVeiculo || !cotacao) return null;

    const coverUrl = getCoverUrl();
    const contracapaUrl = companyData?.settings?.pdf_contracapa || null;
    const textoInstitucional = companyData?.settings?.texto_institucional || 
      'Esta proposta tem validade de 7 dias.';
    const contractMd = companyData?.contractTemplate || '';
    
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + 7);
    const validadeStr = dataValidade.toLocaleDateString('pt-BR');

    // Pre-convert ALL images to base64 to avoid CORS/cross-origin issues
    console.log('[PDF] Pre-converting images to base64...');
    const [logoColoridaB64, logoBrancaB64, coverB64, contracapaB64] = await Promise.all([
      imageToBase64(harmonyAgroLogoColorida),
      imageToBase64(harmonyAgroLogoBranca),
      coverUrl ? imageToBase64(coverUrl) : Promise.resolve(''),
      contracapaUrl ? imageToBase64(contracapaUrl) : Promise.resolve(''),
    ]);
    console.log('[PDF] Images converted. Cover:', !!coverB64, 'Logo:', !!logoBrancaB64);

    // Contract variables
    const contractVars: Record<string, string> = {
      nome: dadosPessoais.nome,
      cpf: '(a definir)',
      plano: cotacao.cotaNome || 'Padrão',
      modelo: `${dadosVeiculo.marca} ${dadosVeiculo.modelo}`,
      ano: String(dadosVeiculo.ano),
      placa: dadosVeiculo.placa || '(a definir)',
      mensalidade: formatCurrency(cotacao.mensalidade),
      data: dataAtual,
    };

    const contractHtml = contractMd ? markdownToHtml(contractMd, contractVars) : '';

    const beneficios = [
      { titulo: 'Carro Reserva', sub: '30 dias inclusos' },
      { titulo: 'Guincho', sub: '500 km (250km ida/volta)' },
      { titulo: 'Vidros', sub: 'Cobertura de para-brisa' },
      { titulo: 'Chaveiro', sub: '24 horas' },
      { titulo: 'Pane Elétrica', sub: 'Assistência inclusa' },
      { titulo: 'Pane Mecânica', sub: 'Assistência inclusa' },
      { titulo: 'Pane Seca', sub: 'Combustível incluso' },
      { titulo: 'Eventos da Natureza', sub: 'Proteção completa' },
    ];

    // Build full HTML - using base64 data URIs for all images
    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;">
        ${coverB64 ? `
          <div style="width:210mm;min-height:297mm;display:flex;flex-direction:column;background:#fff;padding:24px;page-break-after:always;">
            <div style="border-radius:16px;overflow:hidden;flex:1;">
              <img src="${coverB64}" style="width:100%;height:100%;object-fit:cover;" />
            </div>
          </div>
        ` : ''}
        
        <!-- PROPOSTA -->
        <div style="width:210mm;min-height:297mm;background:#fff;padding:0;page-break-after:always;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#F97316,#ea580c);padding:24px 32px;border-radius:0 0 16px 16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              ${logoBrancaB64 ? `<img src="${logoBrancaB64}" style="height:48px;" />` : ''}
              <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:10px;font-weight:600;padding:6px 16px;border-radius:20px;">
                Atendimento em todo território nacional
              </span>
            </div>
            <div style="text-align:center;color:#fff;padding:8px 0 12px;">
              <h1 style="font-size:22px;font-weight:bold;margin:0;letter-spacing:1px;">PROPOSTA DE COTAÇÃO</h1>
              <p style="font-size:12px;opacity:0.9;margin:4px 0 0;">Proteção Veicular • Carros • Motos • Camionetes</p>
            </div>
          </div>

          <!-- Dados do Cliente -->
          <div style="padding:20px 32px;">
            <div style="display:flex;gap:24px;margin-bottom:16px;">
              <div style="flex:1;">
                <p style="font-size:10px;color:#888;text-transform:uppercase;">Cliente</p>
                <p style="font-size:14px;font-weight:bold;">${dadosPessoais.nome}</p>
              </div>
              <div>
                <p style="font-size:10px;color:#888;text-transform:uppercase;">Telefone</p>
                <p style="font-size:14px;font-weight:bold;">${dadosPessoais.telefone}</p>
              </div>
              <div>
                <p style="font-size:10px;color:#888;text-transform:uppercase;">Data</p>
                <p style="font-size:14px;font-weight:bold;">${dataAtual}</p>
              </div>
            </div>
          </div>

          <!-- Veículo + Valores -->
          <div style="padding:0 32px;display:flex;gap:16px;">
            <!-- Veículo -->
            <div style="flex:1;border:1px solid #fed7aa;border-radius:16px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#F97316,#ea580c);padding:12px 16px;">
                <p style="color:#fff;font-weight:bold;font-size:14px;margin:0;">Dados do Veículo</p>
              </div>
              <div style="padding:16px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                  <div style="background:#fff7ed;border-radius:8px;padding:8px;">
                    <p style="font-size:9px;color:#9a3412;text-transform:uppercase;">Marca</p>
                    <p style="font-weight:600;font-size:12px;">${dadosVeiculo.marca}</p>
                  </div>
                  <div style="background:#fff7ed;border-radius:8px;padding:8px;">
                    <p style="font-size:9px;color:#9a3412;text-transform:uppercase;">Modelo</p>
                    <p style="font-weight:600;font-size:12px;">${dadosVeiculo.modelo}</p>
                  </div>
                  <div style="background:#fff7ed;border-radius:8px;padding:8px;">
                    <p style="font-size:9px;color:#9a3412;text-transform:uppercase;">Ano</p>
                    <p style="font-weight:600;font-size:12px;">${dadosVeiculo.ano}</p>
                  </div>
                  <div style="background:#fff7ed;border-radius:8px;padding:8px;">
                    <p style="font-size:9px;color:#9a3412;text-transform:uppercase;">Tipo</p>
                    <p style="font-weight:600;font-size:12px;">${dadosVeiculo.tipo_bem}</p>
                  </div>
                </div>
                <div style="background:#f0fdf4;border-radius:8px;padding:12px;text-align:center;margin-top:8px;">
                  <p style="font-size:9px;color:#166534;text-transform:uppercase;">Valor FIPE</p>
                  <p style="font-size:20px;font-weight:bold;color:#15803d;">${formatCurrency(cotacao.valorFipe)}</p>
                </div>
              </div>
            </div>

            <!-- Valores -->
            <div style="flex:1;border:1px solid #bbf7d0;border-radius:16px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:12px 16px;">
                <p style="color:#fff;font-weight:bold;font-size:14px;margin:0;">Valores da Proposta</p>
              </div>
              <div style="padding:16px;">
                <div style="background:linear-gradient(135deg,#F97316,#ea580c);border-radius:12px;padding:16px;text-align:center;color:#fff;margin-bottom:12px;">
                  <p style="font-size:11px;opacity:0.9;margin:0;">Mensalidade</p>
                  <p style="font-size:32px;font-weight:bold;margin:4px 0;">${formatCurrency(cotacao.mensalidade)}</p>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                  <div style="background:#f0fdf4;border-radius:8px;padding:8px;text-align:center;">
                    <p style="font-size:9px;color:#166534;">COTA</p>
                    <p style="font-weight:600;font-size:11px;">${cotacao.cotaNome || 'Padrão'}</p>
                  </div>
                  <div style="background:#f0fdf4;border-radius:8px;padding:8px;text-align:center;">
                    <p style="font-size:9px;color:#166534;">PARTICIPAÇÃO</p>
                    <p style="font-weight:600;font-size:11px;">${formatCurrency(cotacao.participacao)}</p>
                  </div>
                </div>
                <div style="background:#fff7ed;border-radius:8px;padding:8px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="font-size:11px;color:#9a3412;">Taxa de adesão:</span>
                    <span style="font-weight:600;color:#15803d;font-size:11px;">GRÁTIS ✅</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;">
                    <span style="font-size:11px;color:#9a3412;">Validade:</span>
                    <span style="font-weight:600;font-size:11px;">${validadeStr}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Benefícios -->
          <div style="padding:20px 32px;">
            <div style="border:1px solid #fed7aa;border-radius:16px;padding:20px;">
              <h2 style="font-size:16px;font-weight:bold;margin:0 0 12px;color:#1e3a5f;">Benefícios Inclusos</h2>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                ${beneficios.map(b => `
                  <div style="display:flex;align-items:center;gap:8px;padding:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:#fff7ed;display:flex;align-items:center;justify-content:center;">
                      <span style="color:#F97316;font-size:12px;">✓</span>
                    </div>
                    <div>
                      <p style="font-weight:600;font-size:11px;margin:0;">${b.titulo}</p>
                      <p style="font-size:9px;color:#888;margin:0;">${b.sub}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Condições -->
          <div style="padding:0 32px 16px;">
            <div style="background:#fff7ed;border-radius:12px;padding:12px;border:1px solid #fed7aa;">
              <p style="font-size:11px;font-weight:bold;color:#9a3412;margin:0 0 6px;">Condições Importantes</p>
              <p style="font-size:10px;color:#78350f;line-height:1.5;margin:0;">${textoInstitucional}</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#F97316;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;margin-top:auto;">
            ${logoBrancaB64 ? `<img src="${logoBrancaB64}" style="height:32px;" />` : ''}
            <span style="color:#fff;font-size:12px;font-weight:500;">${siteEmpresa}</span>
          </div>
        </div>

        ${contractHtml ? `
          <!-- CONTRATO -->
          <div style="width:210mm;min-height:297mm;background:#fff;padding:32px 40px;page-break-before:always;font-size:11px;line-height:1.7;">
            <div style="text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #F97316;">
              ${logoColoridaB64 ? `<img src="${logoColoridaB64}" style="height:40px;margin-bottom:8px;" />` : ''}
            </div>
            ${contractHtml}
          </div>
        ` : ''}

        ${contracapaB64 ? `
          <div style="width:210mm;height:297mm;page-break-before:always;display:flex;align-items:center;justify-content:center;background:#fff;">
            <img src="${contracapaB64}" style="width:100%;height:100%;object-fit:cover;" />
          </div>
        ` : ''}
      </div>
    `;

    // Create hidden container
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    try {
      const opt = {
        margin: 0,
        filename: `Proposta_HarmonyAgro_${dadosVeiculo.marca}_${dadosVeiculo.modelo}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      const blob = await html2pdf().set(opt).from(container).outputPdf('blob');
      return blob;
    } finally {
      document.body.removeChild(container);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!dadosVeiculo || !cotacao) return;
    
    setLoadingPdf(true);
    try {
      const blob = await generateProfessionalPdf();
      if (!blob) {
        toast.error('Erro ao gerar PDF');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proposta_HarmonyAgro_${dadosVeiculo.marca}_${dadosVeiculo.modelo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  // Send email with PDF
  const handleSendEmail = async () => {
    if (!dadosVeiculo || !cotacao) return;
    if (!dadosPessoais.email) {
      toast.error('E-mail não informado');
      return;
    }
    
    setLoadingEmail(true);
    try {
      const blob = await generateProfessionalPdf();
      if (!blob) {
        toast.error('Erro ao gerar PDF para envio');
        return;
      }

      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const filename = `Proposta_HarmonyAgro_${dadosVeiculo.marca}_${dadosVeiculo.modelo}.pdf`;

      const { data, error } = await supabase.functions.invoke('send-proposta-email', {
        body: {
          to: dadosPessoais.email,
          clienteNome: dadosPessoais.nome,
          modelo: `${dadosVeiculo.marca} ${dadosVeiculo.modelo}`,
          mensalidade: formatCurrency(cotacao.mensalidade),
          validadeDias: 7,
          pdfUrl: null,
          pdfBase64: base64,
          filename,
          empresaNome: companyData?.settings?.empresa_nome || 'Proteção Veicular',
        },
      });

      if (error) {
        console.error('Erro ao enviar email:', error);
        toast.error('Erro ao enviar e-mail. Tente novamente.');
        return;
      }

      if (data?.success) {
        toast.success(`Proposta enviada para ${dadosPessoais.email}!`);
      } else {
        toast.error(data?.error || 'Erro ao enviar e-mail');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast.error('Erro ao enviar e-mail');
    } finally {
      setLoadingEmail(false);
    }
  };

  // Copy adesão link to clipboard
  const handleCopyLink = async () => {
    let adesaoUrl = sessionStorage.getItem('adesao_link') || '';
    
    if (!adesaoUrl && dadosVeiculo && cotacao) {
      // Create cotação + link if not yet created
      try {
        const { data: consultores } = await supabase
          .from('profiles')
          .select('id, company_id')
          .limit(1) as { data: { id: string; company_id: string | null }[] | null };

        const consultorId = consultores?.[0]?.id;
        const companyId = consultores?.[0]?.company_id;

        if (consultorId) {
          const { data: novaCotacao } = await supabase
            .from('cotacoes')
            .insert({
              tipo_bem: dadosVeiculo.tipo_bem as any,
              marca: dadosVeiculo.marca || '',
              modelo: dadosVeiculo.modelo || '',
              ano_fabricacao: dadosVeiculo.ano || new Date().getFullYear(),
              valor_bem: dadosVeiculo.valor_fipe || 0,
              valor_fipe: dadosVeiculo.valor_fipe || null,
              codigo_fipe: dadosVeiculo.codigo_fipe || null,
              consultor_id: consultorId,
              company_id: companyId,
              cliente_nome: dadosPessoais.nome,
              cliente_email: dadosPessoais.email,
              cliente_whatsapp: dadosPessoais.telefone,
              mensalidade: cotacao.mensalidade,
              participacao: cotacao.participacao,
              status: 'enviada' as any,
              metodo_valoracao: 'fipe' as any,
            })
            .select('id')
            .single();

          if (novaCotacao) {
            const { data: adesaoLink } = await supabase
              .from('adesao_links')
              .insert({ cotacao_id: novaCotacao.id, company_id: companyId })
              .select('token')
              .single();

            if (adesaoLink) {
              adesaoUrl = `${window.location.origin}/adesao/${novaCotacao.id}/${adesaoLink.token}`;
              sessionStorage.setItem('adesao_link', adesaoUrl);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao criar link:', error);
      }
    }

    if (adesaoUrl) {
      await navigator.clipboard.writeText(adesaoUrl);
      toast.success('Link de adesão copiado!');
    } else {
      toast.error('Não foi possível gerar o link. Tente novamente.');
    }
  };

  if (!dadosVeiculo) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-16 px-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8">
            <p className="text-muted-foreground">Dados do veículo não encontrados. Tente novamente.</p>
            <Button onClick={onBack} className="mt-4">Voltar</Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!cotacao) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-16 px-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8 space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg">Cotação não disponível</h3>
            <p className="text-muted-foreground text-sm">
              Não encontramos uma faixa de proteção para o veículo informado 
              ({dadosVeiculo.marca} {dadosVeiculo.modelo} - {formatCurrency(dadosVeiculo.valor_fipe || 0)}).
            </p>
            <p className="text-xs text-muted-foreground">
              Por favor, entre em contato conosco para uma cotação personalizada.
            </p>
            <Button onClick={onBack} className="mt-4">Voltar e tentar novamente</Button>
          </CardContent>
        </Card>
      </section>
    );
  }

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

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Step Indicator */}
        <StepIndicator currentStep={3} steps={QUOTATION_STEPS} />

        {/* Header */}
        <div className="text-center mb-10">
          <img src={logoColorida} alt="Harmony" className="h-12 mx-auto mb-4 dark:hidden" />
          <img src={logoBranca} alt="Harmony" className="h-12 mx-auto mb-4 hidden dark:block" />
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Sua cotação está pronta!</h2>
          <p className="text-lg text-muted-foreground">
            Olá <span className="font-semibold text-foreground">{dadosPessoais.nome.split(' ')[0]}</span>, 
            confira os valores da sua proteção
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Card principal com valores */}
          <Card className="lg:col-span-2 shadow-2xl border-primary/20 overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6">
              <p className="text-sm opacity-80 mb-1">Veículo</p>
              <p className="font-bold text-lg">
                {dadosVeiculo.marca} {dadosVeiculo.modelo}
              </p>
              <p className="text-sm opacity-80">Ano {dadosVeiculo.ano}</p>
            </div>
            
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-muted-foreground text-sm">Valor FIPE</span>
                <span className="font-semibold">{formatCurrency(cotacao.valorFipe)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-muted-foreground text-sm">Participação</span>
                <span className="font-semibold">{formatCurrency(cotacao.participacao)}</span>
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-1">Mensalidade</p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(cotacao.mensalidade)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">por mês</p>
              </div>

              <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-primary">Adesão gratuita — sem taxa!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefícios */}
          <Card className="lg:col-span-3 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Benefícios Inclusos
              </CardTitle>
              <CardDescription>
                Tudo o que você precisa para proteger seu veículo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {beneficiosIcons.map((beneficio, index) => (
                  <div 
                    key={index} 
                    className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                      <beneficio.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium">{beneficio.titulo}</p>
                    <p className="text-[10px] text-muted-foreground">{beneficio.descricao}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botões de ação */}
        <Card className="mt-6 shadow-xl">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground mb-4">
              Receba sua proposta detalhada {loadingCompany ? '(carregando dados...)' : '(com capas e contrato)'}
            </p>
            
            <div className="grid grid-cols-4 gap-3 mb-6">
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={onWhatsApp}
              >
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={handleSendEmail}
                disabled={loadingEmail || loadingCompany}
              >
                {loadingEmail ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Mail className="h-5 w-5 text-primary" />
                )}
                <span className="text-xs">{loadingEmail ? 'Enviando...' : 'E-mail'}</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={handleDownloadPdf}
                disabled={loadingPdf || loadingCompany}
              >
                {loadingPdf ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
                <span className="text-xs">{loadingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
              </Button>

              <Button 
                variant="outline" 
                className="flex-col h-auto py-4 gap-2 border-2 hover:border-primary/50"
                onClick={handleCopyLink}
              >
                <Link2 className="h-5 w-5 text-primary" />
                <span className="text-xs">Copiar Link</span>
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onBack} className="px-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={() => {
                handleDownloadPdf();
                onContinue();
              }} className="flex-1 py-6 text-lg">
                Aceitar proposta
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
