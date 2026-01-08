import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  Car, 
  Loader2, 
  AlertCircle,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand';

interface VistoriaData {
  id: string;
  token_acesso: string;
  token_expires_at: string;
  status: string;
  tipo_vistoria: string;
  checklist: Record<string, boolean> | null;
  fotos: string[] | null;
  observacoes: string;
  veiculo: {
    id: string;
    marca: string;
    modelo: string;
    placa: string;
    ano: number;
  };
  associado: {
    id: string;
    nome_completo: string;
  } | null;
}

const checklistItems = [
  { key: 'frente', label: 'Frente do Veículo', required: true },
  { key: 'traseira', label: 'Traseira do Veículo', required: true },
  { key: 'lateral_esquerda', label: 'Lateral Esquerda', required: true },
  { key: 'lateral_direita', label: 'Lateral Direita', required: true },
  { key: 'painel', label: 'Painel / Hodômetro', required: true },
  { key: 'motor', label: 'Motor', required: false },
  { key: 'chassi', label: 'Número do Chassi', required: true },
  { key: 'documento', label: 'Documento do Veículo (CRLV)', required: true },
];

export default function VistoriaPublica() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [vistoria, setVistoria] = useState<VistoriaData | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [fotos, setFotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      fetchVistoria();
    } else {
      setNotFound(true);
      setIsLoading(false);
    }
  }, [token]);

  const fetchVistoria = async () => {
    try {
      const { data, error } = await supabase
        .from('vistorias')
        .select(`
          id,
          token_acesso,
          token_expires_at,
          status,
          tipo_vistoria,
          checklist,
          fotos,
          observacoes,
          veiculo:veiculos!vistorias_veiculo_id_fkey (
            id,
            marca,
            modelo,
            placa,
            ano
          ),
          associado:associados!vistorias_associado_id_fkey (
            id,
            nome_completo
          )
        `)
        .eq('token_acesso', token)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }

      // Check if token is expired
      if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
        setIsExpired(true);
        return;
      }

      // Check if already completed
      if (data.status === 'em_andamento' || data.status === 'aprovada' || data.status === 'reprovada') {
        setIsCompleted(true);
      }

      setVistoria(data as unknown as VistoriaData);
      setChecklist(data.checklist as Record<string, boolean> || {});
      setFotos(data.fotos || []);
    } catch (err) {
      console.error('Erro ao buscar vistoria:', err);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChecklistChange = (key: string, checked: boolean) => {
    setChecklist(prev => ({ ...prev, [key]: checked }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !vistoria) return;

    setIsUploading(true);
    const newFotos: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${vistoria.id}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('vistoria-fotos')
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from('vistoria-fotos')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          newFotos.push(publicUrlData.publicUrl);
        }
      }

      setFotos(prev => [...prev, ...newFotos]);
      toast.success(`${newFotos.length} foto(s) enviada(s)`);
    } catch (err) {
      console.error('Erro no upload:', err);
      toast.error('Erro ao enviar fotos');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!vistoria) return;

    // Validate required items
    const requiredItems = checklistItems.filter(item => item.required);
    const missingItems = requiredItems.filter(item => !checklist[item.key]);

    if (missingItems.length > 0) {
      toast.error(`Itens obrigatórios pendentes: ${missingItems.map(i => i.label).join(', ')}`);
      return;
    }

    if (fotos.length < 6) {
      toast.error('Envie pelo menos 6 fotos do veículo');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('vistorias')
        .update({
          checklist,
          fotos,
          status: 'em_andamento',
          solicitada_em: new Date().toISOString(),
        })
        .eq('id', vistoria.id);

      if (error) throw error;

      toast.success('Vistoria enviada com sucesso!');
      setIsCompleted(true);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast.error(err.message || 'Erro ao salvar vistoria');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-2" />
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              O link de vistoria não foi encontrado ou é inválido.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-2" />
            <CardTitle>Link Expirado</CardTitle>
            <CardDescription>
              Este link de vistoria expirou. Entre em contato com seu consultor para solicitar um novo link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
            <CardTitle>Vistoria Enviada!</CardTitle>
            <CardDescription>
              Sua vistoria foi recebida com sucesso. Nossa equipe irá analisá-la e entrará em contato em breve.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Obrigado por enviar as fotos e documentos do seu veículo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <BrandLogo className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Vistoria do Veículo</h1>
          <p className="text-muted-foreground mt-1">
            Envie as fotos e documentos do seu veículo
          </p>
        </div>

        {/* Vehicle Info */}
        {vistoria?.veiculo && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="w-5 h-5" />
                Dados do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Veículo:</span>
                <span className="font-medium">
                  {vistoria.veiculo.marca} {vistoria.veiculo.modelo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Placa:</span>
                <span className="font-mono">{vistoria.veiculo.placa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ano:</span>
                <span>{vistoria.veiculo.ano}</span>
              </div>
              {vistoria.associado && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Proprietário:</span>
                  <span>{vistoria.associado.nome_completo}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Checklist de Fotos</CardTitle>
            <CardDescription>
              Marque os itens conforme enviar as fotos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklistItems.map((item) => (
              <div key={item.key} className="flex items-center space-x-3">
                <Checkbox
                  id={item.key}
                  checked={checklist[item.key] || false}
                  onCheckedChange={(checked) => handleChecklistChange(item.key, !!checked)}
                />
                <Label htmlFor={item.key} className="flex items-center gap-2 cursor-pointer">
                  {item.label}
                  {item.required && (
                    <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                  )}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upload Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="w-5 h-5" />
              Enviar Fotos
            </CardTitle>
            <CardDescription>
              Envie pelo menos 6 fotos do veículo (frente, traseira, laterais, painel, chassi, documento)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id="photo-upload"
              />
              <Button
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Tirar Foto / Selecionar Imagens
                  </>
                )}
              </Button>
            </div>

            {/* Photo Grid */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemoveFoto(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              <span>{fotos.length} foto(s) enviada(s) - Mínimo: 6</span>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={isSaving || fotos.length < 6}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Enviando Vistoria...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Enviar Vistoria
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Ao enviar, você confirma que as fotos são do veículo informado.
        </p>
      </div>
    </div>
  );
}
