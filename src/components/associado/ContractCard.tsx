import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/hooks/useSettings';
import { useBrand } from '@/hooks/useBrand';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileDown } from 'lucide-react';

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
  marca: string;
  modelo: string;
  placa: string;
  ano: number;
  chassi: string | null;
  renavam: string | null;
  cor: string | null;
  combustivel: string | null;
  tipo: string;
  mensalidade: number;
  valor_fipe: number;
  carro_reserva_dias: number;
  cota_id: string | null;
  cotacao_id: string | null;
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

// ─── Helper ───────────────────────────────────────────────────────────────────

const fmtCPF = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

const fmtDate = (v: string | null) => {
  if (!v) return '—';
  const [y, m, d] = v.split('-');
  return `${d}/${m}/${y}`;
};

const fmtMoney = (v: number | null) =>
  v != null ? `R$ ${v.toFixed(2).replace('.', ',')}` : '—';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionBadge({ label }: { label: string }) {
  return (
    <div
      style={{ backgroundColor: '#F97316', color: '#fff', padding: '4px 16px', borderRadius: 4, display: 'inline-block', marginBottom: 12 }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>{label}</span>
    </div>
  );
}

function DataGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 24px', marginTop: 8 }}>
      {children}
    </div>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: 0.5, margin: 0, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, margin: 0, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>{value || '—'}</p>
    </div>
  );
}

function DataFieldFull({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ gridColumn: 'span 2' }}>
      <p style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: 0.5, margin: 0, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, margin: 0, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>{value || '—'}</p>
    </div>
  );
}

// ─── ContractCard ─────────────────────────────────────────────────────────────

export interface ContractCardRef {
  exportToPDF: () => Promise<void>;
}

