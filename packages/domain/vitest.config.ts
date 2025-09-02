import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],

    // Test isolation for better reliability (beneficial for domain logic)
    isolate: true,

    // Enhanced reporting for CI integration
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },

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
        '**/test-utils/**',
        'src/index.ts',
      ],
      // Per-file thresholds for domain layer excellence
      thresholds: {
        statements: 98,
        branches: 95,
        functions: 98,
        lines: 98,
        perFile: true,
      },
      watermarks: {
        statements: [95, 98],
        branches: [90, 95],
        functions: [95, 98],
        lines: [95, 98],
      },
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});
