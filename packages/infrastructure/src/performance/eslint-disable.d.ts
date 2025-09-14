/**
 * Type declarations for ESLint disable pragmas
 * This file helps TypeScript understand Node.js globals in performance testing context
 */

declare global {
  // Node.js globals for performance testing
  const global: {
    gc?: () => void;
  };

  const process: {
    memoryUsage?: () => {
      heapUsed: number;
      heapTotal: number;
      external: number;
      arrayBuffers: number;
    };
  };

  // Browser globals for performance testing
  interface Performance {
    memory?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
  }

  // Timer functions
  function setInterval(callback: () => void, ms: number): number;
  function clearInterval(id: number): void;
}

export {};
