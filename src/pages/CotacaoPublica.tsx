import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Loader2, Shield } from 'lucide-react';
import type { TipoBem } from '@/types/cotacao';
import {
  calcularCotacaoCompleta,
  parseValorBrasileiro,
  formatCurrency,
  type Cota,
  type ResultadoCotacao,
} from '@/lib/cotacaoUtils';
import {
  INITIAL_FORM_DATA,
  type WizardFormData,
} from '@/components/cotacao/wizard/CotacaoWizardTypes';
import { WizardStep1Vehicle } from '@/components/cotacao/wizard/WizardStep1Vehicle';
import { WizardStep2Client } from '@/components/cotacao/wizard/WizardStep2Client';
import { WizardStep3Terms } from '@/components/cotacao/wizard/WizardStep3Terms';
import { WizardStep4Generate } from '@/components/cotacao/wizard/WizardStep4Generate';
import { useBrand } from '@/hooks/useBrand';
import type { SystemSettings } from '@/hooks/useCompanySettings';

const PUBLIC_STEPS = [
  { number: 1, title: 'Veículo & Plano', description: 'Dados e valoração' },
  { number: 2, title: 'Seus Dados', description: 'Informações de contato' },
  { number: 3, title: 'Contrato & Termos', description: 'Aceite e assinatura' },
  { number: 4, title: 'Gerar & Enviar', description: 'PDF e compartilhamento' },
] as const;

const defaultPublicSettings: SystemSettings = {
  id: '',
  empresa_nome: 'Harmony Agro',
  cnpj: null,
  empresa_logo: null,
  empresa_logo_branca: null,
  empresa_logo_escura: null,
  cor_primaria: '#F97316',
  cor_secundaria: '#22C55E',
  cor_destaque: '#F59E0B',
  texto_institucional: null,
  pdf_contracapa: null,
  telefone: null,
  email: null,
  site: null,
  modo_white_label: false,
  esconder_marca_harmony: false,
  cover_1: null,
  cover_2: null,
  cover_3: null,
  cover_4: null,
  cover_mode: null,
  cover_fixed_index: null,
  created_at: '',
  updated_at: '',
};

