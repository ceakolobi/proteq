import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { DadosAssociadoStep } from './steps/DadosAssociadoStep';
import { EnderecoStep } from './steps/EnderecoStep';
import { DocumentosAssociadoStep } from './steps/DocumentosAssociadoStep';
import { DadosVeiculoStep } from './steps/DadosVeiculoStep';
import { DocumentosVeiculoStep } from './steps/DocumentosVeiculoStep';
import { ResumoStep } from './steps/ResumoStep';
import { TermosAceiteStep } from './steps/TermosAceiteStep';

import type { AssociadoFormData, VeiculoFormData, DocumentoUpload } from './types';
import { gerarConteudoTermoPDF } from '@/lib/termoAceiteContent';

interface AssociadoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STEPS = [
  { id: 'dados', label: 'Dados Pessoais', shortLabel: 'Dados' },
  { id: 'endereco', label: 'Endereço', shortLabel: 'Endereço' },
  { id: 'docs-associado', label: 'Documentos', shortLabel: 'Docs' },
  { id: 'veiculo', label: 'Veículo', shortLabel: 'Veículo' },
  { id: 'docs-veiculo', label: 'Docs Veículo', shortLabel: 'Fotos' },
  { id: 'resumo', label: 'Resumo', shortLabel: 'Resumo' },
  { id: 'termos', label: 'Termos', shortLabel: 'Termos' },
];

const initialAssociadoData: AssociadoFormData = {
  nome_completo: '',
  cpf: '',
  rg: '',
  data_nascimento: '',
  telefone: '',
  whatsapp: '',
  email: '',
  estado_civil: '',
  profissao: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  dia_vencimento: 10,
};

const initialVeiculoData: VeiculoFormData = {
  placa: '',
  chassi: '',
  renavam: '',
  marca: '',
  modelo: '',
  ano: new Date().getFullYear(),
  combustivel: '',
  cor: '',
  categoria: '',
  quilometragem: 0,
  situacao_financeira: 'quitado',
  tipo: 'carro',
  valor_fipe: 0,
  codigo_fipe: '',
};

