import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBrand } from "@/hooks/useBrand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Calendar, User, FileText, Clock, Car } from "lucide-react";

interface PropostaValidacao {
  id: string;
  numeroCotacao: string;
  consultorNome: string;
  dataCriacao: string;
  dataValidade: string;
  modelo: string;
  marca: string;
  status: "ativa" | "expirada";
}

export default function ValidarProposta() {
  const [searchParams] = useSearchParams();
  const cotacaoId = searchParams.get("id");
  const { brand, getLogoForContext } = useBrand();
  
  const [isLoading, setIsLoading] = useState(true);
  const [proposta, setProposta] = useState<PropostaValidacao | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposta = async () => {
      if (!cotacaoId) {
        setError("ID da proposta não informado");
        setIsLoading(false);
        return;
      }

      try {
        // Buscar cotação
        const { data: cotacaoRows, error: cotacaoError } = await supabase
          .rpc("get_proposta_publica_by_id", { p_id: cotacaoId });
        const cotacao = cotacaoRows?.[0];

        if (cotacaoError || !cotacao) {
          setError("Proposta não encontrada");
          setIsLoading(false);
          return;
        }

        // Buscar nome do consultor
        let consultorNome = "Consultor Proteq";
        if (cotacao.consultor_id) {
          const { data: profileRows } = await supabase
            .rpc("get_consultor_publico", { p_consultor_id: cotacao.consultor_id });
          const profile = profileRows?.[0];
          if (profile?.nome_completo) {
            consultorNome = profile.nome_completo;
          }
        }

        // Calcular validade (7 dias a partir da criação)
        const dataCriacao = new Date(cotacao.created_at);
        const dataValidade = new Date(dataCriacao);
        dataValidade.setDate(dataValidade.getDate() + 7);
        
        const agora = new Date();
        const status = agora <= dataValidade ? "ativa" : "expirada";

        // Gerar número da cotação
        const numeroCotacao = `COT-${dataCriacao.getFullYear()}-${cotacao.id.substring(0, 8).toUpperCase()}`;

        setProposta({
          id: cotacao.id,
          numeroCotacao,
          consultorNome,
          dataCriacao: dataCriacao.toLocaleDateString("pt-BR"),
          dataValidade: dataValidade.toLocaleDateString("pt-BR"),
          modelo: cotacao.modelo || "–",
          marca: cotacao.marca || "–",
          status,
        });
      } catch (err) {
        console.error("Erro ao validar proposta:", err);
        setError("Erro ao validar proposta");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposta();
  }, [cotacaoId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-Proteq-orange/10 via-background to-Proteq-green/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-48 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !proposta) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/10 via-background to-destructive/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Proposta Inválida</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {error || "Não foi possível validar esta proposta."}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Verifique se o link está correto ou entre em contato com a Proteq.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-Proteq-orange/10 via-background to-Proteq-green/10 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${proposta.status === "ativa" ? "border-Proteq-green" : "border-muted"}`}>
        <CardHeader className="text-center pb-2">
          {/* Logo dinâmica */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src={getLogoForContext('auto')} 
              alt={brand.name}
              className="h-10 object-contain"
            />
            <span className="text-xl font-bold">{brand.name}</span>
          </div>
          
          {/* Status Badge */}
          {proposta.status === "ativa" ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-Proteq-green/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-Proteq-green" />
              </div>
              <Badge className="bg-Proteq-green hover:bg-Proteq-green text-white text-lg px-4 py-1">
                PROPOSTA ATIVA
              </Badge>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Clock className="w-10 h-10 text-muted-foreground" />
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                PROPOSTA EXPIRADA
              </Badge>
            </div>
          )}
          
          <CardTitle className="text-lg mt-4">Validação de Proposta</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {/* Número da Cotação */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <FileText className="w-5 h-5 text-Proteq-orange flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Número da Cotação</p>
              <p className="font-mono font-medium">{proposta.numeroCotacao}</p>
            </div>
          </div>
          
          {/* Veículo */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Car className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Veículo</p>
              <p className="font-medium">{proposta.marca} {proposta.modelo}</p>
            </div>
          </div>
          
          {/* Consultor */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <User className="w-5 h-5 text-Proteq-orange flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Consultor Responsável</p>
              <p className="font-medium">{proposta.consultorNome}</p>
            </div>
          </div>
          
          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Criada em</p>
                <p className="text-sm font-medium">{proposta.dataCriacao}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 p-3 rounded-lg ${proposta.status === "ativa" ? "bg-Proteq-green/10" : "bg-muted/50"}`}>
              <Clock className={`w-4 h-4 flex-shrink-0 ${proposta.status === "ativa" ? "text-Proteq-green" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs text-muted-foreground">Válida até</p>
                <p className={`text-sm font-medium ${proposta.status === "ativa" ? "text-Proteq-green" : ""}`}>
                  {proposta.dataValidade}
                </p>
              </div>
            </div>
          </div>
          
          {/* Mensagem de Status */}
          <div className={`text-center p-4 rounded-lg ${proposta.status === "ativa" ? "bg-Proteq-green/10 text-Proteq-green" : "bg-muted text-muted-foreground"}`}>
            {proposta.status === "ativa" ? (
              <p className="text-sm font-medium">
                ✓ Esta proposta é válida e pode ser utilizada para contratação.
              </p>
            ) : (
              <p className="text-sm">
                Esta proposta expirou. Entre em contato com o consultor para uma nova cotação.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estilos Proteq */}
      <style>{`
        .bg-Proteq-orange {
          background-color: hsl(25, 95%, 53%);
        }
        .bg-Proteq-green {
          background-color: hsl(142, 71%, 45%);
        }
        .text-Proteq-orange {
          color: hsl(25, 95%, 53%);
        }
        .text-Proteq-green {
          color: hsl(142, 71%, 45%);
        }
        .from-Proteq-orange {
          --tw-gradient-from: hsl(25, 95%, 53%);
        }
        .to-Proteq-green {
          --tw-gradient-to: hsl(142, 71%, 45%);
        }
        .border-Proteq-green {
          border-color: hsl(142, 71%, 45%);
        }
        .bg-Proteq-green\\/10 {
          background-color: hsl(142, 71%, 45%, 0.1);
        }
        .bg-Proteq-orange\\/10 {
          background-color: hsl(25, 95%, 53%, 0.1);
        }
      `}</style>
    </div>
  );
}
