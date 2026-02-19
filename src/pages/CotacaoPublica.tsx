import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, MessageCircle, Shield } from 'lucide-react';
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
import { useBrand } from '@/hooks/useBrand';

const PUBLIC_STEPS = [
  { number: 1, title: 'Veículo & Plano', description: 'Dados e valoração' },
  { number: 2, title: 'Seus Dados', description: 'Informações de contato' },
] as const;

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
  const [savedResult, setSavedResult] = useState(false);

  // Load public cotas (anon has SELECT on active cotas)
  useEffect(() => {
    const fetchCotas = async () => {
      const { data, error } = await supabase
        .from('cotas')
        .select('*')
        .eq('ativo', true)
        .order('fipe_min', { ascending: true });

      if (data) setCotas(data as unknown as Cota[]);
      if (error) console.error('Erro ao buscar cotas:', error);
      setCotasLoading(false);
    };
    fetchCotas();
  }, []);

  const cotasAtivas = useMemo(() => cotas.filter(c => c.ativo), [cotas]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, resultado, handleCalcular]);

  // Save lead + send WhatsApp
  const handleFinalize = useCallback(async () => {
    if (!validateStep(2) || !resultado) return;

    setIsSaving(true);
    try {
      // Get default consultant
      const { data: consultores } = await supabase
        .from('profiles')
        .select('id, company_id')
        .limit(1) as { data: { id: string; company_id: string | null }[] | null };

      const consultorId = consultores?.[0]?.id;
      const companyId = consultores?.[0]?.company_id;

      if (consultorId) {
        const telefoneNormalizado = formData.cliente_whatsapp.replace(/\D/g, '');

        // Check for existing lead
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('telefone', telefoneNormalizado)
          .limit(1)
          .maybeSingle() as { data: { id: string } | null };

        let leadId = existingLead?.id;

        if (!leadId) {
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
          leadId = novoLead?.id;
        }
      }

      setSavedResult(true);
      toast.success('Cotação registrada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar lead:', err);
      toast.error('Erro ao registrar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }, [validateStep, resultado, formData]);

  const handleWhatsApp = useCallback(() => {
    if (!resultado) return;
    const valorBem = parseValorBrasileiro(formData.valor_bem);
    const msg = [
      `🛡️ *Cotação de Proteção Veicular*`,
      ``,
      `*Veículo:* ${formData.marca} ${formData.modelo} ${formData.ano_fabricacao}`,
      `*Valor FIPE:* ${formatCurrency(valorBem)}`,
      `*Mensalidade:* ${formatCurrency(resultado.valorFinal)}`,
      `*Participação:* ${formatCurrency(resultado.participacao)}`,
      `*Cota:* ${resultado.cotaNome}`,
      ``,
      `✅ Coberturas incluídas:`,
      `• Proteção contra roubo e furto`,
      `• Assistência 24h`,
      `• Guincho 500km`,
      `• 30 dias de carro reserva`,
      `• Vidros cobertos`,
      ``,
      `*Cliente:* ${formData.cliente_nome}`,
      `📱 ${formData.cliente_whatsapp}`,
    ].join('\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }, [resultado, formData]);

  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    if (currentStep === 1 && !resultado) {
      const calc = handleCalcular();
      if (!calc) {
        toast.error('Calcule a cotação primeiro');
        return;
      }
    }
    setCurrentStep(2);
  }, [currentStep, validateStep, resultado, handleCalcular]);

  const progressPercent = (currentStep / 2) * 100;

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
              Etapa {currentStep} de 2
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
          <div className="grid grid-cols-2 gap-2">
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
              errors={errors}
            />
          )}
          {currentStep === 2 && !savedResult && (
            <WizardStep2Client
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
            />
          )}
          {currentStep === 2 && savedResult && resultado && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Cotação Registrada!</h2>
                <p className="text-muted-foreground">
                  Sua cotação para <strong>{formData.marca} {formData.modelo}</strong> foi registrada.
                  Em breve um consultor entrará em contato.
                </p>
                <div className="bg-card border rounded-xl p-6 space-y-3">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Mensalidade</p>
                    <p className="text-4xl font-bold text-primary">{formatCurrency(resultado.valorFinal)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                    <div>
                      <p className="text-muted-foreground">Cota</p>
                      <p className="font-semibold">{resultado.cotaNome}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Participação</p>
                      <p className="font-semibold">{formatCurrency(resultado.participacao)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button onClick={handleWhatsApp} size="lg" className="gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Compartilhar via WhatsApp
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => navigate('/')}>
                    Voltar ao site
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {!savedResult && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? () => navigate('/') : () => setCurrentStep(1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? 'Voltar ao site' : 'Voltar'}
            </Button>

            {currentStep === 1 && (
              <Button onClick={handleNext}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Próximo
              </Button>
            )}

            {currentStep === 2 && (
              <Button onClick={handleFinalize} disabled={isSaving}>
                {isSaving ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Finalizar Cotação
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