export function AssociadoWizard({ open, onOpenChange, onSuccess }: AssociadoWizardProps) {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [associadoData, setAssociadoData] = useState<AssociadoFormData>(initialAssociadoData);
  const [veiculoData, setVeiculoData] = useState<VeiculoFormData>(initialVeiculoData);
  const [docsAssociado, setDocsAssociado] = useState<DocumentoUpload[]>([]);
  const [docsVeiculo, setDocsVeiculo] = useState<DocumentoUpload[]>([]);
  const [termosAceitos, setTermosAceitos] = useState(false);
  
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setAssociadoData(initialAssociadoData);
    setVeiculoData(initialVeiculoData);
    setDocsAssociado([]);
    setDocsVeiculo([]);
    setTermosAceitos(false);
    setStepValidation({});
  }, []);

  const handleClose = () => {
    if (currentStep > 0 && !isSubmitting) {
      if (!confirm('Deseja realmente cancelar o cadastro? Todos os dados serão perdidos.')) {
        return;
      }
    }
    resetWizard();
    onOpenChange(false);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Dados Associado
        const cpfLimpo = associadoData.cpf.replace(/\D/g, '');
        if (!associadoData.nome_completo.trim()) {
          toast.error('Nome completo é obrigatório');
          return false;
        }
        if (cpfLimpo.length !== 11) {
          toast.error('CPF deve ter 11 dígitos');
          return false;
        }
        if (!associadoData.telefone.replace(/\D/g, '')) {
          toast.error('Telefone é obrigatório');
          return false;
        }
        if (!associadoData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(associadoData.email)) {
          toast.error('E-mail válido é obrigatório');
          return false;
        }
        return true;
      
      case 1: // Endereço
        if (!associadoData.cep.replace(/\D/g, '')) {
          toast.error('CEP é obrigatório');
          return false;
        }
        if (!associadoData.endereco.trim()) {
          toast.error('Endereço é obrigatório');
          return false;
        }
        if (!associadoData.cidade.trim()) {
          toast.error('Cidade é obrigatória');
          return false;
        }
        if (!associadoData.estado.trim()) {
          toast.error('Estado é obrigatório');
          return false;
        }
        return true;
      
      case 2: // Docs Associado
        // Documentos são recomendados mas não obrigatórios
        return true;
      
      case 3: // Dados Veículo
        if (!veiculoData.placa.replace(/[^A-Za-z0-9]/g, '')) {
          toast.error('Placa é obrigatória');
          return false;
        }
        if (!veiculoData.marca.trim()) {
          toast.error('Marca é obrigatória');
          return false;
        }
        if (!veiculoData.modelo.trim()) {
          toast.error('Modelo é obrigatório');
          return false;
        }
        if (veiculoData.valor_fipe <= 0) {
          toast.error('Valor FIPE é obrigatório');
          return false;
        }
        // Validar Chassi (17 caracteres alfanuméricos)
        const chassiLimpo = veiculoData.chassi.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (!chassiLimpo || chassiLimpo.length !== 17) {
          toast.error('Chassi deve ter exatamente 17 caracteres');
          return false;
        }
        // Validar Renavam (11 dígitos)
        const renavamLimpo = veiculoData.renavam.replace(/\D/g, '');
        if (!renavamLimpo || renavamLimpo.length !== 11) {
          toast.error('Renavam deve ter exatamente 11 dígitos');
          return false;
        }
        return true;
      
      case 4: // Docs Veículo
        // Documentos são recomendados mas não obrigatórios
        return true;
      
      case 5: // Resumo
        return true;

      case 6: // Termos
        if (!termosAceitos) {
          toast.error('Você precisa aceitar os termos para continuar');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setStepValidation(prev => ({ ...prev, [currentStep]: true }));
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const uploadDocuments = async (
    docs: DocumentoUpload[], 
    bucket: string, 
    entityId: string,
    table: 'documentos_associado' | 'documentos_veiculo',
    entityField: 'associado_id' | 'veiculo_id'
  ) => {
    for (const doc of docs) {
      if (!doc.file) continue;
      
      const fileExt = doc.file.name.split('.').pop();
      const fileName = `${entityId}/${doc.tipo}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, doc.file);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }
      
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      
      if (table === 'documentos_associado') {
        await supabase.from('documentos_associado').insert({
          associado_id: entityId,
          tipo: doc.tipo,
          nome_arquivo: doc.file.name,
          url: urlData.publicUrl,
        });
      } else {
        await supabase.from('documentos_veiculo').insert({
          veiculo_id: entityId,
          tipo: doc.tipo,
          nome_arquivo: doc.file.name,
          url: urlData.publicUrl,
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    if (!user?.id || !profile?.regiao_id) {
      toast.error('Você precisa estar vinculado a uma regional para cadastrar');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Create associado
      const { data: associado, error: associadoError } = await supabase
        .from('associados')
        .insert({
          nome_completo: associadoData.nome_completo.trim(),
          cpf: associadoData.cpf.replace(/\D/g, ''),
          rg: associadoData.rg?.replace(/\D/g, '') || null,
          data_nascimento: associadoData.data_nascimento || null,
          telefone: associadoData.telefone.replace(/\D/g, ''),
          whatsapp: associadoData.whatsapp?.replace(/\D/g, '') || null,
          email: associadoData.email.trim().toLowerCase(),
          estado_civil: associadoData.estado_civil || null,
          profissao: associadoData.profissao || null,
          cep: associadoData.cep.replace(/\D/g, ''),
          endereco: associadoData.endereco.trim(),
          numero: associadoData.numero || null,
          complemento: associadoData.complemento || null,
          bairro: associadoData.bairro || null,
          cidade: associadoData.cidade.trim(),
          estado: associadoData.estado.trim(),
          consultor_id: user.id,
          regiao_id: profile.regiao_id,
          status: 'ativo',
          dia_vencimento: associadoData.dia_vencimento,
        })
        .select()
        .single();

      if (associadoError) throw associadoError;

      // 2. Upload associado documents
      if (docsAssociado.length > 0) {
        await uploadDocuments(
          docsAssociado, 
          'associado-documentos', 
          associado.id, 
          'documentos_associado',
          'associado_id'
        );
      }

      // 3. Find appropriate cota
      const { data: cotas } = await supabase
        .from('cotas')
        .select('*')
        .eq('ativo', true)
        .gte('fipe_max', veiculoData.valor_fipe)
        .lte('fipe_min', veiculoData.valor_fipe);

      const cotaApropriada = cotas?.[0];
      
      if (!cotaApropriada) {
        toast.error('Não existe faixa FIPE para este valor. Contate o administrador.');
        // Rollback: delete associado
        await supabase.from('associados').delete().eq('id', associado.id);
        return;
      }

      // Calculate mensalidade usando fórmula única com valores fixos
      const ajusteGeralValor = Number((cotaApropriada as any).ajuste_geral_valor) || Number(cotaApropriada.acrescimo_global) || 0;
      let valorBase = 0;
      switch (veiculoData.tipo) {
        case 'carro':
          valorBase = cotaApropriada.valor_carro || 0;
          break;
        case 'moto':
          valorBase = cotaApropriada.valor_moto || 0;
          break;
        case 'pickup':
          valorBase = cotaApropriada.valor_camionete || 0;
          break;
      }
      // Fórmula única: valorFinal = valorBase + ajusteGeralValor
      const mensalidade = valorBase + ajusteGeralValor;

      // 4. Create veiculo
      const { data: veiculo, error: veiculoError } = await supabase
        .from('veiculos')
        .insert({
          associado_id: associado.id,
          placa: veiculoData.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
          chassi: veiculoData.chassi || null,
          renavam: veiculoData.renavam || null,
          marca: veiculoData.marca.trim(),
          modelo: veiculoData.modelo.trim(),
          ano: veiculoData.ano,
          combustivel: veiculoData.combustivel || null,
          cor: veiculoData.cor || null,
          quilometragem: veiculoData.quilometragem || null,
          situacao_financeira: veiculoData.situacao_financeira,
          tipo: veiculoData.tipo,
          valor_fipe: veiculoData.valor_fipe,
          codigo_fipe: veiculoData.codigo_fipe || null,
          cota_id: cotaApropriada.id,
          mensalidade,
          consultor_id: user.id,
          carro_reserva_dias: 15,
        })
        .select()
        .single();

      if (veiculoError) throw veiculoError;

      // 5. Upload vehicle documents
      if (docsVeiculo.length > 0) {
        await uploadDocuments(
          docsVeiculo,
          'veiculo-documentos',
          veiculo.id,
          'documentos_veiculo',
          'veiculo_id'
        );
      }

      // 6. Create termo de aceite with signature request
      const dataHoraAceite = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const conteudoTermo = gerarConteudoTermoPDF({
        nomeAssociado: associadoData.nome_completo,
        cpfCnpj: associadoData.cpf,
        telefone: associadoData.telefone,
        email: associadoData.email,
        placa: veiculoData.placa.toUpperCase(),
        marcaModelo: `${veiculoData.marca} ${veiculoData.modelo}`,
        ano: veiculoData.ano,
        dataHoraAceite,
      });

      const { data: termoData, error: termoError } = await supabase
        .from('termos_aceite')
        .insert({
          associado_id: associado.id,
          veiculo_id: veiculo.id,
          conteudo_termo: conteudoTermo,
          canal_aceite: 'app',
          status: 'pendente',
        })
        .select()
        .single();

      if (termoError) {
        console.error('Erro ao criar termo:', termoError);
        // Não bloquear o cadastro por erro no termo
      } else {
        // 7. Update associado with termos_aceitos
        await supabase
          .from('associados')
          .update({
            termos_aceitos: true,
            termos_aceitos_em: new Date().toISOString(),
          })
          .eq('id', associado.id);

        // 8. Send notification via edge function (async, don't wait)
        supabase.functions.invoke('send-termo-aceite', {
          body: { termoId: termoData.id, canal: 'ambos' },
        }).catch(err => console.error('Erro ao enviar notificação:', err));
      }

      toast.success('Cadastro realizado com sucesso! O termo de aceite foi enviado para assinatura.');
      resetWizard();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe um cadastro com este CPF ou placa');
      } else {
        toast.error(error.message || 'Erro ao realizar cadastro');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <DadosAssociadoStep
            data={associadoData}
            onChange={setAssociadoData}
          />
        );
      case 1:
        return (
          <EnderecoStep
            data={associadoData}
            onChange={setAssociadoData}
          />
        );
      case 2:
        return (
          <DocumentosAssociadoStep
            documents={docsAssociado}
            onChange={setDocsAssociado}
          />
        );
      case 3:
        return (
          <DadosVeiculoStep
            data={veiculoData}
            onChange={setVeiculoData}
          />
        );
      case 4:
        return (
          <DocumentosVeiculoStep
            documents={docsVeiculo}
            onChange={setDocsVeiculo}
          />
        );
      case 5:
        return (
          <ResumoStep
            associadoData={associadoData}
            veiculoData={veiculoData}
            docsAssociado={docsAssociado}
            docsVeiculo={docsVeiculo}
          />
        );
      case 6:
        return (
          <TermosAceiteStep
            aceitou={termosAceitos}
            onChange={setTermosAceitos}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">Novo Cadastro de Associado</DialogTitle>
          
          {/* Progress Bar */}
          <div className="mt-4 space-y-3">
            <Progress value={progress} className="h-2" />
            
            {/* Step Indicators */}
            <div className="flex justify-between">
              {STEPS.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => {
                    if (index < currentStep) setCurrentStep(index);
                  }}
                  disabled={index > currentStep}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    index === currentStep
                      ? 'text-primary'
                      : index < currentStep
                      ? 'text-primary/70 cursor-pointer hover:text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                      index === currentStep
                        ? 'bg-primary text-primary-foreground border-primary'
                        : index < currentStep
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-muted border-muted-foreground/30'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs hidden sm:block">{step.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {renderStep()}
        </div>

        {/* Footer with Navigation */}
        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="text-sm text-muted-foreground">
            Etapa {currentStep + 1} de {STEPS.length}
          </div>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar Cadastro
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
