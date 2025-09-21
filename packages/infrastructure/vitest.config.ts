import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts', 'src/**/*.perf.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**'],

    // Infrastructure layer coverage - adapters and external integrations
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/index.ts',
      ],
      // Infrastructure layer thresholds (adapters are harder to test)
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80,
        perFile: false, // Allow averaging for adapters
      },
      watermarks: {
        statements: [75, 90],
        branches: [70, 85],
        functions: [80, 90],
        lines: [75, 90],
      },
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
  },
});
