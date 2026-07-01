import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Copy,
  Mail,
  MessageCircle,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BENEFICIOS_WHATSAPP } from "@/constants/beneficios";

interface PdfActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  pdfUrl: string | null;
  filename: string;
  clienteNome?: string;
  clienteEmail?: string;
  clienteWhatsapp?: string;
  validadeDias?: number;
  modelo?: string;
  mensalidade?: string;
  cotacaoId?: string;
  empresaNome?: string;
  beneficiosExtras?: { nome_snapshot: string; valor_snapshot: number }[];
  placa?: string;
  valorAdesao?: number;
  participacao?: number;
  valorFipe?: number;
  percentualParticipacao?: number;
  marcaAno?: string;
  mensalidadeBase?: number;
  mensalidadeTotal?: number;
  aceiteToken?: string;
}

export const PdfActionsModal = ({
  isOpen,
  onClose,
  pdfBlob,
  pdfUrl,
  filename,
  clienteNome = "",
  clienteEmail = "",
  clienteWhatsapp = "",
  validadeDias = 7,
  modelo = "",
  mensalidade = "",
  cotacaoId,
  empresaNome = "Harmony Clube de Benefícios",
  beneficiosExtras = [],
  placa,
  valorAdesao,
  participacao,
  valorFipe,
  percentualParticipacao = 7,
  marcaAno,
  mensalidadeBase,
  mensalidadeTotal,
  aceiteToken,
}: PdfActionsModalProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailDestinatario, setEmailDestinatario] = useState(clienteEmail);
  const [whatsappNumero, setWhatsappNumero] = useState(clienteWhatsapp);

  // Baixar PDF localmente
  const handleDownload = () => {
    if (!pdfBlob) {
      toast({
        title: "PDF não disponível",
        description: "Gere o PDF novamente.",
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download iniciado!",
      description: filename,
    });
  };

  // Copiar link do PDF
  const handleCopyLink = async () => {
    if (!pdfUrl) {
      toast({
        title: "Link não disponível",
        description: "O PDF precisa ser salvo na nuvem primeiro.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(pdfUrl);
      setIsCopied(true);
      toast({
        title: "Link copiado!",
        description: "Cole em qualquer lugar para compartilhar.",
      });
      setTimeout(() => setIsCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Tente copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  // Formatar número para WhatsApp (apenas dígitos, com código do país)
  const formatWhatsappNumber = (numero: string): string => {
    let digits = numero.replace(/\D/g, '');
    digits = digits.replace(/^0+/, '');
    if (!digits.startsWith('55')) digits = '55' + digits;
    return digits;
  };

  // Abrir WhatsApp Web com número e mensagem
  const handleWhatsApp = () => {
    if (!whatsappNumero || whatsappNumero.replace(/\D/g, "").length < 10) {
      toast({
        title: "WhatsApp não informado",
        description: "Informe o WhatsApp do cliente para enviar a cotação.",
        variant: "destructive",
      });
      return;
    }

    const numeroFormatado = formatWhatsappNumber(whatsappNumero);
    const nomePrimeiro = (clienteNome || '').split(' ')[0] || 'cliente';
    const formatBRL = (v: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const veiculoDesc = marcaAno || modelo;
    const totalExtras = beneficiosExtras.reduce((s, b) => s + b.valor_snapshot, 0);
    const totalMensalidade = (mensalidadeTotal ?? mensalidadeBase ?? 0) + totalExtras;

    const cotaParticipacaoStr = valorFipe != null && valorFipe > 0
      ? `\n📋 Cota de participação: ${percentualParticipacao}% · ${formatBRL(valorFipe * (percentualParticipacao / 100))} (FIPE: ${formatBRL(valorFipe)})`
      : '';

    const extrasSecao = beneficiosExtras.length > 0
      ? `\n\n✨ *Benefícios Extras*\n${beneficiosExtras.map(b => `- ${b.nome_snapshot}`).join('\n')}`
      : '';

    const mensagem = `🛡 HARMONY CLUBE DE BENEFÍCIOS
Olá, ${nomePrimeiro}! 😊
Segue sua proposta de proteção veicular:
🚗 Veículo: ${veiculoDesc}
💰 Mensalidade: ${formatBRL(totalMensalidade)}${cotaParticipacaoStr}

${BENEFICIOS_WHATSAPP}${extrasSecao}

⏳ Proposta válida por ${validadeDias} dias.
🤝 Harmony Clube de Benefícios — Proteção Veicular`;

    const whatsappUrl = `https://wa.me/${numeroFormatado}?text=${encodeURIComponent(mensagem)}`;
    const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    if (!opened) {
      navigator.clipboard
        ?.writeText(whatsappUrl)
        .then(() => {
          toast({
            title: "Pop-up bloqueado",
            description: "Link do WhatsApp copiado. Cole no navegador para abrir.",
          });
        })
        .catch(() => {
          toast({
            title: "Pop-up bloqueado",
            description: "Permita pop-ups ou copie o link manualmente.",
            variant: "destructive",
          });
        });
      return;
    }

    toast({
      title: "Abrindo WhatsApp",
      description: `Enviando para ${whatsappNumero}`,
    });
  };

  // Converter Blob para Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove o prefixo "data:application/pdf;base64,"
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Extrair erro retornado pela Function (quando status != 2xx)
  const extractFunctionErrorBody = (err: any): any | null => {
    const body = err?.context?.body;
    if (!body) return null;

    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        return { error: body };
      }
    }

    if (typeof body === "object") return body;
    return null;
  };

  // Enviar por e-mail via edge function
  const handleSendEmail = async () => {
    if (!emailDestinatario) {
      toast({
        title: "E-mail não informado",
        description: "Informe o e-mail do cliente para enviar a proposta.",
        variant: "destructive",
      });
      return;
    }

    // Validar se tem PDF
    if (!pdfBlob) {
      toast({
        title: "PDF não disponível",
        description: "Gere o PDF novamente antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      // Converter PDF para base64
      const pdfBase64 = await blobToBase64(pdfBlob);

      const { data, error } = await supabase.functions.invoke("send-proposta-email", {
        body: {
          to: emailDestinatario,
          clienteNome,
          modelo,
          mensalidade,
          validadeDias,
          pdfUrl,
          pdfBase64,
          filename,
        },
      });

      // Quando a Function retorna status != 2xx, o SDK preenche `error`.
      if (error) {
        const body = extractFunctionErrorBody(error);
        const errorMessage = body?.error || body?.message || error.message || "Erro desconhecido";
        const errorType = body?.errorType || "desconhecido";

        let description = errorMessage;
        if (errorType === "api_key") {
          description = "Erro de configuração do serviço de e-mail. Entre em contato com o suporte.";
        } else if (errorType === "remetente") {
          description = errorMessage;
        } else if (errorType === "destinatario") {
          description = "E-mail do destinatário inválido ou não permitido.";
        } else if (errorType === "pdf") {
          description = "Erro ao processar o PDF. Tente gerar novamente.";
        }

        toast({
          title: "Erro ao enviar e-mail",
          description,
          variant: "destructive",
        });
        return;
      }

      // Verificar resposta da Edge Function (fallback)
      if (data && !data.success) {
        const errorMessage = data.error || "Erro desconhecido";
        const errorType = data.errorType || "desconhecido";

        let description = errorMessage;
        if (errorType === "api_key") {
          description = "Erro de configuração do serviço de e-mail. Entre em contato com o suporte.";
        } else if (errorType === "remetente") {
          description = errorMessage;
        } else if (errorType === "destinatario") {
          description = "E-mail do destinatário inválido ou não permitido.";
        } else if (errorType === "pdf") {
          description = "Erro ao processar o PDF. Tente gerar novamente.";
        }

        toast({
          title: "Erro ao enviar e-mail",
          description,
          variant: "destructive",
        });
        return;
      }

      // Registrar envio no histórico da cotação
      if (cotacaoId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await supabase
          .from("cotacoes")
          .update({
            proposta_enviada_em: new Date().toISOString(),
            proposta_enviada_por: user?.id,
          })
          .eq("id", cotacaoId);
      }

      toast({
        title: "E-mail enviado com sucesso!",
        description: `Proposta enviada para ${emailDestinatario}`,
      });
    } catch (error: any) {
      console.error("Erro ao enviar e-mail:", error);

      const body = extractFunctionErrorBody(error);
      const msg = body?.error || body?.message || error.message || "Tente novamente ou use outro método.";

      toast({
        title: "Erro ao enviar e-mail",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-harmony-green" />
            PDF Gerado com Sucesso!
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja compartilhar a proposta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome do arquivo */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Arquivo:</p>
            <p className="text-sm font-mono truncate">{filename}</p>
          </div>

          {/* Botões de ação */}
          <div className="grid gap-3">
            {/* Baixar PDF */}
            <Button
              onClick={handleDownload}
              className="w-full justify-start bg-harmony-green hover:bg-harmony-green/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>

            {/* Copiar Link (opcional, discreto) */}
            {pdfUrl && (
              <Button
                onClick={handleCopyLink}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
              >
                {isCopied ? (
                  <Check className="w-4 h-4 mr-2 text-harmony-green" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {isCopied ? "Link copiado!" : "Copiar link do PDF (opcional)"}
              </Button>
            )}


            {/* WhatsApp */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="whatsappNumero" className="text-sm font-semibold">
                Enviar por WhatsApp
              </Label>
              <div className="flex gap-2">
                <Input
                  id="whatsappNumero"
                  type="tel"
                  placeholder="(00) 90000-0000"
                  value={whatsappNumero}
                  onChange={(e) => setWhatsappNumero(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleWhatsApp}
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                  title="Enviar por WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* E-mail */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="emailDestinatario" className="text-sm font-semibold">
                Enviar por E-mail
              </Label>
              <div className="flex gap-2">
                <Input
                  id="emailDestinatario"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={emailDestinatario}
                  onChange={(e) => setEmailDestinatario(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  variant="outline"
                  className="border-harmony-orange text-harmony-orange hover:bg-harmony-orange/10"
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Info sobre integração futura */}
          {!pdfUrl && (
            <p className="text-xs text-muted-foreground text-center">
              O link de compartilhamento estará disponível após upload na nuvem.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
