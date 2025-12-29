import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  CloudRain,
  Users,
  Flame,
  Fuel,
  Truck,
  Key,
  Car,
  Phone,
  Globe,
  Upload,
  Printer,
  ArrowLeft,
  Clock,
  Square,
  FileDown,
  Loader2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { tipoBemLabels, TipoBem } from "@/types/cotacao";
import html2pdf from "html2pdf.js";
import { toast } from "@/hooks/use-toast";

// Formatador de moeda
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "–";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Formatador de valor ou placeholder
const formatValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
};

interface CotacaoData {
  id: string;
  tipo_bem: TipoBem;
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  ano_modelo: number | null;
  valor_bem: number;
  valor_fipe: number | null;
  codigo_fipe: string | null;
  mensalidade: number | null;
  participacao: number | null;
  cota_id: string | null;
  created_at: string;
  observacoes: string | null;
}

interface CotaData {
  id: string;
  cota_nome: string;
}

const beneficios = [
  { icon: Shield, label: "Roubo e Furto 100% FIPE" },
  { icon: CloudRain, label: "Fenômenos da Natureza" },
  { icon: Users, label: "Terceiros" },
  { icon: Flame, label: "Incêndio" },
  { icon: Fuel, label: "Pane Seca" },
  { icon: Truck, label: "Guincho" },
  { icon: Key, label: "Chaveiro" },
  { icon: Square, label: "Vidros" },
  { icon: Car, label: "Carro Reserva" },
  { icon: Phone, label: "Assistência 24h" },
];

