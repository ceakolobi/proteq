import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Persistência genérica de formulários em localStorage.
 * - Salva automaticamente (debounce) enquanto o usuário digita
 * - Restaura ao montar
 * - Sobrevive a recarregar a página / sair e voltar
 *
 * Uso típico:
 *   const { value, setValue, clearDraft, hasDraft } = useFormPersistence(
 *     'sedes:new', initialFormData, { enabled: isDialogOpen && !editingExisting }
 *   );
 *
 * Chame clearDraft() após salvar com sucesso.
 */

interface Options {
  /** Se false, o hook não lê nem grava em localStorage (útil para edições de itens existentes). */
  enabled?: boolean;
  /** Debounce em ms para o auto-save. Default 400ms. */
  debounceMs?: number;
  /** Se true, no mount substitui o initial pelo draft. Default true. */
  restoreOnMount?: boolean;
}

const STORAGE_PREFIX = 'lovable:formdraft:';

function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage cheio ou indisponível — silencioso
  }
}

function removeDraft(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // silencioso
  }
}

export function useFormPersistence<T>(
  key: string,
  initialValue: T,
  options: Options = {}
) {
  const { enabled = true, debounceMs = 400, restoreOnMount = true } = options;

  const [value, setValue] = useState<T>(() => {
    if (enabled && restoreOnMount) {
      const draft = readDraft<T>(key);
      if (draft) return draft;
    }
    return initialValue;
  });

  const [hasDraft, setHasDraft] = useState<boolean>(() =>
    enabled ? !!readDraft<T>(key) : false
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Auto-save com debounce
  useEffect(() => {
    if (!enabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      writeDraft(key, value);
      setHasDraft(true);
    }, debounceMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [key, value, debounceMs, enabled]);

  // Flush em unmount / beforeunload
  useEffect(() => {
    const handler = () => {
      if (enabledRef.current) writeDraft(key, value);
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      if (enabledRef.current) writeDraft(key, value);
    };
  }, [key, value]);

  const clearDraft = useCallback(() => {
    removeDraft(key);
    setHasDraft(false);
  }, [key]);

  const resetValue = useCallback(
    (next: T) => {
      setValue(next);
      removeDraft(key);
      setHasDraft(false);
    },
    [key]
  );

  return { value, setValue, clearDraft, resetValue, hasDraft };
}
