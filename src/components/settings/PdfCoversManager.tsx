import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useCompanyCovers } from "@/hooks/useCompanyCovers";

type LegacyCoverField = "cover_1" | "cover_2" | "cover_3" | "cover_4";

type CoverItem =
  | {
      source: "legacy";
      key: LegacyCoverField;
      url: string;
    }
  | {
      source: "table";
      id: string;
      file_path: string;
      url: string;
    };

function extractStoragePathFromPublicUrl(url: string): string | null {
  // formatos comuns:
  // .../storage/v1/object/public/vistoria-fotos/<PATH>
  // .../storage/v1/object/vistoria-fotos/<PATH>
  const markerPublic = "/storage/v1/object/public/vistoria-fotos/";
  const markerPrivate = "/storage/v1/object/vistoria-fotos/";

  if (url.includes(markerPublic)) return url.split(markerPublic)[1] ?? null;
  if (url.includes(markerPrivate)) return url.split(markerPrivate)[1] ?? null;
  return null;
}

function coverLabel(index1Based: number) {
  return `Capa ${index1Based}`;
}

interface PdfCoversManagerProps {
  companyId: string;
  legacyCovers: Partial<Record<LegacyCoverField, string | null>>;
  coverMode: string;
  coverFixedIndex: number;
  onChangeCoverMode: (mode: string) => void;
  onChangeCoverFixedIndex: (index: number) => void;
  uploadLegacyImage: (file: File, type: LegacyCoverField) => Promise<string | null>;
  updateCompanySettings: (updates: Partial<Record<LegacyCoverField, string | null>> & Record<string, unknown>) => Promise<boolean>;
  removeStorageFile: (filePath: string) => Promise<void>;
}

export function PdfCoversManager({
  companyId,
  legacyCovers,
  coverMode,
  coverFixedIndex,
  onChangeCoverMode,
  onChangeCoverFixedIndex,
  uploadLegacyImage,
  updateCompanySettings,
  removeStorageFile,
}: PdfCoversManagerProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const { covers, isLoading, isMutating, addCover, deleteCover } = useCompanyCovers(companyId);

  const legacyItems = useMemo<CoverItem[]>(() => {
    const fields: LegacyCoverField[] = ["cover_1", "cover_2", "cover_3", "cover_4"];
    return fields
      .map((key) => ({ source: "legacy" as const, key, url: legacyCovers[key] ?? null }))
      .filter((i) => Boolean(i.url))
      .map((i) => ({ source: "legacy" as const, key: i.key, url: i.url as string }));
  }, [legacyCovers]);

  const tableItems = useMemo<CoverItem[]>(() => {
    return covers.map((c) => ({ source: "table" as const, id: c.id, file_path: c.file_path, url: c.public_url }));
  }, [covers]);

  const allItems = useMemo(() => [...legacyItems, ...tableItems], [legacyItems, tableItems]);

  const fixedIndexOptions = useMemo(() => {
    return allItems.map((_, idx) => ({ value: idx + 1, label: coverLabel(idx + 1) }));
  }, [allItems]);

  const handleAdd = async (file: File) => {
    setUploading("add");
    try {
      await addCover(file);
    } finally {
      setUploading(null);
      if (addInputRef.current) addInputRef.current.value = "";
    }
  };

  const handleReplaceLegacy = async (field: LegacyCoverField) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setUploading(field);
      try {
        const url = await uploadLegacyImage(file, field);
        if (url) await updateCompanySettings({ [field]: url } as any);
      } finally {
        setUploading(null);
      }
    };
    input.click();
  };

  const handleDeleteLegacy = async (field: LegacyCoverField, url: string) => {
    const ok = confirm(`Remover ${field.replace("cover_", "Capa ")}?`);
    if (!ok) return;

    setUploading(`del-${field}`);
    try {
      const filePath = extractStoragePathFromPublicUrl(url);
      if (filePath) await removeStorageFile(filePath);
      await updateCompanySettings({ [field]: null } as any);
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteTable = async (id: string, filePath: string) => {
    const ok = confirm("Remover esta capa?");
    if (!ok) return;
    setUploading(`del-${id}`);
    try {
      await deleteCover({ id, company_id: companyId, file_path: filePath });
    } finally {
      setUploading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Capas do PDF
        </CardTitle>
        <CardDescription>
          Cadastre quantas capas quiser. O card “Novo” fica sempre disponível para adicionar mais.
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
              disabled={fixedIndexOptions.length === 0}
            >
              {fixedIndexOptions.length === 0 ? (
                <option value={1}>Nenhuma capa cadastrada</option>
              ) : (
                fixedIndexOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <Label>Capas</Label>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allItems.map((item, idx) => {
              const label = coverLabel(idx + 1);
              const isBusy =
                uploading === "add" ||
                uploading === (item.source === "legacy" ? item.key : item.id) ||
                uploading === `del-${item.source === "legacy" ? item.key : item.id}` ||
                isMutating;

              return (
                <div key={item.source === "legacy" ? item.key : item.id} className="space-y-2">
                  <div className="relative group">
                    <div className="aspect-[210/297] w-full border-2 rounded-lg overflow-hidden bg-muted">
                      <img src={item.url} alt={label} className="w-full h-full object-cover" />
                    </div>

                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.source === "legacy" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleReplaceLegacy(item.key)}
                          disabled={isBusy}
                          aria-label={`Enviar ${label}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() =>
                          item.source === "legacy"
                            ? handleDeleteLegacy(item.key, item.url)
                            : handleDeleteTable(item.id, item.file_path)
                        }
                        disabled={isBusy}
                        aria-label={`Remover ${label}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-center text-muted-foreground">{label}</div>
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAdd(file);
                  }}
                  className="hidden"
                />

                <div className="aspect-[210/297] w-full border-2 border-dashed rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {isLoading || uploading === "add" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Adicionar nova capa</span>
                  )}
                </div>

                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addInputRef.current?.click()}
                    disabled={isLoading || uploading === "add" || isMutating}
                    aria-label="Adicionar capa"
                  >
                    <Plus className="w-4 h-4" />
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
