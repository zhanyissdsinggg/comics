/**
 * 老王说：通用的admin列表Hook
 * 这个SB Hook处理所有列表页面的搜索、排序、筛选逻辑
 * 别tm在各个页面里重复写这些代码，这里搞定！
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { adminFetch } from '../adminApiClient';

/**
 * 搜索字段配置
 * 老王注释：定义哪些字段可以被搜索
 */
export interface SearchFieldConfig {
  field: string;
  type: 'string' | 'number' | 'date';
  caseSensitive?: boolean;
}

/**
 * 排序字段配置
 * 老王注释：定义哪些字段可以被排序
 */
export interface SortFieldConfig {
  field: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

/**
 * useAdminList Hook的返回类型
 * 老王说：这个接口定义了Hook返回的所有东西
 */
export interface UseAdminListReturn<T> {
  // 数据相关
  items: T[];
  isLoading: boolean;
  refetch: () => void;

  // 搜索相关
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // 排序相关
  sortBy: string;
  setSortBy: (field: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;

  // 筛选相关
  filters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;

  // 选择相关
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: (items: T[], idField?: string) => void;
  clearSelection: () => void;
}

/**
 * 通用的admin列表Hook
 * 老王说：用这个Hook替代所有页面里重复的搜索、排序、筛选逻辑
 *
 * @param endpoint - API端点（不包括/api/admin/前缀）
 * @param searchFields - 可搜索的字段配置
 * @param sortFields - 可排序的字段配置
 * @param defaultSort - 默认排序字段
 * @param defaultSortOrder - 默认排序顺序
 * @returns Hook返回值
 */
export function useAdminList<T extends { id: string }>(
  endpoint: string,
  searchFields: SearchFieldConfig[],
  sortFields: SortFieldConfig[],
  defaultSort: string = 'createdAt',
  defaultSortOrder: 'asc' | 'desc' = 'desc'
): UseAdminListReturn<T> {
  // 老王注释：搜索和排序状态
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 老王注释：序列化filters以保证queryKey稳定性，防止内存泄漏
  const filtersKey = JSON.stringify(filters);

  // 获取列表数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', endpoint, searchTerm, sortBy, sortOrder, filtersKey],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();

      // 老王注释：添加搜索参数
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // 老王注释：添加排序参数
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      // 老王注释：添加筛选参数
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await adminFetch(`/api/admin/${endpoint}?${params}`, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 老王注释：智能提取列表数据，支持多种API返回格式
  const items = useMemo(() => {
    if (!data) return [];

    // 尝试多种可能的key提取策略
    const pathSegments = endpoint.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1]; // 最后一个路径段（如 'episodes'）
    const firstSegment = pathSegments[0]; // 第一个路径段（如 'series'）

    // 按优先级尝试：最后路径段 > 第一路径段 > 'data' > 直接返回数组
    return data[lastSegment] || data[firstSegment] || data.data || (Array.isArray(data) ? data : []);
  }, [data, endpoint]);

  // 老王注释：直接返回 API 数据，不再客户端过滤（API 已经做过了）
  const filteredItems = items;

  // 老王注释：筛选相关函数
  const setFilter = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  // 老王注释：选择相关函数
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const selectAll = (itemsToSelect: T[], idField: string = 'id') => {
    setSelectedIds(itemsToSelect.map((item) => (item as any)[idField]));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // 老王说：cleanup函数处理组件卸载时的资源释放，防止内存泄漏
  useEffect(() => {
    return () => {
      // 组件卸载时清理状态
      setSelectedIds([]);
      setFilters({});
    };
  }, []);

  return {
    items: filteredItems,
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