export default function CotacaoPublica() {
  const navigate = useNavigate();
  const { getLogoForContext } = useBrand();

  const [cotas, setCotas] = useState<Cota[]>([]);
  const [cotasLoading, setCotasLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM_DATA);
  const [resultado, setResultado] = useState<ResultadoCotacao | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [cotacaoId, setCotacaoId] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [publicSettings, setPublicSettings] = useState<SystemSettings>(defaultPublicSettings);

  // Load company settings first, then cotas filtered by company
  useEffect(() => {
    const fetchData = async () => {
      // 1. Load company settings publicly
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      let companyId: string | null = null;

      if (companyData) {
        companyId = companyData.id;
        setPublicSettings({
          ...defaultPublicSettings,
          id: companyData.id,
          empresa_nome: companyData.nome || 'Harmony Agro',
          cnpj: companyData.cnpj,
          empresa_logo: companyData.logo,
          empresa_logo_branca: companyData.logo_branca,
          empresa_logo_escura: companyData.logo_escura,
          cor_primaria: companyData.cor_primaria || '#F97316',
          cor_secundaria: companyData.cor_secundaria || '#22C55E',
          cor_destaque: companyData.cor_destaque || '#F59E0B',
          texto_institucional: companyData.texto_institucional,
          pdf_contracapa: companyData.pdf_contracapa,
          telefone: companyData.telefone,
          email: companyData.email,
          site: companyData.site,
          modo_white_label: companyData.modo_white_label || false,
          esconder_marca_harmony: companyData.esconder_marca_harmony || false,
          cover_1: companyData.cover_1,
          cover_2: companyData.cover_2,
          cover_3: companyData.cover_3,
          cover_4: companyData.cover_4,
          cover_mode: companyData.cover_mode,
          cover_fixed_index: companyData.cover_fixed_index,
        });
      }

      // 2. Load cotas filtered by company_id
      let cotasQuery = supabase
        .from('cotas')
        .select('*')
        .eq('ativo', true)
        .order('fipe_min', { ascending: true });

      if (companyId) {
        cotasQuery = cotasQuery.eq('company_id', companyId);
      }

      const { data: cotasData, error: cotasError } = await cotasQuery;

      if (cotasData) {
        console.log('[CotacaoPublica] Cotas carregadas para empresa:', cotasData.length);
        setCotas(cotasData as unknown as Cota[]);
      }
      if (cotasError) console.error('Erro ao buscar cotas:', cotasError);
      setCotasLoading(false);
    };

    fetchData();
  }, []);

  const cotasAtivas = useMemo(() => cotas.filter(c => c.ativo), [cotas]);

  const empresaNome = publicSettings.modo_white_label && publicSettings.empresa_nome
    ? publicSettings.empresa_nome
    : 'Proteção Veicular';

  const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleCalcular = useCallback(() => {
    if (!formData.tipo_bem || !formData.valor_bem) return null;
    const valorBem = parseValorBrasileiro(formData.valor_bem);
    if (valorBem < 1000) return null;
    const result = calcularCotacaoCompleta(
      valorBem,
      formData.tipo_bem as TipoBem,
      cotasAtivas,
      formData.ajuste_individual_valor,
      formData.carro_reserva_extra
    );
    setResultado(result);
    return result;
  }, [formData.tipo_bem, formData.valor_bem, formData.ajuste_individual_valor, formData.carro_reserva_extra, cotasAtivas]);

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.tipo_bem) newErrors.tipo_bem = 'Selecione o tipo';
      if (!formData.marca || formData.marca.length < 2) newErrors.marca = 'Informe a marca';
      if (!formData.modelo || formData.modelo.length < 2) newErrors.modelo = 'Informe o modelo';
      if (!formData.ano_fabricacao) newErrors.ano_fabricacao = 'Informe o ano';
      if (!formData.valor_bem) newErrors.valor_bem = 'Informe o valor';
      if (!resultado) {
        const calc = handleCalcular();
        if (!calc) newErrors.valor_bem = 'Calcule a cotação primeiro';
      }
    }

    if (step === 2) {
      if (!formData.cliente_nome || formData.cliente_nome.length < 3) newErrors.cliente_nome = 'Nome obrigatório';
      if (!formData.cliente_email || !formData.cliente_email.includes('@')) newErrors.cliente_email = 'E-mail inválido';
      if (!formData.cliente_whatsapp || formData.cliente_whatsapp.replace(/\D/g, '').length < 10) newErrors.cliente_whatsapp = 'WhatsApp inválido';
    }

    if (step === 3) {
      if (!formData.termos_aceitos) newErrors.termos_aceitos = 'Aceite os termos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, resultado, handleCalcular]);

  // Save lead + cotação to DB (public, no auth required)
  const handleSaveCotacao = useCallback(async (): Promise<string | null> => {
    if (!resultado) return null;
    if (cotacaoId) return cotacaoId;

    setIsSaving(true);
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      // Get default consultant
      const { data: consultores } = await supabase
        .from('profiles')
        .select('id, company_id')
        .limit(1) as { data: { id: string; company_id: string | null }[] | null };

      const defaultConsultorId = consultores?.[0]?.id;
      const companyId = consultores?.[0]?.company_id;

      // If authenticated, use own ID as consultor_id (RLS requires consultor_id = auth.uid())
      const consultorId = currentUserId || defaultConsultorId;

      if (!consultorId) {
        toast.error('Erro de configuração do sistema');
        return null;
      }

      const telefoneNormalizado = formData.cliente_whatsapp.replace(/\D/g, '');
      const valorBem = parseValorBrasileiro(formData.valor_bem);

      // Create/find lead
      let leadId: string | null = null;
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('telefone', telefoneNormalizado)
        .limit(1)
        .maybeSingle() as { data: { id: string } | null };

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        const { data: novoLead } = await supabase
          .from('leads')
          .insert({
            nome: formData.cliente_nome.trim(),
            telefone: telefoneNormalizado,
            email: formData.cliente_email.trim().toLowerCase(),
            consultor_id: consultorId,
            company_id: companyId,
            origem: 'site' as const,
            status: 'cotado' as const,
            tipo_veiculo: formData.tipo_bem as any,
          })
          .select('id')
          .single();
        leadId = novoLead?.id || null;
      }

      // Create cotação
      const { data: novaCotacao, error } = await supabase
        .from('cotacoes')
        .insert({
          tipo_bem: formData.tipo_bem as TipoBem,
          marca: formData.marca,
          modelo: formData.modelo,
          ano_fabricacao: parseInt(formData.ano_fabricacao),
          valor_bem: valorBem,
          metodo_valoracao: formData.metodo_valoracao,
          consultor_id: consultorId,
          company_id: companyId,
          lead_id: leadId,
          placa: formData.placa || null,
          chassi: formData.chassi || null,
          ano_modelo: formData.ano_modelo ? parseInt(formData.ano_modelo) : null,
          categoria: resultado.categoria,
          cor: formData.cor || null,
          renavam: formData.renavam || null,
          valor_fipe: formData.metodo_valoracao === 'fipe' ? valorBem : null,
          codigo_fipe: formData.codigo_fipe || null,
          cota_id: resultado.cotaId,
          valor_base: resultado.valorBase,
          ajuste_geral_valor: resultado.ajusteGeralValor,
          ajuste_individual_valor: resultado.ajusteIndividualValor,
          valor_final: resultado.valorFinal,
          mensalidade: resultado.valorFinal,
          participacao: resultado.participacao,
          cliente_nome: formData.cliente_nome || null,
          cliente_email: formData.cliente_email || null,
          cliente_whatsapp: formData.cliente_whatsapp || null,
          status: 'aceita' as any,
        })
        .select('id')
        .single();

      if (error) throw error;

      setCotacaoId(novaCotacao.id);

      // Create adesão link
      const { data: adesaoLink } = await supabase
        .from('adesao_links')
        .insert({
          cotacao_id: novaCotacao.id,
          company_id: companyId,
        })
        .select('token')
        .single();

      if (adesaoLink) {
        sessionStorage.setItem('adesao_link', `${window.location.origin}/adesao/${novaCotacao.id}/${adesaoLink.token}`);
      }

      // Update lead status
      if (leadId) {
        await supabase
          .from('leads')
          .update({ status: 'convertido' as const })
          .eq('id', leadId);
      }

      toast.success('Cotação salva com sucesso!');
      return novaCotacao.id;
    } catch (err: any) {
      console.error('Erro ao salvar cotação:', err);
      toast.error(err.message || 'Erro ao salvar cotação');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [resultado, formData, cotacaoId]);

  // Generate PDF (same logic as CRM)
  const handleGeneratePdf = useCallback(async () => {
    if (!resultado) {
      toast.error('Calcule a cotação primeiro');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // Save cotação first if not saved
      const savedId = await handleSaveCotacao();
      if (!savedId) {
        setIsGeneratingPdf(false);
        return;
      }

      const html2pdf = (await import('html2pdf.js')).default;

      const dataAtual = new Date().toLocaleDateString('pt-BR');
      const html = `
        <div style="background:#fff;font-family:Arial,sans-serif;color:#333;">
          <div style="background:linear-gradient(135deg,#F97316,#22C55E);padding:40px 30px;text-align:center;color:#fff;">
            <h1 style="font-size:28px;font-weight:bold;margin:0 0 8px;">🛡️ Proposta de Cotação</h1>
            <p style="font-size:14px;opacity:0.9;margin:0;">${empresaNome} • Proteção Veicular</p>
          </div>
          <div style="padding:30px;">
            <table style="width:100%;border-spacing:20px 0;border-collapse:separate;">
              <tr>
                <td style="width:50%;vertical-align:top;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
                  <h2 style="font-size:16px;font-weight:bold;border-bottom:2px solid #F97316;padding-bottom:8px;margin-bottom:16px;">Dados do Veículo</h2>
                  <table style="width:100%;font-size:13px;">
                    <tr><td style="padding:6px 0;color:#6b7280;">Marca:</td><td style="font-weight:600;text-align:right;">${formData.marca}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;">Modelo:</td><td style="font-weight:600;text-align:right;">${formData.modelo}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;">Ano:</td><td style="font-weight:600;text-align:right;">${formData.ano_fabricacao}${formData.ano_modelo ? '/' + formData.ano_modelo : ''}</td></tr>
                    ${formData.placa ? `<tr><td style="padding:6px 0;color:#6b7280;">Placa:</td><td style="font-weight:600;text-align:right;">${formData.placa}</td></tr>` : ''}
                  </table>
                </td>
                <td style="width:50%;vertical-align:top;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
                  <h2 style="font-size:16px;font-weight:bold;border-bottom:2px solid #22C55E;padding-bottom:8px;margin-bottom:16px;">Valores</h2>
                  <div style="background:linear-gradient(135deg,#F97316,#ea580c);color:#fff;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
                    <p style="font-size:12px;text-transform:uppercase;opacity:0.9;margin:0 0 4px;">Mensalidade</p>
                    <p style="font-size:32px;font-weight:bold;margin:0;">${formatCurrency(resultado.valorFinal)}</p>
                  </div>
                  <table style="width:100%;font-size:13px;">
                    <tr><td style="padding:4px 0;color:#6b7280;">Cota:</td><td style="font-weight:600;text-align:right;">${resultado.cotaNome}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Participação:</td><td style="font-weight:600;text-align:right;">${formatCurrency(resultado.participacao)}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Validade:</td><td style="font-weight:600;text-align:right;">7 dias</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
          ${formData.cliente_nome ? `
          <div style="padding:0 30px 20px;">
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
              <h2 style="font-size:16px;font-weight:bold;border-bottom:2px solid #F97316;padding-bottom:8px;margin-bottom:16px;">Dados do Cliente</h2>
              <table style="width:100%;font-size:13px;">
                <tr><td style="padding:4px 0;color:#6b7280;">Nome:</td><td style="font-weight:600;">${formData.cliente_nome}</td></tr>
                ${formData.cliente_email ? `<tr><td style="padding:4px 0;color:#6b7280;">E-mail:</td><td style="font-weight:600;">${formData.cliente_email}</td></tr>` : ''}
                ${formData.cliente_whatsapp ? `<tr><td style="padding:4px 0;color:#6b7280;">WhatsApp:</td><td style="font-weight:600;">${formData.cliente_whatsapp}</td></tr>` : ''}
              </table>
            </div>
          </div>` : ''}
          <div style="padding:0 30px 20px;"><div style="background:#f9fafb;border-radius:12px;padding:20px;">
            <h3 style="font-size:14px;font-weight:bold;margin-bottom:10px;">Condições Importantes</h3>
            <p style="font-size:11px;color:#6b7280;line-height:1.6;">Esta proposta tem validade de 7 dias. Os valores podem sofrer alteração conforme tabela FIPE vigente. A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade.</p>
          </div></div>
          <div style="background:linear-gradient(135deg,#F97316,#22C55E);padding:15px 30px;text-align:center;color:#fff;font-size:11px;">
            <p style="margin:0;font-weight:600;">${empresaNome}</p>
            <p style="margin:4px 0 0;opacity:0.9;">Emitido em ${dataAtual}</p>
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

      // Force layout recalculation
      void container.offsetHeight;

      try {
        const opt = {
          margin: 0,
          filename: `Proposta_${formData.modelo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.92 },
          html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
          pagebreak: { mode: ['css', 'legacy'] },
        };

        const blob = await html2pdf().set(opt).from(container).outputPdf('blob');
        setPdfBlob(blob);

        // Upload to storage
        const filePath = `propostas/${savedId}/Proposta_${formData.modelo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('vistoria-fotos')
          .upload(filePath, blob, { contentType: 'application/pdf', upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('vistoria-fotos')
            .getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            setPdfUrl(urlData.publicUrl);
          }
        }

        toast.success('PDF gerado com sucesso!');
      } finally {
        document.body.removeChild(container);
      }
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [resultado, handleSaveCotacao, formData, empresaNome]);

  // Next step
  const handleNext = useCallback(async () => {
    if (!validateStep(currentStep)) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (currentStep === 1 && !resultado) {
      const calc = handleCalcular();
      if (!calc) {
        toast.error('Não foi possível calcular a cotação');
        return;
      }
    }

    // Save on step 3 → 4 transition
    if (currentStep === 3) {
      const saved = await handleSaveCotacao();
      if (!saved) return;
    }

    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, [currentStep, validateStep, resultado, handleCalcular, handleSaveCotacao]);

  const handlePrev = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const progressPercent = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img
              src={getLogoForContext('header')}
              alt="Logo"
              className="h-8"
            />
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex">
              <Shield className="w-3 h-3 mr-1" /> Cotação Online
            </Badge>
            <Badge variant="secondary">
              Etapa {currentStep} de 4
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">Cotação de Proteção Veicular</h1>
          <p className="text-muted-foreground">Preencha os dados e receba sua cotação em instantes</p>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <Progress value={progressPercent} className="h-2" />
          <div className="grid grid-cols-4 gap-2">
            {PUBLIC_STEPS.map((step) => (
              <button
                key={step.number}
                onClick={() => step.number < currentStep && setCurrentStep(step.number)}
                disabled={step.number > currentStep}
                className={`text-center p-2 rounded-lg transition-colors ${
                  step.number === currentStep
                    ? 'bg-primary/10 border border-primary/30'
                    : step.number < currentStep
                    ? 'bg-muted cursor-pointer hover:bg-muted/80'
                    : 'opacity-40'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full mx-auto mb-1 text-xs font-bold ${
                  step.number < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step.number === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                }`}>
                  {step.number < currentStep ? <Check className="w-3 h-3" /> : step.number}
                </div>
                <p className="text-xs font-medium truncate">{step.title}</p>
                <p className="text-[10px] text-muted-foreground truncate hidden sm:block">{step.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <WizardStep1Vehicle
              formData={formData}
              updateFormData={updateFormData}
              resultado={resultado}
              onCalcular={handleCalcular}
              cotasAtivas={cotasAtivas}
              cotasLoading={cotasLoading}
              perfilEditor="CONSULTOR"
              origem="cotacao-publica"
              errors={errors}
            />
          )}
          {currentStep === 2 && (
            <WizardStep2Client
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
            />
          )}
          {currentStep === 3 && (
            <WizardStep3Terms
              formData={formData}
              updateFormData={updateFormData}
              resultado={resultado}
              errors={errors}
              empresaNome={empresaNome}
            />
          )}
          {currentStep === 4 && (
            <WizardStep4Generate
              formData={formData}
              resultado={resultado}
              cotacaoId={cotacaoId}
              pdfBlob={pdfBlob}
              pdfUrl={pdfUrl}
              isGeneratingPdf={isGeneratingPdf}
              onGeneratePdf={handleGeneratePdf}
              empresaNome={empresaNome}
              settings={publicSettings}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? () => navigate('/') : handlePrev}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? 'Voltar ao site' : 'Voltar'}
          </Button>

          {currentStep < 4 && (
            <Button onClick={handleNext} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {currentStep === 3 ? 'Salvar e Continuar' : 'Próximo'}
            </Button>
          )}

          {currentStep === 4 && (
            <Button onClick={() => navigate('/')}>
              <Check className="w-4 h-4 mr-2" />
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
