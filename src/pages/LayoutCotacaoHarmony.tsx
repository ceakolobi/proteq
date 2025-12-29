import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PropostaData {
  tipoBem: string;
  marca: string;
  modelo: string;
  ano: string;
  valorFipe: string;
  codigoFipe: string;
  mensalidade: string;
  cotaAplicada: string;
  participacao: string;
  taxas: string;
  validadeProposta: string;
  numeroCotacao: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usarLogoColorida, setUsarLogoColorida] = useState(true);
  const [imagemVeiculo, setImagemVeiculo] = useState<string | null>(null);
  const [condicoes, setCondicoes] = useState(
    "Esta proposta tem validade de 7 dias. Os valores podem sofrer alteração conforme tabela FIPE vigente no momento da contratação. A proteção terá início após aprovação da vistoria e confirmação do pagamento da primeira mensalidade."
  );

  const [proposta, setProposta] = useState<PropostaData>({
    tipoBem: "Caminhão",
    marca: "Volvo",
    modelo: "FH 540",
    ano: "2023",
    valorFipe: "R$ 850.000,00",
    codigoFipe: "512001-9",
    mensalidade: "R$ 1.890,00",
    cotaAplicada: "Cota Premium",
    participacao: "7%",
    taxas: "Sem taxas adicionais",
    validadeProposta: "7 dias",
    numeroCotacao: "COT-2024-001234",
  });

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
          <Button onClick={handlePrint} className="bg-harmony-orange hover:bg-harmony-orange/90">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Página de Cotação */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
        <div className="bg-card rounded-xl shadow-lg print:shadow-none print:rounded-none overflow-hidden">
          
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
                      <Input
                        value={proposta.tipoBem}
                        onChange={(e) => setProposta({ ...proposta, tipoBem: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Marca</Label>
                      <Input
                        value={proposta.marca}
                        onChange={(e) => setProposta({ ...proposta, marca: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Modelo</Label>
                      <Input
                        value={proposta.modelo}
                        onChange={(e) => setProposta({ ...proposta, modelo: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Ano</Label>
                      <Input
                        value={proposta.ano}
                        onChange={(e) => setProposta({ ...proposta, ano: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Valor FIPE</Label>
                      <Input
                        value={proposta.valorFipe}
                        onChange={(e) => setProposta({ ...proposta, valorFipe: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Código FIPE</Label>
                      <Input
                        value={proposta.codigoFipe}
                        onChange={(e) => setProposta({ ...proposta, codigoFipe: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
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
                    <Input
                      value={proposta.mensalidade}
                      onChange={(e) => setProposta({ ...proposta, mensalidade: e.target.value })}
                      className="mt-1 text-2xl font-bold text-center bg-transparent border-none text-card placeholder:text-card/70 print:text-3xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground text-xs">Cota Aplicada</Label>
                      <Input
                        value={proposta.cotaAplicada}
                        onChange={(e) => setProposta({ ...proposta, cotaAplicada: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Participação</Label>
                      <Input
                        value={proposta.participacao}
                        onChange={(e) => setProposta({ ...proposta, participacao: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Taxas</Label>
                      <Input
                        value={proposta.taxas}
                        onChange={(e) => setProposta({ ...proposta, taxas: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Validade</Label>
                      <Input
                        value={proposta.validadeProposta}
                        onChange={(e) => setProposta({ ...proposta, validadeProposta: e.target.value })}
                        className="mt-1 print:border-none print:p-0 print:h-auto"
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <Label className="text-muted-foreground text-xs">Nº da Cotação</Label>
                    <Input
                      value={proposta.numeroCotacao}
                      onChange={(e) => setProposta({ ...proposta, numeroCotacao: e.target.value })}
                      className="mt-1 font-mono text-sm print:border-none print:p-0 print:h-auto"
                    />
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
