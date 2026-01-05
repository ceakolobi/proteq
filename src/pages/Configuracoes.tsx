import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useSettings } from "@/hooks/useSettings";
import { useSystemInfo } from "@/hooks/useSystemInfo";
import { useAuth } from "@/contexts/AuthContext";

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
  const { isAllowed, isChecking } = useAccessControl("admin_or_basico");
  const { settings, isLoading, isSaving, updateSettings, uploadImage } = useSettings();
  const { theme, setTheme } = useAppTheme();
  
  const { toast } = useToast();
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoBrancaInputRef = useRef<HTMLInputElement>(null);
  const contracapaInputRef = useRef<HTMLInputElement>(null);
  const cover1InputRef = useRef<HTMLInputElement>(null);
  const cover2InputRef = useRef<HTMLInputElement>(null);
  const cover3InputRef = useRef<HTMLInputElement>(null);
  const cover4InputRef = useRef<HTMLInputElement>(null);
  
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
  const [uploadingCover3, setUploadingCover3] = useState(false);
  const [uploadingCover4, setUploadingCover4] = useState(false);

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
      cover_fixed_index: settings.cover_fixed_index || 1,
    });
    setIsFormInitialized(true);
  }

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
    coverNum: 1 | 2 | 3 | 4
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = {
      1: setUploadingCover1,
      2: setUploadingCover2,
      3: setUploadingCover3,
      4: setUploadingCover4,
    }[coverNum];

    const coverField = `cover_${coverNum}` as "cover_1" | "cover_2" | "cover_3" | "cover_4";

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
                    <option value={3}>Capa 3</option>
                    <option value={4}>Capa 4</option>
                  </select>
                </div>
              )}

              <Separator />

              {/* Covers Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Cover 1 */}
                <div className="space-y-2">
                  <Label>Cover 1</Label>
                  <div
                    className="relative h-32 border-2 border-dashed rounded-lg overflow-hidden bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => cover1InputRef.current?.click()}
                  >
                    <input
                      ref={cover1InputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCoverUpload(e, 1)}
                      className="hidden"
                    />
                    {settings.cover_1 ? (
                      <img
                        src={settings.cover_1}
                        alt="Cover 1"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        {uploadingCover1 ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mb-1" />
                            <p className="text-xs">Upload</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cover 2 */}
                <div className="space-y-2">
                  <Label>Cover 2</Label>
                  <div
                    className="relative h-32 border-2 border-dashed rounded-lg overflow-hidden bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => cover2InputRef.current?.click()}
                  >
                    <input
                      ref={cover2InputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCoverUpload(e, 2)}
                      className="hidden"
                    />
                    {settings.cover_2 ? (
                      <img
                        src={settings.cover_2}
                        alt="Cover 2"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        {uploadingCover2 ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mb-1" />
                            <p className="text-xs">Upload</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cover 3 */}
                <div className="space-y-2">
                  <Label>Cover 3</Label>
                  <div
                    className="relative h-32 border-2 border-dashed rounded-lg overflow-hidden bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => cover3InputRef.current?.click()}
                  >
                    <input
                      ref={cover3InputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCoverUpload(e, 3)}
                      className="hidden"
                    />
                    {settings.cover_3 ? (
                      <img
                        src={settings.cover_3}
                        alt="Cover 3"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        {uploadingCover3 ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mb-1" />
                            <p className="text-xs">Upload</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cover 4 */}
                <div className="space-y-2">
                  <Label>Cover 4</Label>
                  <div
                    className="relative h-32 border-2 border-dashed rounded-lg overflow-hidden bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => cover4InputRef.current?.click()}
                  >
                    <input
                      ref={cover4InputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCoverUpload(e, 4)}
                      className="hidden"
                    />
                    {settings.cover_4 ? (
                      <img
                        src={settings.cover_4}
                        alt="Cover 4"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        {uploadingCover4 ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mb-1" />
                            <p className="text-xs">Upload</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
                    <p className="font-medium">Esconder Marca MARKA</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Remove referências à MARKA dos PDFs (White Label)
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