export default function LayoutCotacaoHarmony() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cotacaoId = searchParams.get("id");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [usarLogoColorida, setUsarLogoColorida] = useState(true);
  const [imagemVeiculo, setImagemVeiculo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [cotacao, setCotacao] = useState<CotacaoData | null>(null);
  const [cotaNome, setCotaNome] = useState<string | null>(null);
  const [condicoes, setCondicoes] = useState(
    "Esta proposta tem validade de 7 dias. Os valores podem sofrer alteração conforme tabela FIPE vigente no momento da contratação. A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade."
  );

  // Carregar dados da cotação
  useEffect(() => {
    const fetchCotacao = async () => {
      if (!cotacaoId) {
        setIsLoading(false);
        return;
      }

      try {
        // Buscar cotação
        const { data: cotacaoData, error: cotacaoError } = await supabase
          .from("cotacoes")
          .select("*")
          .eq("id", cotacaoId)
          .single();

        if (cotacaoError) {
          console.error("Erro ao buscar cotação:", cotacaoError);
          setIsLoading(false);
          return;
        }

        setCotacao(cotacaoData);

        // Buscar nome da cota se existir
        if (cotacaoData.cota_id) {
          const { data: cotaData, error: cotaError } = await supabase
            .from("cotas")
            .select("cota_nome")
            .eq("id", cotacaoData.cota_id)
            .single();

          if (!cotaError && cotaData) {
            setCotaNome(cotaData.cota_nome);
          }
        }

        // Adicionar observações da cotação se existirem
        if (cotacaoData.observacoes) {
          setCondicoes(prev => prev + "\n\nObservações: " + cotacaoData.observacoes);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCotacao();
  }, [cotacaoId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagemVeiculo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Gerar número da cotação formatado
  const numeroCotacao = cotacao 
    ? `COT-${new Date(cotacao.created_at).getFullYear()}-${cotacao.id.substring(0, 8).toUpperCase()}`
    : "–";

  // Número curto para nome do arquivo
  const numeroCotacaoCurto = cotacao 
    ? cotacao.id.substring(0, 8).toUpperCase()
    : "000000";

  // Modelo para nome do arquivo
  const modeloParaArquivo = cotacao?.modelo 
    ? cotacao.modelo.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)
    : "Veiculo";

  // Gerar PDF
  const handleGeneratePdf = async () => {
    if (!pdfContentRef.current) return;

    setIsGeneratingPdf(true);

    try {
      const element = pdfContentRef.current;
      const filename = `Cotacao_HarmonyAgro_${modeloParaArquivo}_#${numeroCotacaoCurto}.pdf`;

      const opt = {
        margin: 0,
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait" 
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(element).save();

      toast({
        title: "PDF gerado com sucesso!",
        description: `Arquivo: ${filename}`,
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Tente novamente ou use a opção de imprimir.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Calcular validade (7 dias a partir da criação)
  const calcularValidade = (): string => {
    if (!cotacao) return "–";
    const dataCriacao = new Date(cotacao.created_at);
    const dataValidade = new Date(dataCriacao);
    dataValidade.setDate(dataValidade.getDate() + 7);
    return dataValidade.toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar - não aparece na impressão */}
      <div className="print:hidden sticky top-0 z-50 bg-card border-b p-4 flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUsarLogoColorida(!usarLogoColorida)}
          >
            {usarLogoColorida ? "Usar Logo Branca" : "Usar Logo Colorida"}
          </Button>
          <Button 
            onClick={handleGeneratePdf} 
            disabled={isGeneratingPdf}
            className="bg-harmony-green hover:bg-harmony-green/90"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Gerar PDF da Cotação
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Página de Cotação */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
        <div ref={pdfContentRef} className="bg-card rounded-xl shadow-lg print:shadow-none print:rounded-none overflow-hidden">
          
          {/* 1️⃣ Cabeçalho */}
          <header className="bg-gradient-to-r from-harmony-orange to-harmony-green p-8 text-center">
            <div className="mb-4">
              {usarLogoColorida ? (
                <div className="inline-flex items-center gap-2 text-3xl font-bold text-card">
                  <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
                    <span className="text-harmony-orange text-xl font-bold">H</span>
                  </div>
                  <span>HARMONY AGRO</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-3xl font-bold text-card">
                  <div className="w-12 h-12 rounded-full bg-card/20 flex items-center justify-center">
                    <span className="text-card text-xl font-bold">H</span>
                  </div>
                  <span>HARMONY AGRO</span>
                </div>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-card uppercase tracking-wider mb-2">
              Proposta de Cotação
            </h1>
            <p className="text-card/90 text-sm md:text-base">
              Proteção Veicular • Caminhões • Motos • Máquinas Agrícolas
            </p>
          </header>

          {/* 2️⃣ Seção Principal – Resumo da Proposta */}
          <section className="p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Dados do Veículo */}
              <Card className="border-2 border-harmony-orange/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-harmony-orange">
                    <Car className="w-5 h-5" />
                    Dados do Veículo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground text-xs">Tipo do Bem</Label>
                      <p className="mt-1 font-medium">
                        {cotacao?.tipo_bem ? tipoBemLabels[cotacao.tipo_bem] : "–"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Marca</Label>
                      <p className="mt-1 font-medium">{formatValue(cotacao?.marca)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Modelo</Label>
                      <p className="mt-1 font-medium">{formatValue(cotacao?.modelo)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Ano</Label>
                      <p className="mt-1 font-medium">
                        {cotacao?.ano_fabricacao 
                          ? `${cotacao.ano_fabricacao}${cotacao.ano_modelo ? `/${cotacao.ano_modelo}` : ""}`
                          : "–"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Valor FIPE</Label>
                      <p className="mt-1 font-medium text-harmony-green">
                        {formatCurrency(cotacao?.valor_fipe || cotacao?.valor_bem)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Código FIPE</Label>
                      <p className="mt-1 font-medium font-mono">
                        {formatValue(cotacao?.codigo_fipe)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Valores em Destaque */}
              <Card className="border-2 border-harmony-green bg-gradient-to-br from-harmony-green/5 to-harmony-orange/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-harmony-green">
                    <Shield className="w-5 h-5" />
                    Valores da Proposta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mensalidade em Destaque */}
                  <div className="bg-harmony-orange text-card rounded-lg p-4 text-center">
                    <p className="text-xs uppercase tracking-wider opacity-90">Mensalidade</p>
                    <p className="text-3xl md:text-4xl font-bold mt-1">
                      {formatCurrency(cotacao?.mensalidade)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground text-xs">Cota Aplicada</Label>
                      <p className="mt-1 font-medium">{formatValue(cotaNome)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Participação</Label>
                      <p className="mt-1 font-medium">
                        {cotacao?.participacao !== null && cotacao?.participacao !== undefined
                          ? `${cotacao.participacao}%`
                          : "7%"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Taxas</Label>
                      <p className="mt-1 font-medium">Sem taxas adicionais</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Validade</Label>
                      <p className="mt-1 font-medium">{calcularValidade()}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <Label className="text-muted-foreground text-xs">Nº da Cotação</Label>
                    <p className="mt-1 font-mono text-sm font-medium">{numeroCotacao}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 3️⃣ Seção de Imagem do Veículo */}
          <section className="px-6 md:px-8 pb-6">
            <div
              className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-gradient-to-br from-harmony-orange/10 via-harmony-green/10 to-harmony-orange/5 border-2 border-dashed border-muted cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {imagemVeiculo ? (
                <img
                  src={imagemVeiculo}
                  alt="Veículo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Upload className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">Clique para adicionar imagem do veículo</p>
                  <p className="text-xs opacity-70 print:hidden">ou arraste uma imagem aqui</p>
                </div>
              )}
              <div className="absolute inset-0 bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
            </div>
          </section>

          {/* 4️⃣ Benefícios em Cards */}
          <section className="px-6 md:px-8 pb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-harmony-green" />
              Benefícios Inclusos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {beneficios.map((beneficio, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-harmony-orange/5 to-harmony-green/5 border text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-harmony-orange/10 flex items-center justify-center">
                    <beneficio.icon className="w-5 h-5 text-harmony-orange" />
                  </div>
                  <span className="text-xs font-medium leading-tight">{beneficio.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 5️⃣ Condições Importantes */}
          <section className="px-6 md:px-8 pb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-harmony-orange" />
              Condições Importantes
            </h3>
            <Textarea
              value={condicoes}
              onChange={(e) => setCondicoes(e.target.value)}
              className="min-h-[80px] text-sm text-muted-foreground print:border-none print:p-0 print:resize-none"
              placeholder="Adicione observações e condições importantes..."
            />
          </section>

          <Separator />

          {/* 6️⃣ Assinaturas */}
          <section className="px-6 md:px-8 py-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="h-16 border-b-2 border-foreground/30 mb-2" />
                <p className="text-sm font-medium">Assinatura do Cliente</p>
                <p className="text-xs text-muted-foreground">Nome:</p>
              </div>
              <div className="text-center">
                <div className="h-16 border-b-2 border-foreground/30 mb-2" />
                <p className="text-sm font-medium">Harmony Agro</p>
                <p className="text-xs text-muted-foreground">Representante</p>
              </div>
              <div className="text-center">
                <div className="h-16 border-b-2 border-foreground/30 mb-2" />
                <p className="text-sm font-medium">Data</p>
                <p className="text-xs text-muted-foreground">___/___/______</p>
              </div>
            </div>
          </section>

          {/* 7️⃣ Rodapé */}
          <footer className="bg-gradient-to-r from-harmony-green to-harmony-orange p-6 text-card">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-card/20 flex items-center justify-center">
                  <span className="text-card text-sm font-bold">H</span>
                </div>
                <span className="font-bold">HARMONY AGRO</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-card/90">
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>(00) 00000-0000</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span>www.harmonyagro.com.br</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
        .bg-harmony-orange {
          background-color: hsl(25, 95%, 53%);
        }
        .bg-harmony-green {
          background-color: hsl(142, 71%, 45%);
        }
        .text-harmony-orange {
          color: hsl(25, 95%, 53%);
        }
        .text-harmony-green {
          color: hsl(142, 71%, 45%);
        }
        .from-harmony-orange {
          --tw-gradient-from: hsl(25, 95%, 53%);
        }
        .to-harmony-orange {
          --tw-gradient-to: hsl(25, 95%, 53%);
        }
        .from-harmony-green {
          --tw-gradient-from: hsl(142, 71%, 45%);
        }
        .to-harmony-green {
          --tw-gradient-to: hsl(142, 71%, 45%);
        }
        .border-harmony-orange\\/20 {
          border-color: hsl(25, 95%, 53%, 0.2);
        }
        .border-harmony-green {
          border-color: hsl(142, 71%, 45%);
        }
        .bg-harmony-orange\\/10 {
          background-color: hsl(25, 95%, 53%, 0.1);
        }
        .bg-harmony-green\\/10 {
          background-color: hsl(142, 71%, 45%, 0.1);
        }
        .bg-harmony-orange\\/5 {
          background-color: hsl(25, 95%, 53%, 0.05);
        }
        .bg-harmony-green\\/5 {
          background-color: hsl(142, 71%, 45%, 0.05);
        }
        .hover\\:bg-harmony-orange\\/90:hover {
          background-color: hsl(25, 95%, 53%, 0.9);
        }
      `}</style>
    </div>
  );
}
