import { Download, Play, FileText, Image as ImageIcon, ExternalLink, ArrowRight, QrCode, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface MediaItem {
  type: 'image' | 'video' | 'pdf';
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
}

export interface PixInfo {
  chavePix: string;
  tipoChave: string;
  valor: number;
}

// Componente de botão CTA para cotação
export function QuotationCTAButton({ className }: { className?: string }) {
  const handleClick = () => {
    // Scroll para o topo e iniciar cotação
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Disparar evento customizado para iniciar cotação
    window.dispatchEvent(new CustomEvent('start-quotation'));
  };

  return (
    <Button 
      onClick={handleClick}
      className={cn("w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold", className)}
    >
      Fazer minha cotação
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  );
}

interface ChatMediaMessageProps {
  media: MediaItem;
  className?: string;
}

export function ChatMediaMessage({ media, className }: ChatMediaMessageProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = media.url;
    link.download = media.title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpen = () => {
    window.open(media.url, '_blank');
  };

  return (
    <div className={cn("rounded-xl overflow-hidden border border-border bg-card", className)}>
      {/* Preview */}
      {media.type === 'image' && (
        <div className="relative group cursor-pointer" onClick={handleOpen}>
          <img 
            src={media.url} 
            alt={media.title}
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-white" />
          </div>
        </div>
      )}

      {media.type === 'video' && (
        <div className="relative group cursor-pointer" onClick={handleOpen}>
          <div className="w-full h-32 bg-muted flex items-center justify-center">
            {media.thumbnail ? (
              <img src={media.thumbnail} alt={media.title} className="w-full h-full object-cover" />
            ) : (
              <Play className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="h-10 w-10 text-white fill-white" />
          </div>
        </div>
      )}

      {media.type === 'pdf' && (
        <div 
          className="w-full h-24 bg-muted flex items-center justify-center gap-3 cursor-pointer hover:bg-muted/80 transition-colors"
          onClick={handleOpen}
        >
          <FileText className="h-10 w-10 text-destructive" />
          <span className="text-xs text-muted-foreground uppercase font-medium">PDF</span>
        </div>
      )}

      {/* Info + Actions */}
      <div className="p-2.5 space-y-2">
        <div>
          <p className="text-xs font-medium truncate">{media.title}</p>
          {media.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-2">{media.description}</p>
          )}
        </div>
        
        <div className="flex gap-1.5">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-[10px]"
            onClick={handleOpen}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Abrir
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1 h-7 text-[10px]"
            onClick={handleDownload}
          >
            <Download className="h-3 w-3 mr-1" />
            Baixar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Parse media tags from message content
export function parseMediaFromContent(content: string): { 
  text: string; 
  media: MediaItem[]; 
  hasQuotationLink: boolean; 
  hasCertidaoLink: boolean;
  hasVistoriaLink: boolean;
  vistoriaUrl?: string;
  pixInfo?: PixInfo;
  cadastroInfo?: { email: string; senha: string };
} {
  const mediaRegex = /\[MEDIA:(\w+)\|(.*?)\|(.*?)(?:\|(.*?))?\]/g;
  const media: MediaItem[] = [];
  
  let match;
  while ((match = mediaRegex.exec(content)) !== null) {
    const [, type, url, title, description] = match;
    if (type === 'image' || type === 'video' || type === 'pdf') {
      media.push({
        type: type as 'image' | 'video' | 'pdf',
        url,
        title,
        description: description || undefined,
      });
    }
  }
  
  // Check for quotation link
  const hasQuotationLink = content.includes('[LINK_COTACAO]');
  
  // Check for certidao SUSEP link
  const hasCertidaoLink = content.includes('[LINK_CERTIDAO_SUSEP]');
  
  // Check for vistoria link
  const hasVistoriaLink = content.includes('[LINK_VISTORIA]');
  
  // Extract vistoria URL from CADASTRO_CRIADO
  let vistoriaUrl: string | undefined;
  const vistoriaUrlMatch = content.match(/VistoriaURL:\s*(https?:\/\/[^\s\]|]+)/);
  if (vistoriaUrlMatch) {
    vistoriaUrl = vistoriaUrlMatch[1].trim();
    if (vistoriaUrl === 'N/A') vistoriaUrl = undefined;
  }
  
  // Check for PIX link and extract info
  let pixInfo: PixInfo | undefined;
  const pixMatch = content.match(/\[LINK_PIX_ADESAO\]/);
  if (pixMatch) {
    // Try to extract PIX details from CADASTRO_CRIADO message in conversation
    const cadastroMatch = content.match(/ChavePIX:\s*([^|]+)\s*\|\s*TipoChave:\s*([^|]+)\s*\|\s*Taxa de Adesão:\s*R\$\s*([\d,.]+)/);
    if (cadastroMatch) {
      pixInfo = {
        chavePix: cadastroMatch[1].trim(),
        tipoChave: cadastroMatch[2].trim(),
        valor: parseFloat(cadastroMatch[3].replace(',', '.'))
      };
    } else {
      // Default PIX info
      pixInfo = {
        chavePix: '',
        tipoChave: 'CPF',
        valor: 50
      };
    }
  }
  
  // Check for cadastro info
  let cadastroInfo: { email: string; senha: string } | undefined;
  const emailMatch = content.match(/Email:\s*([^\s\n]+)/);
  const senhaMatch = content.match(/Senha:\s*([^\s\n]+)/);
  if (emailMatch && senhaMatch) {
    cadastroInfo = {
      email: emailMatch[1],
      senha: senhaMatch[1]
    };
  }
  
  // Remove media tags and special links from text
  let text = content
    .replace(mediaRegex, '')
    .replace(/\[LINK_COTACAO\]/g, '')
    .replace(/\[LINK_CERTIDAO_SUSEP\]/g, '')
    .replace(/\[LINK_PIX_ADESAO\]/g, '')
    .replace(/\[LINK_VISTORIA\]/g, '')
    .replace(/\[CADASTRO_CRIADO:[^\]]+\]/g, '')
    .replace(/\[LEAD_SALVO:[^\]]+\]/g, '')
    .replace(/\[DADOS_VEICULO:[^\]]+\]/g, '')
    .replace(/\[ENDERECO_CEP:[^\]]+\]/g, '')
    .replace(/\[CPF_VALIDO:[^\]]+\]/g, '')
    .replace(/\[CPF_INVALIDO:[^\]]+\]/g, '')
    .replace(/\[ERRO_[^\]]+\]/g, '')
    .trim();
  
  return { text, media, hasQuotationLink, hasCertidaoLink, hasVistoriaLink, vistoriaUrl, pixInfo, cadastroInfo };
}