interface ContractCardProps {
  associadoId: string;
  onPdfGenerated?: (url: string) => void;
}

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

    const printRef = useRef<HTMLDivElement>(null);

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
        } catch (e: any) {
          toast.error('Erro ao carregar dados do contrato');
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }, [associadoId]);

    // ── Export ────────────────────────────────────────────────────────────────

    const exportToPDF = async () => {
      if (!printRef.current || !associado) return;
      setIsExporting(true);
      try {
        const element = printRef.current;

        // Temporarily make visible if hidden
        const prevVisibility = element.style.visibility;
        element.style.visibility = 'visible';

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 800,
        });

        element.style.visibility = prevVisibility;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
        const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
        const canvasRatio = canvas.height / canvas.width;
        const imgHeightMM = pdfWidth * canvasRatio;

        if (imgHeightMM <= pdfHeight) {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeightMM);
        } else {
          // Multi-page: slice the image
          let remainingHeight = imgHeightMM;
          let yPos = 0;
          while (remainingHeight > 0) {
            if (yPos > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, -yPos, pdfWidth, imgHeightMM);
            yPos += pdfHeight;
            remainingHeight -= pdfHeight;
          }
        }

        // Save locally
        const safeName = associado.nome_completo.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `contrato_${safeName}_${Date.now()}.pdf`;
        pdf.save(fileName);

        // Upload to Supabase Storage
        const pdfBlob = pdf.output('blob');
        const storagePath = `contratos/${associadoId}/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from('documentos')
          .upload(storagePath, pdfBlob, { contentType: 'application/pdf', upsert: false });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage
          .from('documentos')
          .getPublicUrl(storagePath);

        // Mark contrato_gerado = true
        if (cotacao?.id) {
          await supabase.from('cotacoes')
            .update({ contrato_gerado: true } as never)
            .eq('id', cotacao.id);
        }

        setPdfUrl(publicUrl);
        onPdfGenerated?.(publicUrl);
        toast.success('PDF gerado e salvo com sucesso!');
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

    const enderecoCompleto = [
      associado.endereco,
      associado.numero ? `nº ${associado.numero}` : null,
      associado.complemento,
      associado.bairro,
      associado.cidade,
      associado.estado,
      associado.cep ? `CEP ${associado.cep}` : null,
    ].filter(Boolean).join(', ');

    const mensalidade = veiculo?.mensalidade ?? cotacao?.mensalidade ?? null;
    const planoNome = cota?.cota_nome ?? cotacao?.plano ?? 'Plano Padrão';
    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Default benefits if none from DB
    const beneficiosList = beneficios.length > 0
      ? beneficios.map(b => b.nome_snapshot)
      : [
          'Perda Total por Colisão',
          'Perda Total por Roubo/Furto',
          'Perda Parcial',
          'Assistência 24 horas',
          `Carro Reserva (${veiculo?.carro_reserva_dias ?? 3} dias)`,
          'Rastreamento Veicular',
        ];

    return (
      <div className="space-y-4">
        {/* Action buttons (above the card) */}
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

        {/* ── Printable Contract Area ── */}
        <div
          ref={printRef}
          style={{
            width: 794,
            backgroundColor: '#ffffff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 12,
            color: '#1e293b',
            padding: 40,
            boxSizing: 'border-box' as const,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            margin: '0 auto',
          }}
        >
          {/* ── HEADER ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #F97316' }}>
            <div>
              {logoPrimary && (
                <img
                  src={logoPrimary}
                  alt="Logo"
                  crossOrigin="anonymous"
                  style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain' }}
                />
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e3a5f' }}>
                {settings.empresa_nome || 'Harmony Agro'}
              </p>
              {settings.cnpj && (
                <p style={{ margin: '2px 0', fontSize: 11, color: '#6b7280' }}>CNPJ: {settings.cnpj}</p>
              )}
              {settings.telefone && (
                <p style={{ margin: '2px 0', fontSize: 11, color: '#6b7280' }}>Tel: {settings.telefone}</p>
              )}
              {settings.email && (
                <p style={{ margin: '2px 0', fontSize: 11, color: '#6b7280' }}>{settings.email}</p>
              )}
              {settings.site && (
                <p style={{ margin: '2px 0', fontSize: 11, color: '#6b7280' }}>{settings.site}</p>
              )}
            </div>
          </div>

          {/* ── TITLE ── */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e3a5f', letterSpacing: 2, textTransform: 'uppercase' as const }}>
              FICHA DE AFILIAÇÃO
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#F97316', letterSpacing: 1, fontWeight: 600 }}>
              PROTEÇÃO VEICULAR PARA AGRONEGÓCIO
            </p>
          </div>

          {/* ── DADOS PESSOAIS ── */}
          <div style={{ marginBottom: 20 }}>
            <SectionBadge label="Dados Pessoais" />
            <DataGrid>
              <DataFieldFull label="Nome Completo" value={associado.nome_completo} />
              <DataField label="CPF" value={fmtCPF(associado.cpf)} />
              <DataField label="RG" value={associado.rg || '—'} />
              <DataField label="Data de Nascimento" value={fmtDate(associado.data_nascimento)} />
              <DataField label="Estado Civil" value={(associado as any).estado_civil || '—'} />
              <DataField label="Telefone / WhatsApp" value={associado.whatsapp || associado.telefone} />
              <DataField label="E-mail" value={associado.email} />
              <DataField label="Dia de Vencimento" value={associado.dia_vencimento ? `Todo dia ${associado.dia_vencimento}` : '—'} />
              {enderecoCompleto && <DataFieldFull label="Endereço Completo" value={enderecoCompleto} />}
            </DataGrid>
          </div>

          {/* ── DADOS DO VEÍCULO ── */}
          {veiculo && (
            <div style={{ marginBottom: 20 }}>
              <SectionBadge label="Dados do Veículo" />
              <DataGrid>
                <DataField label="Marca" value={veiculo.marca} />
                <DataField label="Modelo" value={veiculo.modelo} />
                <DataField label="Ano" value={String(veiculo.ano)} />
                <DataField label="Placa" value={veiculo.placa.toUpperCase()} />
                <DataField label="Chassi" value={veiculo.chassi || '—'} />
                <DataField label="RENAVAM" value={veiculo.renavam || '—'} />
                <DataField label="Cor" value={veiculo.cor || '—'} />
                <DataField label="Combustível" value={veiculo.combustivel || '—'} />
                <DataField label="Tipo de Bem" value={veiculo.tipo?.replace(/_/g, ' ') || '—'} />
                <DataField label="Valor FIPE" value={fmtMoney(veiculo.valor_fipe)} />
              </DataGrid>
            </div>
          )}

          {/* ── CONTRIBUIÇÕES ── */}
          <div style={{ marginBottom: 20 }}>
            <SectionBadge label="Contribuições e Plano" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 16px', marginTop: 8 }}>
              <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '10px 12px', textAlign: 'center' as const }}>
                <p style={{ margin: 0, fontSize: 9, color: '#9a3412', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>Mensalidade</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#ea580c' }}>{fmtMoney(mensalidade)}</p>
              </div>
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '10px 12px', textAlign: 'center' as const }}>
                <p style={{ margin: 0, fontSize: 9, color: '#075985', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>Plano</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{planoNome}</p>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 12px', textAlign: 'center' as const }}>
                <p style={{ margin: 0, fontSize: 9, color: '#14532d', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>Vencimento</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                  {associado.dia_vencimento ? `Dia ${associado.dia_vencimento}` : '—'}
                </p>
              </div>
              <div style={{ backgroundColor: '#fefce8', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 12px', textAlign: 'center' as const }}>
                <p style={{ margin: 0, fontSize: 9, color: '#713f12', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>Participação</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#b45309' }}>
                  {cotacao?.participacao != null ? `R$ ${cotacao.participacao.toFixed(2).replace('.', ',')}` : 'Sem participação'}
                </p>
              </div>
            </div>
            <p style={{ marginTop: 8, fontSize: 10, color: '#6b7280', fontStyle: 'italic' as const }}>
              * Forma de pagamento: PIX — sem cobrança de adesão. Pagamento em dia {associado.dia_vencimento ?? '?'} de cada mês.
            </p>
          </div>

          {/* ── BENEFÍCIOS INCLUSOS ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionBadge label="Benefícios Inclusos" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: 8 }}>
              {beneficiosList.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#F97316', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#374151' }}>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── FOOTER / ASSINATURAS ── */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, marginTop: 8 }}>
            <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 32, textAlign: 'center' as const }}>
              Declaro que li e aceito os termos e condições da Associação de Proteção Veicular.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 48 }}>
              <div style={{ textAlign: 'center' as const }}>
                <div style={{ borderTop: '1px solid #374151', paddingTop: 8 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#1e293b' }}>
                    {settings.empresa_nome || 'Harmony Agro'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6b7280' }}>Representante da Associação</p>
                </div>
              </div>
              <div style={{ textAlign: 'center' as const }}>
                <div style={{ borderTop: '1px solid #374151', paddingTop: 8 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#1e293b' }}>
                    {associado.nome_completo}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6b7280' }}>Associado — CPF: {fmtCPF(associado.cpf)}</p>
                </div>
              </div>
            </div>
            <p style={{ textAlign: 'center' as const, marginTop: 20, fontSize: 10, color: '#9ca3af' }}>
              {associado.cidade && associado.estado ? `${associado.cidade}/${associado.estado}, ` : ''}
              {hoje}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ContractCard.displayName = 'ContractCard';
export default ContractCard;
