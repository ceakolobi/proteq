import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { useSystemInfo } from "@/hooks/useSystemInfo";
import { useAuth } from "@/contexts/AuthContext";
import { ApiTokensCard } from "@/components/settings/ApiTokensCard";
import { GeneratedContractsCard } from "@/components/settings/GeneratedContractsCard";

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
  const cover1InputRef = useRef<HTMLInputElement>(null);
  const cover2InputRef = useRef<HTMLInputElement>(null);
  const newCoverInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    empresa_nome: "",
    cnpj: "",
    cor_primaria: "",
    cor_secundaria: "",
    cor_destaque: "",
    texto_institucional: "",
    telefone: "",
    email: "",
    site: "",
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
  const [uploadingNewCover, setUploadingNewCover] = useState(false);
  const [covers, setCovers] = useState<Array<{id: string; url: string; path: string}>>([]);
  const [isLoadingCovers, setIsLoadingCovers] = useState(true);

  // Inicializar form com dados do settings
  if (!isFormInitialized && !isLoading && settings.id) {
    setFormData({
      empresa_nome: settings.empresa_nome || "",
      cnpj: settings.cnpj || "",
      cor_primaria: settings.cor_primaria || "#F97316",
      cor_secundaria: settings.cor_secundaria || "#22C55E",
      cor_destaque: settings.cor_destaque || "#F59E0B",
      texto_institucional: settings.texto_institucional || "",
      telefone: settings.telefone || "",
      email: settings.email || "",
      site: settings.site || "",
      modo_white_label: settings.modo_white_label || false,
      esconder_marca_harmony: settings.esconder_marca_harmony || false,
      cover_mode: settings.cover_mode || "fixed",
      cover_fixed_index: (settings.cover_fixed_index && settings.cover_fixed_index <= 2)
        ? settings.cover_fixed_index
        : 1,
    });
    setIsFormInitialized(true);
  }

  // Carregar capas do company_covers
  useEffect(() => {
    const fetchCovers = async () => {
      if (!settings.id) return;
      setIsLoadingCovers(true);
      try {
        const { data, error } = await supabase
          .from('company_covers')
          .select('*')
          .eq('company_id', settings.id)
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          setCovers(data.map((c: any) => ({ id: c.id, url: c.public_url, path: c.file_path })));
        }
      } catch (err) {
        console.error('Erro ao carregar capas:', err);
      } finally {
        setIsLoadingCovers(false);
      }
    };
    fetchCovers();
  }, [settings.id]);

  const handleAddCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings.id) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Envie uma imagem (JPG, PNG, WEBP, etc.).',
        variant: 'destructive',
      });
      return;
    }

    setUploadingNewCover(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `companies/${settings.id}/covers/cover_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vistoria-fotos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('vistoria-fotos')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      const { data: insertData, error: insertError } = await supabase
        .from('company_covers')
        .insert({
          company_id: settings.id,
          file_path: fileName,
          public_url: publicUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCovers((prev) => [...prev, { id: insertData.id, url: publicUrl, path: fileName }]);
      toast({
        title: 'Capa adicionada',
        description: 'A nova capa foi salva com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao adicionar capa:', error);
      toast({
        title: 'Erro ao adicionar capa',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploadingNewCover(false);
      if (newCoverInputRef.current) newCoverInputRef.current.value = '';
    }
  };

  const handleDeleteCover = async (coverId: string, filePath: string) => {
    if (!confirm('Excluir esta capa permanentemente?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('vistoria-fotos')
        .remove([filePath]);

      if (storageError) console.warn('Erro ao remover arquivo do storage:', storageError);

      const { error: dbError } = await supabase
        .from('company_covers')
        .delete()
        .eq('id', coverId);

      if (dbError) throw dbError;

      setCovers((prev) => prev.filter((c) => c.id !== coverId));
      toast({
        title: 'Capa excluída',
        description: 'A capa e o arquivo foram removidos.',
      });
    } catch (error: any) {
      console.error('Erro ao excluir capa:', error);
      toast({
        title: 'Erro ao excluir capa',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    await updateSettings(formData);
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

              {/* CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <div className="flex gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-3" />
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) =>
                      setFormData({ ...formData, cnpj: e.target.value })
                    }
                    placeholder="00.000.000/0000-00"
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

                {/* Preview das cores */}
                <div className="flex gap-2 p-3 rounded-lg bg-muted">
                  <div
                    className="w-12 h-8 rounded"
                    style={{ backgroundColor: formData.cor_primaria }}
                  />
                  <div
                    className="w-12 h-8 rounded"
                    style={{ backgroundColor: formData.cor_secundaria }}
                  />
                  <div
                    className="w-12 h-8 rounded"
                    style={{ backgroundColor: formData.cor_destaque }}
                  />
                  <span className="text-xs text-muted-foreground ml-2 self-center">
                    Preview da paleta
                  </span>
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

          {/* Covers do PDF */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                Capas do PDF
              </CardTitle>
              <CardDescription>
                Configure até 4 imagens de capa para as propostas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cover Mode */}
              <div className="space-y-2">
                <Label htmlFor="cover_mode">Modo de Exibição</Label>
                <select
                  id="cover_mode"
                  value={formData.cover_mode}
                  onChange={(e) =>
                    setFormData({ ...formData, cover_mode: e.target.value })
                  }
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="fixed">Capa Fixa (selecionar qual)</option>
                  <option value="select">Escolher na Geração</option>
                  <option value="random">Aleatória entre as cadastradas</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {formData.cover_mode === "fixed" && "Usa sempre a capa selecionada abaixo"}
                  {formData.cover_mode === "select" && "Permite escolher qual capa usar ao gerar o PDF"}
                  {formData.cover_mode === "random" && "Seleciona aleatoriamente entre as capas cadastradas"}
                </p>
              </div>

              {/* Fixed cover selector */}
              {formData.cover_mode === "fixed" && (
                <div className="space-y-2">
                  <Label htmlFor="cover_fixed_index">Capa Fixa Selecionada</Label>
                  <select
                    id="cover_fixed_index"
                    value={formData.cover_fixed_index}
                    onChange={(e) =>
                      setFormData({ ...formData, cover_fixed_index: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
                  >
                    <option value={1}>Capa 1</option>
                    <option value={2}>Capa 2</option>
                  </select>
                </div>
              )}

              <Separator />

              {/* Covers Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Capas Cadastradas</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => newCoverInputRef.current?.click()}
                    disabled={uploadingNewCover}
                  >
                    {uploadingNewCover ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Adicionar Capa
                  </Button>
                  <input
                    ref={newCoverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAddCover}
                    className="hidden"
                  />
                </div>
                
                {isLoadingCovers ? (
                  <div className="text-sm text-muted-foreground">Carregando capas...</div>
                ) : covers.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                    <p className="text-sm">Nenhuma capa cadastrada.</p>
                    <p className="text-xs">Clique em "Adicionar Capa" para enviar uma imagem.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {covers.map((cover, idx) => (
                      <div key={cover.id} className="relative group">
                        <div className="aspect-[210/297] w-full border-2 rounded-lg overflow-hidden bg-muted">
                          <img
                            src={cover.url}
                            alt={`Capa ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteCover(cover.id, cover.path)}
                        >
                          Excluir
                        </Button>
                        <div className="mt-1 text-xs text-center text-muted-foreground">
                          Capa {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
  const { systemInfo, isLoading, createNewVersion } = useSystemInfo();
  const { profile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateVersion = async () => {
    if (!newVersion.trim()) return;
    
    setIsSaving(true);
    const success = await createNewVersion(
      newVersion.trim(),
      newNotes.trim(),
      profile?.nome_completo || "Admin"
    );
    
    if (success) {
      setIsDialogOpen(false);
      setNewVersion("");
      setNewNotes("");
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          Versão do Sistema
        </CardTitle>
        <CardDescription>
          Informações sobre a versão atual e histórico de atualizações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {systemInfo ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Tag className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Versão Atual</p>
                  <p className="text-2xl font-bold text-primary">v{systemInfo.system_version}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Última Atualização</p>
                  <p className="font-medium">{releaseDate}</p>
                  {systemInfo.updated_by && (
                    <p className="text-xs text-muted-foreground">por {systemInfo.updated_by}</p>
                  )}
                </div>
              </div>
            </div>

            {systemInfo.release_notes && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notas da Versão
                </Label>
                <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                  {systemInfo.release_notes}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                <strong>Padrão SemVer (MAJOR.MINOR.PATCH):</strong>
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li><strong>MAJOR</strong> – Mudanças incompatíveis com versões anteriores</li>
                <li><strong>MINOR</strong> – Novas funcionalidades (retrocompatíveis)</li>
                <li><strong>PATCH</strong> – Correções de bugs</li>
              </ul>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Nova Versão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Nova Versão</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova versão ao sistema. Isso será refletido em toda a interface.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="version">Número da Versão</Label>
                    <Input
                      id="version"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="Ex: 1.2.0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Siga o padrão MAJOR.MINOR.PATCH
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas da Versão</Label>
                    <Textarea
                      id="notes"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Descreva as mudanças desta versão..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateVersion} disabled={!newVersion.trim() || isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Versão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Nenhuma informação de versão encontrada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
