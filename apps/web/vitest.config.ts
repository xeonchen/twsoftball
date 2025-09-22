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
    testTimeout: 20000, // Increase global test timeout to 20 seconds for performance tests
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/**/*.perf.test.{ts,tsx}'],
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
