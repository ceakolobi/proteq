import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, AlertCircle, Loader2, Car, Shield, ArrowRight, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBrand } from "@/hooks/useBrand";

const formatCurrency = (v: number | null | undefined) =>
  v == null ? "–" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function AceitarCotacao() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { brand } = useBrand();

  const [loading, setLoading] = useState(true);
  const [cotacao, setCotacao] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aceitando, setAceitando] = useState(false);
  const [aceita, setAceita] = useState(false);
  const [vistoriaUrl, setVistoriaUrl] = useState<string | null>(null);
  const [whatsappCliente, setWhatsappCliente] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Aceitar Cotação | Harmony";
    if (!token) {
      setErro("Link inválido.");
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("id, marca, modelo, ano_modelo, valor_bem, mensalidade, cliente_nome, cliente_email, cliente_whatsapp, status, aceite_expires_at, aceita_em, placa")
        .eq("aceite_token", token)
        .maybeSingle();

      if (error || !data) {
        setErro("Cotação não encontrada ou link expirado.");
      } else if (data.aceite_expires_at && new Date(data.aceite_expires_at) < new Date()) {
        setErro("Este link de cotação expirou. Solicite uma nova proposta.");
      } else {
        setCotacao(data);
        if (data.status === "aceita" || data.aceita_em) {
          setAceita(true);
        }
      }
      setLoading(false);
    })();
  }, [token]);

  const handleAceitar = async () => {
    if (!token) return;
    setAceitando(true);
    try {
      const { data, error } = await supabase.functions.invoke("aceitar-cotacao", {
        body: { token },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao aceitar");

      setAceita(true);
      setVistoriaUrl(data.vistoria_url || null);
      setWhatsappCliente(data.cliente_whatsapp || null);

      toast({
        title: "Cotação aceita! 🎉",
        description: data.vistoria_url
          ? "Agora finalize com a vistoria do veículo."
          : "Em breve entraremos em contato.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao aceitar",
        description: err?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setAceitando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-xl mx-auto space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <CardTitle className="text-center">Link inválido</CardTitle>
            <CardDescription className="text-center">{erro}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/")}>Voltar ao site</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          {brand?.logo && (
            <img src={brand.logo} alt={brand.companyName} className="h-12 mx-auto object-contain" />
          )}
          <h1 className="text-2xl md:text-3xl font-bold">Sua proposta está pronta</h1>
          <p className="text-sm text-muted-foreground">
            Confira os detalhes abaixo e confirme o aceite
          </p>
        </div>

        {/* Resumo */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
            <div className="flex items-center gap-3 mb-3">
              <Car className="w-6 h-6" />
              <div>
                <p className="text-xs opacity-90">Veículo protegido</p>
                <p className="font-bold text-lg">
                  {cotacao.marca} {cotacao.modelo} {cotacao.ano_modelo ? `(${cotacao.ano_modelo})` : ""}
                </p>
                {cotacao.placa && <p className="text-xs opacity-90">Placa: {cotacao.placa}</p>}
              </div>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-muted-foreground">Valor do bem (FIPE)</span>
              <span className="font-semibold">{formatCurrency(cotacao.valor_bem)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Mensalidade</p>
                <p className="text-xs text-muted-foreground">1º mês grátis · sem taxa de adesão</p>
              </div>
              <span className="text-2xl font-bold text-primary">{formatCurrency(cotacao.mensalidade)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Ação */}
        {aceita ? (
          <Card className="border-secondary bg-secondary/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-secondary">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">Proposta aceita!</p>
                  <p className="text-sm text-muted-foreground">
                    {vistoriaUrl ? "Próximo passo: vistoria do veículo." : "Em breve entraremos em contato."}
                  </p>
                </div>
              </div>
              {vistoriaUrl && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => window.location.href = vistoriaUrl}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Iniciar vistoria online
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Ao aceitar, você confirma o interesse na proteção e libera os próximos passos
                (vistoria e ativação). Não há cobrança neste momento.
              </p>
              <Button
                className="w-full"
                size="lg"
                onClick={handleAceitar}
                disabled={aceitando}
              >
                {aceitando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Aceitar Proposta
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Dúvidas? Fale conosco no WhatsApp.
        </p>
      </div>
    </div>
  );
}
