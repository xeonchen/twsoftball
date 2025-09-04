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
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov', 'clover'],
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
      // Domain layer thresholds (2-3% below Codecov targets)
      thresholds: {
        statements: 96,
        branches: 92,
        functions: 93,
        lines: 96,
        // Rely on Codecov for per-file coverage gates
        perFile: false,
      },
      watermarks: {
        statements: [96, 98],
        branches: [92, 96],
        functions: [93, 95],
        lines: [96, 98],
      },
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});
