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
}

export const PdfActionsModal = ({
  isOpen,
  onClose,
  pdfBlob,
  pdfUrl,
  filename,
  clienteNome = "",
  clienteEmail = "",
}: PdfActionsModalProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailDestinatario, setEmailDestinatario] = useState(clienteEmail);

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

  // Abrir WhatsApp Web com link
  const handleWhatsApp = () => {
    const mensagem = pdfUrl
      ? `Olá${clienteNome ? ` ${clienteNome}` : ""}! Segue a proposta de proteção veicular Harmony Agro:\n\n${pdfUrl}`
      : `Olá${clienteNome ? ` ${clienteNome}` : ""}! Segue a proposta de proteção veicular Harmony Agro.`;

    const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, "_blank");

    toast({
      title: "WhatsApp Web aberto",
      description: "Selecione o contato para enviar a proposta.",
    });
  };

  // Enviar por e-mail (placeholder - requer edge function)
  const handleSendEmail = async () => {
    if (!emailDestinatario) {
      toast({
        title: "E-mail obrigatório",
        description: "Digite o e-mail do destinatário.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      // Por enquanto, abre o cliente de e-mail padrão
      const assunto = `Proposta de Proteção Veicular - Harmony Agro`;
      const corpo = pdfUrl
        ? `Olá${clienteNome ? ` ${clienteNome}` : ""},\n\nSegue a proposta de proteção veicular Harmony Agro.\n\nAcesse o PDF em: ${pdfUrl}\n\nAtenciosamente,\nHarmony Agro`
        : `Olá${clienteNome ? ` ${clienteNome}` : ""},\n\nSegue a proposta de proteção veicular Harmony Agro.\n\nAtenciosamente,\nHarmony Agro`;

      const mailtoUrl = `mailto:${emailDestinatario}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
      window.location.href = mailtoUrl;

      toast({
        title: "Cliente de e-mail aberto",
        description: "Complete o envio no seu aplicativo de e-mail.",
      });
    } catch (error) {
      console.error("Erro ao enviar e-mail:", error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente.",
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
            <Button
              onClick={handleWhatsApp}
              variant="outline"
              className="w-full justify-start border-green-500 text-green-600 hover:bg-green-50"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar via WhatsApp
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </Button>

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
