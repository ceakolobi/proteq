import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

export default function Configuracoes() {
  const navigate = useNavigate();
  const { isAllowed, isChecking } = useAccessControl("admin_principal_only");
  const { settings, isLoading, isSaving, updateSettings, uploadImage } = useSettings();
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoBrancaInputRef = useRef<HTMLInputElement>(null);
  const contracapaInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    empresa_nome: "",
    cor_primaria: "",
    cor_secundaria: "",
    cor_destaque: "",
    texto_institucional: "",
    telefone: "",
    email: "",
    site: "",
    modo_white_label: false,
    esconder_marca_harmony: false,
  });
  
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoBranca, setUploadingLogoBranca] = useState(false);
  const [uploadingContracapa, setUploadingContracapa] = useState(false);

  // Inicializar form com dados do settings
  if (!isFormInitialized && !isLoading && settings.id) {
    setFormData({
      empresa_nome: settings.empresa_nome || "",
      cor_primaria: settings.cor_primaria || "#F97316",
      cor_secundaria: settings.cor_secundaria || "#22C55E",
      cor_destaque: settings.cor_destaque || "#F59E0B",
      texto_institucional: settings.texto_institucional || "",
      telefone: settings.telefone || "",
      email: settings.email || "",
      site: settings.site || "",
      modo_white_label: settings.modo_white_label || false,
      esconder_marca_harmony: settings.esconder_marca_harmony || false,
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
              {/* Nome da Empresa */}
              <div className="space-y-2">
                <Label htmlFor="empresa_nome">Nome da Empresa</Label>
                <div className="flex gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground mt-3" />
                  <Input
                    id="empresa_nome"
                    value={formData.empresa_nome}
                    onChange={(e) =>
                      setFormData({ ...formData, empresa_nome: e.target.value })
                    }
                    placeholder="Nome da empresa"
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
                    Remove referências à Harmony Agro dos PDFs
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
        </div>
      </div>
    </DashboardLayout>
  );
}
