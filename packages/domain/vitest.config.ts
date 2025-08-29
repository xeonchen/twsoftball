import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.d.ts', 'src/index.ts', 'dist/**/*', '**/node_modules/**'],
    },
  },
});
