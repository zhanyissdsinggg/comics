import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '../adminApiClient';

export interface SearchFieldConfig {
  field: string;
  type: 'string' | 'number' | 'date';
  caseSensitive?: boolean;
}

export interface SortFieldConfig {
  field: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

type FilterValue = string | number | boolean | null | undefined;
type FilterState = Record<string, FilterValue>;
type AdminListPayload<T> = Record<string, unknown> | T[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractItems<T>(data: AdminListPayload<T> | undefined, endpoint: string): T[] {
  if (!data) {
    return [];
  }
  if (Array.isArray(data)) {
    return data;
  }

  const pathSegments = endpoint.split('/');
  const lastSegment = pathSegments[pathSegments.length - 1];
  const firstSegment = pathSegments[0];
  const candidates = [data[lastSegment], data[firstSegment], data.data];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
}

function toSelectableId<T extends { id: string }>(item: T, idField: string): string {
  if (idField === 'id') {
    return item.id;
  }

  if (!isRecord(item)) {
    return item.id;
  }

  const rawId = item[idField];
  return typeof rawId === 'string' ? rawId : String(rawId ?? item.id);
}

export interface UseAdminListReturn<T> {
  items: T[];
  isLoading: boolean;
  refetch: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: string;
  setSortBy: (field: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  filters: FilterState;
  setFilter: (key: string, value: FilterValue) => void;
  clearFilters: () => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: (items: T[], idField?: string) => void;
  clearSelection: () => void;
}

export function useAdminList<T extends { id: string }>(
  endpoint: string,
  _searchFields: SearchFieldConfig[],
  _sortFields: SortFieldConfig[],
  defaultSort: string = 'createdAt',
  defaultSortOrder: 'asc' | 'desc' = 'desc'
): UseAdminListReturn<T> {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtersKey = JSON.stringify(filters);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', endpoint, searchTerm, sortBy, sortOrder, filtersKey],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await adminFetch(`/api/admin/${endpoint}?${params}`, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}`);
      }

      return (await response.json()) as AdminListPayload<T>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = useMemo(() => extractItems<T>(data, endpoint), [data, endpoint]);

  const setFilter = (key: string, value: FilterValue) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const selectAll = (itemsToSelect: T[], idField: string = 'id') => {
    setSelectedIds(itemsToSelect.map((item) => toSelectableId(item, idField)));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  useEffect(() => {
    return () => {
      setSelectedIds([]);
      setFilters({});
    };
  }, []);

  return {
    items,
    isLoading,
    refetch,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filters,
    setFilter,
    clearFilters,
    selectedIds,
    setSelectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
  };
}
