import { useEffect, useMemo, useRef, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import { FileText, FileUp, History, Save, Shield, Trash2 } from "lucide-react";

type TemplateType = "contract" | "cancellation_letter";

type DocumentTemplate = {
  id: string;
  company_id: string;
  template_key: string;
  template_type: TemplateType;
  title: string;
  description: string | null;
  content_markdown: string;
  is_active: boolean;
  updated_at: string;
};

type TemplateVersion = {
  id: string;
  template_id: string;
  version: number;
  created_at: string;
};

type DocumentSettings = {
  company_id: string;
  auto_generate_contract: boolean;
  require_digital_accept: boolean;
  record_ip_and_date: boolean;
  send_contract_by_email: boolean;
  show_contract_in_associate_area: boolean;
};

type InternalDocument = {
  id: string;
  company_id: string;
  category: "certificados" | "susep" | "pdf";
  title: string;
  description: string | null;
  file_path: string;
  mime_type: string | null;
  created_at: string;
};

const DEFAULT_VARIABLES_HELP = `Variáveis disponíveis (use assim: {{nome}}):
- {{nome}}
- {{cpf}}
- {{plano}}
- {{data}}
- {{placa}}
- {{modelo}}
- {{ano}}
- {{mensalidade}}
`;

function formatDateBR(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function DocumentosContratos() {
  const { toast } = useToast();
  const { user, profile, roles, isAdminPrincipal } = useAuth();

  // Permissões granulares (fallback por role)
  const { canAccessPage, canEdit, isLoading: permissionsLoading } = useModuleAccess("configuracoes");

  const isAdmin = useMemo(() => {
    if (isAdminPrincipal) return true;
    return roles.includes("admin_nivel_basico") || roles.includes("admin_regional");
  }, [isAdminPrincipal, roles]);

  const companyId = profile?.company_id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [contractTemplate, setContractTemplate] = useState<DocumentTemplate | null>(null);
  const [cancelTemplate, setCancelTemplate] = useState<DocumentTemplate | null>(null);
  const [contractVersions, setContractVersions] = useState<TemplateVersion[]>([]);
  const [cancelVersions, setCancelVersions] = useState<TemplateVersion[]>([]);

  const [settings, setSettings] = useState<DocumentSettings | null>(null);
  const [internalDocs, setInternalDocs] = useState<InternalDocument[]>([]);

  const internalFileRef = useRef<HTMLInputElement>(null);
  const [internalUpload, setInternalUpload] = useState({
    category: "pdf" as InternalDocument["category"],
    title: "",
    description: "",
    uploading: false,
  });

  const [editor, setEditor] = useState({
    contract: {
      title: "Contrato Padrão",
      description: "Modelo base usado na geração automática após pagamento.",
      content_markdown: `# HARMONY CLUBE DE BENEFÍCIOS
## TERMO DE ADESÃO AO PROGRAMA DE BENEFÍCIOS (SOCORRO MÚTUO)

---

## 1) Identificação do Associado e do Veículo

**Associado:** {{nome}}  
**CPF:** {{cpf}}  
**Plano/Programa:** {{plano}}  
**Veículo:** {{modelo}} / {{ano}}  
**Placa:** {{placa}}  
**Mensalidade/Contribuição:** {{mensalidade}}  
**Data:** {{data}}

---

## 2) Natureza Jurídica e Regras Gerais

A HARMONY CLUBE DE BENEFÍCIOS, inscrita no CNPJ nº 39.583.767/0001-26, é uma associação civil sem fins lucrativos, constituída nos termos do Código Civil Brasileiro, que atua por meio do sistema de proteção patrimonial mutualista, fundamentado no socorro mútuo e no rateio de despesas entre seus associados.

O Associado declara ciência de que:

- A Associação **não é seguradora**;
- **Não comercializa seguros**, não emite apólices e não opera sob regime securitário;
- Os benefícios decorrem do **sistema de socorro mútuo** e do **rateio** entre associados;
- O recebimento de qualquer benefício depende do cumprimento deste termo/regulamento e da **regularidade financeira**.

## 3) Enquadramento Normativo (SUSEP)

Este termo observa as regras aplicáveis às associações e aos modelos mutualistas, incluindo a legislação vigente e normas correlatas, com vistas à conformidade regulatória.

## 4) Cobertura Contratada Neste Momento

Neste momento, o Associado declara ciência de que a cobertura principal contratada é **Furto e Roubo**.

Benefícios/coberturas **opcionais** (podem existir por convênio/plano, conforme contratação):

- Assistência 24h (reboque/guincho, chaveiro, pane seca, socorro elétrico/mecânico, etc.)
- Colisão / Perda Total
- Terceiros
- Carro reserva
- Vidros

## 5) Carência e Início de Funcionamento

O Associado declara ciência de que, como regra geral, os serviços/benefícios passam a funcionar **72 (setenta e duas) horas** após a **adesão**.

**Exceção:** a cobertura de **Furto e Roubo** é considerada **imediata** a partir da adesão, observado o cumprimento das exigências cadastrais e documentais.

## 6) Vencimento, Pagamento e Inadimplência

O não pagamento na data correta implica em **suspensão imediata** dos benefícios/coberturas até a regularização.

Durante a inadimplência:

- não há autorização de uso de benefícios;
- não há reembolso de despesas;
- a Associação pode exigir nova inspeção/vistoria e reinício de carência para reativação.

## 7) Socorro Mútuo e Rateio

Os benefícios decorrem do socorro mútuo entre associados. Os valores e critérios de rateio, quando aplicáveis, seguem regras internas técnicas, visando o equilíbrio do grupo e a continuidade do programa.

## 8) Aceite Eletrônico e Assinatura

O Associado concorda com o aceite eletrônico. Quando habilitado, o sistema registra **data/hora** e **IP do dispositivo** para fins de auditoria e validade jurídica.

---

**Declaração final:** Ao prosseguir, o Associado declara que leu, compreendeu e aceita os termos acima.
`,
      is_active: true,
    },
    cancel: {
      title: "Carta de Cancelamento",
      description: "Modelo usado quando houver cancelamento de plano.",
      content_markdown: "# Carta de Cancelamento\n\nEu, {{nome}} (CPF: {{cpf}}), solicito o cancelamento do plano {{plano}} em {{data}}.\n",
      is_active: true,
    },
  });

  const loadAll = async () => {
    if (!user || !companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Templates
      const { data: templates, error: templatesError } = await supabase
        .from("document_templates")
        .select("*")
        .eq("company_id", companyId)
        .in("template_type", ["contract", "cancellation_letter"]);
      if (templatesError) throw templatesError;

      const ct = (templates || []).find((t: any) => t.template_type === "contract" && t.template_key === "default_contract") ??
        (templates || []).find((t: any) => t.template_type === "contract");
      const cl = (templates || []).find((t: any) => t.template_type === "cancellation_letter" && t.template_key === "default_cancel") ??
        (templates || []).find((t: any) => t.template_type === "cancellation_letter");

      setContractTemplate((ct as any) ?? null);
      setCancelTemplate((cl as any) ?? null);

      if (ct) {
        const { data: versions, error } = await supabase
          .from("document_template_versions")
          .select("id, template_id, version, created_at")
          .eq("template_id", ct.id)
          .order("version", { ascending: false })
          .limit(20);
        if (error) throw error;
        setContractVersions((versions as any) ?? []);
      } else {
        setContractVersions([]);
      }

      if (cl) {
        const { data: versions, error } = await supabase
          .from("document_template_versions")
          .select("id, template_id, version, created_at")
          .eq("template_id", cl.id)
          .order("version", { ascending: false })
          .limit(20);
        if (error) throw error;
        setCancelVersions((versions as any) ?? []);
      } else {
        setCancelVersions([]);
      }

      // Settings
      const { data: docSettings, error: settingsError } = await supabase
        .from("document_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (settingsError) throw settingsError;

      setSettings((docSettings as any) ?? null);

      // Internal docs
      const { data: docs, error: docsError } = await supabase
        .from("internal_documents")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (docsError) throw docsError;
      setInternalDocs((docs as any) ?? []);

      // Seed editor with existing templates
      if (ct) {
        setEditor((prev) => ({
          ...prev,
          contract: {
            title: ct.title,
            description: ct.description ?? "",
            content_markdown: ct.content_markdown,
            is_active: ct.is_active,
          },
        }));
      }
      if (cl) {
        setEditor((prev) => ({
          ...prev,
          cancel: {
            title: cl.title,
            description: cl.description ?? "",
            content_markdown: cl.content_markdown,
            is_active: cl.is_active,
          },
        }));
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao carregar",
        description: e?.message ?? "Não foi possível carregar Documentos e Contratos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permissionsLoading) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoading, user?.id, companyId]);

  const upsertTemplate = async (type: TemplateType) => {
    if (!user || !companyId) return;
    if (!isAdmin || !(canAccessPage && (canEdit || isAdminPrincipal))) {
      toast({ title: "Acesso restrito", description: "Apenas administradores podem editar modelos.", variant: "destructive" });
      return;
    }

    const payload = type === "contract" ? editor.contract : editor.cancel;
    const templateKey = type === "contract" ? "default_contract" : "default_cancel";

    setSaving(true);
    try {
      const existing = type === "contract" ? contractTemplate : cancelTemplate;

      if (existing) {
        const { error } = await supabase
          .from("document_templates")
          .update({
            title: payload.title,
            description: payload.description || null,
            content_markdown: payload.content_markdown,
            is_active: payload.is_active,
            updated_by: user.id,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("document_templates")
          .insert({
            company_id: companyId,
            template_key: templateKey,
            template_type: type,
            title: payload.title,
            description: payload.description || null,
            content_markdown: payload.content_markdown,
            is_active: payload.is_active,
            created_by: user.id,
          });
        if (error) throw error;
      }

      toast({ title: "Salvo", description: "Modelo atualizado e versão registrada automaticamente." });
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao salvar", description: e?.message ?? "Falha ao salvar modelo.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const upsertSettings = async (partial: Partial<DocumentSettings>) => {
    if (!user || !companyId) return;
    if (!isAdmin) {
      toast({ title: "Acesso restrito", description: "Apenas administradores podem editar configurações.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const base: DocumentSettings = settings ?? {
        company_id: companyId,
        auto_generate_contract: true,
        require_digital_accept: true,
        record_ip_and_date: true,
        send_contract_by_email: true,
        show_contract_in_associate_area: true,
      };

      const next = { ...base, ...partial };

      const { error } = await supabase
        .from("document_settings")
        .upsert(next, { onConflict: "company_id" });
      if (error) throw error;

      setSettings(next);
      toast({ title: "Configurações salvas" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e?.message ?? "Falha ao salvar configurações.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const uploadInternalDocument = async (file: File) => {
    if (!user || !companyId) return;
    if (!isAdmin) {
      toast({ title: "Acesso restrito", description: "Apenas administradores podem enviar documentos internos.", variant: "destructive" });
      return;
    }

    if (!internalUpload.title.trim()) {
      toast({ title: "Título obrigatório", description: "Informe um título para o documento.", variant: "destructive" });
      return;
    }

    setInternalUpload((p) => ({ ...p, uploading: true }));
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `internal-docs/${companyId}/${internalUpload.category}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase
        .storage
        .from("termos-aceite")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("internal_documents")
        .insert({
          company_id: companyId,
          category: internalUpload.category,
          title: internalUpload.title,
          description: internalUpload.description || null,
          file_path: path,
          mime_type: file.type || null,
          created_by: user.id,
        });
      if (insertError) throw insertError;

      toast({ title: "Documento enviado" });
      setInternalUpload((p) => ({ ...p, title: "", description: "", uploading: false }));
      if (internalFileRef.current) internalFileRef.current.value = "";
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao enviar", description: e?.message ?? "Falha no upload.", variant: "destructive" });
      setInternalUpload((p) => ({ ...p, uploading: false }));
    }
  };

  const downloadInternalDoc = async (doc: InternalDocument) => {
    try {
      const { data, error } = await supabase
        .storage
        .from("termos-aceite")
        .createSignedUrl(doc.file_path, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Não foi possível gerar link.", variant: "destructive" });
    }
  };

  const removeInternalDoc = async (doc: InternalDocument) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      // Remover registro (arquivo pode ser limpo depois; aqui priorizamos histórico/controle)
      const { error } = await supabase
        .from("internal_documents")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;

      toast({ title: "Removido" });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao remover.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Sessão expirada</CardTitle>
              <CardDescription>Faça login novamente para continuar.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" />
                Acesso restrito
              </CardTitle>
              <CardDescription>Somente administradores podem editar contratos e documentos internos.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Documentos e Contratos</h1>
          <p className="text-muted-foreground">
            Cadastre modelos, versões e documentos internos. A geração automática roda ao confirmar pagamento.
          </p>
        </header>

        <Tabs defaultValue="contrato">
          <TabsList>
            <TabsTrigger value="contrato">Contrato padrão</TabsTrigger>
            <TabsTrigger value="cancelamento">Carta de cancelamento</TabsTrigger>
            <TabsTrigger value="internos">Documentos internos</TabsTrigger>
            <TabsTrigger value="configs">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="contrato" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contrato padrão
                </CardTitle>
                <CardDescription>
                  Edite em Markdown/HTML simples e use variáveis dinâmicas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={editor.contract.title}
                      onChange={(e) => setEditor((p) => ({ ...p, contract: { ...p.contract, title: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ativo</Label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editor.contract.is_active}
                        onCheckedChange={(v) => setEditor((p) => ({ ...p, contract: { ...p.contract, is_active: v } }))}
                      />
                      <span className="text-sm text-muted-foreground">
                        {editor.contract.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={editor.contract.description}
                    onChange={(e) => setEditor((p) => ({ ...p, contract: { ...p.contract, description: e.target.value } }))}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-2">
                    <Label>Conteúdo (Markdown)</Label>
                    <Textarea
                      value={editor.contract.content_markdown}
                      onChange={(e) =>
                        setEditor((p) => ({ ...p, contract: { ...p.contract, content_markdown: e.target.value } }))
                      }
                      className="min-h-[360px] font-mono"
                      placeholder={DEFAULT_VARIABLES_HELP}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Variáveis</Label>
                    <Card>
                      <CardContent className="pt-6">
                        <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{DEFAULT_VARIABLES_HELP}</pre>
                      </CardContent>
                    </Card>

                    <Separator className="my-4" />

                    <Label>Histórico (últimas 20)</Label>
                    <Card>
                      <CardContent className="pt-6 space-y-2">
                        {contractVersions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sem versões ainda.</p>
                        ) : (
                          contractVersions.map((v) => (
                            <div key={v.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <History className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">v{v.version}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{formatDateBR(v.created_at)}</span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => upsertTemplate("contract")} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar contrato
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancelamento" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Modelo de carta de cancelamento
                </CardTitle>
                <CardDescription>Texto editável com versionamento automático.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={editor.cancel.title}
                      onChange={(e) => setEditor((p) => ({ ...p, cancel: { ...p.cancel, title: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ativo</Label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editor.cancel.is_active}
                        onCheckedChange={(v) => setEditor((p) => ({ ...p, cancel: { ...p.cancel, is_active: v } }))}
                      />
                      <span className="text-sm text-muted-foreground">
                        {editor.cancel.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={editor.cancel.description}
                    onChange={(e) => setEditor((p) => ({ ...p, cancel: { ...p.cancel, description: e.target.value } }))}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-2">
                    <Label>Conteúdo (Markdown)</Label>
                    <Textarea
                      value={editor.cancel.content_markdown}
                      onChange={(e) =>
                        setEditor((p) => ({ ...p, cancel: { ...p.cancel, content_markdown: e.target.value } }))
                      }
                      className="min-h-[360px] font-mono"
                      placeholder={DEFAULT_VARIABLES_HELP}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Histórico (últimas 20)</Label>
                    <Card>
                      <CardContent className="pt-6 space-y-2">
                        {cancelVersions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sem versões ainda.</p>
                        ) : (
                          cancelVersions.map((v) => (
                            <div key={v.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <History className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">v{v.version}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{formatDateBR(v.created_at)}</span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => upsertTemplate("cancellation_letter")} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar carta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="internos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Documentos internos
                </CardTitle>
                <CardDescription>Uso exclusivo do administrador (certificados, SUSEP, PDFs).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-1">
                    <Label>Categoria</Label>
                    <Input
                      value={internalUpload.category}
                      onChange={(e) =>
                        setInternalUpload((p) => ({
                          ...p,
                          category: (e.target.value as any) || "pdf",
                        }))
                      }
                      placeholder="certificados | susep | pdf"
                    />
                    <p className="text-xs text-muted-foreground">Valores: certificados, susep, pdf</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Título</Label>
                    <Input
                      value={internalUpload.title}
                      onChange={(e) => setInternalUpload((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Ex.: Certificado 2026"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={internalUpload.description}
                    onChange={(e) => setInternalUpload((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Observações internas"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <input
                    ref={internalFileRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadInternalDocument(f);
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => internalFileRef.current?.click()}
                    disabled={internalUpload.uploading}
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    {internalUpload.uploading ? "Enviando..." : "Selecionar arquivo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">Arquivos ficam armazenados com acesso privado.</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Arquivos cadastrados</Label>
                  {internalDocs.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Nenhum documento interno cadastrado.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {internalDocs.map((d) => (
                        <Card key={d.id}>
                          <CardContent className="pt-6 flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{d.title}</span>
                                <Badge variant="secondary">{d.category}</Badge>
                              </div>
                              {d.description ? (
                                <p className="text-sm text-muted-foreground">{d.description}</p>
                              ) : null}
                              <p className="text-xs text-muted-foreground">{formatDateBR(d.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => downloadInternalDoc(d)}>
                                Baixar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeInternalDoc(d)}
                                disabled={saving}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações gerais</CardTitle>
                <CardDescription>Controle a geração automática, aceite digital e exibição na área do associado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Ativar geração automática de contrato</p>
                    <p className="text-sm text-muted-foreground">Gera contrato quando a mensalidade é confirmada como paga.</p>
                  </div>
                  <Switch
                    checked={settings?.auto_generate_contract ?? true}
                    onCheckedChange={(v) => upsertSettings({ auto_generate_contract: v })}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Exigir aceite digital</p>
                    <p className="text-sm text-muted-foreground">Registra aceite e libera o download na área do associado.</p>
                  </div>
                  <Switch
                    checked={settings?.require_digital_accept ?? true}
                    onCheckedChange={(v) => upsertSettings({ require_digital_accept: v })}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Registrar IP e data</p>
                    <p className="text-sm text-muted-foreground">Armazena IP e carimbo de tempo na geração/aceite.</p>
                  </div>
                  <Switch
                    checked={settings?.record_ip_and_date ?? true}
                    onCheckedChange={(v) => upsertSettings({ record_ip_and_date: v })}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Enviar contrato por e-mail</p>
                    <p className="text-sm text-muted-foreground">Envia o PDF ao associado após geração.</p>
                  </div>
                  <Switch
                    checked={settings?.send_contract_by_email ?? true}
                    onCheckedChange={(v) => upsertSettings({ send_contract_by_email: v })}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Exibir contrato na área do associado</p>
                    <p className="text-sm text-muted-foreground">Permite que o associado visualize/baixe seus contratos.</p>
                  </div>
                  <Switch
                    checked={settings?.show_contract_in_associate_area ?? true}
                    onCheckedChange={(v) => upsertSettings({ show_contract_in_associate_area: v })}
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
