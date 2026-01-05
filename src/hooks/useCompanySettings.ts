import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanySettings {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  site: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  // Branding - 3 versões de logo para suporte completo a temas
  logo: string | null;           // Logo primária/colorida
  logo_branca: string | null;    // Logo clara (para fundos escuros)
  logo_escura: string | null;    // Logo escura (para fundos claros)
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
  // PDF Settings
  texto_institucional: string | null;
  pdf_contracapa: string | null;
  cover_1: string | null;
  cover_2: string | null;
  cover_3: string | null;
  cover_4: string | null;
  cover_mode: string | null;
  cover_fixed_index: number | null;
  // Status
  ativo: boolean;
  modo_white_label: boolean;
  esconder_marca_harmony: boolean;
  created_at: string;
  updated_at: string;
}

// Map company fields to legacy settings interface for backward compatibility
export interface SystemSettings {
  id: string;
  empresa_nome: string;
  cnpj: string | null;
  empresa_logo: string | null;        // Logo primária/colorida
  empresa_logo_branca: string | null; // Logo clara
  empresa_logo_escura: string | null; // Logo escura
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
  cover_fixed_index: number | null;
  created_at: string;
  updated_at: string;
}

const defaultSettings: SystemSettings = {
  id: "",
  empresa_nome: "MARKA CRM",
  cnpj: null,
  empresa_logo: null,
  empresa_logo_branca: null,
  empresa_logo_escura: null,
  cor_primaria: "#F97316",
  cor_secundaria: "#22C55E",
  cor_destaque: "#F59E0B",
  texto_institucional: "Esta proposta tem validade de 7 dias. Os valores podem sofrer alteração conforme tabela FIPE vigente no momento da contratação. A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade.",
  pdf_contracapa: null,
  telefone: "(00) 00000-0000",
  email: "contato@marka.com.br",
  site: "www.marka.com.br",
  modo_white_label: false,
  esconder_marca_harmony: false,
  cover_1: null,
  cover_2: null,
  cover_3: null,
  cover_4: null,
  cover_mode: "fixed",
  cover_fixed_index: 1,
  created_at: "",
  updated_at: "",
};

// Convert company data to legacy settings format
function companyToSettings(company: CompanySettings): SystemSettings {
  return {
    id: company.id,
    empresa_nome: company.nome,
    cnpj: company.cnpj,
    empresa_logo: company.logo,
    empresa_logo_branca: company.logo_branca,
    empresa_logo_escura: company.logo_escura,
    cor_primaria: company.cor_primaria,
    cor_secundaria: company.cor_secundaria,
    cor_destaque: company.cor_destaque,
    texto_institucional: company.texto_institucional,
    pdf_contracapa: company.pdf_contracapa,
    telefone: company.telefone,
    email: company.email,
    site: company.site,
    modo_white_label: company.modo_white_label,
    esconder_marca_harmony: company.esconder_marca_harmony,
    cover_1: company.cover_1,
    cover_2: company.cover_2,
    cover_3: company.cover_3,
    cover_4: company.cover_4,
    cover_mode: company.cover_mode,
    cover_fixed_index: company.cover_fixed_index,
    created_at: company.created_at,
    updated_at: company.updated_at,
  };
}

export function useCompanySettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUsingLegacy, setIsUsingLegacy] = useState(false);

  const fetchSettings = async () => {
    try {
      // First get user's company_id from profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) {
        // Fallback to legacy settings table
        const { data: legacySettings } = await supabase
          .from("settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (legacySettings) {
          setSettings(legacySettings as unknown as SystemSettings);
          setIsUsingLegacy(true);
        }
        setIsLoading(false);
        return;
      }

      // Fetch company settings
      const { data: companyData, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();

      if (error) {
        console.error("Erro ao carregar configurações da empresa:", error);
        setIsLoading(false);
        return;
      }

      if (companyData) {
        const companySettings = companyData as unknown as CompanySettings;
        setCompany(companySettings);
        setSettings(companyToSettings(companySettings));
        setIsUsingLegacy(false);
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
      if (isUsingLegacy) {
        // Update legacy settings table
        const legacyUpdates: Record<string, unknown> = { ...updates };
        legacyUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from("settings")
          .update(legacyUpdates)
          .eq("id", settings.id);

        if (error) {
          console.error("Erro ao salvar configurações (legacy):", error);
          toast.error("Erro ao salvar configurações");
          return false;
        }

        setSettings((prev) => ({ ...prev, ...updates }));
        toast.success("Configurações salvas com sucesso!");
        return true;
      }

      // Map settings updates to company fields
      const companyUpdates: Record<string, unknown> = {};
      
      if (updates.empresa_nome !== undefined) companyUpdates.nome = updates.empresa_nome;
      if (updates.cnpj !== undefined) companyUpdates.cnpj = updates.cnpj;
      if (updates.empresa_logo !== undefined) companyUpdates.logo = updates.empresa_logo;
      if (updates.empresa_logo_branca !== undefined) companyUpdates.logo_branca = updates.empresa_logo_branca;
      if (updates.empresa_logo_escura !== undefined) companyUpdates.logo_escura = updates.empresa_logo_escura;
      if (updates.cor_primaria !== undefined) companyUpdates.cor_primaria = updates.cor_primaria;
      if (updates.cor_secundaria !== undefined) companyUpdates.cor_secundaria = updates.cor_secundaria;
      if (updates.cor_destaque !== undefined) companyUpdates.cor_destaque = updates.cor_destaque;
      if (updates.texto_institucional !== undefined) companyUpdates.texto_institucional = updates.texto_institucional;
      if (updates.pdf_contracapa !== undefined) companyUpdates.pdf_contracapa = updates.pdf_contracapa;
      if (updates.telefone !== undefined) companyUpdates.telefone = updates.telefone;
      if (updates.email !== undefined) companyUpdates.email = updates.email;
      if (updates.site !== undefined) companyUpdates.site = updates.site;
      if (updates.modo_white_label !== undefined) companyUpdates.modo_white_label = updates.modo_white_label;
      if (updates.esconder_marca_harmony !== undefined) companyUpdates.esconder_marca_harmony = updates.esconder_marca_harmony;
      if (updates.cover_1 !== undefined) companyUpdates.cover_1 = updates.cover_1;
      if (updates.cover_2 !== undefined) companyUpdates.cover_2 = updates.cover_2;
      if (updates.cover_3 !== undefined) companyUpdates.cover_3 = updates.cover_3;
      if (updates.cover_4 !== undefined) companyUpdates.cover_4 = updates.cover_4;
      if (updates.cover_mode !== undefined) companyUpdates.cover_mode = updates.cover_mode;
      if (updates.cover_fixed_index !== undefined) companyUpdates.cover_fixed_index = updates.cover_fixed_index;
      
      companyUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("companies")
        .update(companyUpdates)
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
    type: "logo" | "logo_branca" | "logo_escura" | "contracapa" | "cover_1" | "cover_2" | "cover_3" | "cover_4"
  ): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const folderName = isUsingLegacy ? "settings" : "companies";
      const fileName = `${folderName}/${settings.id}/${type}_${Date.now()}.${fileExt}`;

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
    company,
    isLoading,
    isSaving,
    updateSettings,
    uploadImage,
    refreshSettings: fetchSettings,
  };
}

// Re-export as useSettings for backward compatibility
export { useCompanySettings as useSettings };
