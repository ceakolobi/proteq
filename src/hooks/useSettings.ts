import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemSettings {
  id: string;
  empresa_nome: string;
  empresa_logo: string | null;
  empresa_logo_branca: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
  texto_institucional: string | null;
  pdf_contracapa: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  modo_white_label: boolean;
  esconder_marca_harmony: boolean;
  cover_1: string | null;
  cover_2: string | null;
  cover_3: string | null;
  cover_4: string | null;
  cover_mode: string | null;
  created_at: string;
  updated_at: string;
}

const defaultSettings: SystemSettings = {
  id: "",
  empresa_nome: "Harmony Agro",
  empresa_logo: null,
  empresa_logo_branca: null,
  cor_primaria: "#F97316",
  cor_secundaria: "#22C55E",
  cor_destaque: "#F59E0B",
  texto_institucional: "Esta proposta tem validade de 7 dias. Os valores podem sofrer alteração conforme tabela FIPE vigente no momento da contratação. A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade.",
  pdf_contracapa: null,
  telefone: "(00) 00000-0000",
  email: "contato@harmonyagro.com.br",
  site: "www.harmonyagro.com.br",
  modo_white_label: false,
  esconder_marca_harmony: false,
  cover_1: null,
  cover_2: null,
  cover_3: null,
  cover_4: null,
  cover_mode: "single",
  created_at: "",
  updated_at: "",
};

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configurações:", error);
        return;
      }

      if (data) {
        setSettings(data as SystemSettings);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<SystemSettings>) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("settings")
        .update(updates)
        .eq("id", settings.id);

      if (error) {
        console.error("Erro ao salvar configurações:", error);
        toast.error("Erro ao salvar configurações");
        return false;
      }

      setSettings((prev) => ({ ...prev, ...updates }));
      toast.success("Configurações salvas com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImage = async (
    file: File,
    type: "logo" | "logo_branca" | "contracapa" | "cover_1" | "cover_2" | "cover_3" | "cover_4"
  ): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `settings/${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("vistoria-fotos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Erro no upload:", uploadError);
        toast.error("Erro ao fazer upload da imagem");
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("vistoria-fotos")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    uploadImage,
    refreshSettings: fetchSettings,
  };
}
