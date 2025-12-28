import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, CheckCircle, Loader2, Upload, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';

export interface ChecklistItem {
  key: string;
  label: string;
  photoUrl?: string;
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'frente', label: 'Foto Frente' },
  { key: 'traseira', label: 'Foto Traseira' },
  { key: 'lateral_direita', label: 'Foto Lado Direito' },
  { key: 'lateral_esquerda', label: 'Foto Lado Esquerdo' },
  { key: 'interior', label: 'Interior' },
  { key: 'painel_km', label: 'Painel / KM' },
  { key: 'motor', label: 'Motor' },
  { key: 'chassi_etiqueta', label: 'Chassi / Etiqueta' },
];

interface ChecklistPhotos {
  [key: string]: string; // key: photoUrl
}

interface VistoriaChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  vistoriaId: string;
  vistoriaStatus: string;
  existingPhotos: ChecklistPhotos;
  existingChecklist: Record<string, boolean>;
  canEdit: boolean;
  onSave: () => void;
}

export default function VistoriaChecklist({
  isOpen,
  onClose,
  vistoriaId,
  vistoriaStatus,
  existingPhotos,
  existingChecklist,
  canEdit,
  onSave,
}: VistoriaChecklistProps) {
  const [photos, setPhotos] = useState<ChecklistPhotos>(existingPhotos || {});
  const [uploading, setUploading] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditable = canEdit && vistoriaStatus === 'em_andamento';

  const handleFileUpload = async (key: string, file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(key);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vistoriaId}/${key}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vistoria-fotos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('vistoria-fotos')
        .getPublicUrl(fileName);

      setPhotos(prev => ({
        ...prev,
        [key]: urlData.publicUrl,
      }));

      toast.success(`Foto ${CHECKLIST_ITEMS.find(i => i.key === key)?.label} enviada`);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(null);
    }
  };

  const handleRemovePhoto = async (key: string) => {
    try {
      // Extract the file path from the URL
      const url = photos[key];
      if (url) {
        const path = url.split('/vistoria-fotos/')[1];
        if (path) {
          await supabase.storage.from('vistoria-fotos').remove([path]);
        }
      }

      setPhotos(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });

      toast.success('Foto removida');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Erro ao remover foto');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build checklist from photos
      const checklist: Record<string, boolean> = {};
      CHECKLIST_ITEMS.forEach(item => {
        checklist[item.key] = !!photos[item.key];
      });

      // Get all photo URLs as array
      const fotos = Object.values(photos).filter(Boolean);

      const { error } = await supabase
        .from('vistorias')
        .update({
          checklist,
          fotos,
        })
        .eq('id', vistoriaId);

      if (error) throw error;

      toast.success('Checklist salvo com sucesso!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Erro ao salvar checklist');
    } finally {
      setIsSaving(false);
    }
  };

  const completedCount = Object.keys(photos).filter(k => photos[k]).length;
  const isComplete = completedCount === CHECKLIST_ITEMS.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Checklist de Vistoria
          </DialogTitle>
          <DialogDescription>
            {isEditable ? (
              'Faça upload das fotos obrigatórias para cada item do checklist'
            ) : vistoriaStatus !== 'em_andamento' ? (
              <span className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                O checklist só pode ser preenchido quando o status for "Em andamento"
              </span>
            ) : !canEdit ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                Somente o vistoriador atribuído pode preencher o checklist
              </span>
            ) : (
              'Visualização do checklist'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress indicator */}
          <div className="mb-6 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso do Checklist</span>
              <span className={`text-sm font-medium ${isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>
                {completedCount}/{CHECKLIST_ITEMS.length}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Checklist items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CHECKLIST_ITEMS.map((item) => {
              const hasPhoto = !!photos[item.key];
              const isUploading = uploading === item.key;

              return (
                <div
                  key={item.key}
                  className={`relative border rounded-lg p-4 transition-colors ${
                    hasPhoto ? 'border-green-300 bg-green-50/50' : 'border-dashed border-muted-foreground/30'
                  }`}
                >
                  <Label className="flex items-center gap-2 mb-3 font-medium">
                    {hasPhoto ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    )}
                    {item.label}
                    {!hasPhoto && <span className="text-destructive text-xs">*</span>}
                  </Label>

                  {hasPhoto ? (
                    <div className="relative group">
                      <img
                        src={photos[item.key]}
                        alt={item.label}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      {isEditable && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemovePhoto(item.key)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      {isEditable ? (
                        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted-foreground/30 rounded-md cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(item.key, file);
                            }}
                            disabled={isUploading}
                          />
                          {isUploading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                              <span className="text-xs text-muted-foreground">Clique para enviar</span>
                            </>
                          )}
                        </label>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted-foreground/30 rounded-md bg-muted/20">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                          <span className="text-xs text-muted-foreground">Sem foto</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isComplete && isEditable && (
            <div className="mt-4 p-3 border border-amber-200 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Todas as fotos são obrigatórias para aprovar/reprovar a vistoria.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isEditable ? 'Cancelar' : 'Fechar'}
          </Button>
          {isEditable && (
            <Button onClick={handleSave} disabled={isSaving || uploading !== null}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Checklist
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Utility function to check if checklist is complete
export function isChecklistComplete(checklist: Record<string, boolean> | null): boolean {
  if (!checklist) return false;
  return CHECKLIST_ITEMS.every(item => checklist[item.key] === true);
}

// Utility function to convert fotos array to ChecklistPhotos object
export function fotosArrayToObject(fotos: string[] | null, vistoriaId: string): Record<string, string> {
  if (!fotos || fotos.length === 0) return {};
  
  const result: Record<string, string> = {};
  
  fotos.forEach(url => {
    // Try to extract the key from the URL
    const match = url.match(/\/([a-z_]+)_\d+\.[a-z]+$/i);
    if (match) {
      const key = match[1];
      if (CHECKLIST_ITEMS.some(item => item.key === key)) {
        result[key] = url;
      }
    }
  });
  
  return result;
}
