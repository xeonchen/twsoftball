import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.tsx'],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**'],

    // Test isolation for web app reliability
    isolate: true,

    // Enhanced reporting for CI integration
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov', 'clover'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.test.tsx',
        '**/*.spec.tsx',
        'src/index.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.stories.ts',
        '**/*.stories.tsx',
      ],
      // Web app layer thresholds (3% below Codecov targets)
      thresholds: {
        statements: 89,
        branches: 82,
        functions: 85,
        lines: 89,
        // Rely on Codecov for per-file coverage gates
        perFile: false,
      },
      watermarks: {
        statements: [85, 92],
        branches: [80, 85],
        functions: [85, 88],
        lines: [85, 92],
      },
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
  },
});
