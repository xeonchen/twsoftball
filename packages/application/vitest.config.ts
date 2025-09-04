import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**'],

    // Test isolation for application layer reliability
    isolate: true,

    // Enhanced reporting for CI integration
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov', 'clover'],
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
      // Application layer thresholds (based on current coverage with buffer)
      thresholds: {
        statements: 93,
        branches: 81,
        functions: 90,
        lines: 93,
        // Rely on Codecov for per-file coverage gates
        perFile: false,
      },
      watermarks: {
        statements: [90, 95],
        branches: [85, 88],
        functions: [90, 92],
        lines: [90, 95],
      },
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
  },
});
