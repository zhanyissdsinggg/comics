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

async function readResponseError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload = await response.json();
    const message = payload?.message ?? payload?.error ?? payload?.details;

    if (Array.isArray(message)) {
      return message.find((item) => typeof item === 'string') || fallbackMessage;
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  } catch {
    // Ignore JSON parsing failures and fall through to text parsing.
  }

  try {
    const text = await response.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Ignore body parsing failures and use the fallback message.
  }

  return fallbackMessage;
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

      const requests = ids.map(async (id) => {
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

        const response = await adminFetch(url, requestOptions);
        if (!response.ok) {
          throw new Error(
            await readResponseError(response, `${config.method} ${config.endpoint} failed for ${id}.`)
          );
        }
      });

      const results = await Promise.allSettled(requests);
      const failed = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

      if (failed.length > 0) {
        const firstError = failed[0]?.reason;
        const firstMessage = firstError instanceof Error ? firstError.message : String(firstError || 'Unknown error');

        if (ids.length === 1) {
          throw new Error(firstMessage);
        }

        throw new Error(`${failed.length}/${ids.length} operations failed. ${firstMessage}`);
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
