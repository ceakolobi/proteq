import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Mail, Phone, Calendar, Briefcase, Heart, CreditCard, Building2, Upload, FileCheck } from 'lucide-react';
import type { AssociadoFormData } from '../types';
import { ESTADO_CIVIL_OPTIONS, DIA_VENCIMENTO_OPTIONS } from '../types';
import { DocumentScanner, type ScanResult } from '@/components/associado/DocumentScanner';

interface DadosAssociadoStepProps {
  data: AssociadoFormData;
  onChange: (data: AssociadoFormData) => void;
  onDocumentScanned?: (result: ScanResult) => void;
}

// Mask functions
const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
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
    .replace(/(-\d{4})\d+?$/, '$1');
};

export function DadosAssociadoStep({ data, onChange, onDocumentScanned }: DadosAssociadoStepProps) {
  const handleChange = (field: keyof AssociadoFormData, value: string | boolean | File | null) => {
    onChange({ ...data, [field]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleChange('comprovante_migracao_file', file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Dados Pessoais</h3>
        </div>
        <DocumentScanner
          documentKind="cnh"
          onExtracted={(extracted) => {
            onChange({
              ...data,
              nome_completo: (extracted.nome_completo as string) || data.nome_completo,
              cpf: extracted.cpf ? maskCPF(extracted.cpf as string) : data.cpf,
              rg: extracted.rg ? maskRG(extracted.rg as string) : data.rg,
              data_nascimento: (extracted.data_nascimento as string) || data.data_nascimento,
              // telefone e email NUNCA preenchidos automaticamente — manual obrigatório
            });
          }}
          onScanned={onDocumentScanned}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Nome Completo */}
        <div className="sm:col-span-2 lg:col-span-3 space-y-2">
          <Label htmlFor="nome_completo">
            Nome Completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nome_completo"
            placeholder="Nome completo do associado"
            value={data.nome_completo}
            onChange={(e) => handleChange('nome_completo', e.target.value)}
          />
        </div>

        {/* CPF */}
        <div className="space-y-2">
          <Label htmlFor="cpf">
            CPF <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cpf"
            placeholder="000.000.000-00"
            value={data.cpf}
            onChange={(e) => handleChange('cpf', maskCPF(e.target.value))}
            maxLength={14}
          />
        </div>

        {/* RG */}
        <div className="space-y-2">
          <Label htmlFor="rg">RG</Label>
          <Input
            id="rg"
            placeholder="00.000.000-0"
            value={data.rg}
            onChange={(e) => handleChange('rg', maskRG(e.target.value))}
            maxLength={12}
          />
        </div>

        {/* Data de Nascimento */}
        <div className="space-y-2">
          <Label htmlFor="data_nascimento">
            Data de Nascimento
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="data_nascimento"
              type="date"
              className="pl-10"
              value={data.data_nascimento}
              onChange={(e) => handleChange('data_nascimento', e.target.value)}
            />
          </div>
        </div>

        {/* Estado Civil */}
        <div className="space-y-2">
          <Label htmlFor="estado_civil">Estado Civil</Label>
          <Select
            value={data.estado_civil}
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
          <Label htmlFor="profissao">Profissão</Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="profissao"
              placeholder="Ex: Engenheiro"
              className="pl-10"
              value={data.profissao}
              onChange={(e) => handleChange('profissao', e.target.value)}
            />
          </div>
        </div>

        {/* Telefone */}
        <div className="space-y-2">
          <Label htmlFor="telefone">
            Telefone <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="telefone"
              placeholder="(00) 00000-0000"
              className="pl-10"
              value={data.telefone}
              onChange={(e) => handleChange('telefone', maskPhone(e.target.value))}
              maxLength={15}
            />
          </div>
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="whatsapp"
              placeholder="(00) 00000-0000"
              className="pl-10"
              value={data.whatsapp}
              onChange={(e) => handleChange('whatsapp', maskPhone(e.target.value))}
              maxLength={15}
            />
          </div>
        </div>

        {/* E-mail */}
        <div className="space-y-2">
          <Label htmlFor="email">
            E-mail <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              className="pl-10"
              value={data.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
        </div>

        {/* Dia de Vencimento */}
        <div className="space-y-2">
          <Label htmlFor="dia_vencimento">
            Dia de Vencimento
          </Label>
          <Select
            value={String(data.dia_vencimento)}
            onValueChange={(value) => onChange({ ...data, dia_vencimento: Number(value) })}
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
          <p className="text-xs text-muted-foreground">
            Dia do mês para vencimento das mensalidades
          </p>
        </div>
      </div>

      {/* Seção de Migração de Outra Associação */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Migração de Outra Associação</CardTitle>
          </div>
          <CardDescription>
            Se o associado já fazia parte de outra associação de proteção veicular, a vistoria pode ser dispensada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="veio_de_outra_associacao" className="font-medium">
                Já fazia parte de outra associação?
              </Label>
              <p className="text-xs text-muted-foreground">
                Marque esta opção para dispensa automática de vistoria
              </p>
            </div>
            <Switch
              id="veio_de_outra_associacao"
              checked={data.veio_de_outra_associacao}
              onCheckedChange={(checked) => handleChange('veio_de_outra_associacao', checked)}
            />
          </div>

          {data.veio_de_outra_associacao && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome da Associação Anterior */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="nome_associacao_anterior">
                    Nome da Associação Anterior
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nome_associacao_anterior"
                      placeholder="Ex: Proteção XYZ"
                      className="pl-10"
                      value={data.nome_associacao_anterior}
                      onChange={(e) => handleChange('nome_associacao_anterior', e.target.value)}
                    />
                  </div>
                </div>

                {/* Data de Saída */}
                <div className="space-y-2">
                  <Label htmlFor="data_saida_associacao">
                    Data de Saída
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="data_saida_associacao"
                      type="date"
                      className="pl-10"
                      value={data.data_saida_associacao}
                      onChange={(e) => handleChange('data_saida_associacao', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Upload de Comprovante */}
              <div className="space-y-2">
                <Label htmlFor="comprovante_migracao">
                  Documento Comprobatório
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  <input
                    id="comprovante_migracao"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label 
                    htmlFor="comprovante_migracao" 
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {data.comprovante_migracao_file ? (
                      <>
                        <FileCheck className="h-8 w-8 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          {data.comprovante_migracao_file.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Clique para alterar
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Clique para enviar comprovante
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Declaração, contrato, boleto, carteirinha ou outro comprovante (PDF, JPG, PNG)
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Importante:</strong> Ao anexar o comprovante, a vistoria será automaticamente dispensada 
                  e o associado poderá ter a proteção ativada mais rapidamente.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <span className="text-destructive">*</span> Nome completo, CPF, telefone e e-mail são obrigatórios. Todos os demais campos são opcionais.
      </p>
    </div>
  );
}
