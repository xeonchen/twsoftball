/* eslint-disable react-refresh/only-export-components -- Test utility file with mixed exports */
import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement } from 'react';

/**
 * Test wrapper component for consistent test environment
 * Currently minimal but ready for providers like theme or router
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  return <>{children}</>;
};

/**
 * Custom render function that includes test providers
 * Use this instead of RTL's render for consistent test setup
 */
const customRender = (ui: ReactElement, options?: RenderOptions): ReturnType<typeof render> =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };
/* eslint-enable react-refresh/only-export-components -- End of mixed exports section */
