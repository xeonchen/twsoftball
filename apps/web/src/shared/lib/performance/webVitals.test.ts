import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('webVitals', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export initWebVitals function', async () => {
    const module = await import('./webVitals');
    expect(typeof module.initWebVitals).toBe('function');
  });

  it('should export consoleReporter function', async () => {
    const module = await import('./webVitals');
    expect(typeof module.consoleReporter).toBe('function');
  });

  it('consoleReporter should log metric to console', async () => {
    const { consoleReporter } = await import('./webVitals');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockMetric = {
      name: 'LCP',
      value: 2500,
      rating: 'good' as const,
      delta: 100,
      id: 'v1-123',
      entries: [],
      navigationType: 'navigate' as const,
    };

    consoleReporter(mockMetric);

    expect(consoleSpy).toHaveBeenCalledWith('[Web Vitals] LCP:', {
      value: 2500,
      rating: 'good',
      delta: 100,
    });

    consoleSpy.mockRestore();
  });

  it('consoleReporter should log different metrics correctly', async () => {
    const { consoleReporter } = await import('./webVitals');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const clsMetric = {
      name: 'CLS',
      value: 0.05,
      rating: 'good' as const,
      delta: 0.01,
      id: 'v1-456',
      entries: [],
      navigationType: 'navigate' as const,
    };

    consoleReporter(clsMetric);

    expect(consoleSpy).toHaveBeenCalledWith('[Web Vitals] CLS:', {
      value: 0.05,
      rating: 'good',
      delta: 0.01,
    });

    consoleSpy.mockRestore();
  });

  it('consoleReporter should handle poor ratings', async () => {
    const { consoleReporter } = await import('./webVitals');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const poorMetric = {
      name: 'INP',
      value: 500,
      rating: 'poor' as const,
      delta: 500,
      id: 'v1-789',
      entries: [],
      navigationType: 'navigate' as const,
    };

    consoleReporter(poorMetric);

    expect(consoleSpy).toHaveBeenCalledWith('[Web Vitals] INP:', {
      value: 500,
      rating: 'poor',
      delta: 500,
    });

    consoleSpy.mockRestore();
  });

  it('initWebVitals should call web-vitals functions with reporter', async () => {
    // Mock web-vitals module
    const mockOnCLS = vi.fn();
    const mockOnFCP = vi.fn();
    const mockOnLCP = vi.fn();
    const mockOnTTFB = vi.fn();
    const mockOnINP = vi.fn();

    vi.doMock('web-vitals', () => ({
      onCLS: mockOnCLS,
      onFCP: mockOnFCP,
      onLCP: mockOnLCP,
      onTTFB: mockOnTTFB,
      onINP: mockOnINP,
    }));

    // Re-import module with mocked dependencies
    const { initWebVitals } = await import('./webVitals');
    const mockReporter = vi.fn();

    initWebVitals(mockReporter);

    expect(mockOnCLS).toHaveBeenCalledWith(mockReporter);
    expect(mockOnFCP).toHaveBeenCalledWith(mockReporter);
    expect(mockOnLCP).toHaveBeenCalledWith(mockReporter);
    expect(mockOnTTFB).toHaveBeenCalledWith(mockReporter);
    expect(mockOnINP).toHaveBeenCalledWith(mockReporter);
  });
});
