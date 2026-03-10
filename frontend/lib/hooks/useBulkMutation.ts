import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { adminFetch } from '../adminApiClient';

export type BulkMutationPayload = Record<string, unknown>;

export interface BulkMutationConfig {
  endpoint: string;
  method: 'DELETE' | 'PATCH' | 'POST';
  bodyBuilder?: (id: string) => BulkMutationPayload;
  appendIdToPath?: boolean;
}

export interface UseBulkMutationReturn {
  mutate: (ids: string[]) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useBulkMutation(
  config: BulkMutationConfig,
  options?: Omit<UseMutationOptions<void, Error, string[]>, 'mutationFn'>
): UseBulkMutationReturn {
  const mutation = useMutation<void, Error, string[]>({
    mutationFn: async (ids: string[]) => {
      if (!ids || ids.length === 0) {
        throw new Error('No items selected');
      }

      const requests = ids.map((id) => {
        const appendIdToPath = config.appendIdToPath !== false;
        const url = appendIdToPath
          ? `/api/admin/${config.endpoint}/${id}`
          : `/api/admin/${config.endpoint}`;
        const requestOptions: RequestInit = {
          method: config.method,
        };

        if (config.method === 'PATCH' || config.method === 'POST') {
          const body = config.bodyBuilder ? config.bodyBuilder(id) : {};
          requestOptions.body = JSON.stringify(body);
        }

        return adminFetch(url, requestOptions);
      });

      const results = await Promise.allSettled(requests);
      const failed = results.filter(
        (result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok)
      );

      if (failed.length > 0) {
        throw new Error(`${failed.length}/${ids.length} operations failed. Please try again.`);
      }
    },
    onError: (error) => {
      console.error('Bulk operation failed:', error);
    },
    ...options,
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export function useBulkDelete(
  endpoint: string,
  options?: Omit<UseMutationOptions<void, Error, string[]>, 'mutationFn'>
): UseBulkMutationReturn {
  return useBulkMutation(
    {
      endpoint,
      method: 'DELETE',
    },
    options
  );
}

export function useBulkUpdateStatus(
  endpoint: string,
  statusField: string = 'status',
  statusValue: unknown = null,
  options?: Omit<UseMutationOptions<void, Error, string[]>, 'mutationFn'>
): UseBulkMutationReturn {
  return useBulkMutation(
    {
      endpoint,
      method: 'PATCH',
      bodyBuilder: () => ({
        [statusField]: statusValue,
      }),
    },
    options
  );
}

export function useBulkUpdateBoolean(
  endpoint: string,
  fieldName: string,
  fieldValue: boolean,
  options?: Omit<UseMutationOptions<void, Error, string[]>, 'mutationFn'>
): UseBulkMutationReturn {
  return useBulkMutation(
    {
      endpoint,
      method: 'PATCH',
      bodyBuilder: () => ({
        [fieldName]: fieldValue,
      }),
    },
    options
  );
}