// Componente de botão para baixar Certidão SUSEP
export function CertidaoSUSEPButton({ className }: { className?: string }) {
  const handleClick = () => {
    window.open('/documentos/certidao-susep.pdf', '_blank');
  };

  return (
    <Button 
      onClick={handleClick}
      variant="outline"
      className={cn("w-full border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground font-semibold", className)}
    >
      <FileText className="mr-2 h-4 w-4" />
      Ver Certidão SUSEP
    </Button>
  );
}

// Componente de botão PIX para adesão
export function PixAdesaoButton({ pixInfo, className }: { pixInfo?: PixInfo; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    if (pixInfo?.chavePix) {
      await navigator.clipboard.writeText(pixInfo.chavePix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn("rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2", className)}>
      <div className="flex items-center gap-2 text-primary">
        <QrCode className="h-5 w-5" />
        <span className="font-semibold text-sm">Pagamento via PIX</span>
      </div>
      
      <div className="text-2xl font-bold text-primary">
        R$ {pixInfo?.valor?.toFixed(2).replace('.', ',') || '50,00'}
      </div>
      
      {pixInfo?.chavePix && pixInfo.chavePix !== 'não configurada' ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Chave PIX ({pixInfo.tipoChave}):
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background rounded px-2 py-1.5 truncate border">
              {pixInfo.chavePix}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Entre em contato para receber a chave PIX
        </p>
      )}
      
      <p className="text-[10px] text-muted-foreground mt-2">
        ⚡ Após pagamento, sua proteção é ativada em até 24h
      </p>
    </div>
  );
}

// Componente de botão para vistoria
export function VistoriaButton({ url, className }: { url: string; className?: string }) {
  const handleClick = () => {
    window.open(url, '_blank');
  };

  return (
    <div className={cn("rounded-xl border border-secondary/30 bg-secondary/5 p-3 space-y-2", className)}>
      <div className="flex items-center gap-2 text-secondary">
        <ImageIcon className="h-5 w-5" />
        <span className="font-semibold text-sm">Vistoria do Veículo</span>
      </div>
      
      <p className="text-xs text-muted-foreground">
        📸 Tire fotos do seu veículo para completar o cadastro
      </p>
      
      <Button 
        onClick={handleClick}
        className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
        size="sm"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Fazer Vistoria Agora
      </Button>
      
      <p className="text-[10px] text-muted-foreground">
        ⏰ Link válido por 7 dias
      </p>
    </div>
  );
}

// Componente para mostrar dados de acesso
export function AccessDataCard({ email, senha, className }: { email: string; senha: string; className?: string }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSenha, setCopiedSenha] = useState(false);
  
  const handleCopy = async (text: string, type: 'email' | 'senha') => {
    await navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedSenha(true);
      setTimeout(() => setCopiedSenha(false), 2000);
    }
  };

  return (
    <div className={cn("rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2", className)}>
      <div className="flex items-center gap-2 text-primary">
        <Check className="h-5 w-5" />
        <span className="font-semibold text-sm">Seus dados de acesso</span>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Email:</span>
          <code className="flex-1 text-xs bg-background rounded px-2 py-1 truncate border">
            {email}
          </code>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => handleCopy(email, 'email')}
          >
            {copiedEmail ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Senha:</span>
          <code className="flex-1 text-xs bg-background rounded px-2 py-1 truncate border font-mono">
            {senha}
          </code>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => handleCopy(senha, 'senha')}
          >
            {copiedSenha ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      
      <p className="text-[10px] text-muted-foreground">
        📧 Guarde esses dados! Você pode alterar a senha depois.
      </p>
    </div>
  );
}
