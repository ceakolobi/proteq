import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Globe,
  Upload,
  Printer,
  ArrowLeft,
  FileDown,
  Loader2,
  User,
  Calendar,
  QrCode,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { tipoBemLabels, TipoBem } from "@/types/cotacao";
import html2pdf from "html2pdf.js";
import { toast } from "@/hooks/use-toast";
import { SignaturePad } from "@/components/cotacao/SignaturePad";
import { PdfActionsModal } from "@/components/cotacao/PdfActionsModal";
import { CoverSelectorModal, CoverOption } from "@/components/cotacao/CoverSelectorModal";
import { QRCodeSVG } from "qrcode.react";
import { 
  isCota01, 
  formatCurrency as formatCurrencyUtil,
} from "@/lib/cotacaoUtils";
import harmonyAgroLogoColorida from "@/assets/harmony-agro-logo-colorida.png";
import harmonyAgroLogoBranca from "@/assets/harmony-agro-logo-branca.png";
import { useSettings } from "@/hooks/useSettings";

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
  cliente_nome: string | null;
  cliente_email: string | null;
  cliente_whatsapp: string | null;
  chassi: string | null;
}

// Benefícios detalhados - Versão 2.0 (Sem ícones, textos completos)
const beneficiosDetalhados = [
  {
    titulo: "Colisão (ou perda total)",
    descricao: "Pode ficar tranquilo, com a HARMONY, você recebe 100% do veículo (de acordo com a tabela FIPE) para os casos em que seu veículo tem danos muito severos e que não compensam o reparo."
  },
  {
    titulo: "Reboque até 1000Km",
    subtitulo: "(500KM ida e 500KM volta)",
    descricao: "Quem nunca ficou na mão com algum problema no carro? Mesmo os carros novos podem dar panes eletrônicas. Com a HARMONY, você tem reboque disponível 24h por dia."
  },
  {
    titulo: "Roubo ou Furto",
    descricao: "Seu carro foi roubado ou furtado? Com nossa proteção veicular, você não fica no prejuízo! Nós reavemos o seu veículo ou reembolsamos 100% do valor (de acordo com a tabela FIPE)."
  },
  {
    titulo: "Alagamentos ou fenômenos da natureza",
    descricao: "Ficou no meio de uma enchente ou de um alagamento? Pode ficar tranquilo, com a HARMONY, sua Proteção Veicular é completa mesmo no caso de danos causados por eventos naturais."
  },
  {
    titulo: "Carro reserva",
    descricao: "Quando você tem a comodidade de ter um carro é muito difícil ficar sem ele não é mesmo? Por isso, em caso de roubo, de furto, de colisão, de incêndio ou de alagamento, você pode pedir um carro reserva para utilizar de 15 ou 30 dias.",
    nota: "Conheça as condições de uso ilimitado no regulamento."
  },
  {
    titulo: "Proteção Automotiva de Responsabilidade",
    descricao: "Se você sofrer um acidente e envolver outras pessoas, muito provavelmente terá que se responsabilizar pelos danos causados. Por isso, sua proteção veicular garante cobertura de despesas de até R$100.000,00 a terceiros."
  }
];

