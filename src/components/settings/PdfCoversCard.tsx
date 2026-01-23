import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";

type CoverField = "cover_1" | "cover_2" | "cover_3" | "cover_4";

interface PdfCoversCardProps {
  settings: {
    cover_1: string | null;
    cover_2: string | null;
    cover_3: string | null;
    cover_4: string | null;
  };
  coverMode: string;
  coverFixedIndex: number;
  onChangeCoverMode: (mode: string) => void;
  onChangeCoverFixedIndex: (index: number) => void;
  uploadImage: (file: File, type: CoverField) => Promise<string | null>;
  updateSettings: (updates: Partial<Record<CoverField, string | null>> & Record<string, unknown>) => Promise<boolean>;
}

const COVER_FIELDS: CoverField[] = ["cover_1", "cover_2", "cover_3", "cover_4"];

function coverLabel(field: CoverField) {
  const idx = COVER_FIELDS.indexOf(field) + 1;
  return `Capa ${idx}`;
}

export function PdfCoversCard({
  settings,
  coverMode,
  coverFixedIndex,
  onChangeCoverMode,
  onChangeCoverFixedIndex,
  uploadImage,
  updateSettings,
}: PdfCoversCardProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const [uploadingField, setUploadingField] = useState<CoverField | "add" | null>(null);

  const nextEmptyField = useMemo(() => {
    return COVER_FIELDS.find((f) => !settings[f]) ?? null;
  }, [settings.cover_1, settings.cover_2, settings.cover_3, settings.cover_4]);

  const handleUploadToField = async (field: CoverField, file: File) => {
    setUploadingField(field);
    try {
      const url = await uploadImage(file, field);
      if (url) {
        await updateSettings({ [field]: url } as any);
      }
    } finally {
      setUploadingField(null);
    }
  };

  const handleReplaceField = (field: CoverField) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await handleUploadToField(field, file);
    };
    input.click();
  };

  const handleClearField = async (field: CoverField) => {
    const ok = confirm(`Remover ${coverLabel(field)}?`);
    if (!ok) return;
    await updateSettings({ [field]: null } as any);
  };

  const handleAddCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!nextEmptyField) return;

    setUploadingField("add");
    try {
      await handleUploadToField(nextEmptyField, file);
    } finally {
      setUploadingField(null);
      if (addInputRef.current) addInputRef.current.value = "";
    }
  };

  const fixedIndexOptions = useMemo(() => {
    return COVER_FIELDS.map((f, i) => ({ value: i + 1, label: coverLabel(f) }));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Capas do PDF
        </CardTitle>
        <CardDescription>
          Configure até 4 capas e mantenha sempre um card em branco para adicionar a próxima
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="cover_mode">Modo de Exibição</Label>
          <select
            id="cover_mode"
            value={coverMode}
            onChange={(e) => onChangeCoverMode(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
          >
            <option value="fixed">Capa Fixa (selecionar qual)</option>
            <option value="select">Escolher na Geração</option>
            <option value="random">Aleatória entre as cadastradas</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {coverMode === "fixed" && "Usa sempre a capa selecionada abaixo"}
            {coverMode === "select" && "Permite escolher qual capa usar ao gerar o PDF"}
            {coverMode === "random" && "Seleciona aleatoriamente entre as capas cadastradas"}
          </p>
        </div>

        {coverMode === "fixed" && (
          <div className="space-y-2">
            <Label htmlFor="cover_fixed_index">Capa Fixa Selecionada</Label>
            <select
              id="cover_fixed_index"
              value={coverFixedIndex}
              onChange={(e) => onChangeCoverFixedIndex(Number(e.target.value))}
              className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
            >
              {fixedIndexOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <Label>Capas</Label>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COVER_FIELDS.map((field) => {
              const url = settings[field];
              const isUploading = uploadingField === field;

              return (
                <div key={field} className="space-y-2">
                  <div className="relative group">
                    <div className="aspect-[210/297] w-full border-2 rounded-lg overflow-hidden bg-muted">
                      {url ? (
                        <img src={url} alt={coverLabel(field)} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {isUploading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <span className="text-xs">Não configurada</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleReplaceField(field)}
                        disabled={isUploading}
                        aria-label={`Enviar ${coverLabel(field)}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleClearField(field)}
                        disabled={isUploading || !url}
                        aria-label={`Remover ${coverLabel(field)}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-center text-muted-foreground">{coverLabel(field)}</div>
                </div>
              );
            })}

            {/* Card extra: sempre em branco para adicionar a próxima capa */}
            <div className="space-y-2">
              <div className="relative group">
                <input
                  ref={addInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAddCoverChange}
                  className="hidden"
                />

                <div
                  className="aspect-[210/297] w-full border-2 border-dashed rounded-lg overflow-hidden bg-muted flex items-center justify-center"
                >
                  {uploadingField === "add" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {nextEmptyField ? "Adicionar nova capa" : "Limite de 4 capas"}
                    </span>
                  )}
                </div>

                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addInputRef.current?.click()}
                    disabled={!nextEmptyField || uploadingField === "add"}
                    aria-label="Adicionar capa"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => nextEmptyField && handleClearField(nextEmptyField)}
                    disabled={!nextEmptyField || uploadingField === "add"}
                    aria-label="Limpar próximo slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-center text-muted-foreground">Novo</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
