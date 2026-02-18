import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import type { WizardFormData } from './CotacaoWizardTypes';

interface Props {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  errors: Record<string, string>;
}

export function WizardStep2Client({ formData, updateFormData, errors }: Props) {
  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Dados do Cliente
          </CardTitle>
          <CardDescription>Preencha as informações do associado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Cliente</Label>
            <RadioGroup
              value={formData.cliente_tipo}
              onValueChange={(v: 'pf' | 'pj') => updateFormData({ cliente_tipo: v })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pf" id="pf" />
                <Label htmlFor="pf">Pessoa Física</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pj" id="pj" />
                <Label htmlFor="pj">Pessoa Jurídica</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="cliente_nome">
              {formData.cliente_tipo === 'pj' ? 'Razão Social' : 'Nome Completo'} *
            </Label>
            <Input
              id="cliente_nome"
              value={formData.cliente_nome}
              onChange={(e) => updateFormData({ cliente_nome: e.target.value })}
              placeholder={formData.cliente_tipo === 'pj' ? 'Razão social da empresa' : 'Nome completo do cliente'}
              className={errors.cliente_nome ? 'border-destructive' : ''}
            />
            {errors.cliente_nome && <p className="text-xs text-destructive">{errors.cliente_nome}</p>}
          </div>

          {/* CPF/CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cliente_cpf">
              {formData.cliente_tipo === 'pj' ? 'CNPJ' : 'CPF'}
            </Label>
            <Input
              id="cliente_cpf"
              value={formData.cliente_cpf}
              onChange={(e) => {
                const formatted = formData.cliente_tipo === 'pj'
                  ? formatCnpj(e.target.value)
                  : formatCpf(e.target.value);
                updateFormData({ cliente_cpf: formatted });
              }}
              placeholder={formData.cliente_tipo === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'}
            />
          </div>

          {/* Email + WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_email" className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> E-mail *
              </Label>
              <Input
                id="cliente_email"
                type="email"
                value={formData.cliente_email}
                onChange={(e) => updateFormData({ cliente_email: e.target.value })}
                placeholder="email@exemplo.com"
                className={errors.cliente_email ? 'border-destructive' : ''}
              />
              {errors.cliente_email && <p className="text-xs text-destructive">{errors.cliente_email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente_whatsapp" className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> WhatsApp *
              </Label>
              <Input
                id="cliente_whatsapp"
                value={formData.cliente_whatsapp}
                onChange={(e) => updateFormData({ cliente_whatsapp: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                className={errors.cliente_whatsapp ? 'border-destructive' : ''}
              />
              {errors.cliente_whatsapp && <p className="text-xs text-destructive">{errors.cliente_whatsapp}</p>}
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="cliente_endereco" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Endereço
            </Label>
            <Input
              id="cliente_endereco"
              value={formData.cliente_endereco}
              onChange={(e) => updateFormData({ cliente_endereco: e.target.value })}
              placeholder="Rua, nº, bairro, cidade - UF"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
