import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useSettings } from "@/hooks/useSettings";
import { useSystemInfo } from "@/hooks/useSystemInfo";
import { useAuth } from "@/contexts/AuthContext";
import { ApiTokensCard } from "@/components/settings/ApiTokensCard";
import { GeneratedContractsCard } from "@/components/settings/GeneratedContractsCard";
import { PdfCoversManager } from "@/components/settings/PdfCoversManager";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Palette,
  Building2,
  FileText,
  Phone,
  Mail,
  Globe,
  Upload,
  Image,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Paintbrush,
  Sun,
  Moon,
  SunMoon,
  Info,
  Tag,
  Calendar,
  Plus,
} from "lucide-react";
import { useAppTheme, themeOptions } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { hexToHSL, bestForegroundHSL, contrastRatio } from "@/hooks/useBrand";

// ── Máscaras de documento ────────────────────────────────────────────────────
const maskCNPJ = (v: string) =>
  v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .slice(0, 18);

const maskCPF = (v: string) =>
  v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .slice(0, 14);

export default function Configuracoes() {
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl("authenticated");
  
  // Permissões granulares com fallback por role
  const { canAccessPage, canEdit, isLoading: permissionsLoading } = useModuleAccess('configuracoes');
  
  const { settings, isLoading, isSaving, updateSettings, uploadImage } = useSettings();
  const { theme, setTheme } = useAppTheme();
  
  const { toast } = useToast();
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoBrancaInputRef = useRef<HTMLInputElement>(null);
  const contracapaInputRef = useRef<HTMLInputElement>(null);
  // (covers do PDF são tratados pelo componente PdfCoversCard)
  
  const [formData, setFormData] = useState({
    empresa_nome: "",
    cnpj: "",
    tipo_documento: "pj" as "pj" | "pf",
    cor_primaria: "",
    cor_secundaria: "",
    cor_destaque: "",
    texto_institucional: "",
    telefone: "",
    email: "",
    site: "",
    instagram: "",
    facebook: "",
    whatsapp_comercial: "",
    modo_white_label: false,
    esconder_marca_harmony: false,
    cover_mode: "fixed",
    cover_fixed_index: 1,
  });
  
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoBranca, setUploadingLogoBranca] = useState(false);
  const [uploadingContracapa, setUploadingContracapa] = useState(false);
  const [uploadingCover1, setUploadingCover1] = useState(false);
  const [uploadingCover2, setUploadingCover2] = useState(false);

  // Inicializar form com dados do settings
  if (!isFormInitialized && !isLoading && settings.id) {
    const rawDoc = (settings.cnpj || "").replace(/\D/g, '');
    const tipoDoc: "pj" | "pf" = rawDoc.length === 11 ? "pf" : "pj";
    setFormData({
      empresa_nome: settings.empresa_nome || "",
      cnpj: settings.cnpj || "",
      tipo_documento: tipoDoc,
      cor_primaria: settings.cor_primaria || "#F97316",
      cor_secundaria: settings.cor_secundaria || "#22C55E",
      cor_destaque: settings.cor_destaque || "#F59E0B",
      texto_institucional: settings.texto_institucional || "",
      telefone: settings.telefone || "",
      email: settings.email || "",
      site: settings.site || "",
      instagram: (settings as any).instagram || "",
      facebook: (settings as any).facebook || "",
      whatsapp_comercial: (settings as any).whatsapp_comercial || "",
      modo_white_label: settings.modo_white_label || false,
      esconder_marca_harmony: settings.esconder_marca_harmony || false,
      cover_mode: settings.cover_mode || "fixed",
      cover_fixed_index: settings.cover_fixed_index || 1,
    });
    setIsFormInitialized(true);
  }

  const removeFromStorage = async (filePath: string) => {
    // best-effort: se falhar, ainda tentamos limpar o campo
    const { error } = await supabase.storage.from("vistoria-fotos").remove([filePath]);
    if (error) console.warn("Erro ao remover arquivo:", error);
  };

  const handleSave = async () => {
    await updateSettings(formData);
    // Injeta imediatamente no DOM para refletir sem reload
    if (formData.cor_primaria) {
      const root = document.documentElement;
      root.style.setProperty('--primary', hexToHSL(formData.cor_primaria));
      root.style.setProperty('--primary-foreground', bestForegroundHSL(formData.cor_primaria));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    const url = await uploadImage(file, "logo");
    if (url) {
      await updateSettings({ empresa_logo: url });
    }
    setUploadingLogo(false);
  };

  const handleLogoBrancaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogoBranca(true);
    const url = await uploadImage(file, "logo_branca");
    if (url) {
      await updateSettings({ empresa_logo_branca: url });
    }
    setUploadingLogoBranca(false);
  };

  const handleContracapaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingContracapa(true);
    const url = await uploadImage(file, "contracapa");
    if (url) {
      await updateSettings({ pdf_contracapa: url });
    }
    setUploadingContracapa(false);
  };

  const handleCoverUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    coverNum: 1 | 2
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = {
      1: setUploadingCover1,
      2: setUploadingCover2,
    }[coverNum];

    const coverField = `cover_${coverNum}` as "cover_1" | "cover_2";

    setUploading(true);
    const url = await uploadImage(file, coverField);
    if (url) {
      await updateSettings({ [coverField]: url });
    }
    setUploading(false);
  };


  if (isChecking || isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowed) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Acesso Negado</CardTitle>
              <CardDescription>
                Você não tem permissão para acessar as configurações do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/dashboard")}>
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
            <p className="text-muted-foreground">
              Personalize a identidade visual e configurações gerais
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Identidade Visual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Identidade Visual
              </CardTitle>
              <CardDescription>
                Configure o nome, logos e cores da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Razão Social */}
              <div className="space-y-2">
                <Label htmlFor="empresa_nome">Razão Social / Nome da Empresa</Label>
                <div className="flex gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground mt-3" />
                  <Input
                    id="empresa_nome"
                    value={formData.empresa_nome}
                    onChange={(e) =>
                      setFormData({ ...formData, empresa_nome: e.target.value })
                    }
                    placeholder="Razão Social da empresa"
                  />
                </div>
              </div>

              {/* Documento: PJ ou PF */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cnpj">
                    {formData.tipo_documento === 'pj' ? 'CNPJ' : 'CPF'}
                  </Label>
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_documento: 'pj', cnpj: '' })}
                      className={`px-2 py-0.5 rounded border transition-colors ${formData.tipo_documento === 'pj' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
                    >
                      Pessoa Jurídica
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_documento: 'pf', cnpj: '' })}
                      className={`px-2 py-0.5 rounded border transition-colors ${formData.tipo_documento === 'pf' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
                    >
                      Pessoa Física
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-3" />
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => {
                      const masked = formData.tipo_documento === 'pj'
                        ? maskCNPJ(e.target.value)
                        : maskCPF(e.target.value);
                      setFormData({ ...formData, cnpj: masked });
                    }}
                    placeholder={formData.tipo_documento === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'}
                    maxLength={formData.tipo_documento === 'pj' ? 18 : 14}
                  />
                </div>
              </div>

              <Separator />

              {/* Logos */}
              <div className="space-y-4">
                <Label>Logos da Empresa</Label>
                
                {/* Logo Padrão */}
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {settings.empresa_logo ? (
                      <img
                        src={settings.empresa_logo}
                        alt="Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Logo Colorida</p>
                    <p className="text-xs text-muted-foreground">
                      Para fundos claros
                    </p>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Logo Branca */}
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 border rounded-lg overflow-hidden bg-foreground flex items-center justify-center">
                    {settings.empresa_logo_branca ? (
                      <img
                        src={settings.empresa_logo_branca}
                        alt="Logo Branca"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-muted" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Logo Branca</p>
                    <p className="text-xs text-muted-foreground">
                      Para fundos escuros
                    </p>
                  </div>
                  <input
                    ref={logoBrancaInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoBrancaUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoBrancaInputRef.current?.click()}
                    disabled={uploadingLogoBranca}
                  >
                    {uploadingLogoBranca ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Cores */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Paintbrush className="w-4 h-4" />
                  Paleta de Cores
                </Label>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cor_primaria" className="text-xs">
                      Cor Primária
                    </Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="cor_primaria"
                        value={formData.cor_primaria}
                        onChange={(e) =>
                          setFormData({ ...formData, cor_primaria: e.target.value })
                        }
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={formData.cor_primaria}
                        onChange={(e) =>
                          setFormData({ ...formData, cor_primaria: e.target.value })
                        }
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cor_secundaria" className="text-xs">
                      Cor Secundária
                    </Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="cor_secundaria"
                        value={formData.cor_secundaria}
                        onChange={(e) =>
                          setFormData({ ...formData, cor_secundaria: e.target.value })
                        }
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={formData.cor_secundaria}
                        onChange={(e) =>
                          setFormData({ ...formData, cor_secundaria: e.target.value })
                        }
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cor_destaque" className="text-xs">
                      Cor Destaque
                    </Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="cor_destaque"
                        value={formData.cor_destaque}
                        onChange={(e) =>
                          setFormData({ ...formData, cor_destaque: e.target.value })
                        }
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={formData.cor_destaque}
                        onChange={(e) =>
                          setFormData({ ...formData, cor_destaque: e.target.value })
                        }
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview das cores com contraste WCAG */}
                <div className="space-y-2 p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-2">Preview — texto automático (WCAG AA)</p>
                  {[
                    { label: 'Primária', key: 'cor_primaria', hex: formData.cor_primaria },
                    { label: 'Secundária', key: 'cor_secundaria', hex: formData.cor_secundaria },
                    { label: 'Destaque', key: 'cor_destaque', hex: formData.cor_destaque },
                  ].map(({ label, hex }) => {
                    const fgHSL = bestForegroundHSL(hex);
                    const fgHex = fgHSL.startsWith('0 0% 100') ? '#ffffff' : '#1a1f2e';
                    const ratio = Math.max(contrastRatio(hex, '#ffffff'), contrastRatio(hex, '#000000'));
                    const pass = ratio >= 4.5;
                    return (
                      <div
                        key={label}
                        className="flex items-center justify-between px-3 py-2 rounded"
                        style={{ backgroundColor: hex, color: fgHex }}
                      >
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs opacity-80">
                          {ratio.toFixed(1)}:1 {pass ? '✓ AA' : '⚠ baixo'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Propostas e PDF */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Propostas e PDF
              </CardTitle>
              <CardDescription>
                Configure a contra-capa e textos das propostas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contra-capa */}
              <div className="space-y-3">
                <Label>Imagem da Contra-capa</Label>
                <div
                  className="relative h-48 border-2 border-dashed rounded-lg overflow-hidden bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => contracapaInputRef.current?.click()}
                >
                  <input
                    ref={contracapaInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleContracapaUpload}
                    className="hidden"
                  />
                  {settings.pdf_contracapa ? (
                    <img
                      src={settings.pdf_contracapa}
                      alt="Contra-capa"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      {uploadingContracapa ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2" />
                          <p className="text-sm">Clique para enviar imagem</p>
                          <p className="text-xs">Recomendado: A4 (210x297mm)</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Texto Institucional */}
              <div className="space-y-2">
                <Label htmlFor="texto_institucional">
                  Texto Institucional da Proposta
                </Label>
                <Textarea
                  id="texto_institucional"
                  value={formData.texto_institucional}
                  onChange={(e) =>
                    setFormData({ ...formData, texto_institucional: e.target.value })
                  }
                  placeholder="Condições e informações importantes..."
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Este texto aparece na seção "Condições Importantes" do PDF
                </p>
              </div>
            </CardContent>
          </Card>

          <PdfCoversManager
            companyId={settings.id}
            legacyCovers={{
              cover_1: settings.cover_1,
              cover_2: settings.cover_2,
              cover_3: (settings as any).cover_3 ?? null,
              cover_4: (settings as any).cover_4 ?? null,
            }}
            coverMode={formData.cover_mode}
            coverFixedIndex={formData.cover_fixed_index}
            onChangeCoverMode={(mode) => {
              setFormData(prev => ({ ...prev, cover_mode: mode }));
              updateSettings({ cover_mode: mode }); // auto-save
            }}
            onChangeCoverFixedIndex={(index) => {
              setFormData(prev => ({ ...prev, cover_fixed_index: index }));
              updateSettings({ cover_fixed_index: index }); // auto-save
            }}
            uploadLegacyImage={uploadImage as any}
            updateCompanySettings={updateSettings as any}
            removeStorageFile={removeFromStorage}
          />

          {/* Contatos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Informações de Contato
              </CardTitle>
              <CardDescription>
                Dados de contato exibidos nas propostas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <div className="flex gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-3" />
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({ ...formData, telefone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="flex gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground mt-3" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="contato@empresa.com.br"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site">Website</Label>
                <div className="flex gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground mt-3" />
                  <Input
                    id="site"
                    value={formData.site}
                    onChange={(e) =>
                      setFormData({ ...formData, site: e.target.value })
                    }
                    placeholder="www.empresa.com.br"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <Label className="text-sm">Redes Sociais</Label>
                <p className="text-xs text-muted-foreground">Aparecem no rodapé do painel e nos PDFs</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <div className="flex gap-2">
                  <span className="text-muted-foreground mt-2.5 text-sm">@</span>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="seuarroba"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <div className="flex gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground mt-3" />
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="facebook.com/suapagina"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_comercial">WhatsApp Comercial</Label>
                <div className="flex gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-3" />
                  <Input
                    id="whatsapp_comercial"
                    value={formData.whatsapp_comercial}
                    onChange={(e) => setFormData({ ...formData, whatsapp_comercial: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* White Label */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Modo White Label
              </CardTitle>
              <CardDescription>
                Personalize a marca do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div className="space-y-1">
                  <p className="font-medium">Ativar White Label</p>
                  <p className="text-sm text-muted-foreground">
                    Usa sua marca em vez da marca padrão
                  </p>
                </div>
                <Switch
                  checked={formData.modo_white_label}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, modo_white_label: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    <p className="font-medium">Esconder Marca Harmony</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Remove referências à Harmony dos PDFs (White Label)
                  </p>
                </div>
                <Switch
                  checked={formData.esconder_marca_harmony}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, esconder_marca_harmony: checked })
                  }
                />
              </div>

              {formData.modo_white_label && (
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <p className="text-sm">
                    <strong>Modo White Label ativo:</strong> Certifique-se de
                    fazer upload das suas logos personalizadas na seção
                    "Identidade Visual".
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tema da Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SunMoon className="w-5 h-5 text-primary" />
                Tema da Interface
              </CardTitle>
              <CardDescription>
                Escolha o tema visual do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {themeOptions.map((option) => {
                  const isSelected = theme === option.value;
                  const Icon = option.value === "light" ? Sun : option.value === "dark" ? Moon : SunMoon;
                  
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`
                        relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all
                        ${isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50 bg-card"
                        }
                      `}
                    >
                      <div className={`
                        p-3 rounded-full 
                        ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                      `}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <p className="text-xs text-muted-foreground text-center pt-2">
                O tema é salvo automaticamente e aplicado em toda a interface.
              </p>
            </CardContent>
          </Card>

          {/* Versão do Sistema */}
          <SystemVersionCard />

          {/* Tokens de API */}
          <ApiTokensCard />

          {/* Contratos gerados */}
          <GeneratedContractsCard />
        </div>
      </div>
    </DashboardLayout>
  );
}

function SystemVersionCard() {
  const { systemInfo, totalUpdates, nextVersion, updatesUntilNextPatch, patchesUntilNextMinor, isLoading, registerUpdate } = useSystemInfo();
  const { profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleRegister = async () => {
    setIsSaving(true);
    await registerUpdate("", profile?.nome_completo || "Admin");
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const releaseDate = systemInfo?.release_date
    ? format(new Date(systemInfo.release_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    : '';

  const updatesInPatch = totalUpdates % 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          Versão do Sistema
        </CardTitle>
        <CardDescription>
          Versão calculada automaticamente a cada 10 atualizações registradas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <Tag className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Versão Atual</p>
              <p className="text-2xl font-bold text-primary">v{systemInfo?.system_version ?? '1.0.0'}</p>
              <p className="text-xs text-muted-foreground">{totalUpdates} atualizações registradas</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Última Atualização</p>
              <p className="font-medium text-sm">{releaseDate || '—'}</p>
              {systemInfo?.updated_by && (
                <p className="text-xs text-muted-foreground">por {systemInfo.updated_by}</p>
              )}
            </div>
          </div>
        </div>

        {/* Progresso até próxima versão */}
        <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso para próximo PATCH</span>
            <span>{updatesInPatch}/10 atualizações</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${updatesInPatch * 10}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            Próxima versão ao registrar: <strong className="text-foreground">v{nextVersion}</strong>
            {' '}· faltam {updatesUntilNextPatch} para próximo PATCH
            {' '}· {patchesUntilNextMinor} PATCHes para próximo MINOR
          </p>
        </div>

        {systemInfo?.release_notes && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notas da Última Atualização
            </Label>
            <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
              {systemInfo.release_notes}
            </div>
          </div>
        )}

        <Button className="w-full sm:w-auto" onClick={handleRegister} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Atualizar versão (v{nextVersion})
        </Button>
      </CardContent>
    </Card>
  );
}
