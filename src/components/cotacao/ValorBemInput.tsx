import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MetodoValoracao } from '@/types/cotacao';
import { metodoValoracaoLabels } from '@/types/cotacao';

interface ValorBemInputProps {
  valorBem: string;
  onValorChange: (value: string) => void;
  metodoValoracao: MetodoValoracao;
  onMetodoChange: (value: MetodoValoracao) => void;
  codigoFipe: string;
  onCodigoFipeChange: (value: string) => void;
  fipeBloqueado: boolean;
  tipoTemFipe: boolean;
  error?: string;
}

export default function ValorBemInput({
  valorBem,
  onValorChange,
  metodoValoracao,
  onMetodoChange,
  codigoFipe,
  onCodigoFipeChange,
  fipeBloqueado,
  tipoTemFipe,
  error,
}: ValorBemInputProps) {
  const [showUpload, setShowUpload] = useState(false);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove caracteres não numéricos exceto ponto e vírgula
    const rawValue = e.target.value.replace(/[^\d.,]/g, '');
    onValorChange(rawValue);
  };

  const formatDisplayValue = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) return value;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4">
      {/* Método de Valoração */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Método de Valoração
          {fipeBloqueado && (
            <Badge className="gap-1 bg-green-500 text-xs">
              <Lock className="w-3 h-3" />
              FIPE Automática
            </Badge>
          )}
        </Label>
        <Select
          value={metodoValoracao}
          onValueChange={(value) => onMetodoChange(value as MetodoValoracao)}
          disabled={fipeBloqueado || !tipoTemFipe}
        >
          <SelectTrigger className={cn(
            fipeBloqueado && "bg-green-50 dark:bg-green-950 border-green-500"
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tipoTemFipe && <SelectItem value="fipe">Tabela FIPE</SelectItem>}
            <SelectItem value="venal">Valor Venal</SelectItem>
            <SelectItem value="nota_fiscal">Nota Fiscal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mensagem explicativa */}
      {!tipoTemFipe && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Este tipo de bem não possui tabela FIPE. Informe o valor venal ou da nota fiscal.</span>
          </div>
        </div>
      )}

      {fipeBloqueado && (
        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-2 text-green-700 dark:text-green-300 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Valor FIPE obtido automaticamente. Este campo está bloqueado para garantir a precisão.</span>
          </div>
        </div>
      )}

      {metodoValoracao === 'fipe' && !fipeBloqueado && tipoTemFipe && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Integração FIPE preparada para futura API. Insira o valor FIPE manualmente.</span>
          </div>
        </div>
      )}

      {/* Valor do Bem */}
      <div className="space-y-2">
        <Label>Valor do Bem (R$) *</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className={cn(
              "pl-10 text-lg h-12",
              fipeBloqueado && "bg-green-50 dark:bg-green-950 border-green-500 cursor-not-allowed",
              error && "border-destructive"
            )}
            value={valorBem}
            onChange={handleValorChange}
            disabled={fipeBloqueado}
          />
          {fipeBloqueado && (
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Código FIPE (quando método é FIPE) */}
      {metodoValoracao === 'fipe' && (
        <div className="space-y-2">
          <Label>Código FIPE {fipeBloqueado ? '' : '(opcional)'}</Label>
          <Input
            placeholder="Ex: 001234-5"
            value={codigoFipe}
            onChange={(e) => onCodigoFipeChange(e.target.value)}
            disabled={fipeBloqueado}
            className={cn(
              fipeBloqueado && "bg-green-50 dark:bg-green-950 border-green-500"
            )}
          />
        </div>
      )}

      {/* Upload Nota Fiscal */}
      {metodoValoracao === 'nota_fiscal' && (
        <div className="space-y-2">
          <Label>Upload Nota Fiscal (opcional)</Label>
          <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Clique para anexar ou arraste o arquivo</p>
            <p className="text-xs mt-1">PDF, JPG ou PNG até 5MB</p>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <FileText className="w-3 h-3" />
            A nota fiscal será usada para comprovar o valor informado
          </p>
        </div>
      )}
    </div>
  );
}
