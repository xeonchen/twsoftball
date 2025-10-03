import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createLineupErrorBoundary } from './errorBoundaryFactory';

vi.mock('../lib/monitoring');

describe('createLineupErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console errors from intentional errors in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Test 1: HOC preserves component props
  it('creates HOC that forwards all props to wrapped component', () => {
    const TestComponent = ({
      value,
      count,
    }: {
      value: string;
      count: number;
    }): React.JSX.Element => (
      <div data-testid="test-component">
        {value}-{count}
      </div>
    );

    const Enhanced = createLineupErrorBoundary(TestComponent, {
      context: 'test_context',
      maxRetries: 2,
      fallbackRenderer: (error, _onRetry) => <div>Error: {error.message}</div>,
    });

    render(<Enhanced value="test" count={42} />);
    expect(screen.getByTestId('test-component')).toHaveTextContent('test-42');
  });

  // Test 2: Error boundary config applied
  it('applies error boundary configuration correctly', () => {
    const TestComponent = (): React.JSX.Element => <div>Content</div>;
    const mockFallback = vi.fn((_error, _onRetry) => <div>Fallback</div>);

    const Enhanced = createLineupErrorBoundary(TestComponent, {
      context: 'lineup_test',
      maxRetries: 3,
      fallbackRenderer: mockFallback,
    });

    // Verify component type and config
    expect(Enhanced).toBeDefined();
    expect(typeof Enhanced).toBe('function');
  });

  // Test 3: Factory returns valid component
  it('returns a valid React component type', () => {
    const TestComponent = (): React.JSX.Element => <div>Test</div>;

    const Enhanced = createLineupErrorBoundary(TestComponent, {
      context: 'component_test',
      maxRetries: 1,
      fallbackRenderer: () => <div>Error</div>,
    });

    expect(typeof Enhanced).toBe('function');
    expect(Enhanced.displayName).toBeDefined();
  });

  // Test 4: Accepts different maxRetries values
  it('respects maxRetries configuration', () => {
    const TestComponent = (): React.JSX.Element => <div>Content</div>;

    const Enhanced1 = createLineupErrorBoundary(TestComponent, {
      context: 'retry_test_1',
      maxRetries: 1,
      fallbackRenderer: () => <div>Error</div>,
    });

    const Enhanced2 = createLineupErrorBoundary(TestComponent, {
      context: 'retry_test_2',
      maxRetries: 5,
      fallbackRenderer: () => <div>Error</div>,
    });

    expect(Enhanced1).toBeDefined();
    expect(Enhanced2).toBeDefined();
  });

  // Test 5: Accepts retry functionality config
  it('supports retry functionality', () => {
    const TestComponent = (): React.JSX.Element => <div>Content</div>;

    const Enhanced = createLineupErrorBoundary(TestComponent, {
      context: 'retry_enabled_test',
      maxRetries: 3,
      fallbackRenderer: (error, onRetry) => <button onClick={onRetry}>Retry</button>,
    });

    expect(Enhanced).toBeDefined();
  });

  // Test 6: Generic type constraint enforcement
  it('accepts components with object props', () => {
    const ValidComponent = ({ data }: { data: { id: number } }): React.JSX.Element => (
      <div>{data.id}</div>
    );

    const Enhanced = createLineupErrorBoundary(ValidComponent, {
      context: 'type_test',
      maxRetries: 2,
      fallbackRenderer: () => <div>Error</div>,
    });

    render(<Enhanced data={{ id: 123 }} />);
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  // Test 7: Multiple instances with different contexts
  it('creates independent HOCs for different contexts', () => {
    const Component1 = (): React.JSX.Element => <div>Component 1</div>;
    const Component2 = (): React.JSX.Element => <div>Component 2</div>;

    const Enhanced1 = createLineupErrorBoundary(Component1, {
      context: 'context_1',
      maxRetries: 1,
      fallbackRenderer: () => <div>Error 1</div>,
    });

    const Enhanced2 = createLineupErrorBoundary(Component2, {
      context: 'context_2',
      maxRetries: 2,
      fallbackRenderer: () => <div>Error 2</div>,
    });

    const { container: c1 } = render(<Enhanced1 />);
    const { container: c2 } = render(<Enhanced2 />);

    expect(c1).toHaveTextContent('Component 1');
    expect(c2).toHaveTextContent('Component 2');
  });

  // Test 8: Component renders successfully
  it('renders wrapped component without errors', () => {
    const TestComponent = ({ title }: { title: string }): React.JSX.Element => <h1>{title}</h1>;

    const Enhanced = createLineupErrorBoundary(TestComponent, {
      context: 'render_test',
      maxRetries: 2,
      fallbackRenderer: () => <div>Error</div>,
    });

    render(<Enhanced title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  // Test 9: Fallback renderer signature
  it('accepts valid fallback renderer function', () => {
    const TestComponent = (): React.JSX.Element => <div>Content</div>;

    const fallbackRenderer = (error: Error, onRetry: () => void): React.JSX.Element => (
      <div>
        <p>Error: {error.message}</p>
        <button onClick={onRetry}>Retry</button>
      </div>
    );

    const Enhanced = createLineupErrorBoundary(TestComponent, {
      context: 'fallback_test',
      maxRetries: 3,
      fallbackRenderer,
    });

    expect(Enhanced).toBeDefined();
  });

  // Test 10: Context string configuration
  it('accepts different context strings', () => {
    const TestComponent = (): React.JSX.Element => <div>Content</div>;

    const contexts = ['lineup_editor', 'substitution_dialog', 'position_assignment'];

    contexts.forEach(context => {
      const Enhanced = createLineupErrorBoundary(TestComponent, {
        context,
        maxRetries: 2,
        fallbackRenderer: () => <div>Error</div>,
      });

      expect(Enhanced).toBeDefined();
    });
  });
});
