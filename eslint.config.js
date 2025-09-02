import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import security from 'eslint-plugin-security';

export default [
  // Base configs
  js.configs.recommended,

  // TypeScript and Airbnb configurations for TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        // Node.js globals
        crypto: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      boundaries,
      import: importPlugin,
      security,
    },
    rules: {
      // TypeScript ESLint recommended rules
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,

      // Custom TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/prefer-readonly': 'error',

      // Import rules
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.ts',
            '**/*.spec.ts',
            '**/vitest.config.ts',
            '**/vite.config.ts',
            'tools/**',
            'tests/**',
          ],
        },
      ],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      // Disabled due to flat config incompatibility - see https://github.com/import-js/eslint-plugin-import/issues/3079
      // 'import/no-unused-modules': [
      //   'error',
      //   {
      //     unusedExports: true,
      //     ignoreExports: [
      //       '**/index.ts',
      //       '**/*.test.ts',
      //       '**/*.spec.ts',
      //       '**/vitest.config.ts',
      //       '**/vite.config.ts',
      //     ],
      //   },
      // ],
      'import/no-cycle': ['error', { maxDepth: 10 }],
      'import/no-self-import': 'error',

      // General rules
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',

      // Security rules (adjusted for domain model patterns)
      ...security.configs.recommended.rules,
      'security/detect-object-injection': 'off', // Too many false positives with domain patterns
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-eval-with-expression': 'error',

      // Architecture boundaries
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'domain',
              allow: ['domain'],
            },
            {
              from: 'application',
              allow: ['domain', 'application'],
            },
            {
              from: 'infrastructure',
              allow: ['domain', 'application', 'infrastructure'],
            },
            {
              from: 'web',
              allow: ['domain', 'application', 'shared'],
            },
            {
              from: 'shared',
              allow: ['shared'],
            },
          ],
        },
      ],
    },
    settings: {
      'boundaries/elements': [
        {
          type: 'domain',
          pattern: 'packages/domain/src/**',
        },
        {
          type: 'application',
          pattern: 'packages/application/src/**',
        },
        {
          type: 'infrastructure',
          pattern: 'packages/infrastructure/src/**',
        },
        {
          type: 'web',
          pattern: 'apps/web/src/**',
        },
        {
          type: 'shared',
          pattern: 'packages/shared/src/**',
        },
      ],
    },
  },

  // Test files overrides
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      // Security rules are often false positives in test files
      'security/detect-object-injection': 'off',
    },
  },

  // Node.js scripts (tools directory)
  {
    files: ['tools/**/*.js'],
    languageOptions: {
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
  },

  // Prettier config (should be last)
  prettier,

  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.pnpm-store/**',
      '**/*.tsbuildinfo',
      '**/.tsbuildinfo',
      '**/dist/**',
      '.next/**',
    ],
  },
];
