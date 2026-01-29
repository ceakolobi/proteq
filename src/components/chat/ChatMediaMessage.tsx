import { Download, Play, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MediaItem {
  type: 'image' | 'video' | 'pdf';
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
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
export function parseMediaFromContent(content: string): { text: string; media: MediaItem[] } {
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
  
  // Remove media tags from text
  const text = content.replace(mediaRegex, '').trim();
  
  return { text, media };
}
