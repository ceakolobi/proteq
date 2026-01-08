import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Loader2, 
  CheckCircle, 
  FileText, 
  PenLine, 
  AlertTriangle, 
  Clock,
  Car,
  User,
  Calendar,
  Eye,
  MessageCircle,
  Smartphone,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { SignaturePad } from '@/components/cotacao/SignaturePad';
import { TERMO_ACEITE_TITULO } from '@/lib/termoAceiteContent';

interface TermoData {
  id: string;
  associado_id: string;
  veiculo_id: string | null;
  conteudo_termo: string;
  status: string;
  token_assinatura: string;
  token_expires_at: string;
  associado?: {
    nome_completo: string;
    cpf: string;
    email: string;
    whatsapp: string | null;
    telefone: string;
  };
  veiculo?: {
    placa: string;
    marca: string;
    modelo: string;
    ano: number;
  };
}

export default function AssinaturaTermoPublico() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isRenewingToken, setIsRenewingToken] = useState(false);
  const [termo, setTermo] = useState<TermoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [success, setSuccess] = useState(false);
  const [whatsappConfirmacao, setWhatsappConfirmacao] = useState<string | null>(null);
  
  // Form state
  const [assinaturaData, setAssinaturaData] = useState<string | null>(null);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [metodoAssinatura, setMetodoAssinatura] = useState<'desenho' | 'codigo'>('desenho');
  
  // Code verification state
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [codigoValidado, setCodigoValidado] = useState(false);
  const [codigoGerado, setCodigoGerado] = useState('');

  useEffect(() => {
    if (token) {
      fetchTermo();
    }
  }, [token]);

  const fetchTermo = async () => {
    setIsLoading(true);
    setError(null);
    setTokenExpired(false);

    try {
      // Buscar termo pelo token
      const { data, error: fetchError } = await supabase
        .from('termos_aceite')
        .select(`
          id,
          associado_id,
          veiculo_id,
          conteudo_termo,
          status,
          token_assinatura,
          token_expires_at
        `)
        .eq('token_assinatura', token)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Link inválido. Solicite um novo link de assinatura.');
        } else {
          throw fetchError;
        }
        return;
      }

      // Verificar se expirou
      if (new Date(data.token_expires_at) < new Date()) {
        setTokenExpired(true);
        setTermo(data);
        // Buscar dados do associado para renovação
        const { data: associado } = await supabase
          .from('associados')
          .select('nome_completo, cpf, email, whatsapp, telefone')
          .eq('id', data.associado_id)
          .single();
        if (associado) {
          setTermo({ ...data, associado });
        }
        return;
      }

      // Verificar status
      if (data.status !== 'pendente') {
        if (data.status === 'assinado') {
          setError('Este termo já foi assinado.');
        } else {
          setError('Este termo não está mais disponível para assinatura.');
        }
        return;
      }

      // Buscar dados do associado
      const { data: associado } = await supabase
        .from('associados')
        .select('nome_completo, cpf, email, whatsapp, telefone')
        .eq('id', data.associado_id)
        .single();

      // Buscar dados do veículo se existir
      let veiculo = null;
      if (data.veiculo_id) {
        const { data: veiculoData } = await supabase
          .from('veiculos')
          .select('placa, marca, modelo, ano')
          .eq('id', data.veiculo_id)
          .single();
        veiculo = veiculoData;
      }

      setTermo({
        ...data,
        associado: associado || undefined,
        veiculo: veiculo || undefined
      });

    } catch (err) {
      console.error('Error fetching termo:', err);
      setError('Erro ao carregar o termo. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renovarToken = async () => {
    if (!termo) return;
    
    setIsRenewingToken(true);
    
    try {
      // Gerar novo token e nova data de expiração (72h)
      const novaExpiracao = new Date();
      novaExpiracao.setHours(novaExpiracao.getHours() + 72);
      
      const { data: novoTermo, error: updateError } = await supabase
        .from('termos_aceite')
        .update({
          token_assinatura: crypto.randomUUID(),
          token_expires_at: novaExpiracao.toISOString(),
        })
        .eq('id', termo.id)
        .select('token_assinatura')
        .single();

      if (updateError) throw updateError;

      toast.success('Link renovado! Redirecionando...');
      
      // Redirecionar para o novo token
      setTimeout(() => {
        navigate(`/assinatura-termo/${novoTermo.token_assinatura}`);
        window.location.reload();
      }, 1000);
      
    } catch (err) {
      console.error('Error renewing token:', err);
      toast.error('Erro ao renovar o link. Tente novamente.');
    } finally {
      setIsRenewingToken(false);
    }
  };

  const enviarCodigoWhatsApp = async () => {
    if (!termo?.associado) return;
    
    const telefone = termo.associado.whatsapp || termo.associado.telefone;
    if (!telefone) {
      toast.error('Nenhum telefone cadastrado para enviar o código');
      return;
    }

    setIsSendingCode(true);
    
    try {
      // Gerar código de 6 dígitos
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      setCodigoGerado(codigo);
      
      // Formatar telefone para WhatsApp
      const cleanPhone = telefone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      
      // Abrir WhatsApp com a mensagem do código
      const mensagem = encodeURIComponent(
        `🔐 *Código de Verificação*\n\n` +
        `Seu código para assinar o Termo de Aceite é:\n\n` +
        `*${codigo}*\n\n` +
        `Este código é válido por 10 minutos.\n\n` +
        `Harmony Clube de Benefícios`
      );
      
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${mensagem}`;
      
      // Tentar abrir em nova aba
      const newWindow = window.open(whatsappUrl, '_blank');
      
      if (!newWindow) {
        // Fallback: copiar para clipboard
        await navigator.clipboard.writeText(codigo);
        toast.info('Código copiado! Cole no WhatsApp para o associado.');
      }
      
      setCodigoEnviado(true);
      toast.success('Código gerado! Envie via WhatsApp e digite abaixo.');
      
    } catch (err) {
      console.error('Error sending code:', err);
      toast.error('Erro ao gerar código. Tente novamente.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const validarCodigo = () => {
    if (codigoDigitado === codigoGerado) {
      setCodigoValidado(true);
      toast.success('Código validado com sucesso!');
    } else {
      toast.error('Código inválido. Tente novamente.');
    }
  };

  const canSubmit = () => {
    if (!aceitouTermos) return false;
    
    if (metodoAssinatura === 'desenho') {
      return !!assinaturaData;
    } else {
      return codigoValidado;
    }
  };

  const handleSubmit = async () => {
    if (!termo || !canSubmit()) return;

    setIsSubmitting(true);

    try {
      // Chamar edge function para processar assinatura
      const { data: result, error: funcError } = await supabase.functions.invoke('processar-assinatura', {
        body: {
          termoId: termo.id,
          assinaturaNome: termo.associado?.nome_completo || '',
          assinaturaCpf: termo.associado?.cpf || '',
          assinaturaData: metodoAssinatura === 'desenho' ? assinaturaData : `codigo:${codigoGerado}`,
          canalAssinatura: metodoAssinatura === 'desenho' ? 'app' : 'whatsapp',
          userAgent: navigator.userAgent,
        },
      });

      if (funcError) {
        console.error('Function error:', funcError);
        throw new Error(funcError.message || 'Erro ao processar assinatura');
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao processar assinatura');
      }

      // Guardar link do WhatsApp para confirmação
      if (result.data?.whatsappConfirmacao) {
        setWhatsappConfirmacao(result.data.whatsappConfirmacao);
      }

      setSuccess(true);
      toast.success('Termo assinado com sucesso!');

    } catch (err: any) {
      console.error('Error signing termo:', err);
      toast.error(err.message || 'Erro ao assinar o termo. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const abrirWhatsAppConfirmacao = () => {
    if (whatsappConfirmacao) {
      window.open(whatsappConfirmacao, '_blank');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando termo...</p>
        </div>
      </div>
    );
  }

  // Token expired state - allow renewal
  if (tokenExpired && termo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-500/10 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Clock className="h-16 w-16 text-amber-500 mx-auto" />
            <h2 className="text-xl font-semibold">Link Expirado</h2>
            <p className="text-muted-foreground">
              Este link de assinatura expirou, mas você pode gerar um novo agora mesmo.
            </p>
            {termo.associado && (
              <p className="text-sm text-muted-foreground">
                Associado: <strong>{termo.associado.nome_completo}</strong>
              </p>
            )}
            <Button 
              onClick={renovarToken} 
              disabled={isRenewingToken}
              className="w-full"
            >
              {isRenewingToken ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando novo link...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Gerar Novo Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/10 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Não foi possível carregar</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">✅ Tudo certo, {termo?.associado?.nome_completo?.split(' ')[0]}!</h2>
              <p className="text-lg text-muted-foreground">
                Seu termo foi assinado e seu cadastro está ativo.
              </p>
            </div>
            <div className="bg-primary/5 rounded-lg p-4 text-sm text-muted-foreground">
              <p>Bem-vindo ao <strong>Harmony Clube de Benefícios</strong>! 🎉</p>
              <p className="mt-2">Você receberá uma confirmação por e-mail em instantes.</p>
            </div>
            
            {whatsappConfirmacao && (
              <Button 
                onClick={abrirWhatsAppConfirmacao} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar Confirmação via WhatsApp
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <PenLine className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Assinatura do Termo de Aceite</h1>
          <p className="text-muted-foreground">
            Para concluir sua filiação, confirme sua assinatura abaixo.
          </p>
        </div>

        {/* Expiration notice */}
        {termo && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Este link expira em{' '}
              <span className="font-medium">
                {new Date(termo.token_expires_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumo do Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Associado */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Associado</p>
                  <p className="font-medium">{termo?.associado?.nome_completo}</p>
                </div>
              </div>

              {/* Veículo */}
              {termo?.veiculo && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Veículo</p>
                    <p className="font-medium">{termo.veiculo.marca} {termo.veiculo.modelo}</p>
                    <p className="text-sm text-muted-foreground">{termo.veiculo.placa}</p>
                  </div>
                </div>
              )}

              {/* Data */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">{dataAtual}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Ver termo completo */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver termo completo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {TERMO_ACEITE_TITULO}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted/50 p-4 rounded-lg">
                      {termo?.conteudo_termo}
                    </pre>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Signature Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              Área de Assinatura
            </CardTitle>
            <CardDescription>
              Escolha como deseja assinar o documento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={metodoAssinatura} onValueChange={(v) => setMetodoAssinatura(v as 'desenho' | 'codigo')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="desenho" className="flex items-center gap-2">
                  <PenLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Assinatura com</span> dedo/mouse
                </TabsTrigger>
                <TabsTrigger value="codigo" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Código <span className="hidden sm:inline">via</span> WhatsApp
                </TabsTrigger>
              </TabsList>

              {/* Opção A: Assinatura desenhada */}
              <TabsContent value="desenho" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>
                    Desenhe sua assinatura abaixo <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use o mouse ou o dedo (em telas touch) para assinar no campo abaixo
                  </p>
                  <SignaturePad
                    onSignatureChange={setAssinaturaData}
                    width={500}
                    height={200}
                    className="w-full"
                  />
                </div>
              </TabsContent>

              {/* Opção B: Código por WhatsApp */}
              <TabsContent value="codigo" className="space-y-4 mt-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Confirmação por código</p>
                      <p className="text-sm text-muted-foreground">
                        Enviaremos um código de 6 dígitos para seu WhatsApp
                      </p>
                    </div>
                  </div>

                  {!codigoEnviado ? (
                    <Button 
                      onClick={enviarCodigoWhatsApp} 
                      disabled={isSendingCode}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isSendingCode ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Gerando código...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Receber código por WhatsApp
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      {codigoValidado ? (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Código validado com sucesso!</span>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="codigo">Digite o código recebido</Label>
                            <div className="flex gap-2">
                              <Input
                                id="codigo"
                                placeholder="000000"
                                value={codigoDigitado}
                                onChange={(e) => setCodigoDigitado(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                className="text-center text-xl tracking-widest font-mono"
                              />
                              <Button onClick={validarCodigo} disabled={codigoDigitado.length !== 6}>
                                Validar
                              </Button>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={enviarCodigoWhatsApp}
                            className="text-muted-foreground"
                          >
                            Reenviar código
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Checkbox obrigatório */}
            <div className="flex items-start space-x-3 bg-primary/5 p-4 rounded-lg">
              <Checkbox
                id="aceite"
                checked={aceitouTermos}
                onCheckedChange={(checked) => setAceitouTermos(checked === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="aceite"
                className="text-sm leading-relaxed cursor-pointer"
              >
                <span className="font-medium">Declaro que li e concordo com os termos apresentados.</span>
                <br />
                <span className="text-muted-foreground">
                  Reconheço que esta assinatura digital tem validade jurídica conforme Lei nº 14.063/2020.
                </span>
              </label>
            </div>

            {/* Botão principal */}
            <Button
              className="w-full h-12 text-lg"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  CONFIRMAR E ASSINAR
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Este documento possui validade jurídica conforme Lei nº 14.063/2020 e MP nº 2.200-2/2001.
        </p>
      </div>
    </div>
  );
}
