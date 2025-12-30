import { useCallback } from 'react';
import { Camera, Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { DocumentoUpload } from '../types';

interface DocumentosVeiculoStepProps {
  documents: DocumentoUpload[];
  onChange: (documents: DocumentoUpload[]) => void;
}

const DOCUMENT_TYPES = [
  { tipo: 'crlv', label: 'CRLV (Documento do Veículo)', required: false, icon: FileText },
  { tipo: 'foto_frente', label: 'Foto Frente', required: false, icon: Camera },
  { tipo: 'foto_traseira', label: 'Foto Traseira', required: false, icon: Camera },
  { tipo: 'foto_lateral', label: 'Foto Lateral', required: false, icon: Camera },
  { tipo: 'foto_painel', label: 'Foto Painel/Interior', required: false, icon: Camera },
  { tipo: 'laudo_vistoria', label: 'Laudo de Vistoria', required: false, icon: FileText },
];

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentosVeiculoStep({ documents, onChange }: DocumentosVeiculoStepProps) {
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

  const uploadedCount = documents.length;
  const photoCount = documents.filter(d => d.tipo.startsWith('foto_')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Camera className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Documentos e Fotos do Veículo</h3>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Documentos e fotos recomendados</p>
            <p className="text-muted-foreground">
              Recomendamos pelo menos 4 fotos do veículo (frente, traseira, lateral e painel).
              Formatos aceitos: JPG, PNG, WebP ou PDF (máx. 10MB cada).
            </p>
            <p className="text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{uploadedCount}</span> arquivo(s) enviado(s) •
              <span className="font-medium text-foreground ml-1">{photoCount}</span> foto(s)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DOCUMENT_TYPES.map((docType) => {
          const uploadedDoc = getDocument(docType.tipo);
          const IconComponent = docType.icon;
          
          return (
            <div
              key={docType.tipo}
              className={`relative border-2 border-dashed rounded-lg p-3 transition-colors ${
                uploadedDoc
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => handleDrop(docType.tipo, e)}
            >
              {uploadedDoc ? (
                <div className="flex flex-col items-center gap-2">
                  {uploadedDoc.preview ? (
                    <img
                      src={uploadedDoc.preview}
                      alt={docType.label}
                      className="w-full h-24 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-24 bg-primary/10 rounded flex items-center justify-center">
                      <FileText className="h-10 w-10 text-primary" />
                    </div>
                  )}
                  <div className="flex items-center gap-1 w-full">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium truncate">{docType.label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto flex-shrink-0"
                      onClick={() => handleRemove(docType.tipo)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
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
                  <IconComponent className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs font-medium">{docType.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Arraste ou clique
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
