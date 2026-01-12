import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  User, 
  MapPin, 
  FileText, 
  Calendar, 
  Phone, 
  Mail, 
  Briefcase, 
  Heart,
  CreditCard,
  Search,
  Loader2,
  Upload,
  Eye,
  Trash2,
  ExternalLink,
  Building2
} from 'lucide-react';
import type { AssociateStatus } from '@/types/database';
import { 
  ESTADO_CIVIL_OPTIONS, 
  DIA_VENCIMENTO_OPTIONS, 
  ESTADOS_BRASILEIROS 
} from './wizard/types';
import { useAuth } from '@/contexts/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';

interface AssociadoData {
  id: string;
  nome_completo: string;
  cpf: string;
  rg?: string;
  data_nascimento?: string;
  telefone: string;
  whatsapp?: string;
  email: string;
  estado_civil?: string;
  profissao?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  dia_vencimento?: number;
  status: AssociateStatus;
  regiao_id?: string;
  // CNH fields
  cnh_numero?: string;
  cnh_categoria?: string;
  cnh_validade?: string;
  cnh_estado?: string;
}

interface DocumentoAssociado {
  id: string;
  tipo: string;
  nome_arquivo: string;
  url: string;
  created_at: string;
}

interface AssociadoEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  associado: AssociadoData | null;
  onSuccess: () => void;
  canEditStatus?: boolean;
}

// Mask functions
const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(\-\d{2})\d+?$/, '$1');
};

const maskRG = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1})/, '$1-$2')
    .slice(0, 12);
};

const maskPhone = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(\-\d{4})\d+?$/, '$1');
};

const maskCEP = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9);
};

const DOCUMENT_TYPES = [
  { tipo: 'cnh', label: 'CNH' },
  { tipo: 'rg', label: 'RG' },
  { tipo: 'cpf', label: 'CPF' },
  { tipo: 'comprovante_residencia', label: 'Comprovante de Residência' },
];

const CNH_CATEGORIAS = ['A', 'B', 'AB', 'C', 'D', 'E', 'AC', 'AD', 'AE'];

