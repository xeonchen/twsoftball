import { renderHook, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { monitoring } from '../monitoring';

import { usePerformanceMonitoring, useInteractionTracking } from './useMonitoring';

vi.mock('../monitoring');

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // Test 1: Basic render time measurement
  it('measures render time on unmount', async () => {
    const { unmount } = renderHook(() => usePerformanceMonitoring('test_component'));

    await new Promise(resolve => setTimeout(resolve, 10));
    unmount();

    expect(monitoring.timing).toHaveBeenCalledWith(
      'test_component_render_time',
      expect.any(Number),
      expect.objectContaining({ component: 'test_component' })
    );
  });

  // Test 2: Timing value bounds validation
  it('only tracks valid timing values (> 0 and < 60000ms)', () => {
    const { unmount } = renderHook(() => usePerformanceMonitoring('bounds_test'));

    unmount();

    const timingCalls = (monitoring.timing as unknown as { mock: { calls: unknown[][] } }).mock
      .calls;
    const renderCall = timingCalls.find((call: unknown[]) =>
      typeof call[0] === 'string' ? call[0].includes('render_time') : false
    );

    if (renderCall && typeof renderCall[1] === 'number') {
      const renderTime = renderCall[1];
      expect(renderTime).toBeGreaterThan(0);
      expect(renderTime).toBeLessThan(60000);
    }
  });

  // Test 3: Fast unmount handling
  it('handles very fast unmounts correctly', () => {
    const { unmount } = renderHook(() => usePerformanceMonitoring('fast_unmount'));

    unmount(); // Immediate unmount

    // Should still attempt timing
    expect(monitoring.timing).toHaveBeenCalled();
  });

  // Test 4: Component name in metrics
  it('includes component name in timing metadata', () => {
    const { unmount } = renderHook(() => usePerformanceMonitoring('named_component'));

    unmount();

    expect(monitoring.timing).toHaveBeenCalledWith(
      'named_component_render_time',
      expect.any(Number),
      expect.objectContaining({ component: 'named_component' })
    );
  });

  // Test 5: Error handling in production
  it('silently handles monitoring errors in production', () => {
    const originalEnv = import.meta.env.MODE;
    (import.meta.env as unknown as { MODE: string }).MODE = 'production';

    vi.mocked(monitoring.timing).mockImplementation(() => {
      throw new Error('Monitoring service unavailable');
    });

    const { unmount } = renderHook(() => usePerformanceMonitoring('error_test'));

    expect(() => unmount()).not.toThrow();

    (import.meta.env as unknown as { MODE: string }).MODE = originalEnv;
  });

  // Test 6: Development mode error logging
  it('logs monitoring errors in development mode', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const originalEnv = import.meta.env.MODE;
    (import.meta.env as unknown as { MODE: string }).MODE = 'development';

    vi.mocked(monitoring.timing).mockImplementation(() => {
      throw new Error('Test error');
    });

    const { unmount } = renderHook(() => usePerformanceMonitoring('dev_error_test'));
    unmount();

    expect(consoleWarnSpy).toHaveBeenCalledWith('Performance monitoring error:', expect.any(Error));

    consoleWarnSpy.mockRestore();
    (import.meta.env as unknown as { MODE: string }).MODE = originalEnv;
  });
});

describe('useInteractionTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 7: Basic interaction tracking
  it('tracks interactions with component name prefix', () => {
    const { result } = renderHook(() => useInteractionTracking('button_component'));

    result.current.trackInteraction('clicked', { buttonId: 'submit' });

    expect(monitoring.track).toHaveBeenCalledWith(
      'button_component_clicked',
      expect.objectContaining({
        component: 'button_component',
        buttonId: 'submit',
      })
    );
  });

  // Test 8: Feature tracking
  it('tracks features with correct parameters', () => {
    const { result } = renderHook(() => useInteractionTracking('form_component'));

    result.current.trackFeature('submitted', { formId: 'user-signup' });

    expect(monitoring.feature).toHaveBeenCalledWith('form_component', 'submitted', {
      formId: 'user-signup',
    });
  });

  // Test 9: Properties merging
  it('merges custom properties with component context', () => {
    const { result } = renderHook(() => useInteractionTracking('list_component'));

    result.current.trackInteraction('item_selected', {
      itemId: 123,
      timestamp: Date.now(),
    });

    expect(monitoring.track).toHaveBeenCalledWith(
      'list_component_item_selected',
      expect.objectContaining({
        component: 'list_component',
        itemId: 123,
        timestamp: expect.any(Number),
      })
    );
  });

  // Test 10: Undefined properties handling
  it('handles undefined properties gracefully', () => {
    const { result } = renderHook(() => useInteractionTracking('test_component'));

    result.current.trackInteraction('action_without_props');

    expect(monitoring.track).toHaveBeenCalledWith('test_component_action_without_props', {
      component: 'test_component',
    });
  });

  // Test 11: Multiple tracking calls
  it('handles multiple tracking calls independently', () => {
    const { result } = renderHook(() => useInteractionTracking('multi_component'));

    result.current.trackInteraction('action1', { id: 1 });
    result.current.trackInteraction('action2', { id: 2 });
    result.current.trackFeature('feature1', { enabled: true });

    expect(monitoring.track).toHaveBeenCalledTimes(2);
    expect(monitoring.feature).toHaveBeenCalledTimes(1);
  });

  // Test 12: Component name stability
  it('maintains stable component name across renders', () => {
    const { result, rerender } = renderHook(({ name }) => useInteractionTracking(name), {
      initialProps: { name: 'stable_component' },
    });

    result.current.trackInteraction('initial');

    rerender({ name: 'stable_component' }); // Same name
    result.current.trackInteraction('after_rerender');

    expect(monitoring.track).toHaveBeenCalledWith('stable_component_initial', expect.any(Object));
    expect(monitoring.track).toHaveBeenCalledWith(
      'stable_component_after_rerender',
      expect.any(Object)
    );
  });
});