export default function LayoutCotacaoHarmony() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cotacaoId = searchParams.get("id");
  
  // Carregar configurações do sistema
  const { settings, isLoading: settingsLoading } = useSettings();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [usarLogoColorida, setUsarLogoColorida] = useState(true);
  const [imagemVeiculo, setImagemVeiculo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [cotacao, setCotacao] = useState<CotacaoData | null>(null);
  const [cotaNome, setCotaNome] = useState<string | null>(null);
  
  // Estados para PDF
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfActions, setShowPdfActions] = useState(false);
  const [pdfFilename, setPdfFilename] = useState("");
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [selectedCoverOverride, setSelectedCoverOverride] = useState<string | null>(null);
  
  // Estados para assinatura
  const [nomeCliente, setNomeCliente] = useState("");
  const [cpfCliente, setCpfCliente] = useState("");
  const [assinaturaCliente, setAssinaturaCliente] = useState<string | null>(null);
  const [assinaturaRepresentante, setAssinaturaRepresentante] = useState<string | null>(null);
  const [dataAssinatura, setDataAssinatura] = useState(
    new Date().toLocaleDateString("pt-BR")
  );
  
  const [condicoes, setCondicoes] = useState("");
  const [condicoesInitialized, setCondicoesInitialized] = useState(false);
  
  // Determinar logos baseado nas configurações
  const logoColorida = settings.modo_white_label && settings.empresa_logo 
    ? settings.empresa_logo 
    : harmonyAgroLogoColorida;
  const logoBranca = settings.modo_white_label && settings.empresa_logo_branca 
    ? settings.empresa_logo_branca 
    : harmonyAgroLogoBranca;
  
  // Nome da empresa para exibição
  const nomeEmpresa = settings.modo_white_label && settings.empresa_nome 
    ? settings.empresa_nome 
    : "HARMONY AGRO";
  
  // Contatos da empresa
  const telefoneEmpresa = settings.telefone || "(00) 00000-0000";
  const siteEmpresa = settings.site || "www.harmonyagro.com.br";
  
  // Cores do sistema
  const corPrimaria = settings.cor_primaria || "#F97316";
  const corSecundaria = settings.cor_secundaria || "#22C55E";
  
  // Contra-capa
  const temContracapa = !!settings.pdf_contracapa;
  const contracapaImage = settings.pdf_contracapa || "/pdf-back-cover.png";
  
  // Configuração de capas do PDF
  const coverOptions: CoverOption[] = [
    { index: 1, url: settings.cover_1, label: "Capa 1" },
    { index: 2, url: settings.cover_2, label: "Capa 2" },
    { index: 3, url: settings.cover_3, label: "Capa 3" },
    { index: 4, url: settings.cover_4, label: "Capa 4" },
  ];
  
  // Capas disponíveis (com URL configurada)
  const availableCovers = coverOptions.filter((c) => c.url !== null) as { index: number; url: string; label: string }[];
  
  const getSelectedCover = (): string | null => {
    if (selectedCoverOverride) return selectedCoverOverride;
    if (availableCovers.length === 0) return null;
    
    const mode = settings.cover_mode || "fixed";
    
    if (mode === "fixed") {
      const fixedIndex = (settings.cover_fixed_index || 1) - 1;
      const cover = coverOptions[fixedIndex];
      return cover?.url || availableCovers[0]?.url || null;
    } else if (mode === "random") {
      const randomCover = availableCovers[Math.floor(Math.random() * availableCovers.length)];
      return randomCover?.url || null;
    } else if (mode === "select") {
      return availableCovers[0]?.url || null;
    }
    
    return availableCovers[0]?.url || null;
  };
  
  const selectedCover = getSelectedCover();
  
  // Inicializar condições com texto do settings
  useEffect(() => {
    if (!condicoesInitialized && !settingsLoading && settings.texto_institucional) {
      setCondicoes(settings.texto_institucional);
      setCondicoesInitialized(true);
    } else if (!condicoesInitialized && !settingsLoading) {
      setCondicoes("Esta proposta tem validade de 7 dias. Os valores podem sofrer alteração conforme tabela FIPE vigente no momento da contratação. A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade.");
      setCondicoesInitialized(true);
    }
  }, [settingsLoading, settings.texto_institucional, condicoesInitialized]);

  // Carregar dados da cotação
  useEffect(() => {
    const fetchCotacao = async () => {
      if (!cotacaoId) {
        setIsLoading(false);
        return;
      }

      try {
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

  const numeroCotacao = cotacao 
    ? `COT-${new Date(cotacao.created_at).getFullYear()}-${cotacao.id.substring(0, 8).toUpperCase()}`
    : "–";

  const numeroCotacaoCurto = cotacao 
    ? cotacao.id.substring(0, 8).toUpperCase()
    : "000000";

  const modeloParaArquivo = cotacao?.modelo 
    ? cotacao.modelo.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)
    : "Veiculo";

  const uploadPdfToStorage = async (blob: Blob, filename: string): Promise<string | null> => {
    try {
      const filePath = `propostas/${cotacaoId}/${filename}`;
      
      const { data, error } = await supabase.storage
        .from("vistoria-fotos")
        .upload(filePath, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (error) {
        console.error("Erro no upload:", error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("vistoria-fotos")
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      return null;
    }
  };

  const initiateGeneratePdf = () => {
    const mode = settings.cover_mode || "fixed";
    
    if (mode === "select" && availableCovers.length > 0) {
      setShowCoverSelector(true);
    } else {
      handleGeneratePdf();
    }
  };

  const handleSelectCoverAndGenerate = (coverUrl: string) => {
    setSelectedCoverOverride(coverUrl);
    setShowCoverSelector(false);
    setTimeout(() => {
      handleGeneratePdf();
    }, 100);
  };

  const handleGeneratePdf = async () => {
    if (!pdfContentRef.current) return;

    setIsGeneratingPdf(true);

    try {
      const element = pdfContentRef.current;
      const filename = `Proposta_HarmonyAgro_${modeloParaArquivo}_#${numeroCotacaoCurto}.pdf`;

      const backCoverElement = element.querySelector('.pdf-back-cover') as HTMLElement;
      if (backCoverElement && temContracapa) {
        backCoverElement.style.display = 'flex';
      }

      const opt = {
        margin: 0,
        filename: filename,
        image: { 
          type: "jpeg", 
          quality: 0.92
        },
        html2canvas: { 
          scale: 2.5,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait",
          compress: true,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      const pdfInstance = html2pdf().set(opt).from(element);
      const blob = await pdfInstance.outputPdf("blob");

      if (backCoverElement && temContracapa) {
        backCoverElement.style.display = 'none';
      }
      
      setPdfBlob(blob);
      setPdfFilename(filename);

      const publicUrl = await uploadPdfToStorage(blob, filename);
      if (publicUrl) {
        setPdfUrl(publicUrl);
      }

      setShowPdfActions(true);

      toast({
        title: "PDF gerado com sucesso!",
        description: "Escolha como deseja compartilhar.",
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
        <Button variant="ghost" onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/cotacoes');
          }
        }}>
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
            onClick={initiateGeneratePdf} 
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
        <div ref={pdfContentRef} className="bg-card rounded-3xl shadow-2xl print:shadow-none print:rounded-none overflow-hidden">
          
          {/* CAPA (primeira página do PDF) */}
          {selectedCover && (
            <div 
              className="pdf-cover"
              style={{
                width: "210mm",
                height: "297mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#ffffff",
                overflow: "hidden",
                pageBreakAfter: "always",
              }}
            >
              <img
                src={selectedCover}
                alt="Capa"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}
          
          {/* Cabeçalho com CTA */}
          <header className="proposal-header relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(25,95%,53%)] via-[hsl(25,90%,60%)] to-[hsl(30,85%,70%)]" />
            <div className="relative z-10 p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <img 
                  src={logoBranca} 
                  alt={`${nomeEmpresa} - Clube de Benefícios`}
                  className="h-[60px] w-auto object-contain"
                  style={{ maxHeight: '80px', minHeight: '50px' }}
                />
                <div className="text-right">
                  <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
                    Atendimento em todo território nacional
                  </span>
                </div>
              </div>
              
              <div className="text-center text-white">
                <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide mb-2">
                  Proposta de Cotação
                </h1>
                <p className="text-lg text-white/90 mb-4">
                  Proteção Veicular • Carros • Motos • Camionetes • Caminhões • Máquinas Agrícolas
                </p>
                <div className="inline-block bg-white text-[hsl(25,95%,45%)] font-bold text-lg px-8 py-3 rounded-full shadow-lg">
                  CONTRATE AGORA
                </div>
              </div>
            </div>
          </header>

          {/* Seção Principal – Resumo da Proposta */}
          <section className="proposal-section p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Dados do Veículo */}
              <div className="bg-white rounded-2xl shadow-lg border border-[hsl(25,95%,90%)] overflow-hidden">
                <div className="bg-gradient-to-r from-[hsl(25,95%,53%)] to-[hsl(30,90%,60%)] p-4">
                  <h2 className="text-lg font-bold text-white">
                    Dados do Veículo
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[hsl(25,95%,97%)] rounded-xl p-3">
                      <p className="text-xs text-[hsl(25,50%,40%)] font-medium uppercase tracking-wide">Tipo</p>
                      <p className="font-semibold text-[hsl(25,50%,25%)] mt-1">
                        {cotacao?.tipo_bem ? tipoBemLabels[cotacao.tipo_bem] : "–"}
                      </p>
                    </div>
                    <div className="bg-[hsl(25,95%,97%)] rounded-xl p-3">
                      <p className="text-xs text-[hsl(25,50%,40%)] font-medium uppercase tracking-wide">Marca</p>
                      <p className="font-semibold text-[hsl(25,50%,25%)] mt-1">{formatValue(cotacao?.marca)}</p>
                    </div>
                    <div className="bg-[hsl(25,95%,97%)] rounded-xl p-3">
                      <p className="text-xs text-[hsl(25,50%,40%)] font-medium uppercase tracking-wide">Modelo</p>
                      <p className="font-semibold text-[hsl(25,50%,25%)] mt-1">{formatValue(cotacao?.modelo)}</p>
                    </div>
                    <div className="bg-[hsl(25,95%,97%)] rounded-xl p-3">
                      <p className="text-xs text-[hsl(25,50%,40%)] font-medium uppercase tracking-wide">Ano</p>
                      <p className="font-semibold text-[hsl(25,50%,25%)] mt-1">
                        {cotacao?.ano_fabricacao 
                          ? `${cotacao.ano_fabricacao}${cotacao.ano_modelo ? `/${cotacao.ano_modelo}` : ""}`
                          : "–"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-[hsl(142,71%,95%)] to-[hsl(142,71%,90%)] rounded-xl p-4 text-center">
                    <p className="text-xs text-[hsl(142,50%,30%)] font-medium uppercase tracking-wide">Valor FIPE</p>
                    <p className="text-2xl font-bold text-[hsl(142,71%,35%)] mt-1">
                      {formatCurrency(cotacao?.valor_fipe || cotacao?.valor_bem)}
                    </p>
                    {cotacao?.codigo_fipe && (
                      <p className="text-xs text-[hsl(142,50%,40%)] mt-1 font-mono">
                        Código: {cotacao.codigo_fipe}
                      </p>
                    )}
                  </div>
                  
                  {cotacao?.chassi && (
                    <div className="bg-[hsl(25,95%,97%)] rounded-xl p-3">
                      <p className="text-xs text-[hsl(25,50%,40%)] font-medium uppercase tracking-wide">Chassi</p>
                      <p className="font-mono text-xs text-[hsl(25,50%,25%)] mt-1 break-all">
                        {cotacao.chassi}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Valores em Destaque */}
              <div className="bg-white rounded-2xl shadow-lg border border-[hsl(142,71%,85%)] overflow-hidden">
                <div className="bg-gradient-to-r from-[hsl(142,71%,45%)] to-[hsl(142,60%,55%)] p-4">
                  <h2 className="text-lg font-bold text-white">
                    Valores da Proposta
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  {/* Mensalidade em Destaque */}
                  <div className="bg-gradient-to-br from-[hsl(25,95%,53%)] to-[hsl(25,90%,45%)] text-white rounded-2xl p-6 text-center shadow-lg">
                    <p className="text-sm uppercase tracking-wider opacity-90 font-medium">Mensalidade</p>
                    <p className="text-4xl md:text-5xl font-bold mt-2">
                      {formatCurrency(cotacao?.mensalidade)}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[hsl(142,71%,97%)] rounded-xl p-3 text-center">
                      <p className="text-xs text-[hsl(142,50%,30%)] font-medium uppercase">Cota</p>
                      <p className="font-semibold text-[hsl(142,50%,25%)] mt-1">{formatValue(cotaNome)}</p>
                    </div>
                    <div className="bg-[hsl(142,71%,97%)] rounded-xl p-3 text-center">
                      <p className="text-xs text-[hsl(142,50%,30%)] font-medium uppercase">Participação (7%)</p>
                      <p className="font-semibold text-[hsl(142,50%,25%)] mt-1">
                        {cotacao?.participacao !== null && cotacao?.participacao !== undefined
                          ? formatCurrency(cotacao.participacao)
                          : "7%"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-[hsl(25,95%,97%)] rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-[hsl(25,50%,40%)]">Taxas adicionais:</span>
                      <span className="font-semibold text-[hsl(142,71%,35%)]">Sem taxas</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-[hsl(25,50%,40%)]">Validade:</span>
                      <span className="font-semibold text-[hsl(25,50%,25%)]">{calcularValidade()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[hsl(25,95%,90%)]">
                      <span className="text-sm text-[hsl(25,50%,40%)]">Nº Cotação:</span>
                      <span className="font-mono text-sm font-semibold text-[hsl(25,50%,25%)]">{numeroCotacao}</span>
                    </div>
                  </div>
                  
                  {/* Cláusula COTA 01 */}
                  {cotaNome && isCota01(cotaNome) && (
                    <div className="bg-[hsl(25,95%,95%)] border border-[hsl(25,95%,80%)] rounded-xl p-4">
                      <p className="text-sm font-bold text-[hsl(25,95%,40%)] mb-2">
                        📋 Cota de Participação – COTA 01
                      </p>
                      <p className="text-xs text-[hsl(25,50%,35%)] leading-relaxed">
                        Para veículos enquadrados nesta cota, aplica-se valor mínimo de participação:
                      </p>
                      <ul className="text-xs text-[hsl(25,50%,35%)] mt-2 space-y-1">
                        <li>• Moto: mínimo de <strong>R$ 1.100,00</strong></li>
                        <li>• Carro: mínimo de <strong>R$ 1.800,00</strong></li>
                        <li>• Camionete: mínimo de <strong>R$ 2.500,00</strong></li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Seção de Imagem do Veículo */}
          <section className="px-6 md:px-10 pb-8">
            <div
              className="relative h-56 md:h-72 rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(25,95%,95%)] to-[hsl(142,71%,95%)] border-2 border-dashed border-[hsl(25,50%,80%)] cursor-pointer group"
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
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[hsl(25,50%,50%)]">
                  <Upload className="w-16 h-16 mb-3 opacity-40" />
                  <p className="text-base font-medium">Clique para adicionar imagem do veículo</p>
                  <p className="text-sm opacity-70 print:hidden">ou arraste uma imagem aqui</p>
                </div>
              )}
              <div className="absolute inset-0 bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
            </div>
          </section>

          {/* Benefícios Detalhados */}
          <section className="px-6 md:px-10 pb-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-[hsl(25,95%,40%)]">
                Benefícios Inclusos
              </h2>
              <p className="text-[hsl(25,50%,50%)] mt-2">Proteção completa para você e seu veículo</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-5">
              {beneficiosDetalhados.map((beneficio, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 shadow-md border border-[hsl(25,95%,90%)] hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-bold text-[hsl(25,95%,40%)] mb-1">
                    {beneficio.titulo}
                  </h3>
                  {beneficio.subtitulo && (
                    <p className="text-sm text-[hsl(25,70%,50%)] font-medium mb-2">
                      {beneficio.subtitulo}
                    </p>
                  )}
                  <p className="text-sm text-[hsl(25,30%,35%)] leading-relaxed">
                    {beneficio.descricao}
                  </p>
                  {beneficio.nota && (
                    <p className="text-xs text-[hsl(25,50%,50%)] mt-3 italic font-medium">
                      *{beneficio.nota}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Condições Importantes */}
          <section className="px-6 md:px-10 pb-8">
            <div className="bg-[hsl(25,95%,97%)] rounded-2xl p-6 border border-[hsl(25,95%,90%)]">
              <h3 className="text-lg font-bold text-[hsl(25,95%,40%)] mb-4">
                Condições Importantes
              </h3>
              <Textarea
                value={condicoes}
                onChange={(e) => setCondicoes(e.target.value)}
                className="min-h-[100px] text-sm text-[hsl(25,30%,35%)] bg-white border-[hsl(25,95%,85%)] rounded-xl print:border-none print:p-0 print:resize-none"
                placeholder="Adicione observações e condições importantes..."
              />
            </div>
          </section>

          <Separator className="mx-6 md:mx-10" />

          {/* Assinaturas */}
          <section className="px-6 md:px-10 py-10">
            <h3 className="text-xl font-bold text-[hsl(25,95%,40%)] mb-8 text-center">
              Assinatura e Aceite
            </h3>
            
            {/* Dados do Cliente */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <Label htmlFor="nomeCliente" className="text-sm font-semibold text-[hsl(25,50%,30%)]">
                  Nome Completo do Cliente *
                </Label>
                <Input
                  id="nomeCliente"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Digite o nome completo"
                  className="rounded-xl border-[hsl(25,95%,85%)] print:border-none print:p-0 print:shadow-none"
                />
                <p className="hidden print:block font-medium">{nomeCliente || "________________"}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpfCliente" className="text-sm font-semibold text-[hsl(25,50%,30%)]">
                  CPF *
                </Label>
                <Input
                  id="cpfCliente"
                  value={cpfCliente}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 11) {
                      const formatted = value
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                      setCpfCliente(formatted);
                    }
                  }}
                  placeholder="000.000.000-00"
                  className="rounded-xl border-[hsl(25,95%,85%)] print:border-none print:p-0 print:shadow-none"
                />
                <p className="hidden print:block font-medium">{cpfCliente || "___.___.___-__"}</p>
              </div>
            </div>

            {/* Área de Assinaturas */}
            <div className="grid md:grid-cols-2 gap-10 mb-8">
              <div className="flex flex-col items-center space-y-3">
                <Label className="text-sm font-semibold text-[hsl(25,50%,30%)] text-center">Assinatura do Cliente *</Label>
                <div className="print:hidden">
                  <SignaturePad
                    onSignatureChange={setAssinaturaCliente}
                    width={300}
                    height={100}
                  />
                </div>
                <div className="hidden print:block">
                  {assinaturaCliente ? (
                    <img 
                      src={assinaturaCliente} 
                      alt="Assinatura do Cliente" 
                      className="h-20 object-contain border-b-2 border-[hsl(25,50%,60%)]"
                    />
                  ) : (
                    <div className="h-20 w-[300px] border-b-2 border-[hsl(25,50%,60%)]" />
                  )}
                </div>
                <p className="text-sm text-[hsl(25,50%,50%)] text-center font-medium">
                  {nomeCliente || "Nome do Cliente"}
                </p>
              </div>

              <div className="flex flex-col items-center space-y-3">
                <Label className="text-sm font-semibold text-[hsl(25,50%,30%)] text-center">Assinatura {nomeEmpresa}</Label>
                <div className="print:hidden">
                  <SignaturePad
                    onSignatureChange={setAssinaturaRepresentante}
                    width={300}
                    height={100}
                  />
                </div>
                <div className="hidden print:block">
                  {assinaturaRepresentante ? (
                    <img 
                      src={assinaturaRepresentante} 
                      alt="Assinatura Representante" 
                      className="h-20 object-contain border-b-2 border-[hsl(25,50%,60%)]"
                    />
                  ) : (
                    <div className="h-20 w-[300px] border-b-2 border-[hsl(25,50%,60%)]" />
                  )}
                </div>
                <p className="text-sm text-[hsl(25,50%,50%)] text-center font-medium">
                  Representante {nomeEmpresa}
                </p>
              </div>
            </div>

            {/* Data */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[hsl(25,50%,50%)]" />
                <Label className="text-sm font-semibold text-[hsl(25,50%,30%)]">Data:</Label>
              </div>
              <Input
                type="text"
                value={dataAssinatura}
                onChange={(e) => setDataAssinatura(e.target.value)}
                className="w-44 text-center rounded-xl border-[hsl(25,95%,85%)] print:border-none print:p-0 print:shadow-none"
              />
            </div>
          </section>

          {/* QR Code de Validação */}
          {cotacaoId && (
            <section className="px-6 md:px-10 pb-10">
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-[hsl(25,95%,97%)] to-[hsl(142,71%,97%)] border border-[hsl(25,95%,90%)]">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-[hsl(25,95%,53%)]" />
                  <span className="text-base font-bold text-[hsl(25,50%,30%)]">Validar Proposta</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md">
                  <QRCodeSVG
                    value={`${window.location.origin}/validar-proposta?id=${cotacaoId}`}
                    size={110}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-sm text-[hsl(25,50%,50%)] mt-3 text-center max-w-[250px]">
                  Escaneie o QR Code para validar a autenticidade desta proposta
                </p>
              </div>
            </section>
          )}

          {/* Rodapé */}
          <footer className="bg-[hsl(25,95%,53%)] p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{nomeEmpresa.charAt(0)}</span>
                </div>
                <span className="text-xl font-bold">{nomeEmpresa}</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-6 text-white/95">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  <span className="font-medium">{telefoneEmpresa}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  <span className="font-medium">{siteEmpresa}</span>
                </div>
              </div>
            </div>
          </footer>

          {/* Contra-Capa */}
          {temContracapa && (
            <div 
              className="pdf-back-cover"
              style={{
                pageBreakBefore: "always",
                width: "210mm",
                height: "297mm",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#ffffff",
                overflow: "hidden",
              }}
            >
              <img
                src={contracapaImage}
                alt="Contra-capa"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}
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
        .hover\\:bg-harmony-green\\/90:hover {
          background-color: hsl(142, 71%, 45%, 0.9);
        }
      `}</style>

      {/* Modal de Ações do PDF */}
      <PdfActionsModal
        isOpen={showPdfActions}
        onClose={() => setShowPdfActions(false)}
        pdfBlob={pdfBlob}
        pdfUrl={pdfUrl}
        filename={pdfFilename}
        clienteNome={nomeCliente || cotacao?.cliente_nome || ""}
        clienteEmail={cotacao?.cliente_email || ""}
        clienteWhatsapp={cotacao?.cliente_whatsapp || ""}
        validadeDias={7}
        modelo={cotacao?.modelo || ""}
        mensalidade={cotacao?.mensalidade ? formatCurrency(cotacao.mensalidade) : ""}
        cotacaoId={cotacao?.id}
      />

      {/* Modal de Seleção de Capa */}
      <CoverSelectorModal
        isOpen={showCoverSelector}
        onClose={() => setShowCoverSelector(false)}
        onSelectCover={handleSelectCoverAndGenerate}
        covers={coverOptions}
        defaultCoverPreview={
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-4"
            style={{
              background: `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%)`,
            }}
          >
            <img 
              src={logoBranca} 
              alt={nomeEmpresa}
              className="h-8 w-auto object-contain mb-2"
            />
            <p className="text-xs text-white text-center font-semibold">
              PROPOSTA DE COTAÇÃO
            </p>
          </div>
        }
      />
    </div>
  );
}
