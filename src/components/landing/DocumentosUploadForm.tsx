import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, FileText, Upload, X, CheckCircle, Camera, Car, User, Home, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentoUpload {
  tipo: string;
  label: string;
  file?: File;
  preview?: string;
  categoria: 'pessoal' | 'veiculo';
}

interface DocumentosUploadFormProps {
  onSubmit: (documentos: DocumentoUpload[]) => void;
  onBack: () => void;
  loading?: boolean;
}

const DOCUMENTOS_PESSOAIS = [
  { tipo: 'cnh', label: 'CNH (Carteira de Habilitação)', icon: User },
  { tipo: 'comprovante_residencia', label: 'Comprovante de Residência', icon: Home },
];

const DOCUMENTOS_VEICULO = [
  { tipo: 'crlv', label: 'CRLV (Documento do Veículo)', icon: Car },
  { tipo: 'foto_frente', label: 'Foto Frente do Veículo', icon: Camera },
  { tipo: 'foto_traseira', label: 'Foto Traseira do Veículo', icon: Camera },
  { tipo: 'foto_lateral_esq', label: 'Foto Lateral Esquerda', icon: Camera },
  { tipo: 'foto_lateral_dir', label: 'Foto Lateral Direita', icon: Camera },
];

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentosUploadForm({ onSubmit, onBack, loading }: DocumentosUploadFormProps) {
  const [documentos, setDocumentos] = useState<DocumentoUpload[]>([]);

  const handleFileSelect = useCallback((tipo: string, label: string, categoria: 'pessoal' | 'veiculo', file: File) => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      toast.error('Formato não aceito. Use JPG, PNG, WebP ou PDF.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    const existingIndex = documentos.findIndex(d => d.tipo === tipo);
    
    const newDoc: DocumentoUpload = {
      tipo,
      label,
      file,
      categoria,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    };

    if (existingIndex >= 0) {
      const newDocs = [...documentos];
      if (newDocs[existingIndex].preview) {
        URL.revokeObjectURL(newDocs[existingIndex].preview!);
      }
      newDocs[existingIndex] = newDoc;
      setDocumentos(newDocs);
    } else {
      setDocumentos([...documentos, newDoc]);
    }

    toast.success(`${label} adicionado!`);
  }, [documentos]);

  const handleRemove = (tipo: string) => {
    const doc = documentos.find(d => d.tipo === tipo);
    if (doc?.preview) {
      URL.revokeObjectURL(doc.preview);
    }
    setDocumentos(documentos.filter(d => d.tipo !== tipo));
  };

  const getDocument = (tipo: string) => documentos.find(d => d.tipo === tipo);

  const handleSubmit = () => {
    // Validação mínima (pelo menos CNH ou CRLV)
    const temCNH = documentos.some(d => d.tipo === 'cnh');
    const temCRLV = documentos.some(d => d.tipo === 'crlv');
    
    if (!temCNH && !temCRLV) {
      toast.error('Envie pelo menos a CNH ou CRLV para continuar');
      return;
    }
    
    onSubmit(documentos);
  };

  const renderDocCard = (
    tipo: string, 
    label: string, 
    Icon: React.ComponentType<{ className?: string }>,
    categoria: 'pessoal' | 'veiculo'
  ) => {
    const uploadedDoc = getDocument(tipo);
    
    return (
      <div
        key={tipo}
        className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${
          uploadedDoc
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        {uploadedDoc ? (
          <div className="flex items-center gap-3">
            {uploadedDoc.preview ? (
              <img
                src={uploadedDoc.preview}
                alt={label}
                className="w-14 h-14 object-cover rounded-lg"
              />
            ) : (
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-7 w-7 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-sm truncate">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {uploadedDoc.file?.name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleRemove(tipo)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="cursor-pointer block text-center py-2">
            <input
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(tipo, label, categoria, file);
                e.target.value = '';
              }}
            />
            <Icon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Arraste ou clique
            </p>
          </label>
        )}
      </div>
    );
  };

  const docsEnviados = documentos.length;
  const totalDocs = DOCUMENTOS_PESSOAIS.length + DOCUMENTOS_VEICULO.length;

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-16 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Envie seus documentos</h2>
          <p className="text-muted-foreground">
            Documentos necessários para ativar sua proteção
          </p>
        </div>

        {/* Progresso */}
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-primary">{docsEnviados}</span> de {totalDocs} documentos enviados
          </p>
        </div>

        {/* Documentos Pessoais */}
        <Card className="shadow-xl mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Documentos Pessoais
            </CardTitle>
            <CardDescription>CNH e comprovante de residência</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCUMENTOS_PESSOAIS.map(doc => 
                renderDocCard(doc.tipo, doc.label, doc.icon, 'pessoal')
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documentos do Veículo */}
        <Card className="shadow-xl mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Documentos do Veículo
            </CardTitle>
            <CardDescription>CRLV e fotos do veículo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCUMENTOS_VEICULO.map(doc => 
                renderDocCard(doc.tipo, doc.label, doc.icon, 'veiculo')
              )}
            </div>
          </CardContent>
        </Card>

        {/* Aviso */}
        <div className="bg-muted/50 p-4 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Importante</p>
              <p className="text-muted-foreground">
                Envie pelo menos a CNH ou CRLV para continuar. 
                Você pode adicionar os demais documentos depois pelo app.
              </p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="flex-1 flex-grow-[2]"
          >
            {loading ? 'Enviando...' : 'Continuar para pagamento'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
