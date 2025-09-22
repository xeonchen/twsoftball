import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useMemo, type ReactElement } from 'react';

/**
 * Props for the QueryProvider component
 */
interface QueryProviderProps {
  children: ReactNode;
}

/**
 * QueryClient configuration optimized for PWA and offline-first scenarios
 *
 * This configuration is designed for the TW Softball PWA with the following considerations:
 * - Longer stale times for better offline experience
 * - Automatic retries with backoff for intermittent network issues
 * - Cached data persists longer to reduce server load
 * - Error boundaries handle failed requests gracefully
 *
 * @remarks
 * In future phases, this will be enhanced with:
 * - Offline mutation handling
 * - Background sync capabilities
 * - IndexedDB persistence for critical data
 */
const createQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time of 5 minutes - good for slow-changing sports data
        staleTime: 1000 * 60 * 5,

        // Cache time of 10 minutes - keep data available for offline scenarios
        gcTime: 1000 * 60 * 10,

        // Retry failed requests 3 times with exponential backoff
        retry: (failureCount, error): boolean => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
            if (error.status >= 400 && error.status < 500) {
              return false;
            }
          }
          return failureCount < 3;
        },

        // Exponential backoff: 1s, 2s, 4s
        retryDelay: (attemptIndex): number => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Don't refetch on window focus by default (can be overridden per query)
        refetchOnWindowFocus: false,

        // Refetch on reconnect for fresh data when coming back online
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations once (important for game recording actions)
        retry: 1,

        // Shorter retry delay for mutations (user is waiting)
        retryDelay: 1000,
      },
    },
  });
};

/**
 * React Query provider component for the TW Softball PWA
 *
 * Provides a pre-configured QueryClient optimized for offline-first PWA usage.
 * This component should wrap the entire application to enable React Query
 * throughout the component tree.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <QueryProvider>
 *       <GameComponents />
 *     </QueryProvider>
 *   );
 * }
 * ```
 *
 * @param props - The component props
 * @param props.children - Child components that will have access to React Query
 */
export const QueryProvider = ({ children }: QueryProviderProps): ReactElement => {
  // Create QueryClient instance once and memoize it
  const queryClient = useMemo(() => createQueryClient(), []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
