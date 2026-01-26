import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Car, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { usePublicFipe } from '@/hooks/usePublicFipe';
import { TIPOS_VEICULO_LANDING, type DadosVeiculo } from './types';

interface DadosVeiculoFormProps {
  onSubmit: (data: DadosVeiculo) => void;
  onBack: () => void;
  loading?: boolean;
}

export function DadosVeiculoForm({ onSubmit, onBack, loading }: DadosVeiculoFormProps) {
  const [tipoVeiculo, setTipoVeiculo] = useState<'carro' | 'moto' | 'pickup' | 'caminhao' | 'utilitario'>('carro');
  const [placa, setPlaca] = useState('');
  
  const fipe = usePublicFipe(tipoVeiculo);

  // Recarregar marcas quando tipo mudar
  useEffect(() => {
    fipe.fetchMarcas();
  }, [tipoVeiculo]);

  const handleTipoChange = (value: string) => {
    setTipoVeiculo(value as typeof tipoVeiculo);
    fipe.reset();
  };

  const handleBuscarValor = async () => {
    const valor = await fipe.fetchValor();
    if (valor) {
      // Valor encontrado - mostrar resultado
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fipe.valorEncontrado) {
      return;
    }

    onSubmit({
      tipo_bem: tipoVeiculo,
      marca: fipe.valorEncontrado.marca,
      modelo: fipe.valorEncontrado.modelo,
      ano: fipe.valorEncontrado.anoModelo,
      placa: placa || undefined,
      valor_fipe: fipe.valorEncontrado.valor,
      codigo_fipe: fipe.valorEncontrado.codigoFipe,
    });
  };

  const formatPlaca = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-16 px-4">
      <Card className="w-full max-w-lg shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Dados do veículo</CardTitle>
          <CardDescription>Informe os dados do veículo para calcular a proteção</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de veículo */}
            <div className="space-y-2">
              <Label>Tipo de veículo</Label>
              <Select value={tipoVeiculo} onValueChange={handleTipoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VEICULO_LANDING.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marca */}
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select 
                value={fipe.selectedMarcaId} 
                onValueChange={fipe.handleMarcaChange}
                disabled={fipe.loadingMarcas}
              >
                <SelectTrigger>
                  <SelectValue placeholder={fipe.loadingMarcas ? "Carregando..." : "Selecione a marca"} />
                </SelectTrigger>
                <SelectContent>
                  {fipe.marcas.map((marca) => (
                    <SelectItem key={marca.id} value={marca.id}>
                      {marca.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select 
                value={fipe.selectedModeloId} 
                onValueChange={fipe.handleModeloChange}
                disabled={!fipe.selectedMarcaId || fipe.loadingModelos}
              >
                <SelectTrigger>
                  <SelectValue placeholder={fipe.loadingModelos ? "Carregando..." : "Selecione o modelo"} />
                </SelectTrigger>
                <SelectContent>
                  {fipe.modelos.map((modelo) => (
                    <SelectItem key={modelo.id} value={modelo.id}>
                      {modelo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ano */}
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select 
                value={fipe.selectedAnoId} 
                onValueChange={fipe.handleAnoChange}
                disabled={!fipe.selectedModeloId || fipe.loadingAnos}
              >
                <SelectTrigger>
                  <SelectValue placeholder={fipe.loadingAnos ? "Carregando..." : "Selecione o ano"} />
                </SelectTrigger>
                <SelectContent>
                  {fipe.anos.map((ano) => (
                    <SelectItem key={ano.id} value={ano.id}>
                      {ano.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Placa (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="placa">Placa (opcional)</Label>
              <Input
                id="placa"
                placeholder="ABC1234"
                value={placa}
                onChange={(e) => setPlaca(formatPlaca(e.target.value))}
                maxLength={7}
              />
            </div>

            {/* Botão de buscar valor */}
            {fipe.isComplete && !fipe.valorEncontrado && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleBuscarValor}
                disabled={fipe.loadingValor}
              >
                {fipe.loadingValor ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando valor...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Valor FIPE
                  </>
                )}
              </Button>
            )}

            {/* Resultado FIPE */}
            {fipe.valorEncontrado && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Valor FIPE encontrado</span>
                    </div>
                    <p className="font-semibold">
                      {fipe.valorEncontrado.marca} {fipe.valorEncontrado.modelo}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ano: {fipe.valorEncontrado.anoModelo} | Código: {fipe.valorEncontrado.codigoFipe}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {fipe.valorEncontrado.valorFormatado}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!fipe.valorEncontrado || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    Simular proteção
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
