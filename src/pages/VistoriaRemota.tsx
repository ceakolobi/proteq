import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Camera, Upload, CheckCircle2, Car, Loader2,
  AlertCircle, X, Image as ImageIcon, Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VistoriaData {
  id: string;
  status: string;
  token_expires_at: string;
  veiculo: { id: string; marca: string; modelo: string; placa: string; ano: number };
  associado: { nome_completo: string } | null;
}

interface FotoItem {
  key: string;
  label: string;
  required: boolean;
  url: string | null;
  uploading: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOTO_ITEMS_INIT: Omit<FotoItem, 'url' | 'uploading'>[] = [
  { key: 'frente',           label: 'Frente do Veículo',           required: true },
  { key: 'traseira',         label: 'Traseira do Veículo',         required: true },
  { key: 'lateral_esquerda', label: 'Lateral Esquerda',            required: true },
  { key: 'lateral_direita',  label: 'Lateral Direita',             required: true },
  { key: 'painel',           label: 'Painel / Hodômetro',          required: true },
  { key: 'chassi',           label: 'Número do Chassi',            required: true },
  { key: 'crlv',             label: 'CRLV (Documento do Veículo)', required: true },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function VistoriaRemota() {
  const { token } = useParams<{ token: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [vistoria, setVistoria] = useState<VistoriaData | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [fotos, setFotos] = useState<FotoItem[]>(
    FOTO_ITEMS_INIT.map(i => ({ ...i, url: null, uploading: false }))
  );

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Fetch ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { setNotFound(true); setIsLoading(false); return; }
    fetchVistoria();
  }, [token]);

  const fetchVistoria = async () => {
    try {
      const { data: rows } = await supabase
        .rpc('get_vistoria_publica_by_token', { p_token: token });

      const row = rows?.[0];
      if (!row) { setNotFound(true); return; }

      if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
        setIsExpired(true); return;
      }
      if (['em_andamento', 'aprovada', 'reprovada'].includes(row.status)) {
        setIsCompleted(true);
      }

      setVistoria({
        id: row.id,
        status: row.status,
        token_expires_at: row.token_expires_at,
        veiculo: { id: row.veiculo_id, marca: row.veiculo_marca, modelo: row.veiculo_modelo, placa: row.veiculo_placa, ano: row.veiculo_ano },
        associado: row.associado_id ? { nome_completo: row.associado_nome } : null,
      });
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleFileChange = async (key: string, file: File) => {
    if (!vistoria) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 15MB.'); return; }

    setFotos(prev => prev.map(f => f.key === key ? { ...f, uploading: true } : f));

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `vistorias/${vistoria.id}/${key}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('veiculo-documentos')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage
        .from('veiculo-documentos')
        .getPublicUrl(path);

      setFotos(prev => prev.map(f => f.key === key ? { ...f, url: publicUrl, uploading: false } : f));
      toast.success(`${FOTO_ITEMS_INIT.find(i => i.key === key)?.label} enviada!`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar foto');
      setFotos(prev => prev.map(f => f.key === key ? { ...f, uploading: false } : f));
    }
  };

  const handleRemoveFoto = (key: string) => {
    setFotos(prev => prev.map(f => f.key === key ? { ...f, url: null } : f));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!vistoria) return;

    const missing = fotos.filter(f => f.required && !f.url);
    if (missing.length > 0) {
      toast.error(`Fotos obrigatórias faltando: ${missing.map(m => m.label).join(', ')}`);
      return;
    }

    setIsSaving(true);
    try {
      const allUrls = fotos.filter(f => f.url).map(f => f.url!);
      const checklist = Object.fromEntries(fotos.map(f => [f.key, !!f.url]));

      // Use existing RPC to bypass RLS
      const { error } = await supabase.rpc('salvar_vistoria_publica', {
        p_token: token,
        p_checklist: checklist,
        p_fotos: allUrls,
      });
      if (error) throw error;

      // Also update observacoes if provided (best effort)
      if (observacoes.trim()) {
        await supabase.from('vistorias')
          .update({ observacoes: observacoes.trim() } as never)
          .eq('id', vistoria.id);
      }

      setIsCompleted(true);
      toast.success('Vistoria enviada com sucesso!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar vistoria');
    } finally {
      setIsSaving(false);
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

  if (notFound) return <StatusScreen icon="error" title="Link Inválido" message="Este link de vistoria não existe ou é inválido. Entre em contato com seu consultor." />;
  if (isExpired) return <StatusScreen icon="expired" title="Link Expirado" message="Este link de vistoria expirou. Solicite um novo link ao seu consultor." />;

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#111827' }}>
        <div className="max-w-md w-full rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6" style={{ background: '#F97316' }}>
            <BrandLogo className="h-10 mx-auto mb-3" context="report" />
          </div>
          <div className="p-8 text-center" style={{ background: '#1f2937' }}>
            <CheckCircle2 className="h-14 w-14 mx-auto mb-4" style={{ color: '#22c55e' }} />
            <h2 className="text-xl font-bold text-white mb-2">Vistoria Enviada!</h2>
            <p className="text-gray-300 text-sm mb-6">
              Suas fotos foram recebidas com sucesso. Nossa equipe irá analisar e você receberá seu contrato por e-mail após a aprovação.
            </p>
            <div className="rounded-lg p-4 text-left space-y-2" style={{ background: '#374151' }}>
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-3">Próximos passos</p>
              {['Análise das fotos pela equipe Harmony', 'Geração do contrato após aprovação', 'Envio do contrato para assinatura digital', 'Ativação da proteção do seu veículo'].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#F97316' }}>{i + 1}</span>
                  <span className="text-gray-300 text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = fotos.filter(f => f.url).length;
  const requiredCount = fotos.filter(f => f.required).length;
  const requiredCompleted = fotos.filter(f => f.required && f.url).length;
  const allRequiredDone = requiredCompleted === requiredCount;

  return (
    <div className="min-h-screen pb-8" style={{ background: '#111827' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-lg" style={{ background: '#F97316' }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <BrandLogo className="h-8" context="report" />
          <div className="text-right">
            <p className="text-white text-xs font-medium opacity-90">Vistoria Veicular</p>
            <p className="text-white text-xs opacity-75 flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" /> Válido por 48h
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4 mt-4">
        {/* Vehicle info */}
        {vistoria?.veiculo && (
          <div className="rounded-xl p-4" style={{ background: '#1f2937', border: '1px solid #374151' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#F97316' }}>
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">{vistoria.veiculo.marca} {vistoria.veiculo.modelo}</p>
                <p className="text-xs text-gray-400">Placa: <span className="font-mono text-orange-400">{vistoria.veiculo.placa}</span> · {vistoria.veiculo.ano}</p>
              </div>
            </div>
            {vistoria.associado && (
              <p className="text-sm text-gray-400">Proprietário: <span className="text-gray-200">{vistoria.associado.nome_completo}</span></p>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="rounded-xl p-4" style={{ background: '#1f2937', border: '1px solid #374151' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-white">Progresso das fotos</p>
            <span className="text-sm font-bold" style={{ color: allRequiredDone ? '#22c55e' : '#F97316' }}>
              {completedCount}/{fotos.length}
            </span>
          </div>
          <div className="w-full rounded-full h-2" style={{ background: '#374151' }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / fotos.length) * 100}%`, background: allRequiredDone ? '#22c55e' : '#F97316' }}
            />
          </div>
          {!allRequiredDone && (
            <p className="text-xs text-gray-400 mt-1">{requiredCount - requiredCompleted} foto(s) obrigatória(s) pendente(s)</p>
          )}
        </div>

        {/* Photo items */}
        <div className="space-y-3">
          {fotos.map(foto => (
            <div key={foto.key} className="rounded-xl overflow-hidden" style={{ background: '#1f2937', border: `1px solid ${foto.url ? '#166534' : '#374151'}` }}>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {foto.url
                    ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                    : <div className="h-4 w-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: foto.required ? '#F97316' : '#6b7280' }} />
                  }
                  <span className="text-sm text-white font-medium">{foto.label}</span>
                  {foto.required && !foto.url && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#7c2d12', color: '#fed7aa', fontSize: 10 }}>obrigatório</span>
                  )}
                </div>
                {foto.url ? (
                  <button onClick={() => handleRemoveFoto(foto.key)} className="text-gray-400 hover:text-red-400 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={el => { fileInputRefs.current[foto.key] = el; }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(foto.key, f); e.target.value = ''; }}
                    />
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ background: '#F97316', color: '#fff' }}
                    >
                      {foto.uploading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Camera className="h-3.5 w-3.5" />}
                      {foto.uploading ? 'Enviando...' : 'Tirar foto'}
                    </div>
                  </label>
                )}
              </div>

              {foto.url && (
                <img
                  src={foto.url}
                  alt={foto.label}
                  className="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: 200 }}
                  onClick={() => window.open(foto.url!, '_blank')}
                />
              )}
            </div>
          ))}
        </div>

        {/* Observations */}
        <div className="rounded-xl p-4" style={{ background: '#1f2937', border: '1px solid #374151' }}>
          <label className="text-sm font-medium text-gray-200 block mb-2">
            Observações <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <Textarea
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            placeholder="Alguma observação sobre o veículo? (avarias conhecidas, acessórios, etc.)"
            rows={3}
            className="text-sm resize-none"
            style={{ background: '#374151', border: '1px solid #4b5563', color: '#f3f4f6' }}
          />
        </div>

        {/* Submit */}
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={isSaving || !allRequiredDone}
          className="w-full font-bold text-white h-14 text-base rounded-xl"
          style={{ background: allRequiredDone ? '#F97316' : '#374151', color: '#fff' }}
        >
          {isSaving
            ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Enviando vistoria...</>
            : <><CheckCircle2 className="h-5 w-5 mr-2" />Enviar Vistoria</>}
        </Button>

        {!allRequiredDone && (
          <p className="text-center text-xs text-gray-500">
            Envie todas as fotos obrigatórias para continuar
          </p>
        )}

        <p className="text-center text-xs text-gray-600 pb-4">
          Ao enviar, você confirma que as fotos são do veículo informado acima.
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
