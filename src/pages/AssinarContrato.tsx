import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand';
import { SignaturePad } from '@/components/cotacao/SignaturePad';
import { Button } from '@/components/ui/button';
import {
  FileText, CheckCircle2, AlertCircle, Loader2,
  PenTool, ExternalLink, Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VistoriaAssinatura {
  id: string;
  status: string;
  token_assinatura: string;
  token_assinatura_expires_at: string | null;
  contrato_url: string | null;
  assinado_em: string | null;
  associado_nome: string;
  veiculo_marca: string;
  veiculo_modelo: string;
  veiculo_placa: string;
  veiculo_ano: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssinarContrato() {
  const { token } = useParams<{ token: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isAlreadySigned, setIsAlreadySigned] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [vistoria, setVistoria] = useState<VistoriaAssinatura | null>(null);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [confirmedReading, setConfirmedReading] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { setNotFound(true); setIsLoading(false); return; }
    fetchVistoria();
  }, [token]);

  const fetchVistoria = async () => {
    try {
      const { data: rows, error } = await supabase
        .rpc('get_vistoria_by_token_assinatura', { p_token: token });

      const row = rows?.[0];
      if (error || !row) { setNotFound(true); return; }

      if (row.assinado_em) { setIsAlreadySigned(true); setVistoria(row as VistoriaAssinatura); return; }

      if (row.token_assinatura_expires_at && new Date(row.token_assinatura_expires_at) < new Date()) {
        setIsExpired(true); return;
      }

      setVistoria(row as VistoriaAssinatura);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sign ────────────────────────────────────────────────────────────────────

  const handleSign = async () => {
    if (!vistoria || !assinatura) {
      toast.error('Faça sua assinatura antes de confirmar'); return;
    }
    if (!confirmedReading) {
      toast.error('Confirme que leu e concordou com o contrato'); return;
    }

    setIsSigning(true);
    try {
      const { data, error } = await supabase.functions.invoke('embed-assinatura', {
        body: {
          vistoria_id: vistoria.id,
          assinatura_base64: assinatura,
          contrato_url: vistoria.contrato_url ?? '',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao assinar');

      setIsSuccess(true);
      toast.success('Contrato assinado com sucesso!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao processar assinatura');
    } finally {
      setIsSigning(false);
    }
  };

  // ── Render states ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#111827' }}>
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (notFound) return <StatusScreen icon="error" title="Link Inválido" message="Este link de assinatura não existe. Entre em contato com seu consultor." />;
  if (isExpired) return <StatusScreen icon="expired" title="Link Expirado" message="Este link de assinatura expirou. Entre em contato com seu consultor para um novo link." />;

  if (isAlreadySigned || isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#111827' }}>
        <div className="max-w-md w-full rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6" style={{ background: '#F97316' }}>
            <BrandLogo className="h-10 mx-auto" context="report" />
          </div>
          <div className="p-8 text-center" style={{ background: '#1f2937' }}>
            <CheckCircle2 className="h-14 w-14 mx-auto mb-4" style={{ color: '#22c55e' }} />
            <h2 className="text-xl font-bold text-white mb-2">Contrato Assinado!</h2>
            <p className="text-gray-300 text-sm mb-4">
              {isAlreadySigned
                ? `Você assinou este contrato em ${vistoria?.assinado_em ? new Date(vistoria.assinado_em).toLocaleDateString('pt-BR') : 'data anterior'}.`
                : 'Sua assinatura foi registrada. Uma cópia do contrato assinado será enviada por e-mail.'}
            </p>
            {vistoria?.contrato_url && (
              <a
                href={vistoria.contrato_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
                style={{ background: '#1e3a5f' }}
              >
                <FileText className="h-4 w-4" />
                Baixar Contrato
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: '#111827' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-lg" style={{ background: '#F97316' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <BrandLogo className="h-8" context="report" />
          <p className="text-white text-sm font-medium">Assinatura Digital</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5 mt-6">
        {/* Greeting */}
        <div className="rounded-xl p-5" style={{ background: '#1f2937', border: '1px solid #374151' }}>
          <h1 className="text-lg font-bold text-white mb-1">
            Olá, {vistoria?.associado_nome?.split(' ')[0]}!
          </h1>
          <p className="text-sm text-gray-400">
            Sua vistoria foi aprovada. Leia o contrato abaixo e assine para ativar sua proteção.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-orange-400">
            <Clock className="h-3.5 w-3.5" />
            {vistoria?.token_assinatura_expires_at
              ? `Link válido até ${new Date(vistoria.token_assinatura_expires_at).toLocaleDateString('pt-BR')}`
              : 'Link com prazo limitado'}
          </div>
        </div>

        {/* Vehicle */}
        {vistoria && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#1f2937', border: '1px solid #374151' }}>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1e3a5f' }}>
              <FileText className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {vistoria.veiculo_marca} {vistoria.veiculo_modelo} · {vistoria.veiculo_ano}
              </p>
              <p className="text-xs text-gray-400">Placa: <span className="font-mono text-orange-400">{vistoria.veiculo_placa}</span></p>
            </div>
          </div>
        )}

        {/* Contract iframe */}
        {vistoria?.contrato_url ? (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #374151' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#1f2937', borderBottom: '1px solid #374151' }}>
              <span className="text-xs font-medium text-gray-300 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-orange-400" />
                Contrato de Proteção Veicular
              </span>
              <a
                href={vistoria.contrato_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-400 flex items-center gap-1 hover:text-orange-300"
              >
                Abrir <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <iframe
              src={vistoria.contrato_url}
              className="w-full"
              style={{ height: 480, background: '#fff' }}
              title="Contrato de Proteção Veicular"
            />
          </div>
        ) : (
          <div className="rounded-xl p-6 text-center" style={{ background: '#1f2937', border: '1px solid #374151' }}>
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400 text-sm">Contrato em processamento. Tente novamente em alguns instantes.</p>
          </div>
        )}

        {/* Consent checkbox */}
        <label className="flex items-start gap-3 cursor-pointer rounded-xl p-4" style={{ background: '#1f2937', border: `1px solid ${confirmedReading ? '#166534' : '#374151'}` }}>
          <div
            className="mt-0.5 h-5 w-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: confirmedReading ? '#22c55e' : '#374151', border: `2px solid ${confirmedReading ? '#22c55e' : '#6b7280'}` }}
            onClick={() => setConfirmedReading(v => !v)}
          >
            {confirmedReading && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
          </div>
          <span className="text-sm text-gray-300 select-none">
            Li e concordo com todas as cláusulas do contrato acima e com o Regulamento Interno da <strong className="text-white">Harmony Clube de Benefícios</strong>.
          </span>
        </label>

        {/* Signature pad */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: '#1f2937', border: `1px solid ${assinatura ? '#1d4ed8' : '#374151'}` }}>
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">Sua Assinatura</h3>
          </div>
          <p className="text-xs text-gray-400">Assine abaixo usando o dedo, mouse ou caneta.</p>
          <div className="rounded-lg overflow-hidden" style={{ background: '#fff' }}>
            <SignaturePad
              onSignatureChange={setAssinatura}
              width={600}
              height={160}
              className="w-full"
            />
          </div>
          {assinatura && (
            <p className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Assinatura capturada
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          size="lg"
          onClick={handleSign}
          disabled={isSigning || !assinatura || !confirmedReading}
          className="w-full h-14 text-base font-bold rounded-xl text-white"
          style={{
            background: assinatura && confirmedReading ? '#F97316' : '#374151',
            color: '#fff',
          }}
        >
          {isSigning
            ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processando assinatura...</>
            : <><PenTool className="h-5 w-5 mr-2" />Confirmar Assinatura</>}
        </Button>

        <p className="text-center text-xs text-gray-600 pb-4">
          Assinatura digital com validade jurídica conforme Lei nº 14.063/2020.
        </p>
      </div>
    </div>
  );
}

// ─── Status screens ───────────────────────────────────────────────────────────

function StatusScreen({ icon, title, message }: { icon: 'error' | 'expired'; title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#111827' }}>
      <div className="max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#1f2937', border: '1px solid #374151' }}>
        <div className="p-6" style={{ background: '#F97316' }}>
          <BrandLogo className="h-10 mx-auto" context="report" />
        </div>
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: icon === 'expired' ? '#f59e0b' : '#ef4444' }} />
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-400 text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}
