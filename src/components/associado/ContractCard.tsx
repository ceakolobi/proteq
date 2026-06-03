import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/hooks/useSettings';
import { useBrand } from '@/hooks/useBrand';
import { appendRegulamento } from '@/lib/mergeRegulamento';
import { TERMO_ACEITE_DECLARACAO } from '@/lib/termoAceiteContent';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown, Download } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Associado {
  id: string;
  nome_completo: string;
  cpf: string;
  rg: string | null;
  data_nascimento: string | null;
  telefone: string;
  whatsapp: string | null;
  email: string;
  estado_civil: string | null;
  profissao: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  dia_vencimento: number | null;
}

interface Veiculo {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  placa: string;
  ano: number;
  chassi: string | null;
  renavam: string | null;
  cor: string | null;
  combustivel: string | null;
  mensalidade: number;
  valor_fipe: number;
  carro_reserva_dias: number;
  cota_id: string | null;
  cotacao_id: string | null;
  codigo_fipe: string | null;
}

interface Cota {
  cota_nome: string;
  categoria: string | null;
}

interface Beneficio {
  nome_snapshot: string;
  valor_snapshot: number;
}

interface CotacaoInfo {
  id: string;
  mensalidade: number | null;
  participacao: number | null;
  plano: string | null;
  contrato_gerado: boolean | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCPF = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

const fmtDate = (v: string | null) => {
  if (!v) return '—';
  const [y, m, d] = v.split('-');
  return `${d}/${m}/${y}`;
};

const fmtMoney = (v: number | null | undefined) =>
  v != null
    ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

const fmtTipo = (tipo: string) =>
  tipo.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const nextDueDate = (dia: number | null): string => {
  if (!dia) return '—';
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), dia);
  if (d <= now) d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

// ─── Table helpers (inline styles only — required for html2canvas) ─────────────

const S = {
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: 16,
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  orangeTh: {
    backgroundColor: '#F97316',
    color: '#ffffff',
    padding: '7px 10px',
    textAlign: 'left' as const,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  cell: {
    border: '1px solid #d1d5db',
    padding: '7px 10px',
    verticalAlign: 'top' as const,
    width: '33%',
  },
  cellLabel: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  cellValue: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
  },
};

interface CellProps {
  label: string;
  value?: string | null;
  colSpan?: number;
  width?: string;
}

function Cell({ label, value, colSpan, width }: CellProps) {
  return (
    <td colSpan={colSpan} style={{ ...S.cell, ...(width ? { width } : {}) }}>
      <div style={S.cellLabel}>{label}</div>
      <div style={S.cellValue}>{value || '—'}</div>
    </td>
  );
}

function EmptyCell() {
  return <td style={{ ...S.cell, border: '1px solid #d1d5db' }} />;
}

// ─── Page Header (shared) ─────────────────────────────────────────────────────

interface PageHeaderProps {
  logoPrimary: string;
  empresaNome: string;
  cnpj: string | null;
}

function PageHeader({ logoPrimary, empresaNome, cnpj }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 12, borderBottom: '2px solid #F97316' }}>
      <div>
        {logoPrimary && (
          <img
            src={logoPrimary}
            alt="Logo"
            crossOrigin="anonymous"
            style={{ maxHeight: 52, maxWidth: 170, objectFit: 'contain' }}
          />
        )}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>{empresaNome}</div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
          Av Goiás, 315 Setor Central SL 107 1º Andar Goiânia-GO
        </div>
        {cnpj && (
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>CNPJ: {cnpj}</div>
        )}
      </div>
    </div>
  );
}

// ─── Export ref interface ─────────────────────────────────────────────────────

export interface ContractCardRef {
  exportToPDF: () => Promise<void>;
}

interface ContractCardProps {
  associadoId: string;
  onPdfGenerated?: (url: string) => void;
}

// ─── ContractCard ─────────────────────────────────────────────────────────────

