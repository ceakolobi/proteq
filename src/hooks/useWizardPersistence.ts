import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AssociadoFormData, VeiculoFormData } from '@/components/associado/wizard/types';

const STORAGE_KEY = 'draft_associado';

export interface WizardDraft {
  id?: string; // backend associado id (for updates)
  currentStep: number;
  associadoData: AssociadoFormData;
  veiculoData: VeiculoFormData;
  termosAceitos: boolean;
  lastUpdated: string;
}

interface UseWizardPersistenceReturn {
  hasDraft: boolean;
  isLoadingDraft: boolean;
  draftId: string | null;
  saveDraftLocal: (data: Partial<WizardDraft>) => void;
  loadDraftLocal: () => WizardDraft | null;
  clearDraftLocal: () => void;
  saveDraftBackend: (data: WizardDraft) => Promise<string | null>;
  loadDraftBackend: () => Promise<WizardDraft | null>;
  clearDraftBackend: () => Promise<void>;
  clearAll: () => Promise<void>;
}

// --- localStorage helpers ---
function loadFromLocalStorage(): WizardDraft | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WizardDraft;

      // File objects are not serializable; always restore as null
      if (parsed?.associadoData) {
        (parsed.associadoData as any).comprovante_migracao_file = null;
      }

      return parsed;
    }
  } catch (e) {
    console.error('Error loading draft from localStorage:', e);
  }
  return null;
}

function saveToLocalStorage(data: WizardDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving draft to localStorage:', e);
  }
}

function clearLocalStorageKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing draft from localStorage:', e);
  }
}

