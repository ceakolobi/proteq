import { useState, useCallback, useMemo } from 'react';

interface UseEntityListOptions<T> {
  searchFields: (keyof T)[];
  initialFilters?: Record<string, string>;
}

interface UseEntityListResult<T> {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
  filteredItems: T[];
}

/**
 * Hook genérico para filtros e busca em listas
 * Reduz código repetitivo nas páginas
 */
export function useEntityList<T extends Record<string, any>>(
  items: T[],
  options: UseEntityListOptions<T>
): UseEntityListResult<T> {
  const { searchFields, initialFilters = {} } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchTerm('');
  }, [initialFilters]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Text search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchFields.some(field => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchLower);
          }
          if (typeof value === 'number') {
            return value.toString().includes(searchTerm);
          }
          return false;
        });
        if (!matchesSearch) return false;
      }

      // Apply filters
      for (const [key, filterValue] of Object.entries(filters)) {
        if (filterValue && filterValue !== 'all') {
          const itemValue = item[key];
          if (itemValue !== filterValue) {
            return false;
          }
        }
      }

      return true;
    });
  }, [items, searchTerm, filters, searchFields]);

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    resetFilters,
    filteredItems,
  };
}

/**
 * Hook para gerenciar estado de diálogos
 */
export function useDialogState<T>() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const open = useCallback((item?: T) => {
    setSelectedItem(item || null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedItem(null);
  }, []);

  return {
    isOpen,
    selectedItem,
    open,
    close,
    setSelectedItem,
  };
}

/**
 * Hook para loading states com operações assíncronas
 */
export function useAsyncOperation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async <T>(operation: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await operation();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Operação falhou'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, execute, setError };
}
