import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanyCover {
  id: string;
  company_id: string;
  file_path: string;
  public_url: string;
  created_at: string;
}

function getFileExt(fileName: string) {
  const ext = fileName.split(".").pop();
  return ext && ext.length <= 5 ? ext : "png";
}

export function useCompanyCovers(companyId: string | null) {
  const [covers, setCovers] = useState<CompanyCover[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const canLoad = useMemo(() => Boolean(companyId), [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_covers")
        .select("id, company_id, file_path, public_url, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar capas:", error);
        toast.error("Erro ao carregar capas");
        return;
      }

      setCovers((data ?? []) as CompanyCover[]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!canLoad) return;
    refresh();
  }, [canLoad, refresh]);

  const addCover = useCallback(
    async (file: File) => {
      if (!companyId) return false;

      setIsMutating(true);
      const id = crypto.randomUUID();
      const ext = getFileExt(file.name);
      const filePath = `companies/${companyId}/covers/${id}_${Date.now()}.${ext}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from("vistoria-fotos")
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          console.error("Erro no upload da capa:", uploadError);
          toast.error("Erro ao fazer upload da capa");
          return false;
        }

        const { data: urlData } = supabase.storage.from("vistoria-fotos").getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        const { error: insertError } = await supabase
          .from("company_covers")
          .insert({ id, company_id: companyId, file_path: filePath, public_url: publicUrl });

        if (insertError) {
          console.error("Erro ao salvar capa no banco:", insertError);
          // best-effort cleanup
          await supabase.storage.from("vistoria-fotos").remove([filePath]);
          toast.error("Erro ao salvar capa");
          return false;
        }

        await refresh();
        toast.success("Capa adicionada!");
        return true;
      } catch (e) {
        console.error("Erro ao adicionar capa:", e);
        toast.error("Erro ao adicionar capa");
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [companyId, refresh]
  );

  const deleteCover = useCallback(
    async (cover: Pick<CompanyCover, "id" | "company_id" | "file_path">) => {
      if (!companyId) return false;

      setIsMutating(true);
      try {
        const { error: storageError } = await supabase.storage
          .from("vistoria-fotos")
          .remove([cover.file_path]);

        if (storageError) {
          console.warn("Aviso ao remover arquivo da capa:", storageError);
          // continua para remover do banco mesmo assim
        }

        const { error: deleteError } = await supabase
          .from("company_covers")
          .delete()
          .eq("id", cover.id)
          .eq("company_id", cover.company_id);

        if (deleteError) {
          console.error("Erro ao excluir capa:", deleteError);
          toast.error("Erro ao excluir capa");
          return false;
        }

        await refresh();
        toast.success("Capa removida");
        return true;
      } catch (e) {
        console.error("Erro ao excluir capa:", e);
        toast.error("Erro ao excluir capa");
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [companyId, refresh]
  );

  return {
    covers,
    isLoading,
    isMutating,
    refresh,
    addCover,
    deleteCover,
  };
}
