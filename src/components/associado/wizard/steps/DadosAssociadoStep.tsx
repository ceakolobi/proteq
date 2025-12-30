import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Mail, Phone, Calendar, Briefcase, Heart } from 'lucide-react';
import type { AssociadoFormData } from '../types';
import { ESTADO_CIVIL_OPTIONS } from '../types';

interface DadosAssociadoStepProps {
  data: AssociadoFormData;
  onChange: (data: AssociadoFormData) => void;
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

export function DadosAssociadoStep({ data, onChange }: DadosAssociadoStepProps) {
  const handleChange = (field: keyof AssociadoFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <User className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Dados Pessoais</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome Completo */}
        <div className="md:col-span-2 space-y-2">
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
        <div className="md:col-span-2 space-y-2">
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
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="text-destructive">*</span> Campos obrigatórios
      </p>
    </div>
  );
}
