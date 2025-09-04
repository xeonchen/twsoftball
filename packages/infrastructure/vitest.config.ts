import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**'],
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
      // Infrastructure layer thresholds (3% below Codecov targets)
      thresholds: {
        statements: 87,
        branches: 77,
        functions: 82,
        lines: 87,
        // Rely on Codecov for per-file coverage gates
        perFile: false,
      },
      watermarks: {
        statements: [85, 90],
        branches: [75, 80],
        functions: [82, 85],
        lines: [85, 90],
      },
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
  },
});
