import { useState, type RefObject } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileDown, Mail, MessageCircle, Copy, Check, Loader2, Download, ExternalLink, CheckCircle2,
  Car, Truck, Shield, Key, Zap, Wrench, Fuel, Cloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/cotacaoUtils';
import type { ResultadoCotacao } from '@/lib/cotacaoUtils';
import { tipoBemLabels, type TipoBem } from '@/types/cotacao';
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
  pdfContentRef: RefObject<HTMLDivElement>;
  settings: SystemSettings;
}

export function WizardStep4Generate({
  formData, resultado, cotacaoId, pdfBlob, pdfUrl,
  isGeneratingPdf, onGeneratePdf, empresaNome, pdfContentRef, settings,
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

  const beneficios = [
    { titulo: 'Carro Reserva', sub: '30 dias inclusos', icon: Car },
    { titulo: 'Guincho', sub: '500 km', icon: Truck },
    { titulo: 'Vidros', sub: 'Para-brisa', icon: Shield },
    { titulo: 'Chaveiro', sub: '24 horas', icon: Key },
    { titulo: 'Pane Elétrica', sub: 'Assistência', icon: Zap },
    { titulo: 'Pane Mecânica', sub: 'Assistência', icon: Wrench },
    { titulo: 'Pane Seca', sub: 'Combustível', icon: Fuel },
    { titulo: 'Eventos Natureza', sub: 'Proteção completa', icon: Cloud },
  ];

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

      {/* Hidden PDF Content for html2pdf */}
      <div ref={pdfContentRef} className="fixed -left-[9999px] top-0" style={{ width: '210mm' }}>
        {resultado && (
          <div style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#333' }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #F97316, #22C55E)',
              padding: '40px 30px',
              textAlign: 'center',
              color: 'white',
            }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                🛡️ Proposta de Cotação
              </h1>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                {empresaNome} • Proteção Veicular
              </p>
            </div>

            {/* Vehicle + Values */}
            <div style={{ padding: '30px', display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '2px solid #F97316', paddingBottom: '8px', marginBottom: '16px' }}>
                  Dados do Veículo
                </h2>
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <tbody>
                    <tr><td style={{ padding: '6px 0', color: '#6b7280' }}>Tipo:</td><td style={{ fontWeight: 600, textAlign: 'right' }}>{formData.tipo_bem ? tipoBemLabels[formData.tipo_bem as TipoBem] : '—'}</td></tr>
                    <tr><td style={{ padding: '6px 0', color: '#6b7280' }}>Marca:</td><td style={{ fontWeight: 600, textAlign: 'right' }}>{formData.marca}</td></tr>
                    <tr><td style={{ padding: '6px 0', color: '#6b7280' }}>Modelo:</td><td style={{ fontWeight: 600, textAlign: 'right' }}>{formData.modelo}</td></tr>
                    <tr><td style={{ padding: '6px 0', color: '#6b7280' }}>Ano:</td><td style={{ fontWeight: 600, textAlign: 'right' }}>{formData.ano_fabricacao}{formData.ano_modelo ? `/${formData.ano_modelo}` : ''}</td></tr>
                    {formData.placa && <tr><td style={{ padding: '6px 0', color: '#6b7280' }}>Placa:</td><td style={{ fontWeight: 600, textAlign: 'right' }}>{formData.placa}</td></tr>}
                    {formData.chassi && <tr><td style={{ padding: '6px 0', color: '#6b7280' }}>Chassi:</td><td style={{ fontWeight: 600, textAlign: 'right', fontSize: '11px', fontFamily: 'monospace' }}>{formData.chassi}</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '2px solid #22C55E', paddingBottom: '8px', marginBottom: '16px' }}>
                  Valores
                </h2>
                <div style={{ background: 'linear-gradient(135deg, #F97316, #ea580c)', color: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.9, margin: '0 0 4px 0' }}>Mensalidade</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>{formatCurrency(resultado.valorFinal)}</p>
                </div>
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <tbody>
                    <tr><td style={{ padding: '4px 0', color: '#6b7280' }}>Cota:</td><td style={{ fontWeight: 600, textAlign: 'right' }}>{resultado.cotaNome}</td></tr>
                    <tr><td style={{ padding: '4px 0', color: '#6b7280' }}>Participação (7%):</td><td style={{ fontWeight: 600, textAlign: 'right' }}>{formatCurrency(resultado.participacao)}</td></tr>
                    <tr><td style={{ padding: '4px 0', color: '#6b7280' }}>Carro Reserva:</td><td style={{ fontWeight: 600, textAlign: 'right' }}>
                      {formData.carro_reserva_extra === 'nenhum' ? '30 dias' : formData.carro_reserva_extra === '30dias' ? '60 dias' : '120 dias'}
                    </td></tr>
                    <tr><td style={{ padding: '4px 0', color: '#6b7280' }}>Validade:</td><td style={{ fontWeight: 600, textAlign: 'right' }}>7 dias</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Client Data */}
            {formData.cliente_nome && (
              <div style={{ padding: '0 30px 20px' }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '2px solid #F97316', paddingBottom: '8px', marginBottom: '16px' }}>
                    Dados do Associado
                  </h2>
                  <table style={{ width: '100%', fontSize: '13px' }}>
                    <tbody>
                      <tr><td style={{ padding: '4px 0', color: '#6b7280' }}>Nome:</td><td style={{ fontWeight: 600 }}>{formData.cliente_nome}</td></tr>
                      {formData.cliente_cpf && <tr><td style={{ padding: '4px 0', color: '#6b7280' }}>CPF/CNPJ:</td><td style={{ fontWeight: 600 }}>{formData.cliente_cpf}</td></tr>}
                      {formData.cliente_email && <tr><td style={{ padding: '4px 0', color: '#6b7280' }}>E-mail:</td><td style={{ fontWeight: 600 }}>{formData.cliente_email}</td></tr>}
                      {formData.cliente_whatsapp && <tr><td style={{ padding: '4px 0', color: '#6b7280' }}>WhatsApp:</td><td style={{ fontWeight: 600 }}>{formData.cliente_whatsapp}</td></tr>}
                      {formData.cliente_endereco && <tr><td style={{ padding: '4px 0', color: '#6b7280' }}>Endereço:</td><td style={{ fontWeight: 600 }}>{formData.cliente_endereco}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div style={{ padding: '0 30px 20px' }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                  ✅ Benefícios Inclusos
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  {beneficios.map((b) => (
                    <div key={b.titulo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✔️</span>
                      <span><strong>{b.titulo}</strong> – {b.sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Terms */}
            <div style={{ padding: '0 30px 20px' }}>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                  Condições Importantes
                </h3>
                <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.6' }}>
                  Esta proposta tem validade de 7 dias. Os valores podem sofrer alteração conforme tabela FIPE vigente.
                  A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade.
                  Carência de 72h para todas as coberturas, exceto Furto/Roubo (imediato).
                </p>
              </div>
            </div>

            {/* Signature area */}
            <div style={{ padding: '0 30px 20px' }}>
              <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', paddingTop: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  {formData.assinatura_cliente ? (
                    <img src={formData.assinatura_cliente} alt="Assinatura" style={{ height: '60px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '200px', height: '60px', borderBottom: '2px solid #999' }} />
                  )}
                  <p style={{ fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>{formData.cliente_nome || 'Associado'}</p>
                  <p style={{ fontSize: '10px', color: '#999' }}>Associado</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '200px', height: '60px', borderBottom: '2px solid #999' }} />
                  <p style={{ fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>{empresaNome}</p>
                  <p style={{ fontSize: '10px', color: '#999' }}>Representante</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              background: 'linear-gradient(135deg, #F97316, #22C55E)',
              padding: '15px 30px',
              textAlign: 'center',
              color: 'white',
              fontSize: '11px',
            }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{empresaNome} • Proteção Veicular</p>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>
                Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
