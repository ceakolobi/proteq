import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Shield, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';
import { TERMO_ACEITE_TITULO, TERMO_ACEITE_CONTEUDO } from '@/lib/termoAceiteContent';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Regiao {
  id: string;
  nome: string;
  sede_id: string;
}

interface TermosAceiteStepProps {
  aceitou: boolean;
  onChange: (aceitou: boolean) => void;
  selectedRegiaoId: string | null;
  onRegiaoChange: (regiaoId: string) => void;
  showRegiaoSelector: boolean;
}

export function TermosAceiteStep({ aceitou, onChange, selectedRegiaoId, onRegiaoChange, showRegiaoSelector }: TermosAceiteStepProps) {
  const [scrolledToEnd, setScrolledToEnd] = useState(true);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [isLoadingRegioes, setIsLoadingRegioes] = useState(false);

  useEffect(() => {
    if (!showRegiaoSelector) return;

    const fetchRegioes = async () => {
      setIsLoadingRegioes(true);
      const { data, error } = await supabase
        .from('regioes')
        .select('id, nome, sede_id')
        .eq('ativo', true)
        .order('nome');

      if (!error && data) {
        setRegioes(data);
      }
      setIsLoadingRegioes(false);
    };

    fetchRegioes();
  }, [showRegiaoSelector]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom && !scrolledToEnd) {
      setScrolledToEnd(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Termo de Aceite</h3>
      </div>

      {/* Seletor de Regional - apenas para Admin Principal ou usuários sem regional */}
      {showRegiaoSelector && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Selecione a Regional do Associado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="regiao-select">Regional *</Label>
              <Select
                value={selectedRegiaoId || ''}
                onValueChange={onRegiaoChange}
                disabled={isLoadingRegioes}
              >
                <SelectTrigger id="regiao-select" className="w-full">
                  <SelectValue placeholder={isLoadingRegioes ? "Carregando..." : "Selecione uma regional"} />
                </SelectTrigger>
                <SelectContent>
                  {regioes.map((regiao) => (
                    <SelectItem key={regiao.id} value={regiao.id}>
                      {regiao.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedRegiaoId && (
                <p className="text-xs text-destructive">
                  É obrigatório selecionar uma regional para o associado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="bg-primary/10 border-primary/20">
        <Shield className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          Para finalizar o cadastro, leia e aceite o termo abaixo.
          Este documento tem validade jurídica e será arquivado digitalmente.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{TERMO_ACEITE_TITULO}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea
            className="h-[250px] w-full rounded-md border p-4"
            onScrollCapture={handleScroll}
          >
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {TERMO_ACEITE_CONTEUDO}
              </pre>
            </div>
          </ScrollArea>

          {!scrolledToEnd && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Role até o final para poder aceitar os termos
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={`transition-all ${aceitou ? 'ring-2 ring-primary' : ''}`}>
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="termos-aceite"
              checked={aceitou}
              onCheckedChange={(checked) => onChange(checked === true)}
              disabled={!scrolledToEnd}
              className="mt-0.5"
            />
            <label
              htmlFor="termos-aceite"
              className={`text-sm leading-relaxed cursor-pointer ${
                !scrolledToEnd ? 'text-muted-foreground' : ''
              }`}
            >
              <span className="font-medium">Li e aceito os termos</span>
              <br />
              <span className="text-muted-foreground">
                Declaro que li, compreendi e aceito integralmente o TERMO DE ACEITE – HARMONY CLUBE DE BENEFÍCIOS.
                Reconheço que minha concordância digital tem a mesma validade jurídica de uma assinatura física.
              </span>
            </label>
          </div>

          {aceitou && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm text-primary font-medium">
                Termos aceitos! Você pode finalizar o cadastro.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          Ao confirmar, um documento digital será gerado com seus dados,
          data/hora do aceite e IP do dispositivo para fins de registro legal.
        </p>
      </div>
    </div>
  );
}
