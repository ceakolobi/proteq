import { useCallback } from 'react';
import { FileText, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { DocumentoUpload } from '../types';

interface DocumentosAssociadoStepProps {
  documents: DocumentoUpload[];
  onChange: (documents: DocumentoUpload[]) => void;
}

const DOCUMENT_TYPES = [
  { tipo: 'cnh', label: 'CNH (Carteira de Habilitação)', required: false },
  { tipo: 'rg', label: 'RG (Documento de Identidade)', required: false },
  { tipo: 'cpf', label: 'CPF (se não constar na CNH)', required: false },
  { tipo: 'comprovante_residencia', label: 'Comprovante de Residência', required: false },
];

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentosAssociadoStep({ documents, onChange }: DocumentosAssociadoStepProps) {
  const handleFileSelect = useCallback((tipo: string, file: File) => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      toast.error('Formato não aceito. Use JPG, PNG, WebP ou PDF.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    const existingIndex = documents.findIndex(d => d.tipo === tipo);
    const docType = DOCUMENT_TYPES.find(d => d.tipo === tipo);
    
    const newDoc: DocumentoUpload = {
      tipo,
      file,
      label: docType?.label || tipo,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    };

    if (existingIndex >= 0) {
      const newDocs = [...documents];
      // Revoke old preview URL
      if (newDocs[existingIndex].preview) {
        URL.revokeObjectURL(newDocs[existingIndex].preview!);
      }
      newDocs[existingIndex] = newDoc;
      onChange(newDocs);
    } else {
      onChange([...documents, newDoc]);
    }

    toast.success(`${docType?.label || 'Documento'} adicionado!`);
  }, [documents, onChange]);

  const handleDrop = useCallback((tipo: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(tipo, file);
    }
  }, [handleFileSelect]);

  const handleRemove = (tipo: string) => {
    const doc = documents.find(d => d.tipo === tipo);
    if (doc?.preview) {
      URL.revokeObjectURL(doc.preview);
    }
    onChange(documents.filter(d => d.tipo !== tipo));
  };

  const getDocument = (tipo: string) => documents.find(d => d.tipo === tipo);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Documentos do Associado</h3>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Documentos recomendados</p>
            <p className="text-muted-foreground">
              Os documentos ajudam a validar o cadastro mais rapidamente.
              Formatos aceitos: JPG, PNG, WebP ou PDF (máx. 10MB cada).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOCUMENT_TYPES.map((docType) => {
          const uploadedDoc = getDocument(docType.tipo);
          
          return (
            <div
              key={docType.tipo}
              className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                uploadedDoc
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => handleDrop(docType.tipo, e)}
            >
              {uploadedDoc ? (
                <div className="flex items-center gap-3">
                  {uploadedDoc.preview ? (
                    <img
                      src={uploadedDoc.preview}
                      alt={docType.label}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{docType.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {uploadedDoc.file?.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemove(docType.tipo)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block text-center py-4">
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(docType.tipo, file);
                    }}
                  />
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium text-sm">{docType.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Arraste ou clique para enviar
                  </p>
                </label>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Você pode avançar sem enviar os documentos agora. Eles podem ser adicionados posteriormente.
      </p>
    </div>
  );
}
