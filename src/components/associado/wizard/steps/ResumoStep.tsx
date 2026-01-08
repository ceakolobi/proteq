import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, FileText, Car, Camera, CheckCircle, CreditCard, Building2, ShieldCheck } from 'lucide-react';
import type { AssociadoFormData, VeiculoFormData, DocumentoUpload } from '../types';
import { vehicleTypeLabels } from '@/types/database';
import { DIA_VENCIMENTO_OPTIONS } from '../types';

interface ResumoStepProps {
  associadoData: AssociadoFormData;
  veiculoData: VeiculoFormData;
  docsAssociado: DocumentoUpload[];
  docsVeiculo: DocumentoUpload[];
}

const formatCPF = (cpf: string): string => {
  const clean = cpf.replace(/\D/g, '');
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function ResumoStep({ associadoData, veiculoData, docsAssociado, docsVeiculo }: ResumoStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <CheckCircle className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Resumo do Cadastro</h3>
      </div>

      <div className="bg-primary/10 p-4 rounded-lg">
        <p className="text-sm text-center">
          Revise as informações abaixo antes de confirmar o cadastro.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dados do Associado */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados do Associado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{associadoData.nome_completo}</span>
              
              <span className="text-muted-foreground">CPF:</span>
              <span>{formatCPF(associadoData.cpf)}</span>
              
              {associadoData.rg && (
                <>
                  <span className="text-muted-foreground">RG:</span>
                  <span>{associadoData.rg}</span>
                </>
              )}
              
              {associadoData.data_nascimento && (
                <>
                  <span className="text-muted-foreground">Nascimento:</span>
                  <span>{new Date(associadoData.data_nascimento).toLocaleDateString('pt-BR')}</span>
                </>
              )}
              
              <span className="text-muted-foreground">Telefone:</span>
              <span>{formatPhone(associadoData.telefone)}</span>
              
              {associadoData.whatsapp && (
                <>
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <span>{formatPhone(associadoData.whatsapp)}</span>
                </>
              )}
              
              <span className="text-muted-foreground">E-mail:</span>
              <span className="break-all">{associadoData.email}</span>
              
              <span className="text-muted-foreground">Vencimento:</span>
              <span className="font-medium text-primary">
                Dia {String(associadoData.dia_vencimento).padStart(2, '0')}
              </span>
              
              {associadoData.profissao && (
                <>
                  <span className="text-muted-foreground">Profissão:</span>
                  <span>{associadoData.profissao}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {associadoData.endereco}
              {associadoData.numero && `, ${associadoData.numero}`}
              {associadoData.complemento && ` - ${associadoData.complemento}`}
            </p>
            {associadoData.bairro && <p>{associadoData.bairro}</p>}
            <p>
              {associadoData.cidade} - {associadoData.estado}
            </p>
            <p className="text-muted-foreground">
              CEP: {associadoData.cep}
            </p>
          </CardContent>
        </Card>

        {/* Dados do Veículo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" />
              Dados do Veículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Placa:</span>
              <span className="font-medium uppercase">{veiculoData.placa}</span>
              
              <span className="text-muted-foreground">Tipo:</span>
              <span>{vehicleTypeLabels[veiculoData.tipo]}</span>
              
              <span className="text-muted-foreground">Marca/Modelo:</span>
              <span>{veiculoData.marca} {veiculoData.modelo}</span>
              
              <span className="text-muted-foreground">Ano:</span>
              <span>{veiculoData.ano}</span>
              
              <span className="text-muted-foreground">Valor FIPE:</span>
              <span className="font-medium text-primary">{formatCurrency(veiculoData.valor_fipe)}</span>
              
              {veiculoData.cor && (
                <>
                  <span className="text-muted-foreground">Cor:</span>
                  <span className="capitalize">{veiculoData.cor}</span>
                </>
              )}
              
              {veiculoData.combustivel && (
                <>
                  <span className="text-muted-foreground">Combustível:</span>
                  <span className="capitalize">{veiculoData.combustivel}</span>
                </>
              )}
              
              <span className="text-muted-foreground">Situação:</span>
              <span className="capitalize">{veiculoData.situacao_financeira}</span>
            </div>
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos Anexados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Associado:</p>
              {docsAssociado.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {docsAssociado.map((doc) => (
                    <Badge key={doc.tipo} variant="secondary" className="text-xs">
                      {doc.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic">Nenhum documento</span>
              )}
            </div>
            
            <div>
              <p className="text-muted-foreground mb-1">Veículo:</p>
              {docsVeiculo.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {docsVeiculo.map((doc) => (
                    <Badge key={doc.tipo} variant="secondary" className="text-xs">
                      {doc.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic">Nenhum documento</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informação de Migração */}
      {associadoData.veio_de_outra_associacao && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
              <ShieldCheck className="h-4 w-4" />
              Dispensa Automática de Vistoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Associação Anterior:</span>
              <span className="font-medium">{associadoData.nome_associacao_anterior}</span>
              
              <span className="text-muted-foreground">Data de Saída:</span>
              <span>{new Date(associadoData.data_saida_associacao).toLocaleDateString('pt-BR')}</span>
              
              <span className="text-muted-foreground">Comprovante:</span>
              <span>{associadoData.comprovante_migracao_file?.name || 'Anexado'}</span>
            </div>
            <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/50 rounded-md">
              <p className="text-xs text-green-800 dark:text-green-300">
                <strong>✓ Vistoria será dispensada automaticamente</strong> - O associado poderá ter a proteção ativada mais rapidamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-muted/50 p-4 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          Ao confirmar, o associado será vinculado automaticamente à sua regional.
          Você poderá editar as informações posteriormente.
        </p>
      </div>
    </div>
  );
}
