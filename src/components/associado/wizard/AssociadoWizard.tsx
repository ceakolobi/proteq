import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Check, Loader2, Save, MapPin, FileText, Send } from 'lucide-react';
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
import { DraftRecoveryDialog } from './DraftRecoveryDialog';

import type { AssociadoFormData, VeiculoFormData, DocumentoUpload } from './types';
import { useWizardPersistence, type WizardDraft } from '@/hooks/useWizardPersistence';
import type { ScanResult } from '@/components/associado/DocumentScanner';

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

interface Regiao {
  id: string;
  nome: string;
  sede_id: string;
}

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
  veio_de_outra_associacao: false,
  nome_associacao_anterior: '',
  data_saida_associacao: '',
  comprovante_migracao_url: '',
  comprovante_migracao_file: null,
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
  const { user, profile, isAdminPrincipal, isGlobalAdmin } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [associadoData, setAssociadoData] = useState<AssociadoFormData>(initialAssociadoData);
  const [veiculoData, setVeiculoData] = useState<VeiculoFormData>(initialVeiculoData);
  const [docsAssociado, setDocsAssociado] = useState<DocumentoUpload[]>([]);
  const [docsVeiculo, setDocsVeiculo] = useState<DocumentoUpload[]>([]);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [selectedRegiaoId, setSelectedRegiaoId] = useState<string | null>(null);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [isLoadingRegioes, setIsLoadingRegioes] = useState(false);
  
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
  const [pendingScannedDocs, setPendingScannedDocs] = useState<ScanResult[]>([]);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  // Estado pós-cadastro: guarda ids para oferecer geração de contrato
  const [createdIds, setCreatedIds] = useState<{ associadoId: string; veiculoId: string; nome: string } | null>(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<WizardDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Determinar se precisa exibir seletor de regional
  const needsRegiaoSelector = isAdminPrincipal || isGlobalAdmin || !profile?.regiao_id;

  const {
    saveDraftLocal,
    loadDraftLocal,
    clearAll,
    saveDraftBackend,
    loadDraftBackend,
  } = useWizardPersistence();

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const isRealFile = (file: unknown): file is File =>
    typeof File !== 'undefined' && file instanceof File;

  useEffect(() => {
    if (!open || !needsRegiaoSelector) return;

    const fetchRegioes = async () => {
      setIsLoadingRegioes(true);
      const { data, error } = await supabase
        .from('regioes')
        .select('id, nome, sede_id')
        .eq('ativo', true)
        .order('nome');

      if (error) {
        toast.error('Erro ao carregar regionais');
      } else {
        setRegioes(data || []);
      }
      setIsLoadingRegioes(false);
    };

    fetchRegioes();
  }, [open, needsRegiaoSelector]);

  // Check for draft when dialog opens
  useEffect(() => {
    if (!open) return;

    // 1. Try local storage first (instant)
    const localDraft = loadDraftLocal();
    const hasLocalData = Boolean(
      localDraft &&
        (localDraft.currentStep > 0 ||
          localDraft.associadoData?.nome_completo?.trim() ||
          localDraft.associadoData?.cpf?.trim() ||
          localDraft.veiculoData?.placa?.trim() ||
          localDraft.veiculoData?.marca?.trim() ||
          localDraft.veiculoData?.modelo?.trim() ||
          (localDraft.veiculoData?.valor_fipe ?? 0) > 0)
    );

    if (hasLocalData && localDraft) {
      setPendingDraft(localDraft);
      setShowDraftDialog(true);
      return;
    }

    // 2. Otherwise, check backend for existing rascunho
    const checkBackend = async () => {
      const backendDraft = await loadDraftBackend();
      if (backendDraft) {
        // Store in local for quick access next time
        saveDraftLocal(backendDraft);
        setPendingDraft(backendDraft);
        setShowDraftDialog(true);
      }
    };
    checkBackend();
  }, [open, loadDraftLocal, loadDraftBackend, saveDraftLocal]);

  // Auto-save to localStorage on every change
  useEffect(() => {
    if (!open) return;

    // Always save to localStorage as soon as any field changes
    saveDraftLocal({
      currentStep,
      associadoData,
      veiculoData,
      termosAceitos,
    });
  }, [open, currentStep, associadoData, veiculoData, saveDraftLocal]);

  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setAssociadoData(initialAssociadoData);
    setVeiculoData(initialVeiculoData);
    setDocsAssociado([]);
    setDocsVeiculo([]);
    setTermosAceitos(false);
    setSelectedRegiaoId(null);
    setStepValidation({});
    setPendingScannedDocs([]);
    setPendingDraft(null);
    // não resetar createdIds aqui — é resetado ao fechar o dialog pós-cadastro
  }, []);

  const handleClose = () => {
    if (currentStep > 0 && !isSubmitting) {
      const hasData = associadoData.nome_completo || associadoData.cpf;
      if (hasData) {
        toast.info('Seu progresso foi salvo automaticamente. Você pode continuar depois.');
      }
    }
    onOpenChange(false);
  };

  const handleContinueDraft = () => {
    if (pendingDraft) {
      setCurrentStep(Math.min(pendingDraft.currentStep || 0, STEPS.length - 1));

      const safeAssociadoData = pendingDraft.associadoData
        ? {
            ...pendingDraft.associadoData,
            // Arquivos não são preservados no rascunho (localStorage/JSON)
            comprovante_migracao_file: null,
          }
        : initialAssociadoData;

      setAssociadoData(safeAssociadoData as AssociadoFormData);
      setVeiculoData((pendingDraft.veiculoData || initialVeiculoData) as VeiculoFormData);
      setTermosAceitos(false);
    }
    setShowDraftDialog(false);
    setPendingDraft(null);
  };

  const handleDiscardDraft = async () => {
    await clearAll();
    resetWizard();
    setShowDraftDialog(false);
    setPendingDraft(null);
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
        // Validação dos campos de migração
        if (associadoData.veio_de_outra_associacao) {
          if (!associadoData.nome_associacao_anterior.trim()) {
            toast.error('Nome da associação anterior é obrigatório');
            return false;
          }
          if (!associadoData.data_saida_associacao) {
            toast.error('Data de saída da associação anterior é obrigatória');
            return false;
          }
          // Arquivos não persistem em rascunho; garanta que seja um File real
          if (!isRealFile(associadoData.comprovante_migracao_file)) {
            toast.error('Documento comprobatório é obrigatório para dispensa de vistoria');
            return false;
          }
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
      
      case 5: // Resumo e confirmação
        if (needsRegiaoSelector && !selectedRegiaoId) {
          toast.error('Selecione uma regional para o associado');
          return false;
        }
        return true;

      case 6: // Termos
        if (!termosAceitos) {
          toast.error('Você precisa ler e aceitar os termos para finalizar o cadastro');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    setStepValidation(prev => ({ ...prev, [currentStep]: true }));
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));

    // Save to backend when advancing step (async, fire-and-forget with indicator)
    setIsSaving(true);
    const draft: WizardDraft = {
      currentStep: currentStep + 1,
      associadoData,
      veiculoData,
      lastUpdated: new Date().toISOString(),
    };
    saveDraftBackend(draft).finally(() => setTimeout(() => setIsSaving(false), 400));
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
  ): Promise<{ uploaded: number; failed: number }> => {
    let uploaded = 0;
    let failed = 0;

    for (const doc of docs) {
      const file = doc.file;
      if (!isRealFile(file) || !file.name) {
        continue;
      }

      const fileExt = file.name.includes('.') ? file.name.split('.').pop() : undefined;
      const safeExt = fileExt || 'bin';
      const fileName = `${entityId}/${doc.tipo}_${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        failed++;
        continue;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

      if (table === 'documentos_associado') {
        const { error: dbErr } = await supabase.from('documentos_associado').insert({
          associado_id: entityId,
          tipo: doc.tipo,
          nome_arquivo: file.name,
          url: urlData.publicUrl,
        });
        if (dbErr) { console.error('DB insert error:', dbErr); failed++; continue; }
      } else {
        const { error: dbErr2 } = await supabase.from('documentos_veiculo').insert({
          veiculo_id: entityId,
          tipo: doc.tipo,
          nome_arquivo: file.name,
          url: urlData.publicUrl,
        });
        if (dbErr2) { console.error('DB insert error:', dbErr2); failed++; continue; }
      }
      uploaded++;
    }
    return { uploaded, failed };
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    // Determinar qual regiao_id usar
    const finalRegiaoId = needsRegiaoSelector ? selectedRegiaoId : profile?.regiao_id;
    
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    
    if (!finalRegiaoId) {
      toast.error('Selecione uma regional para o associado');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Upload comprovante de migração se necessário
      let comprovanteUrl: string | null = null;
      if (associadoData.veio_de_outra_associacao) {
        const file = associadoData.comprovante_migracao_file;

        if (!isRealFile(file) || !file.name) {
          toast.error('Reenvie o comprovante de migração (o rascunho não preserva anexos)');
          return;
        }

        const fileExt = file.name.includes('.') ? file.name.split('.').pop() : undefined;
        const safeExt = fileExt || 'bin';
        const fileName = `migracao_${Date.now()}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from('associado-documentos')
          .upload(fileName, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('associado-documentos').getPublicUrl(fileName);
          comprovanteUrl = urlData.publicUrl;
        }
      }

      // 2. Criar/atualizar associado via upsert por CPF (evita duplicação entre canais)
      const dadosJson = {
        nome_completo: associadoData.nome_completo.trim(),
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
        dia_vencimento: associadoData.dia_vencimento,
        veio_de_outra_associacao: associadoData.veio_de_outra_associacao,
        nome_associacao_anterior: associadoData.veio_de_outra_associacao ? associadoData.nome_associacao_anterior.trim() : null,
        data_saida_associacao: associadoData.veio_de_outra_associacao ? associadoData.data_saida_associacao : null,
        comprovante_migracao_url: comprovanteUrl,
      };

      const { data: associadoId, error: upsertError } = await supabase
        .rpc('upsert_associado_por_cpf', {
          p_cpf: associadoData.cpf.replace(/\D/g, ''),
          p_dados: dadosJson,
          p_consultor_id: user.id,
          p_regiao_id: finalRegiaoId,
          p_company_id: profile?.company_id ?? null,
        });

      if (upsertError) throw upsertError;

      const { data: associado, error: associadoError } = await supabase
        .from('associados')
        .select()
        .eq('id', associadoId)
        .single();

      if (associadoError) throw associadoError;

      // 3. Upload associado documents
      if (docsAssociado.length > 0) {
        const { failed: docsFailed } = await uploadDocuments(
          docsAssociado,
          'associado-documentos',
          associado.id,
          'documentos_associado',
          'associado_id'
        );
        if (docsFailed > 0) {
          toast.warning(`${docsFailed} documento(s) do associado não puderam ser enviados. Você pode adicioná-los depois na edição.`);
        }
      }

      // 3b. Vincular documentos escaneados (já no Storage) ao associado recém-criado
      if (pendingScannedDocs.length > 0) {
        for (const scan of pendingScannedDocs) {
          if (!scan.storagePath) continue;
          await supabase.from('documentos_associado').insert({
            associado_id: associado.id,
            company_id: profile?.company_id ?? null,
            created_by: user.id,
            tipo: scan.documentKind,
            nome_arquivo: scan.fileName || scan.storagePath.split('/').pop() || scan.documentKind,
            url: scan.storagePath,
          });
        }
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
          company_id: profile?.company_id ?? null,
          carro_reserva_dias: 15,
        })
        .select()
        .single();

      if (veiculoError) throw veiculoError;

      // 5. Upload vehicle documents
      if (docsVeiculo.length > 0) {
        const { failed: veicFailed } = await uploadDocuments(
          docsVeiculo,
          'veiculo-documentos',
          veiculo.id,
          'documentos_veiculo',
          'veiculo_id'
        );
        if (veicFailed > 0) {
          toast.warning(`${veicFailed} documento(s) do veículo não puderam ser enviados. Você pode adicioná-los depois na edição.`);
        }
      }

      // 6. Create vistoria - dispensada se veio de outra associação
      if (associadoData.veio_de_outra_associacao) {
        // Criar vistoria com status DISPENSADA
        const dataSaidaFormatada = associadoData.data_saida_associacao 
          ? new Date(associadoData.data_saida_associacao).toLocaleDateString('pt-BR') 
          : 'Não informada';
        
        const { error: vistoriaError } = await supabase
          .from('vistorias')
          .insert({
            veiculo_id: veiculo.id,
            associado_id: associado.id,
            consultor_id: user.id,
            company_id: profile?.company_id ?? null,
            status: 'dispensada',
            motivo_dispensa: `Migração de outra associação: ${associadoData.nome_associacao_anterior || 'Não informada'}. Data de saída: ${dataSaidaFormatada}`,
            dispensada_por: user.id,
            dispensada_em: new Date().toISOString(),
            canal_abertura: 'link',
            observacoes: 'Vistoria dispensada automaticamente por migração de outra associação de proteção veicular.',
          });

        if (vistoriaError) {
          console.error('Erro ao criar vistoria dispensada:', vistoriaError);
        }

        // Registrar no log de acesso
        await supabase.from('access_logs').insert({
          user_id: user.id,
          action: 'dispensa_vistoria',
          resource_type: 'vistoria',
          resource_id: veiculo.id,
          details: {
            motivo: 'migracao_associacao',
            associacao_anterior: associadoData.nome_associacao_anterior,
            data_saida: associadoData.data_saida_associacao,
            associado_id: associado.id,
            veiculo_id: veiculo.id,
          },
        });
      }

      // Clear draft after successful submission
      await clearAll();

      toast.success(
        associadoData.veio_de_outra_associacao
          ? 'Cadastro realizado com sucesso! Vistoria dispensada por migração de associação.'
          : 'Cadastro realizado com sucesso!'
      );

      // Mostra dialog pós-cadastro para oferecer geração de contrato
      setCreatedIds({
        associadoId: associado.id,
        veiculoId: veiculo.id,
        nome: associadoData.nome_completo,
      });
      resetWizard();
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
            onDocumentScanned={(r) => setPendingScannedDocs(prev => [...prev, r])}
          />
        );
      case 1:
        return (
          <EnderecoStep
            data={associadoData}
            onChange={setAssociadoData}
            onDocumentScanned={(r) => setPendingScannedDocs(prev => [...prev, r])}
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
            onDocumentScanned={(r) => setPendingScannedDocs(prev => [...prev, r])}
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
          <div className="space-y-6">
            {needsRegiaoSelector && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Selecione a Regional do Associado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="regiao-select">Regional *</Label>
                    <Select
                      value={selectedRegiaoId || ''}
                      onValueChange={setSelectedRegiaoId}
                      disabled={isLoadingRegioes}
                    >
                      <SelectTrigger id="regiao-select" className="w-full">
                        <SelectValue placeholder={isLoadingRegioes ? 'Carregando...' : 'Selecione uma regional'} />
                      </SelectTrigger>
                      <SelectContent>
                        {regioes.map((regiao) => (
                          <SelectItem key={regiao.id} value={regiao.id}>
                            {regiao.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedRegiaoId && (
                      <p className="text-xs text-destructive">
                        É obrigatório selecionar uma regional para o associado.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <ResumoStep
              associadoData={associadoData}
              veiculoData={veiculoData}
              docsAssociado={docsAssociado}
              docsVeiculo={docsVeiculo}
            />
          </div>
        );
      case 6:
        return (
          <TermosAceiteStep
            aceitou={termosAceitos}
            onChange={setTermosAceitos}
            selectedRegiaoId={selectedRegiaoId}
            onRegiaoChange={setSelectedRegiaoId}
            showRegiaoSelector={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <DraftRecoveryDialog
        open={showDraftDialog}
        onOpenChange={setShowDraftDialog}
        draft={pendingDraft}
        onContinue={handleContinueDraft}
        onDiscard={handleDiscardDraft}
      />
      
      <Dialog open={open && !showDraftDialog} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">Novo Cadastro de Associado</DialogTitle>
              {isSaving && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Save className="h-3 w-3 animate-pulse" />
                  Salvando...
                </div>
              )}
            </div>
            
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
              <Button onClick={handleSubmit} disabled={isSubmitting || !termosAceitos}>
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

      {/* Dialog pós-cadastro: opções de contrato */}
      <Dialog open={!!createdIds} onOpenChange={(o) => { if (!o && !isGeneratingContract) { setCreatedIds(null); onOpenChange(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Cadastro Concluído!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              <strong>{createdIds?.nome}</strong> foi cadastrado com sucesso.
              Deseja gerar e enviar o contrato agora?
            </p>
            <div className="grid gap-3">
              <Button
                className="w-full"
                onClick={async () => {
                  if (!createdIds) return;
                  setIsGeneratingContract(true);
                  try {
                    const { error } = await supabase.functions.invoke('generate-contract-manual', {
                      body: { associadoId: createdIds.associadoId, veiculoId: createdIds.veiculoId, sendEmail: true },
                    });
                    if (error) throw error;
                    toast.success('Contrato gerado e enviado ao associado por e-mail!');
                  } catch (e: any) {
                    toast.error(e?.message || 'Erro ao gerar contrato. Tente pelo painel de contratos.');
                  } finally {
                    setIsGeneratingContract(false);
                    setCreatedIds(null);
                    onOpenChange(false);
                  }
                }}
                disabled={isGeneratingContract}
              >
                {isGeneratingContract ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando contrato...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Gerar e Enviar Contrato</>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setCreatedIds(null); onOpenChange(false); }}
                disabled={isGeneratingContract}
              >
                <FileText className="h-4 w-4 mr-2" />
                Finalizar sem Contrato
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              O contrato pode ser gerado depois em "Configurações → Contratos Gerados".
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
