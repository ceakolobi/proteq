import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AssociadoFormData, VeiculoFormData, DocumentoUpload } from '@/components/associado/wizard/types';

const STORAGE_KEY = 'associado_wizard_draft';

export interface WizardDraft {
  id?: string;
  currentStep: number;
  associadoData: AssociadoFormData;
  veiculoData: VeiculoFormData;
  termosAceitos: boolean;
  lastUpdated: string;
  // Docs não podem ser persistidos no localStorage (são File objects)
}

interface UseWizardPersistenceReturn {
  hasDraft: boolean;
  isLoadingDraft: boolean;
  draftId: string | null;
  saveDraft: (data: Partial<WizardDraft>) => Promise<void>;
  loadDraft: () => WizardDraft | null;
  clearDraft: () => Promise<void>;
  checkForExistingDraft: () => Promise<boolean>;
}

export function useWizardPersistence(): UseWizardPersistenceReturn {
  const { user } = useAuth();
  const [hasDraft, setHasDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [draftId, setDraftId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): WizardDraft | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as WizardDraft;
      }
    } catch (error) {
      console.error('Error loading draft from localStorage:', error);
    }
    return null;
  }, []);

  // Save to localStorage (debounced)
  const saveToLocalStorage = useCallback((data: WizardDraft) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving draft to localStorage:', error);
    }
  }, []);

  // Clear localStorage
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing draft from localStorage:', error);
    }
  }, []);

  // Check for existing draft (both localStorage and backend)
  const checkForExistingDraft = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setIsLoadingDraft(false);
      return false;
    }

    setIsLoadingDraft(true);
    try {
      // First check localStorage
      const localDraft = loadFromLocalStorage();
      if (localDraft && localDraft.associadoData?.nome_completo) {
        setHasDraft(true);
        setIsLoadingDraft(false);
        return true;
      }

      // Then check backend for rascunhos
      const { data, error } = await supabase
        .from('associados')
        .select('id, nome_completo, created_at')
        .eq('consultor_id', user.id)
        .eq('status', 'rascunho')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setDraftId(data.id);
        setHasDraft(true);
        setIsLoadingDraft(false);
        return true;
      }

      setHasDraft(false);
      setIsLoadingDraft(false);
      return false;
    } catch (error) {
      console.error('Error checking for draft:', error);
      setIsLoadingDraft(false);
      return false;
    }
  }, [user?.id, loadFromLocalStorage]);

  // Save draft (to localStorage and optionally to backend)
  const saveDraft = useCallback(async (data: Partial<WizardDraft>) => {
    if (!user?.id) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Get current draft and merge
    const currentDraft = loadFromLocalStorage() || {
      currentStep: 0,
      associadoData: {} as AssociadoFormData,
      veiculoData: {} as VeiculoFormData,
      termosAceitos: false,
      lastUpdated: new Date().toISOString(),
    };

    const updatedDraft: WizardDraft = {
      ...currentDraft,
      ...data,
      lastUpdated: new Date().toISOString(),
    };

    // Save to localStorage immediately
    saveToLocalStorage(updatedDraft);
    setHasDraft(true);

    // Debounce backend save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Only save to backend if we have minimum required data
        if (updatedDraft.associadoData?.nome_completo && updatedDraft.associadoData?.cpf) {
          const cpfLimpo = updatedDraft.associadoData.cpf.replace(/\D/g, '');
          
          if (cpfLimpo.length === 11) {
            // Check if rascunho already exists
            const { data: existing } = await supabase
              .from('associados')
              .select('id')
              .eq('consultor_id', user.id)
              .eq('status', 'rascunho')
              .maybeSingle();

            if (existing) {
              // Update existing draft
              await supabase
                .from('associados')
                .update({
                  nome_completo: updatedDraft.associadoData.nome_completo.trim(),
                  cpf: cpfLimpo,
                  email: updatedDraft.associadoData.email || 'rascunho@temp.com',
                  telefone: updatedDraft.associadoData.telefone?.replace(/\D/g, '') || '00000000000',
                  rg: updatedDraft.associadoData.rg?.replace(/\D/g, '') || null,
                  cep: updatedDraft.associadoData.cep?.replace(/\D/g, '') || null,
                  endereco: updatedDraft.associadoData.endereco || null,
                  numero: updatedDraft.associadoData.numero || null,
                  bairro: updatedDraft.associadoData.bairro || null,
                  cidade: updatedDraft.associadoData.cidade || null,
                  estado: updatedDraft.associadoData.estado || null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);
              
              setDraftId(existing.id);
            } else {
              // Create new draft - need to get profile's regiao_id
              const { data: profile } = await supabase
                .from('profiles')
                .select('regiao_id')
                .eq('id', user.id)
                .single();

              if (profile?.regiao_id) {
                const { data: newDraft, error } = await supabase
                  .from('associados')
                  .insert({
                    nome_completo: updatedDraft.associadoData.nome_completo.trim(),
                    cpf: cpfLimpo,
                    email: updatedDraft.associadoData.email || 'rascunho@temp.com',
                    telefone: updatedDraft.associadoData.telefone?.replace(/\D/g, '') || '00000000000',
                    consultor_id: user.id,
                    regiao_id: profile.regiao_id,
                    status: 'rascunho',
                  })
                  .select('id')
                  .single();

                if (!error && newDraft) {
                  setDraftId(newDraft.id);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error saving draft to backend:', error);
      }
    }, 2000); // 2 second debounce for backend
  }, [user?.id, loadFromLocalStorage, saveToLocalStorage]);

  // Load draft
  const loadDraft = useCallback((): WizardDraft | null => {
    return loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Clear draft
  const clearDraft = useCallback(async () => {
    clearLocalStorage();
    setHasDraft(false);

    // Clear backend draft if exists
    if (draftId) {
      try {
        await supabase
          .from('associados')
          .delete()
          .eq('id', draftId)
          .eq('status', 'rascunho');
      } catch (error) {
        console.error('Error clearing backend draft:', error);
      }
      setDraftId(null);
    }

    // Also try to delete any other rascunhos by this consultant
    if (user?.id) {
      try {
        await supabase
          .from('associados')
          .delete()
          .eq('consultor_id', user.id)
          .eq('status', 'rascunho');
      } catch (error) {
        console.error('Error clearing all drafts:', error);
      }
    }
  }, [draftId, user?.id, clearLocalStorage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasDraft,
    isLoadingDraft,
    draftId,
    saveDraft,
    loadDraft,
    clearDraft,
    checkForExistingDraft,
  };
}
