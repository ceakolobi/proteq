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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Loader2, 
  CheckCircle, 
  FileText, 
  PenLine, 
  AlertTriangle, 
  Clock 
} from 'lucide-react';
import { SignaturePad } from '@/components/cotacao/SignaturePad';
import { TERMO_ACEITE_TITULO } from '@/lib/termoAceiteContent';

interface TermoData {
  id: string;
  associado_id: string;
  conteudo_termo: string;
  status: string;
  token_expires_at: string;
  associado?: {
    nome_completo: string;
    cpf: string;
    email: string;
  };
}

export default function AssinaturaTermoPublico() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termo, setTermo] = useState<TermoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [nomeAssinatura, setNomeAssinatura] = useState('');
  const [cpfAssinatura, setCpfAssinatura] = useState('');
  const [assinaturaData, setAssinaturaData] = useState<string | null>(null);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  useEffect(() => {
    if (token) {
      fetchTermo();
    }
  }, [token]);

  const fetchTermo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Buscar termo pelo token
      const { data, error: fetchError } = await supabase
        .from('termos_aceite')
        .select(`
          id,
          associado_id,
          conteudo_termo,
          status,
          token_expires_at
        `)
        .eq('token_assinatura', token)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Link inválido ou expirado. Solicite um novo link de assinatura.');
        } else {
          throw fetchError;
        }
        return;
      }

      // Verificar se expirou
      if (new Date(data.token_expires_at) < new Date()) {
        setError('Este link expirou. Solicite um novo link de assinatura.');
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
        .select('nome_completo, cpf, email')
        .eq('id', data.associado_id)
        .single();

      setTermo({
        ...data,
        associado: associado || undefined
      });

      // Pré-preencher nome se disponível
      if (associado?.nome_completo) {
        setNomeAssinatura(associado.nome_completo);
      }

    } catch (err) {
      console.error('Error fetching termo:', err);
      setError('Erro ao carregar o termo. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCPF = (value: string): string => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14);
  };

  const handleCpfChange = (value: string) => {
    setCpfAssinatura(formatCPF(value));
  };

  const handleSubmit = async () => {
    if (!termo) return;

    // Validações
    if (!nomeAssinatura.trim()) {
      toast.error('Digite seu nome completo');
      return;
    }

    if (cpfAssinatura.replace(/\D/g, '').length !== 11) {
      toast.error('Digite um CPF válido');
      return;
    }

    if (!assinaturaData) {
      toast.error('Por favor, faça sua assinatura no campo abaixo');
      return;
    }

    if (!aceitouTermos) {
      toast.error('Você precisa aceitar os termos para continuar');
      return;
    }

    setIsSubmitting(true);

    try {
      // Atualizar o termo com a assinatura
      const { error: updateError } = await supabase
        .from('termos_aceite')
        .update({
          assinatura_nome: nomeAssinatura.trim(),
          assinatura_cpf: cpfAssinatura.replace(/\D/g, ''),
          assinatura_data: assinaturaData,
          assinado_em: new Date().toISOString(),
          status: 'assinado',
          canal_aceite: 'link'
        })
        .eq('token_assinatura', token)
        .eq('status', 'pendente');

      if (updateError) throw updateError;

      // Atualizar associado com termos_aceitos
      await supabase
        .from('associados')
        .update({
          termos_aceitos: true,
          termos_aceitos_em: new Date().toISOString()
        })
        .eq('id', termo.associado_id);

      setSuccess(true);
      toast.success('Termo assinado com sucesso!');

    } catch (err) {
      console.error('Error signing termo:', err);
      toast.error('Erro ao assinar o termo. Tente novamente.');
    } finally {
      setIsSubmitting(false);
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
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">✅ Pronto!</h2>
            <p className="text-muted-foreground">
              Seu termo foi assinado com sucesso e seu cadastro está ativo.
            </p>
            <p className="text-lg font-medium text-primary">
              Bem-vindo ao Harmony Clube de Benefícios!
            </p>
            <p className="text-sm text-muted-foreground">
              Em breve você receberá uma confirmação por e-mail e WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background p-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">{TERMO_ACEITE_TITULO}</h1>
          {termo?.associado && (
            <p className="text-muted-foreground">
              Olá, <span className="font-medium">{termo.associado.nome_completo}</span>
            </p>
          )}
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

        {/* Termo content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leia atentamente o termo abaixo</CardTitle>
            <CardDescription>
              Role até o final para poder assinar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {termo?.conteudo_termo}
                </pre>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Signature form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              Assinar Digitalmente
            </CardTitle>
            <CardDescription>
              Preencha os dados abaixo e faça sua assinatura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  placeholder="Seu nome completo"
                  value={nomeAssinatura}
                  onChange={(e) => setNomeAssinatura(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">
                  CPF <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpfAssinatura}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  maxLength={14}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>
                Assinatura Digital <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Use o mouse ou o dedo (em telas touch) para assinar no campo abaixo
              </p>
              <SignaturePad
                onSignatureChange={setAssinaturaData}
                width={500}
                height={200}
                className="w-full"
              />
            </div>

            <Separator />

            <div className="flex items-start space-x-3">
              <Checkbox
                id="aceite"
                checked={aceitouTermos}
                onCheckedChange={(checked) => setAceitouTermos(checked === true)}
              />
              <label
                htmlFor="aceite"
                className="text-sm leading-relaxed cursor-pointer"
              >
                Li e aceito integralmente os termos e condições do TERMO DE ACEITE – HARMONY CLUBE DE BENEFÍCIOS.
                Declaro que as informações fornecidas são verdadeiras e que esta assinatura digital tem validade jurídica.
              </label>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !aceitouTermos || !assinaturaData}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Assinar e Finalizar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Este documento possui validade jurídica conforme Lei nº 14.063/2020
        </p>
      </div>
    </div>
  );
}
