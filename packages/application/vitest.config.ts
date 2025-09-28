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
        'src/test-utils/**',
        'src/test-factories/**',
        // Pure type DTOs - TypeScript interfaces without runtime code
        // These files contain only `interface` and `type` definitions that
        // don't generate JavaScript runtime code for coverage tools to measure
        'src/dtos/AtBatResultDTO.ts',
        'src/dtos/BasesStateDTO.ts',
        'src/dtos/CompleteAtBatSequenceResult.ts',
        'src/dtos/CompleteGameWorkflowResult.ts',
        'src/dtos/EndGameResult.ts',
        'src/dtos/GameHistoryDTO.ts',
        'src/dtos/GameScoreDTO.ts',
        'src/dtos/GameStartResult.ts',
        'src/dtos/GameStateDTO.ts',
        'src/dtos/GameStatisticsDTO.ts',
        'src/dtos/InningEndResult.ts',
        'src/dtos/PlayerInGameDTO.ts',
        'src/dtos/PlayerStatisticsDTO.ts',
        'src/dtos/RedoResult.ts',
        'src/dtos/RunnerAdvanceDTO.ts',
        'src/dtos/SubstitutionResult.ts',
        'src/dtos/TeamLineupDTO.ts',
        'src/dtos/UndoResult.ts',
        // Port interfaces - these are contracts without implementation
        'src/ports/**/*.ts',
        // Type-only exports that don't generate runtime code
        'src/types/ApplicationTypes.ts',
        'src/services/InfrastructureFactory.ts', // Interface-only file
      ],
      // Application layer thresholds (slightly lower than domain)
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 95,
        lines: 90,
        perFile: true,
      },
      watermarks: {
        statements: [80, 90],
        branches: [75, 85],
        functions: [80, 90],
        lines: [80, 90],
      },
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },

    // Mock infrastructure imports to avoid circular dependency issues
    alias: {
      '@twsoftball/infrastructure/memory':
        '/src/test-factories/mocks/infrastructure-memory-mock.js',
      '@twsoftball/infrastructure/web': '/src/test-factories/mocks/infrastructure-web-mock.js',
    },
  },
});
