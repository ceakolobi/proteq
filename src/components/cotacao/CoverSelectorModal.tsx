import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Image, ImageOff } from "lucide-react";

export interface CoverOption {
  index: number;
  url: string | null;
  label: string;
}

interface CoverSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCover: (coverUrl: string) => void;
  covers: CoverOption[];
  defaultCoverPreview?: React.ReactNode;
}

export function CoverSelectorModal({
  isOpen,
  onClose,
  onSelectCover,
  covers,
  defaultCoverPreview,
}: CoverSelectorModalProps) {
  const availableCovers = covers.filter((c) => c.url !== null);
  const hasCovers = availableCovers.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Escolha a Capa da Proposta
          </DialogTitle>
          <DialogDescription>
            Selecione qual capa deseja usar nesta proposta. A capa aparecerá como primeira página do PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
          {covers.map((cover) => (
            <button
              key={cover.index}
              disabled={!cover.url}
              onClick={() => cover.url && onSelectCover(cover.url)}
              className={cn(
                "relative aspect-[210/297] rounded-lg overflow-hidden border-2 transition-all",
                cover.url
                  ? "border-border hover:border-primary hover:ring-2 hover:ring-primary/20 cursor-pointer"
                  : "border-dashed border-muted-foreground/30 opacity-50 cursor-not-allowed"
              )}
            >
              {cover.url ? (
                <img
                  src={cover.url}
                  alt={cover.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground p-2">
                  <ImageOff className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-xs text-center">Não configurada</span>
                </div>
              )}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 py-1.5 px-2 text-sm font-medium",
                cover.url 
                  ? "bg-black/70 text-white" 
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {cover.label}
              </div>
            </button>
          ))}
        </div>

        {!hasCovers && defaultCoverPreview && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground mb-3">
              Nenhuma capa personalizada configurada. Será usada a capa padrão:
            </p>
            <div className="aspect-[210/297] max-w-[200px] mx-auto rounded-lg overflow-hidden border">
              {defaultCoverPreview}
            </div>
            <Button className="mt-4 w-full" onClick={onClose}>
              Continuar com Capa Padrão
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