export function AssociadoEditModal({
  open,
  onOpenChange,
  associado,
  onSuccess,
  canEditStatus = false,
}: AssociadoEditModalProps) {
  const { isAdminPrincipal, hasRole } = useAuth();
  const { regioes, isLoading: regioesLoading } = useReferenceData({ loadRegioes: true });
  
  const [formData, setFormData] = useState<Partial<AssociadoData>>({});
  const [documentos, setDocumentos] = useState<DocumentoAssociado[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dados');
  
  // Apenas Admin Principal e Admin Básico podem trocar a regional
  const canChangeRegiao = isAdminPrincipal || hasRole('admin_nivel_basico');

  // Load associado data when modal opens
  useEffect(() => {
    if (open && associado) {
      setFormData({
        nome_completo: associado.nome_completo || '',
        cpf: associado.cpf || '',
        rg: associado.rg || '',
        data_nascimento: associado.data_nascimento || '',
        telefone: associado.telefone || '',
        whatsapp: associado.whatsapp || '',
        email: associado.email || '',
        estado_civil: associado.estado_civil || '',
        profissao: associado.profissao || '',
        cep: associado.cep || '',
        endereco: associado.endereco || '',
        numero: associado.numero || '',
        complemento: associado.complemento || '',
        bairro: associado.bairro || '',
        cidade: associado.cidade || '',
        estado: associado.estado || '',
        dia_vencimento: associado.dia_vencimento || 10,
        status: associado.status,
        regiao_id: (associado as any).regiao_id || '',
        cnh_numero: (associado as any).cnh_numero || '',
        cnh_categoria: (associado as any).cnh_categoria || '',
        cnh_validade: (associado as any).cnh_validade || '',
        cnh_estado: (associado as any).cnh_estado || '',
      });
      fetchDocumentos(associado.id);
      setActiveTab('dados');
    }
  }, [open, associado]);

  const fetchDocumentos = async (associadoId: string) => {
    try {
      const { data, error } = await supabase
        .from('documentos_associado')
        .select('*')
        .eq('associado_id', associadoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      console.error('Error fetching documentos:', error);
    }
  };

  const handleChange = (field: keyof AssociadoData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const searchCEP = async () => {
    const cepLimpo = (formData.cep || '').replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      toast.error('CEP deve ter 8 dígitos');
      return;
    }

    setIsSearchingCEP(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const result = await response.json();
      
      if (result.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        endereco: result.logradouro || '',
        bairro: result.bairro || '',
        cidade: result.localidade || '',
        estado: result.uf || '',
        complemento: result.complemento || prev?.complemento || '',
      }));
      
      toast.success('Endereço encontrado!');
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setIsSearchingCEP(false);
    }
  };

  const handleCEPChange = (value: string) => {
    const masked = maskCEP(value);
    handleChange('cep', masked);
    
    const cepLimpo = value.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setTimeout(() => searchCEP(), 100);
    }
  };

  const handleFileUpload = async (tipo: string, file: File) => {
    if (!associado?.id) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG, WebP ou PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }

    setUploadingDoc(tipo);

    try {
      // Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${associado.id}/${tipo}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('associado-documentos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('associado-documentos')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('documentos_associado')
        .insert({
          associado_id: associado.id,
          tipo,
          nome_arquivo: file.name,
          url: publicUrl,
        });

      if (dbError) throw dbError;

      toast.success('Documento enviado com sucesso!');
      fetchDocumentos(associado.id);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Erro ao enviar documento');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDeleteDocumento = async (doc: DocumentoAssociado) => {
    if (!confirm('Deseja realmente excluir este documento?')) return;

    try {
      // Delete from storage
      const urlParts = doc.url.split('/');
      const path = urlParts.slice(-2).join('/');
      
      await supabase.storage
        .from('associado-documentos')
        .remove([path]);

      // Delete from database
      const { error } = await supabase
        .from('documentos_associado')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast.success('Documento excluído');
      fetchDocumentos(associado!.id);
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Erro ao excluir documento');
    }
  };

  const handleSave = async () => {
    if (!associado?.id) return;

    // Validation
    if (!formData.nome_completo?.trim() || !formData.cpf?.trim() || !formData.email?.trim() || !formData.telefone?.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const cpfLimpo = (formData.cpf || '').replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email || '')) {
      toast.error('Email inválido');
      return;
    }

    setIsLoading(true);

    try {
      const updateData: Record<string, any> = {
        nome_completo: formData.nome_completo?.trim(),
        cpf: cpfLimpo,
        rg: formData.rg?.replace(/\D/g, '') || null,
        data_nascimento: formData.data_nascimento || null,
        telefone: formData.telefone?.trim(),
        whatsapp: formData.whatsapp?.trim() || null,
        email: formData.email?.trim().toLowerCase(),
        estado_civil: formData.estado_civil || null,
        profissao: formData.profissao?.trim() || null,
        cep: formData.cep?.replace(/\D/g, '') || null,
        endereco: formData.endereco?.trim() || null,
        numero: formData.numero?.trim() || null,
        complemento: formData.complemento?.trim() || null,
        bairro: formData.bairro?.trim() || null,
        cidade: formData.cidade?.trim() || null,
        estado: formData.estado || null,
        dia_vencimento: formData.dia_vencimento || 10,
        status: formData.status,
      };

      // Adiciona regiao_id apenas se o usuário pode alterar
      if (canChangeRegiao && formData.regiao_id) {
        updateData.regiao_id = formData.regiao_id;
      }

      const { error } = await supabase
        .from('associados')
        .update(updateData)
        .eq('id', associado.id);

      if (error) throw error;

      toast.success('Associado atualizado com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving associado:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe um associado com este CPF');
      } else {
        toast.error(error.message || 'Erro ao salvar');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getDocByTipo = (tipo: string) => {
    return documentos.filter(d => d.tipo === tipo);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Associado</DialogTitle>
          <DialogDescription>
            Atualize os dados do associado {associado?.nome_completo}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="endereco" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Endereço</span>
            </TabsTrigger>
            <TabsTrigger value="cnh" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">CNH</span>
            </TabsTrigger>
            <TabsTrigger value="documentos" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
              {documentos.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {documentos.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4 mt-4">
            {/* Dados Pessoais Tab */}
            <TabsContent value="dados" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="md:col-span-2 space-y-2">
                  <Label>Nome Completo <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.nome_completo || ''}
                    onChange={(e) => handleChange('nome_completo', e.target.value)}
                    placeholder="Nome completo do associado"
                  />
                </div>

                {/* CPF */}
                <div className="space-y-2">
                  <Label>CPF <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.cpf || ''}
                    onChange={(e) => handleChange('cpf', maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                {/* RG */}
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input
                    value={formData.rg || ''}
                    onChange={(e) => handleChange('rg', maskRG(e.target.value))}
                    placeholder="00.000.000-0"
                    maxLength={12}
                  />
                </div>

                {/* Data de Nascimento */}
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={formData.data_nascimento || ''}
                      onChange={(e) => handleChange('data_nascimento', e.target.value)}
                    />
                  </div>
                </div>

                {/* Estado Civil */}
                <div className="space-y-2">
                  <Label>Estado Civil</Label>
                  <Select
                    value={formData.estado_civil || ''}
                    onValueChange={(value) => handleChange('estado_civil', value)}
                  >
                    <SelectTrigger>
                      <Heart className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADO_CIVIL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Profissão */}
                <div className="space-y-2">
                  <Label>Profissão</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      value={formData.profissao || ''}
                      onChange={(e) => handleChange('profissao', e.target.value)}
                      placeholder="Ex: Engenheiro"
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label>Telefone <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      value={formData.telefone || ''}
                      onChange={(e) => handleChange('telefone', maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      value={formData.whatsapp || ''}
                      onChange={(e) => handleChange('whatsapp', maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div className="space-y-2">
                  <Label>E-mail <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      className="pl-10"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                {/* Dia de Vencimento */}
                <div className="space-y-2">
                  <Label>Dia de Vencimento</Label>
                  <Select
                    value={String(formData.dia_vencimento || 10)}
                    onValueChange={(value) => handleChange('dia_vencimento', Number(value))}
                  >
                    <SelectTrigger>
                      <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIA_VENCIMENTO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Regional */}
                {canChangeRegiao && (
                  <div className="space-y-2">
                    <Label>Regional</Label>
                    <Select
                      value={formData.regiao_id || ''}
                      onValueChange={(value) => handleChange('regiao_id' as keyof AssociadoData, value)}
                      disabled={regioesLoading}
                    >
                      <SelectTrigger>
                        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder={regioesLoading ? "Carregando..." : "Selecione a regional"} />
                      </SelectTrigger>
                      <SelectContent>
                        {regioes.map((regiao) => (
                          <SelectItem key={regiao.id} value={regiao.id}>
                            {regiao.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Status */}
                {canEditStatus && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status || 'ativo'}
                      onValueChange={(value: AssociateStatus) => handleChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inadimplente">Inadimplente</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Endereço Tab */}
            <TabsContent value="endereco" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* CEP */}
                <div className="md:col-span-2 space-y-2">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="00000-000"
                      value={formData.cep || ''}
                      onChange={(e) => handleCEPChange(e.target.value)}
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={searchCEP}
                      disabled={isSearchingCEP}
                    >
                      {isSearchingCEP ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digite o CEP para buscar automaticamente
                  </p>
                </div>

                <div className="hidden md:block md:col-span-4" />

                {/* Endereço */}
                <div className="md:col-span-4 space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    value={formData.endereco || ''}
                    onChange={(e) => handleChange('endereco', e.target.value)}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                {/* Número */}
                <div className="md:col-span-1 space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={formData.numero || ''}
                    onChange={(e) => handleChange('numero', e.target.value)}
                    placeholder="Nº"
                  />
                </div>

                {/* Complemento */}
                <div className="md:col-span-1 space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    value={formData.complemento || ''}
                    onChange={(e) => handleChange('complemento', e.target.value)}
                    placeholder="Apto, Sala..."
                  />
                </div>

                {/* Bairro */}
                <div className="md:col-span-2 space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={formData.bairro || ''}
                    onChange={(e) => handleChange('bairro', e.target.value)}
                    placeholder="Bairro"
                  />
                </div>

                {/* Cidade */}
                <div className="md:col-span-2 space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.cidade || ''}
                    onChange={(e) => handleChange('cidade', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>

                {/* Estado */}
                <div className="md:col-span-2 space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={formData.estado || ''}
                    onValueChange={(value) => handleChange('estado', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASILEIROS.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* CNH Tab */}
            <TabsContent value="cnh" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Número da CNH */}
                <div className="space-y-2">
                  <Label>Número da CNH</Label>
                  <Input
                    value={formData.cnh_numero || ''}
                    onChange={(e) => handleChange('cnh_numero' as any, e.target.value.replace(/\D/g, ''))}
                    placeholder="00000000000"
                    maxLength={11}
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.cnh_categoria || ''}
                    onValueChange={(value) => handleChange('cnh_categoria' as any, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CNH_CATEGORIAS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data de Validade */}
                <div className="space-y-2">
                  <Label>Data de Validade</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={formData.cnh_validade || ''}
                      onChange={(e) => handleChange('cnh_validade' as any, e.target.value)}
                    />
                  </div>
                </div>

                {/* Estado de Emissão */}
                <div className="space-y-2">
                  <Label>Estado de Emissão</Label>
                  <Select
                    value={formData.cnh_estado || ''}
                    onValueChange={(value) => handleChange('cnh_estado' as any, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASILEIROS.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Você pode anexar o documento da CNH na aba "Documentos".
              </p>
            </TabsContent>

            {/* Documentos Tab */}
            <TabsContent value="documentos" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DOCUMENT_TYPES.map((docType) => {
                  const docs = getDocByTipo(docType.tipo);
                  return (
                    <div key={docType.tipo} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{docType.label}</Label>
                        {docs.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {docs.length} arquivo(s)
                          </Badge>
                        )}
                      </div>

                      {/* Existing documents */}
                      {docs.map((doc) => (
                        <div 
                          key={doc.id} 
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                        >
                          <span className="truncate flex-1 mr-2">{doc.nome_arquivo}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteDocumento(doc)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Upload button */}
                      <label className="cursor-pointer">
                        <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-md hover:bg-muted/50 transition-colors">
                          {uploadingDoc === docType.tipo ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {uploadingDoc === docType.tipo ? 'Enviando...' : 'Enviar documento'}
                          </span>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          disabled={uploadingDoc !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(docType.tipo, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                Formatos aceitos: JPG, PNG, WebP, PDF. Tamanho máximo: 10MB.
              </p>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
