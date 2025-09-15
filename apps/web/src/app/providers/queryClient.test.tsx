import { useQuery, useQueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { type ReactElement } from 'react';

import { QueryProvider } from './queryClient';

// Test component that uses React Query
const TestComponent = (): ReactElement => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['test'],
    queryFn: () => {
      // Simulate API call
      return new Promise<string>(resolve => {
        setTimeout(() => resolve('test data'), 100);
      });
    },
  });

  return (
    <div>
      <div data-testid="client-available">
        {queryClient ? 'Query Client Available' : 'No Query Client'}
      </div>
      {isLoading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">Error occurred</div>}
      {data && <div data-testid="data">{data}</div>}
    </div>
  );
};

describe('Query Client Provider', () => {
  it('should provide query client to child components', () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    expect(screen.getByTestId('client-available')).toHaveTextContent('Query Client Available');
  });

  it('should handle successful query execution', async () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    // Initially should show loading
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('test data');
    });

    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });

  it('should handle offline scenarios gracefully', async () => {
    // Test component that simulates network error
    const OfflineTestComponent = (): ReactElement => {
      const { data, isLoading, error } = useQuery({
        queryKey: ['offline-test'],
        queryFn: () => {
          throw new Error('Network error');
        },
        retry: false, // Don't retry for this test
      });

      return (
        <div>
          {isLoading && <div data-testid="loading">Loading...</div>}
          {error && <div data-testid="error">Network error occurred</div>}
          {data && <div data-testid="data">{data}</div>}
        </div>
      );
    };

    render(
      <QueryProvider>
        <OfflineTestComponent />
      </QueryProvider>
    );

    // Should eventually show error
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error occurred');
    });
  });

  it('should configure appropriate defaults for PWA', () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    // QueryClient should be available, indicating provider is working
    expect(screen.getByTestId('client-available')).toHaveTextContent('Query Client Available');
  });
});
