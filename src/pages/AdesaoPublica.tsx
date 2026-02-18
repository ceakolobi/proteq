import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Upload, Camera, FileText, CheckCircle2, Shield, 
  Loader2, AlertCircle, PenTool, ArrowRight, ArrowLeft
} from 'lucide-react';

type AdesaoStep = 'loading' | 'documentos' | 'fotos' | 'assinatura' | 'concluido' | 'erro' | 'expirado';

interface AdesaoData {
  id: string;
  cotacao_id: string;
  token: string;
  status: string;
  expires_at: string;
  documentos_enviados: any[];
  fotos_veiculo: any[];
  assinatura_url: string | null;
}

interface CotacaoInfo {
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  valor_bem: number;
  mensalidade: number | null;
  cliente_nome: string | null;
  cliente_email: string | null;
}

const DOCUMENTOS_REQUERIDOS = [
  { tipo: 'cnh_frente', label: 'CNH (frente)', categoria: 'pessoal' },
  { tipo: 'cnh_verso', label: 'CNH (verso)', categoria: 'pessoal' },
  { tipo: 'comprovante_residencia', label: 'Comprovante de Residência', categoria: 'pessoal' },
  { tipo: 'crlv', label: 'CRLV do Veículo', categoria: 'veiculo' },
];

const FOTOS_VEICULO = [
  { tipo: 'frente', label: 'Frente do veículo' },
  { tipo: 'traseira', label: 'Traseira' },
  { tipo: 'lateral_esquerda', label: 'Lateral esquerda' },
  { tipo: 'lateral_direita', label: 'Lateral direita' },
  { tipo: 'painel', label: 'Painel / Hodômetro' },
  { tipo: 'placa', label: 'Placa' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function AdesaoPublica() {
  const { cotacaoId, token } = useParams<{ cotacaoId: string; token: string }>();
  const [step, setStep] = useState<AdesaoStep>('loading');
  const [adesao, setAdesao] = useState<AdesaoData | null>(null);
  const [cotacao, setCotacao] = useState<CotacaoInfo | null>(null);
  const [docs, setDocs] = useState<Record<string, File>>({});
  const [fotos, setFotos] = useState<Record<string, File>>({});
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    if (!cotacaoId || !token) {
      setStep('erro');
      return;
    }
    loadAdesao();
  }, [cotacaoId, token]);

  const loadAdesao = async () => {
    try {
      const { data, error } = await supabase
        .from('adesao_links')
        .select('*')
        .eq('cotacao_id', cotacaoId)
        .eq('token', token!)
        .maybeSingle();

      if (error || !data) {
        setStep('erro');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setStep('expirado');
        return;
      }

      if (data.status === 'concluido') {
        setStep('concluido');
        setAdesao(data as AdesaoData);
        return;
      }

      setAdesao(data as AdesaoData);

      // Load cotação info
      const { data: cotData } = await supabase
        .from('cotacoes')
        .select('marca, modelo, ano_fabricacao, valor_bem, mensalidade, cliente_nome, cliente_email')
        .eq('id', cotacaoId)
        .maybeSingle();

      if (cotData) setCotacao(cotData as CotacaoInfo);
      setStep('documentos');
    } catch {
      setStep('erro');
    }
  };

  const handleFileChange = (tipo: string, file: File | undefined, target: 'docs' | 'fotos') => {
    if (!file) return;
    if (target === 'docs') {
      setDocs(prev => ({ ...prev, [tipo]: file }));
    } else {
      setFotos(prev => ({ ...prev, [tipo]: file }));
    }
  };

  const uploadFiles = async (files: Record<string, File>, folder: string) => {
    const urls: { tipo: string; url: string; nome: string }[] = [];
    
    for (const [tipo, file] of Object.entries(files)) {
      const ext = file.name.split('.').pop();
      const path = `${adesao!.id}/${folder}/${tipo}.${ext}`;
      
      const { error } = await supabase.storage
        .from('adesao-documentos')
        .upload(path, file, { upsert: true });

      if (error) {
        console.error(`Erro ao enviar ${tipo}:`, error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('adesao-documentos')
        .getPublicUrl(path);

      urls.push({ tipo, url: urlData.publicUrl, nome: file.name });
    }
    return urls;
  };

  const handleSubmitDocs = async () => {
    if (Object.keys(docs).length < 3) {
      toast.error('Envie pelo menos CNH (frente e verso) e CRLV.');
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadFiles(docs, 'documentos');
      
      await supabase
        .from('adesao_links')
        .update({ 
          documentos_enviados: uploaded,
          updated_at: new Date().toISOString()
        })
        .eq('id', adesao!.id);

      toast.success('Documentos enviados!');
      setStep('fotos');
    } catch (e) {
      toast.error('Erro ao enviar documentos.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitFotos = async () => {
    if (Object.keys(fotos).length < 4) {
      toast.error('Envie pelo menos 4 fotos do veículo.');
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadFiles(fotos, 'fotos');
      
      await supabase
        .from('adesao_links')
        .update({ 
          fotos_veiculo: uploaded,
          updated_at: new Date().toISOString()
        })
        .eq('id', adesao!.id);

      toast.success('Fotos enviadas!');
      setStep('assinatura');
    } catch {
      toast.error('Erro ao enviar fotos.');
    } finally {
      setUploading(false);
    }
  };

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    ctx.moveTo(point.clientX - rect.left, point.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(point.clientX - rect.left, point.clientY - rect.top);
    ctx.stroke();
    setHasSigned(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSubmitAssinatura = async () => {
    if (!hasSigned) {
      toast.error('Assine no campo abaixo.');
      return;
    }
    setUploading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      const path = `${adesao!.id}/assinatura.png`;
      await supabase.storage
        .from('adesao-documentos')
        .upload(path, blob, { upsert: true, contentType: 'image/png' });

      const { data: urlData } = supabase.storage
        .from('adesao-documentos')
        .getPublicUrl(path);

      await supabase
        .from('adesao_links')
        .update({ 
          assinatura_url: urlData.publicUrl,
          assinado_em: new Date().toISOString(),
          status: 'concluido',
          updated_at: new Date().toISOString()
        })
        .eq('id', adesao!.id);

      // Atualizar status da cotação
      await supabase
        .from('cotacoes')
        .update({ status: 'adesao_concluida' as any })
        .eq('id', cotacaoId);

      toast.success('Adesão concluída com sucesso!');
      setStep('concluido');
    } catch {
      toast.error('Erro ao salvar assinatura.');
    } finally {
      setUploading(false);
    }
  };

  const stepNumber = step === 'documentos' ? 1 : step === 'fotos' ? 2 : step === 'assinatura' ? 3 : 0;

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'erro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Link inválido</h2>
            <p className="text-muted-foreground">Este link de adesão não foi encontrado ou é inválido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'expirado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-bold">Link expirado</h2>
            <p className="text-muted-foreground">Este link de adesão expirou. Solicite um novo link ao seu consultor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'concluido') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5 px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Adesão concluída! 🎉</h2>
            <p className="text-muted-foreground">
              Seus documentos foram enviados com sucesso. Sua proteção será ativada após a análise.
            </p>
            <div className="bg-accent/50 rounded-xl p-4 text-sm text-left">
              <p className="font-medium">📋 Próximos passos:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• Análise dos documentos em até 24h</li>
                <li>• Ativação da proteção</li>
                <li>• Primeiro pagamento no vencimento escolhido</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-3">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Concluir Adesão</h1>
          {cotacao && (
            <p className="text-muted-foreground">
              {cotacao.marca} {cotacao.modelo} ({cotacao.ano_fabricacao}) — {cotacao.mensalidade ? formatCurrency(cotacao.mensalidade) + '/mês' : ''}
            </p>
          )}
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Documentos', 'Fotos', 'Assinatura'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i + 1 <= stepNumber ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1 < stepNumber ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i + 1 <= stepNumber ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < 2 && <div className={`w-8 h-0.5 ${i + 1 < stepNumber ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step: Documentos */}
        {step === 'documentos' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Envie seus documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {DOCUMENTOS_REQUERIDOS.map(doc => (
                <div key={doc.tipo} className="space-y-1.5">
                  <Label className="text-sm font-medium">{doc.label}</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleFileChange(doc.tipo, e.target.files?.[0], 'docs')}
                    className="cursor-pointer"
                  />
                  {docs[doc.tipo] && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {docs[doc.tipo].name}
                    </p>
                  )}
                </div>
              ))}
              <Button onClick={handleSubmitDocs} disabled={uploading} className="w-full mt-4">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Enviar documentos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Fotos */}
        {step === 'fotos' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Fotos do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tire fotos claras do veículo para a vistoria digital.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {FOTOS_VEICULO.map(foto => (
                  <div key={foto.tipo} className="space-y-1.5">
                    <Label className="text-xs font-medium">{foto.label}</Label>
                    <label className={`flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      fotos[foto.tipo] ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => handleFileChange(foto.tipo, e.target.files?.[0], 'fotos')}
                      />
                      {fotos[foto.tipo] ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      )}
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {fotos[foto.tipo] ? 'OK' : 'Tirar foto'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setStep('documentos')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <Button onClick={handleSubmitFotos} disabled={uploading} className="flex-1">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Enviar fotos
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Assinatura */}
        {step === 'assinatura' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-primary" />
                Assinatura Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Assine no campo abaixo para concluir sua adesão.
              </p>
              <div className="border-2 border-border rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={200}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={() => setIsDrawing(false)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearSignature}>
                  Limpar
                </Button>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setStep('fotos')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <Button onClick={handleSubmitAssinatura} disabled={uploading || !hasSigned} className="flex-1">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Concluir adesão
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
