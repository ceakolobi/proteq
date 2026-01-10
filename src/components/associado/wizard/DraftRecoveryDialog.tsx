import { AlertCircle, FileText, Trash2, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { WizardDraft } from '@/hooks/useWizardPersistence';

interface DraftRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: WizardDraft | null;
  onContinue: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryDialog({
  open,
  onOpenChange,
  draft,
  onContinue,
  onDiscard,
}: DraftRecoveryDialogProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Data desconhecida';
    }
  };

  const stepLabels = [
    'Dados Pessoais',
    'Endereço',
    'Documentos do Associado',
    'Dados do Veículo',
    'Documentos do Veículo',
    'Resumo',
    'Termos de Aceite',
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Cadastro em Andamento
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Encontramos um cadastro não finalizado. Deseja continuar de onde parou?</p>
              
              {draft && (
                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                  {draft.associadoData?.nome_completo && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium text-foreground">{draft.associadoData.nome_completo}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Etapa:</span>
                    <span className="font-medium text-foreground">
                      {stepLabels[draft.currentStep] || 'Dados Pessoais'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última edição:</span>
                    <span className="font-medium text-foreground">{formatDate(draft.lastUpdated)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Se você descartar, todos os dados preenchidos serão perdidos permanentemente.
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={onDiscard}
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Descartar
          </Button>
          <Button
            onClick={onContinue}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Continuar Cadastro
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
