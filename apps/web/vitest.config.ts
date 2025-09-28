/// <reference types="vitest" />
import path from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // @ts-expect-error - Vitest config compatibility
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom', // Better CSS compatibility than JSDOM for Tailwind v4
    setupFiles: './src/test/setup.ts',
    css: true,
    testTimeout: 30000, // Reduced timeout from 5 minutes to 30 seconds for better memory management
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/**/*.perf.test.{ts,tsx}'],

    // Memory optimization settings
    isolate: true, // Enable test isolation to prevent memory leaks between tests
    fileParallelism: false, // Sequential execution to reduce memory pressure
    maxConcurrency: 1, // Limit concurrent tests within files

    // Pool optimization for memory management
    poolOptions: {
      threads: {
        maxThreads: 2, // Limit threads to reduce memory usage
        minThreads: 1,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.perf.test.{ts,tsx}',
        '**/test/**',
        '**/__tests__/**',
      ],
      // Web layer thresholds (UI testing has diminishing returns)
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 75,
        lines: 70,
        perFile: false, // Allow averaging for UI components
      },
      watermarks: {
        statements: [65, 85],
        branches: [60, 80],
        functions: [70, 85],
        lines: [65, 85],
      },
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
  },
});