// --- Hook ---
export function useWizardPersistence(): UseWizardPersistenceReturn {
  const { user, profile } = useAuth();
  const [hasDraft, setHasDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // --- Local Storage ---
  const loadDraftLocal = useCallback((): WizardDraft | null => {
    const draft = loadFromLocalStorage();
    setHasDraft(!!draft);
    if (draft?.id) setDraftId(draft.id);
    return draft;
  }, []);

  const saveDraftLocal = useCallback((data: Partial<WizardDraft>) => {
    const current = loadFromLocalStorage() || {
      currentStep: 0,
      associadoData: {} as AssociadoFormData,
      veiculoData: {} as VeiculoFormData,
      termosAceitos: false,
      lastUpdated: new Date().toISOString(),
    };

    const updated: WizardDraft = {
      ...current,
      ...data,
      lastUpdated: new Date().toISOString(),
    };

    // File objects are not serializable; do not persist them in drafts
    if (updated.associadoData) {
      (updated.associadoData as any) = {
        ...(updated.associadoData as any),
        comprovante_migracao_file: null,
      };
    }

    saveToLocalStorage(updated);
    setHasDraft(true);
    if (updated.id) setDraftId(updated.id);
  }, []);

  const clearDraftLocal = useCallback(() => {
    clearLocalStorageKey();
    setHasDraft(false);
  }, []);

  // --- Backend ---
  const saveDraftBackend = useCallback(
    async (data: WizardDraft): Promise<string | null> => {
      if (!user?.id) return null;

      const regiao_id = profile?.regiao_id;
      if (!regiao_id) {
        console.warn('Cannot save draft: user has no regiao_id');
        return null;
      }

      const cpfLimpo = (data.associadoData?.cpf || '').replace(/\D/g, '');
      const nome = (data.associadoData?.nome_completo || '').trim();

      // Minimal data required
      if (!cpfLimpo || cpfLimpo.length !== 11 || !nome) return null;

      try {
        // Check for existing draft
        const { data: existing, error: fetchErr } = await supabase
          .from('associados')
          .select('id')
          .eq('consultor_id', user.id)
          .eq('status', 'rascunho' as any)
          .maybeSingle();

        if (fetchErr) {
          console.error('Error fetching existing draft:', fetchErr);
          return null;
        }

        // Convert payload to plain JSON-compatible object
        const payloadJson = JSON.parse(
          JSON.stringify({
            associadoData: {
              ...(data.associadoData as any),
              // File objects are not serializable; persist as null
              comprovante_migracao_file: null,
            },
            veiculoData: data.veiculoData,
            termosAceitos: data.termosAceitos,
          })
        );

        const baseFields = {
          nome_completo: nome,
          cpf: cpfLimpo,
          email: data.associadoData?.email || 'rascunho@temp.com',
          telefone: (data.associadoData?.telefone || '').replace(/\D/g, '') || '00000000000',
          rg: (data.associadoData?.rg || '').replace(/\D/g, '') || null,
          cep: (data.associadoData?.cep || '').replace(/\D/g, '') || null,
          endereco: data.associadoData?.endereco || null,
          numero: data.associadoData?.numero || null,
          bairro: data.associadoData?.bairro || null,
          cidade: data.associadoData?.cidade || null,
          estado: data.associadoData?.estado || null,
          draft_step: data.currentStep,
          draft_payload: payloadJson,
          draft_last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let id: string | null = null;

        if (existing) {
          // Update
          const { error: updErr } = await supabase
            .from('associados')
            .update(baseFields as any)
            .eq('id', existing.id);

          if (updErr) console.error('Error updating draft:', updErr);
          id = existing.id;
        } else {
          // Insert
          const insertPayload = {
            ...baseFields,
            consultor_id: user.id,
            regiao_id,
            status: 'rascunho' as any,
          };

          const { data: inserted, error: insErr } = await supabase
            .from('associados')
            .insert(insertPayload as any)
            .select('id')
            .single();

          if (insErr) console.error('Error inserting draft:', insErr);
          id = inserted?.id || null;
        }

        if (id) {
          setDraftId(id);
          // Also update local storage with id
          saveDraftLocal({ id });
        }

        return id;
      } catch (e) {
        console.error('Error saving draft to backend:', e);
        return null;
      }
    },
    [user?.id, profile?.regiao_id, saveDraftLocal]
  );

  const loadDraftBackend = useCallback(async (): Promise<WizardDraft | null> => {
    if (!user?.id) return null;

    setIsLoadingDraft(true);
    try {
      const { data, error } = await supabase
        .from('associados')
        .select('id, nome_completo, draft_step, draft_payload, draft_last_updated')
        .eq('consultor_id', user.id)
        .eq('status', 'rascunho' as any)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setIsLoadingDraft(false);
        return null;
      }

      const payload = data.draft_payload as {
        associadoData?: AssociadoFormData;
        veiculoData?: VeiculoFormData;
        termosAceitos?: boolean;
      } | null;

      const draft: WizardDraft = {
        id: data.id,
        currentStep: data.draft_step ?? 0,
        associadoData: {
          ...((payload?.associadoData ?? {}) as any),
          // File objects are not serializable; always restore as null
          comprovante_migracao_file: null,
        } as AssociadoFormData,
        veiculoData: (payload?.veiculoData ?? {}) as VeiculoFormData,
        termosAceitos: payload?.termosAceitos ?? false,
        lastUpdated: data.draft_last_updated ?? new Date().toISOString(),
      };

      setDraftId(data.id);
      setHasDraft(true);
      setIsLoadingDraft(false);
      return draft;
    } catch (e) {
      console.error('Error loading draft from backend:', e);
      setIsLoadingDraft(false);
      return null;
    }
  }, [user?.id]);

  const clearDraftBackend = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Delete all rascunhos for this user
      await supabase
        .from('associados')
        .delete()
        .eq('consultor_id', user.id)
        .eq('status', 'rascunho' as any);

      setDraftId(null);
    } catch (e) {
      console.error('Error clearing draft from backend:', e);
    }
  }, [user?.id]);

  const clearAll = useCallback(async () => {
    clearDraftLocal();
    await clearDraftBackend();
  }, [clearDraftLocal, clearDraftBackend]);

  return {
    hasDraft,
    isLoadingDraft,
    draftId,
    saveDraftLocal,
    loadDraftLocal,
    clearDraftLocal,
    saveDraftBackend,
    loadDraftBackend,
    clearDraftBackend,
    clearAll,
  };
}
