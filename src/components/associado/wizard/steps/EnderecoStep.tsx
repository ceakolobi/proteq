import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AssociadoFormData } from '../types';
import { ESTADOS_BRASILEIROS } from '../types';
import { DocumentScanner, type ScanResult } from '@/components/associado/DocumentScanner';

interface EnderecoStepProps {
  data: AssociadoFormData;
  onChange: (data: AssociadoFormData) => void;
  onDocumentScanned?: (result: ScanResult) => void;
}

const maskCEP = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9);
};

export function EnderecoStep({ data, onChange, onDocumentScanned }: EnderecoStepProps) {
  const [isSearching, setIsSearching] = useState(false);

  const handleChange = (field: keyof AssociadoFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const searchCEP = async () => {
    const cepLimpo = data.cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      toast.error('CEP deve ter 8 dígitos');
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const result = await response.json();
      
      if (result.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      
      onChange({
        ...data,
        endereco: result.logradouro || '',
        bairro: result.bairro || '',
        cidade: result.localidade || '',
        estado: result.uf || '',
        complemento: result.complemento || '',
      });
      
      toast.success('Endereço encontrado!');
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCEPChange = (value: string) => {
    handleChange('cep', maskCEP(value));
    
    // Auto-search when CEP is complete
    const cepLimpo = value.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setTimeout(() => searchCEP(), 100);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Endereço</h3>
        </div>
        <DocumentScanner
          documentKind="comprovante_endereco"
          onScanned={onDocumentScanned}
          onExtracted={(extracted) => {
            const cep = extracted.cep as string | undefined;
            onChange({
              ...data,
              cep: cep ? cep.replace(/(\d{5})(\d{3})/, '$1-$2') : data.cep,
              endereco: (extracted.endereco as string) || data.endereco,
              numero: (extracted.numero as string) || data.numero,
              complemento: (extracted.complemento as string) || data.complemento,
              bairro: (extracted.bairro as string) || data.bairro,
              cidade: (extracted.cidade as string) || data.cidade,
              estado: (extracted.estado as string) || data.estado,
            });
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* CEP */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <div className="flex gap-2">
            <Input
              id="cep"
              placeholder="00000-000"
              value={data.cep}
              onChange={(e) => handleCEPChange(e.target.value)}
              maxLength={9}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={searchCEP}
              disabled={isSearching}
            >
              {isSearching ? (
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

        {/* Espaço vazio */}
        <div className="hidden md:block md:col-span-4" />

        {/* Rua/Endereço */}
        <div className="md:col-span-4 space-y-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            placeholder="Rua, Avenida, etc."
            value={data.endereco}
            onChange={(e) => handleChange('endereco', e.target.value)}
          />
        </div>

        {/* Número */}
        <div className="md:col-span-1 space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            placeholder="Nº"
            value={data.numero}
            onChange={(e) => handleChange('numero', e.target.value)}
          />
        </div>

        {/* Complemento */}
        <div className="md:col-span-1 space-y-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            placeholder="Apto, Sala..."
            value={data.complemento}
            onChange={(e) => handleChange('complemento', e.target.value)}
          />
        </div>

        {/* Bairro */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            placeholder="Bairro"
            value={data.bairro}
            onChange={(e) => handleChange('bairro', e.target.value)}
          />
        </div>

        {/* Cidade */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            placeholder="Cidade"
            value={data.cidade}
            onChange={(e) => handleChange('cidade', e.target.value)}
          />
        </div>

        {/* Estado */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Select
            value={data.estado}
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

      <p className="text-xs text-muted-foreground">
        Todos os campos de endereço são opcionais — podem ser preenchidos pelo scanner de comprovante ou completados depois.
      </p>
    </div>
  );
}