const ContractCard = forwardRef<ContractCardRef, ContractCardProps>(
  ({ associadoId, onPdfGenerated }, ref) => {
    const { settings } = useSettings();
    const { logoPrimary } = useBrand();

    const [associado, setAssociado] = useState<Associado | null>(null);
    const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
    const [cota, setCota] = useState<Cota | null>(null);
    const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
    const [cotacao, setCotacao] = useState<CotacaoInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const page1Ref = useRef<HTMLDivElement>(null);
    const page2Ref = useRef<HTMLDivElement>(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────

    useEffect(() => {
      if (!associadoId) return;
      const load = async () => {
        setIsLoading(true);
        try {
          const [{ data: a }, { data: veics }] = await Promise.all([
            supabase.from('associados').select('*').eq('id', associadoId).single(),
            supabase.from('veiculos').select('*').eq('associado_id', associadoId)
              .order('created_at', { ascending: false }).limit(1),
          ]);

          setAssociado(a as Associado);
          const v = (veics?.[0] as Veiculo) ?? null;
          setVeiculo(v);

          if (v?.cota_id) {
            const { data: c } = await supabase
              .from('cotas').select('cota_nome,categoria').eq('id', v.cota_id).single();
            setCota(c as Cota);
          }

          const { data: cotacoes } = await supabase
            .from('cotacoes').select('id,mensalidade,participacao,plano,contrato_gerado')
            .eq('associado_id', associadoId)
            .order('created_at', { ascending: false }).limit(1);

          const cot = (cotacoes?.[0] as CotacaoInfo) ?? null;
          setCotacao(cot);

          if (cot?.id) {
            const { data: bens } = await supabase
              .from('cotacao_beneficios').select('nome_snapshot,valor_snapshot')
              .eq('cotacao_id', cot.id);
            setBeneficios((bens as Beneficio[]) || []);
          }
        } catch {
          toast.error('Erro ao carregar dados do contrato');
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }, [associadoId]);

    // ── Export ────────────────────────────────────────────────────────────────

    const exportToPDF = async () => {
      if (!page1Ref.current || !page2Ref.current || !associado) return;
      setIsExporting(true);
      try {
        const opts = {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
        };

        const [canvas1, canvas2] = await Promise.all([
          html2canvas(page1Ref.current, opts),
          html2canvas(page2Ref.current, opts),
        ]);

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const W = pdf.internal.pageSize.getWidth(); // 210mm

        const addCanvasPage = (canvas: HTMLCanvasElement, first: boolean) => {
          if (!first) pdf.addPage();
          const imgH = W * canvas.height / canvas.width;
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, W, imgH);
        };

        addCanvasPage(canvas1, true);
        addCanvasPage(canvas2, false);

        // Append regulamento (pdf-lib merges with /regulamento-interno-harmony.pdf)
        const finalBlob = await appendRegulamento(pdf.output('arraybuffer'));

        // Save locally
        const safeName = associado.nome_completo.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `contrato_${safeName}_${Date.now()}.pdf`;
        const blobUrl = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(blobUrl);

        // Upload to Supabase Storage
        const storagePath = `contratos/${associadoId}/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from('documentos')
          .upload(storagePath, finalBlob, { contentType: 'application/pdf', upsert: false });
        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage
          .from('documentos').getPublicUrl(storagePath);

        // Mark contrato_gerado
        if (cotacao?.id) {
          await supabase.from('cotacoes')
            .update({ contrato_gerado: true } as never)
            .eq('id', cotacao.id);
        }

        setPdfUrl(publicUrl);
        onPdfGenerated?.(publicUrl);
        toast.success('Contrato gerado com sucesso!');
      } catch (e: any) {
        toast.error(e?.message || 'Erro ao gerar PDF');
      } finally {
        setIsExporting(false);
      }
    };

    useImperativeHandle(ref, () => ({ exportToPDF }));

    // ── Render ────────────────────────────────────────────────────────────────

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!associado) return null;

    const mensalidade = veiculo?.mensalidade ?? cotacao?.mensalidade ?? null;
    const cotaNome = cota?.cota_nome ?? cotacao?.plano ?? '1';
    const empresaNome = settings.empresa_nome || 'Harmony Agro';
    const cnpj = settings.cnpj || null;
    const diaVenc = associado.dia_vencimento;

    const beneficiosList: Beneficio[] = beneficios.length > 0
      ? beneficios
      : [
          { nome_snapshot: 'Perda Total por Roubo/Furto', valor_snapshot: 0 },
          { nome_snapshot: 'Perda Total por Colisão', valor_snapshot: 0 },
          { nome_snapshot: 'Assistência 24 horas', valor_snapshot: 0 },
          { nome_snapshot: `Carro Reserva (${veiculo?.carro_reserva_dias ?? 3} dias)`, valor_snapshot: 0 },
          { nome_snapshot: 'Perda Parcial', valor_snapshot: 0 },
          { nome_snapshot: 'Rastreamento Veicular', valor_snapshot: 0 },
        ];

    // Chunk beneficios into pairs for 2-column table
    const benefPairs: Beneficio[][] = [];
    for (let i = 0; i < beneficiosList.length; i += 2) {
      benefPairs.push(beneficiosList.slice(i, i + 2));
    }

    const pageStyle: React.CSSProperties = {
      width: 794,
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 12,
      color: '#111827',
      padding: '36px 40px',
      boxSizing: 'border-box',
    };

    return (
      <div className="space-y-4">
        {/* Action buttons */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            onClick={exportToPDF}
            disabled={isExporting}
            className="bg-[#F97316] hover:bg-[#ea6c0a] text-white"
          >
            {isExporting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando PDF...</>
              : <><FileDown className="h-4 w-4 mr-2" />Gerar PDF</>}
          </Button>
          {pdfUrl && (
            <Button variant="outline" onClick={() => window.open(pdfUrl, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          )}
        </div>

        {/* ════════════════════════════════════════════════
            PÁGINA 1 — FICHA DE AFILIAÇÃO
            ════════════════════════════════════════════════ */}
        <div ref={page1Ref} style={pageStyle}>
          <PageHeader logoPrimary={logoPrimary} empresaNome={empresaNome} cnpj={cnpj} />

          {/* Título */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', letterSpacing: 2, textTransform: 'uppercase' }}>
              FICHA DE AFILIAÇÃO
            </div>
            <div style={{ fontSize: 10, color: '#F97316', fontWeight: 600, letterSpacing: 1, marginTop: 4 }}>
              HARMONY CLUBE DE BENEFÍCIOS — PROTEÇÃO VEICULAR PARA AGRONEGÓCIO
            </div>
          </div>

          {/* ── DADOS PESSOAIS ── */}
          <table style={S.table}>
            <thead>
              <tr>
                <th colSpan={3} style={S.orangeTh}>Dados Pessoais</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Cell label="Nome Completo" value={associado.nome_completo} colSpan={2} width="66%" />
                <Cell label="CPF / CNPJ" value={fmtCPF(associado.cpf)} />
              </tr>
              <tr>
                <Cell label="RG / Insc. Estadual" value={associado.rg} />
                <Cell label="Data de Nascimento" value={fmtDate(associado.data_nascimento)} />
                <EmptyCell />
              </tr>
              <tr>
                <Cell label="Endereço" value={associado.endereco} colSpan={2} width="66%" />
                <Cell label="Número" value={associado.numero} />
              </tr>
              <tr>
                <Cell label="Complemento" value={associado.complemento} />
                <Cell label="CEP" value={associado.cep} />
                <Cell label="Bairro" value={associado.bairro} />
              </tr>
              <tr>
                <Cell label="Cidade" value={associado.cidade} />
                <Cell label="UF" value={associado.estado} />
                <EmptyCell />
              </tr>
              <tr>
                <Cell label="Celular" value={associado.telefone} />
                <Cell label="Fixo / WhatsApp" value={associado.whatsapp} />
                <Cell label="E-mail" value={associado.email} />
              </tr>
            </tbody>
          </table>

          {/* ── DADOS DO VEÍCULO ── */}
          {veiculo && (
            <table style={S.table}>
              <thead>
                <tr>
                  <th colSpan={3} style={S.orangeTh}>Dados do Veículo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Cell label="Tipo de Veículo" value={fmtTipo(veiculo.tipo)} />
                  <Cell label="Categoria" value={cota?.categoria} />
                  <Cell label="Marca" value={veiculo.marca} />
                </tr>
                <tr>
                  <Cell label="Modelo" value={veiculo.modelo} colSpan={2} width="66%" />
                  <Cell label="Código FIPE" value={veiculo.codigo_fipe} />
                </tr>
                <tr>
                  <Cell label="RENAVAM" value={veiculo.renavam} />
                  <Cell label="Chassi" value={veiculo.chassi} />
                  <Cell label="Placa" value={veiculo.placa?.toUpperCase()} />
                </tr>
                <tr>
                  <Cell label="Ano / Modelo" value={String(veiculo.ano)} />
                  <Cell label="Combustível" value={veiculo.combustivel} />
                  <Cell label="Cor" value={veiculo.cor} />
                </tr>
              </tbody>
            </table>
          )}

          {/* ── CONTRIBUIÇÕES ── */}
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.orangeTh}>Contribuições</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    CONCORDO COM A MENSALIDADE E PARTICIPAÇÃO PARA ACIONAMENTO EM CASO DE ROUBO, FURTO, COLISÃO OU PERDA TOTAL:
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: '#374151', lineHeight: 1.6 }}>
                    <strong>MENSALIDADE MÉDIA</strong> no valor de{' '}
                    <strong style={{ color: '#ea580c' }}>{fmtMoney(mensalidade)}</strong>{' '}
                    referente à <strong>{cotaNome}</strong> cota(s), de acordo com a tabela e valores FIPE vigente.
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: '#374151', lineHeight: 1.6 }}>
                    <strong>AJUDA PARTICIPATIVA</strong> calculada sobre 7,00% do valor FIPE vigente, não podendo o valor resultante ser inferior a{' '}
                    <strong>R$ 1.800,00</strong>.
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#374151', lineHeight: 1.6 }}>
                    <strong>VENCIMENTO</strong> da primeira mensalidade para{' '}
                    <strong>{nextDueDate(diaVenc)}</strong>{' '}
                    e demais todo dia <strong>{diaVenc ?? '—'}</strong> de cada mês.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── BENEFÍCIOS INCLUSOS ── */}
          <table style={S.table}>
            <thead>
              <tr>
                <th colSpan={2} style={S.orangeTh}>Benefícios Inclusos</th>
              </tr>
            </thead>
            <tbody>
              {benefPairs.map((pair, i) => (
                <tr key={i}>
                  {pair.map((b, j) => (
                    <td key={j} style={{ ...S.cell, width: '50%' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ color: '#F97316', fontWeight: 800, flexShrink: 0, fontSize: 13 }}>✓</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{b.nome_snapshot}</div>
                          {b.valor_snapshot > 0 && (
                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                              + {fmtMoney(b.valor_snapshot)}/mês
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  ))}
                  {pair.length === 1 && <td style={{ ...S.cell, width: '50%' }} />}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── DECLARAÇÃO ── */}
          <div style={{ border: '1px solid #d1d5db', padding: '12px 14px', marginBottom: 20, borderRadius: 2 }}>
            <p style={{ margin: 0, fontSize: 10.5, color: '#374151', lineHeight: 1.65, fontStyle: 'italic' }}>
              Declaro estar ciente de todas as cláusulas, condições e exigências do Regulamento Interno da{' '}
              <strong>HARMONY CLUBE DE BENEFÍCIOS</strong>, comprometendo-me a cumpri-las integralmente.
              Confirmo que os dados acima são verdadeiros e autorizo o tratamento dos mesmos para fins
              de execução deste contrato de proteção veicular baseado no sistema de socorro mútuo,
              não caracterizado como seguro, conforme legislação vigente.
            </p>
          </div>

          {/* ── ASSINATURAS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, paddingTop: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #374151', paddingTop: 8, marginTop: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f' }}>{empresaNome}</div>
                {cnpj && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>CNPJ: {cnpj}</div>}
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>Data: ____/____/________</div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #374151', paddingTop: 8, marginTop: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f' }}>{associado.nome_completo}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>CPF: {fmtCPF(associado.cpf)}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>Data: ____/____/________</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page break indicator */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 border-t-2 border-dashed border-gray-300" />
          <span className="text-xs text-gray-400 font-medium tracking-wide px-2">PÁGINA 2</span>
          <div className="flex-1 border-t-2 border-dashed border-gray-300" />
        </div>

        {/* ════════════════════════════════════════════════
            PÁGINA 2 — TERMO DE CIÊNCIA DE RESPONSABILIDADE
            ════════════════════════════════════════════════ */}
        <div ref={page2Ref} style={pageStyle}>
          <PageHeader logoPrimary={logoPrimary} empresaNome={empresaNome} cnpj={cnpj} />

          {/* Título */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              TERMO DE CIÊNCIA DE RESPONSABILIDADE
            </div>
          </div>

          {/* Identificação */}
          <table style={S.table}>
            <thead>
              <tr>
                <th colSpan={3} style={S.orangeTh}>Identificação do Associado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Cell label="EU (Nome Completo)" value={associado.nome_completo} colSpan={2} width="66%" />
                <Cell label="CPF / CNPJ" value={fmtCPF(associado.cpf)} />
              </tr>
              <tr>
                <Cell label="Estado Civil" value={associado.estado_civil} />
                <Cell label="Profissão" value={associado.profissao} colSpan={2} width="66%" />
              </tr>
            </tbody>
          </table>

          {/* Corpo do Termo */}
          <div style={{ border: '1px solid #d1d5db', padding: '16px 18px', marginBottom: 28, borderRadius: 2 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Declaração
            </p>
            {TERMO_ACEITE_DECLARACAO.split('\n\n').map((paragraph, i) => (
              <p key={i} style={{ margin: '0 0 10px', fontSize: 11.5, color: '#374151', lineHeight: 1.7, textAlign: 'justify' as const }}>
                {paragraph.trim()}
              </p>
            ))}
            <p style={{ margin: '14px 0 0', fontSize: 11.5, color: '#374151', lineHeight: 1.7, textAlign: 'justify' as const }}>
              Declaro também que o veículo descrito na Ficha de Afiliação está em boas condições de uso e conservação, livre de avarias preexistentes não informadas, e que as informações prestadas são verdadeiras, sob pena de cancelamento da proteção sem direito a reembolso, conforme Regulamento Interno.
            </p>
          </div>

          {/* Veículo referenciado */}
          {veiculo && (
            <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, padding: '10px 14px', marginBottom: 24 }}>
              <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Veículo Referenciado</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#111827' }}>
                {veiculo.marca} {veiculo.modelo} — {veiculo.ano} — Placa: {veiculo.placa.toUpperCase()}
                {veiculo.chassi ? ` — Chassi: ${veiculo.chassi}` : ''}
              </p>
            </div>
          )}

          {/* Assinatura */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <div style={{ borderTop: '1px solid #374151', paddingTop: 8, display: 'inline-block', minWidth: 320 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f' }}>{associado.nome_completo}</div>
              <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 3 }}>CPF: {fmtCPF(associado.cpf)}</div>
              <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 8 }}>
                {associado.cidade && associado.estado
                  ? `${associado.cidade}/${associado.estado}, `
                  : ''}
                Data: ____/____/________
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div style={{ marginTop: 40, paddingTop: 12, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 9, color: '#9ca3af' }}>
              O Regulamento Interno completo acompanha este documento nas páginas seguintes.{' '}
              {empresaNome} — {cnpj}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ContractCard.displayName = 'ContractCard';
export default ContractCard;
