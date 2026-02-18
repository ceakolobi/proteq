import { useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import type { Cotacao, TipoBem } from '@/types/cotacao';
import {
  calcularCotacaoCompleta,
  getCategoriaByTipoVeiculo,
  getPerfilEditor,
  parseValorBrasileiro,
  formatCurrency,
  type Cota,
  type ResultadoCotacao,
} from '@/lib/cotacaoUtils';
import {
  WIZARD_STEPS,
  INITIAL_FORM_DATA,
  type WizardFormData,
} from './CotacaoWizardTypes';
import { WizardStep1Vehicle } from './WizardStep1Vehicle';
import { WizardStep2Client } from './WizardStep2Client';
import { WizardStep3Terms } from './WizardStep3Terms';
import { WizardStep4Generate } from './WizardStep4Generate';

interface CotacaoWizardProps {
  leadId?: string;
  leadNome?: string;
  onSuccess: (cotacao: Cotacao) => void;
  onCancel: () => void;
}

export default function CotacaoWizard({ leadId, leadNome, onSuccess, onCancel }: CotacaoWizardProps) {
  const { user, profile, roles, isAdminPrincipal } = useAuth();
  const { cotas, isLoading: cotasLoading } = useReferenceData({ loadCotas: true, filterByUserAccess: false });
  const { settings } = useSettings();

  const perfilEditor = useMemo(() => getPerfilEditor(roles || [], isAdminPrincipal), [roles, isAdminPrincipal]);
  const cotasAtivas = useMemo(() => (cotas as Cota[]).filter(c => c.ativo), [cotas]);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM_DATA);
  const [resultado, setResultado] = useState<ResultadoCotacao | null>(null);
  const [cotacaoId, setCotacaoId] = useState<string | null>(null);
  const [savedCotacao, setSavedCotacao] = useState<Cotacao | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pdfContentRef = useRef<HTMLDivElement>(null);

  const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Calculate quotation
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

  // Validate step
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

  // Save cotação to DB
  const handleSaveCotacao = useCallback(async (): Promise<Cotacao | null> => {
    if (!resultado || !user) return null;
    if (savedCotacao) return savedCotacao;

    setIsSaving(true);
    try {
      const valorBem = parseValorBrasileiro(formData.valor_bem);
      const insertData = {
        tipo_bem: formData.tipo_bem as TipoBem,
        marca: formData.marca,
        modelo: formData.modelo,
        ano_fabricacao: parseInt(formData.ano_fabricacao),
        valor_bem: valorBem,
        metodo_valoracao: formData.metodo_valoracao,
        consultor_id: user.id,
        regiao_id: profile?.regiao_id || null,
        lead_id: leadId || null,
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
        carro_reserva_dias: formData.carro_reserva_extra === 'nenhum' ? 15 :
          formData.carro_reserva_extra === '30dias' ? 45 : 105,
        carro_reserva_adicional: formData.carro_reserva_extra === 'nenhum' ? 0 :
          formData.carro_reserva_extra === '30dias' ? 39.90 : 59.90,
        observacoes: formData.observacoes || null,
        cliente_nome: formData.cliente_nome || null,
        cliente_email: formData.cliente_email || null,
        cliente_whatsapp: formData.cliente_whatsapp || null,
        editado_por: formData.ajuste_individual_valor !== 0 ? user.id : null,
        perfil_editor: formData.ajuste_individual_valor !== 0 ? perfilEditor : null,
        motivo_ajuste: formData.motivo_ajuste || null,
      };

      const { data: novaCotacao, error } = await supabase
        .from('cotacoes')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      setCotacaoId(novaCotacao.id);
      setSavedCotacao(novaCotacao as Cotacao);
      toast.success('Cotação salva no CRM!');
      return novaCotacao as Cotacao;
    } catch (err: any) {
      console.error('Erro ao salvar cotação:', err);
      toast.error(err.message || 'Erro ao salvar cotação');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [resultado, user, formData, profile, leadId, perfilEditor, savedCotacao]);

  // Generate PDF
  const handleGeneratePdf = useCallback(async () => {
    if (!resultado) {
      toast.error('Calcule a cotação primeiro');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // Save cotação first if not saved
      const cotacao = await handleSaveCotacao();
      if (!cotacao) {
        setIsGeneratingPdf(false);
        return;
      }

      // Wait for ref to be available
      await new Promise(r => setTimeout(r, 200));

      if (!pdfContentRef.current) {
        toast.error('Erro ao preparar PDF. Tente novamente.');
        setIsGeneratingPdf(false);
        return;
      }

      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: 0,
        filename: `Proposta_${formData.modelo.replace(/[^a-zA-Z0-9]/g, '_')}_${cotacao.id.substring(0, 8).toUpperCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      const blob = await html2pdf().set(opt).from(pdfContentRef.current).outputPdf('blob');
      setPdfBlob(blob);

      // Upload to storage
      const filePath = `propostas/${cotacao.id}/Proposta_${formData.modelo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
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
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [resultado, handleSaveCotacao, formData.modelo]);

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

  const empresaNome = settings.modo_white_label && settings.empresa_nome
    ? settings.empresa_nome
    : 'Proteção Veicular';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nova Cotação</h2>
          {leadNome && <p className="text-muted-foreground">Lead: {leadNome}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{perfilEditor}</Badge>
          <Badge variant="secondary">
            Etapa {currentStep} de 4
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <Progress value={progressPercent} className="h-2" />
        <div className="grid grid-cols-4 gap-2">
          {WIZARD_STEPS.map((step) => (
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
            perfilEditor={perfilEditor}
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
            pdfContentRef={pdfContentRef}
            settings={settings}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handlePrev}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? 'Cancelar' : 'Voltar'}
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

        {currentStep === 4 && savedCotacao && (
          <Button onClick={() => onSuccess(savedCotacao)}>
            <Check className="w-4 h-4 mr-2" />
            Concluir
          </Button>
        )}
      </div>
    </div>
  );
}
