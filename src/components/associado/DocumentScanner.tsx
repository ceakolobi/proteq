import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, ScanLine, CheckCircle } from 'lucide-react';

export type DocumentKind = 'cnh' | 'crlv' | 'comprovante_endereco';

export interface ScanResult {
  extracted: Record<string, unknown>;
  documentKind: DocumentKind;
  storagePath: string | null;
  bucketName: string;
  fileName: string;
}

const KIND_LABELS: Record<DocumentKind, string> = {
  cnh: 'CNH',
  crlv: 'CRLV',
  comprovante_endereco: 'Comprovante de endereço',
};

const FIELD_LABELS: Record<string, string> = {
  nome_completo: 'Nome completo',
  cpf: 'CPF',
  rg: 'RG',
  data_nascimento: 'Data de nascimento',
  cnh_numero: 'N° CNH',
  cnh_categoria: 'Categoria',
  cnh_validade: 'Validade CNH',
  placa: 'Placa',
  renavam: 'RENAVAM',
  chassi: 'Chassi',
  marca: 'Marca',
  modelo: 'Modelo',
  ano_fabricacao: 'Ano fabricação',
  ano_modelo: 'Ano modelo',
  cor: 'Cor',
  combustivel: 'Combustível',
  cep: 'CEP',
  endereco: 'Endereço',
  numero: 'Número',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cidade: 'Cidade',
  estado: 'Estado',
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'data_nascimento' || key === 'cnh_validade') {
    try { return new Date(String(value) + 'T12:00:00').toLocaleDateString('pt-BR'); } catch { return String(value); }
  }
  return String(value);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface DocumentScannerProps {
  documentKind: DocumentKind;
  /** Preenche os campos do formulário com os dados extraídos */
  onExtracted: (data: Record<string, unknown>) => void;
  /** Callback opcional: recebe o resultado completo incluindo caminho no Storage */
  onScanned?: (result: ScanResult) => void;
  className?: string;
}

export function DocumentScanner({ documentKind, onExtracted, onScanned, className }: DocumentScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 20 MB.');
      return;
    }

    setIsScanning(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const mediaType = file.type || 'image/jpeg';
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('extract-document-data', {
        body: { fileBase64, mediaType, documentKind },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? 'Falha na extração');

      setScanResult({
        extracted: data.data,
        documentKind,
        storagePath: data.storagePath ?? null,
        bucketName: data.bucketName ?? 'documentos-associados',
        fileName: data.fileName ?? '',
      });
    } catch (err: any) {
      toast.error(`Erro ao ler documento: ${err.message}`);
    } finally {
      setIsScanning(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (!scanResult) return;
    onExtracted(scanResult.extracted);
    onScanned?.(scanResult);
    toast.success('Formulário preenchido com os dados do documento!');
    setScanResult(null);
  };

  const visibleEntries = Object.entries(scanResult?.extracted ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isScanning}
        onClick={() => inputRef.current?.click()}
        className={className}
      >
        {isScanning
          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          : <ScanLine className="h-4 w-4 mr-2" />}
        {isScanning ? 'Lendo documento…' : `Preencher com ${KIND_LABELS[documentKind]}`}
      </Button>

      <Dialog open={!!scanResult} onOpenChange={(open) => { if (!open) setScanResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Dados extraídos do {KIND_LABELS[documentKind]}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {visibleEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado reconhecido.</p>
            ) : (
              visibleEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 text-sm border-b pb-1 last:border-0">
                  <span className="text-muted-foreground shrink-0">
                    {FIELD_LABELS[key] ?? key}
                  </span>
                  <span className="font-medium text-right">{formatValue(key, value)}</span>
                </div>
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Revise os dados antes de confirmar. Campos incorretos podem ser corrigidos manualmente.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScanResult(null)}>Descartar</Button>
            <Button onClick={handleConfirm} disabled={visibleEntries.length === 0}>
              Preencher formulário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
