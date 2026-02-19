import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileDown, Mail, MessageCircle, Copy, Check, Loader2, Download, ExternalLink, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/cotacaoUtils';
import type { ResultadoCotacao } from '@/lib/cotacaoUtils';
import type { WizardFormData } from './CotacaoWizardTypes';
import type { SystemSettings } from '@/hooks/useCompanySettings';

interface Props {
  formData: WizardFormData;
  resultado: ResultadoCotacao | null;
  cotacaoId: string | null;
  pdfBlob: Blob | null;
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  onGeneratePdf: () => Promise<void>;
  empresaNome: string;
  settings: SystemSettings;
}

export function WizardStep4Generate({
  formData, resultado, cotacaoId, pdfBlob, pdfUrl,
  isGeneratingPdf, onGeneratePdf, empresaNome, settings,
}: Props) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const logoBranca = settings.modo_white_label && settings.empresa_logo_branca
    ? settings.empresa_logo_branca
    : '/images/harmony-logo-agro-white.png';

  // Download PDF
  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposta_${formData.modelo}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download iniciado!');
  };

  // Copy link
  const handleCopyLink = async () => {
    if (!pdfUrl) return;
    await navigator.clipboard.writeText(pdfUrl);
    setLinkCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setLinkCopied(false), 3000);
  };

  // Send email
  const handleSendEmail = async () => {
    if (!pdfBlob || !formData.cliente_email) {
      toast.error('Gere o PDF e informe o e-mail primeiro');
      return;
    }
    setIsSendingEmail(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      const { data, error } = await supabase.functions.invoke('send-proposta-email', {
        body: {
          to: formData.cliente_email,
          clienteNome: formData.cliente_nome,
          modelo: `${formData.marca} ${formData.modelo}`,
          mensalidade: resultado ? formatCurrency(resultado.valorFinal) : '',
          validadeDias: 7,
          pdfUrl,
          pdfBase64: base64,
          filename: `Proposta_${formData.modelo}.pdf`,
          empresaNome,
        },
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Erro no envio');

      // Update cotação
      if (cotacaoId) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('cotacoes').update({
          proposta_enviada_em: new Date().toISOString(),
          proposta_enviada_por: user?.id,
          status: 'enviada',
        }).eq('id', cotacaoId);
      }

      setEmailSent(true);
      toast.success(`E-mail enviado para ${formData.cliente_email}`);
    } catch (err: any) {
      console.error('Erro email:', err);
      toast.error(err.message || 'Erro ao enviar e-mail');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // WhatsApp
  const handleWhatsApp = () => {
    if (!formData.cliente_whatsapp) {
      toast.error('Informe o WhatsApp');
      return;
    }
    let digits = formData.cliente_whatsapp.replace(/\D/g, '');
    if (!digits.startsWith('55') && digits.length <= 11) digits = '55' + digits;

    const saudacao = formData.cliente_nome ? `Olá ${formData.cliente_nome} 👋` : 'Olá 👋';
    const msg = `${saudacao}, tudo bem?
Aqui é da *${empresaNome}*.
Segue sua *Proposta de Cotação* para o ${formData.marca} ${formData.modelo} 🚗

✔️ Proteção completa
✔️ Assistência 24h
✔️ Mensalidade: *${resultado ? formatCurrency(resultado.valorFinal) : ''}*

${pdfUrl ? `📄 Acesse o PDF:\n${pdfUrl}` : ''}

⏳ *Validade:* 7 dias

🤝 Conte com a gente!
_${empresaNome}_`;

    const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      navigator.clipboard?.writeText(url).then(() => {
        toast.info('Pop-up bloqueado. Link do WhatsApp copiado.');
      });
    } else {
      toast.success('Abrindo WhatsApp');
    }
  };


  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Gerar PDF
            </CardTitle>
            <CardDescription>Gere o PDF profissional da cotação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={onGeneratePdf} disabled={isGeneratingPdf} className="w-full" size="lg">
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : pdfBlob ? (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              {isGeneratingPdf ? 'Gerando...' : pdfBlob ? 'Regenerar PDF' : 'Gerar PDF'}
            </Button>
            {pdfBlob && (
              <div className="space-y-2">
                <Button onClick={handleDownload} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
                {pdfUrl && (
                  <Button onClick={handleCopyLink} variant="outline" className="w-full">
                    {linkCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {linkCopied ? 'Link Copiado!' : 'Copiar Link do PDF'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Enviar Proposta
            </CardTitle>
            <CardDescription>Envie por e-mail ou WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleSendEmail}
              disabled={!pdfBlob || isSendingEmail || !formData.cliente_email}
              variant="outline"
              className="w-full"
            >
              {isSendingEmail ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : emailSent ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {emailSent ? 'E-mail Enviado!' : `Enviar por E-mail${formData.cliente_email ? ` (${formData.cliente_email})` : ''}`}
            </Button>
            <Button
              onClick={handleWhatsApp}
              disabled={!formData.cliente_whatsapp}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar pelo WhatsApp
              {!pdfUrl && <span className="ml-1 text-xs opacity-80">(texto)</span>}
            </Button>
            {!pdfBlob && (
              <p className="text-xs text-muted-foreground text-center">
                Gere o PDF primeiro para enviar com anexo
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PDF URL */}
      {pdfUrl && (
        <Card className="border-primary/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <ExternalLink className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Link público do PDF</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{pdfUrl}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF is now generated inline in CotacaoWizard - no hidden div needed */}
    </div>
  );
}
