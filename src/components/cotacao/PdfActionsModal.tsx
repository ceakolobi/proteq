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
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
    // Remove tudo exceto dígitos
    let digits = numero.replace(/\D/g, "");
    
    // Se não começar com 55, adiciona o código do Brasil
    if (!digits.startsWith("55") && digits.length <= 11) {
      digits = "55" + digits;
    }
    
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
    const saudacao = clienteNome ? `Olá ${clienteNome} 👋` : "Olá 👋";
    
    const mensagem = `${saudacao}, tudo bem?
Aqui é da *Harmony Agro*.
Segue sua *Proposta de Cotação* preparada especialmente para o seu veículo 🚗🚜🚚

✔️ Proteção completa
✔️ Assistência 24h
✔️ Coberturas reais e objetivas
✔️ Mensalidade acessível

📄 ${pdfUrl ? `Acesse o PDF com todos os detalhes:\n${pdfUrl}` : "Estou lhe enviando o PDF com todos os detalhes."}

Qualquer dúvida estou à disposição 🙏

⏳ *Validade da proposta:* ${validadeDias} dias

🤝 Conte com a gente!
_Harmony Agro - Proteção Veicular_`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${numeroFormatado}&text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, "_blank");

    toast({
      title: "WhatsApp Web aberto",
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

    setIsSendingEmail(true);

    try {
      let pdfBase64: string | undefined;
      
      // Converter PDF para base64 se disponível
      if (pdfBlob) {
        pdfBase64 = await blobToBase64(pdfBlob);
      }

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

      if (error) {
        throw error;
      }

      toast({
        title: "E-mail enviado com sucesso!",
        description: `Proposta enviada para ${emailDestinatario}`,
      });
    } catch (error: any) {
      console.error("Erro ao enviar e-mail:", error);
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message || "Tente novamente ou use outro método.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
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

            {/* Copiar Link */}
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full justify-start"
              disabled={!pdfUrl}
            >
              {isCopied ? (
                <Check className="w-4 h-4 mr-2 text-harmony-green" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {isCopied ? "Link Copiado!" : "Copiar Link do PDF"}
            </Button>

            {/* WhatsApp */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="whatsappNumero" className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                Enviar no WhatsApp
              </Label>
              <div className="flex gap-2">
                <Input
                  id="whatsappNumero"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={whatsappNumero}
                  onChange={(e) => {
                    // Formatar telefone
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 11) {
                      const formatted = value
                        .replace(/(\d{2})(\d)/, "($1) $2")
                        .replace(/(\d{5})(\d)/, "$1-$2");
                      setWhatsappNumero(formatted);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleWhatsApp}
                  className="bg-green-600 hover:bg-green-700 text-white px-4"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Abre o WhatsApp Web com a mensagem e link do PDF
              </p>
            </div>

            {/* E-mail */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="emailDestinatario" className="text-sm">
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
