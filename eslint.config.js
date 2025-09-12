import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import eslintComments from 'eslint-plugin-eslint-comments';
import importPlugin from 'eslint-plugin-import';
import security from 'eslint-plugin-security';

export default [
  // Base configs
  js.configs.recommended,

  // Vitest setup files override (special handling) - MUST come before main TS config
  {
    files: ['**/vitest.setup.ts'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // Don't use projectService for these files
      },
      globals: {
        console: 'readonly',
        globalThis: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        Crypto: 'readonly',
        crypto: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Only basic TypeScript rules that don't require project service
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
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // TypeScript and Airbnb configurations for TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/vitest.setup.ts'], // Exclude vitest.setup.ts from this config
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
      'eslint-comments': eslintComments,
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
            '**/test-factories/**',
            '**/test-utils/**',
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

      // ESLint comments rules - control eslint-disable usage
      'eslint-comments/disable-enable-pair': 'error',
      'eslint-comments/no-aggregating-enable': 'error',
      'eslint-comments/no-duplicate-disable': 'error',
      'eslint-comments/no-unlimited-disable': 'error',
      'eslint-comments/no-unused-disable': 'error',
      'eslint-comments/no-unused-enable': 'error',
      'eslint-comments/require-description': 'error',
      'eslint-comments/no-restricted-disable': [
        'error',
        // Critical security rules that should never be disabled
        'security/detect-eval-with-expression',
        'security/detect-non-literal-fs-filename',
        '@typescript-eslint/no-explicit-any',
        '@typescript-eslint/no-unsafe-assignment',
        '@typescript-eslint/no-unsafe-member-access',
        '@typescript-eslint/no-unsafe-call',
        '@typescript-eslint/no-unsafe-return',
        'boundaries/element-types',
      ],

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
    files: [
      '**/*.test.ts',
      '**/*.spec.ts',
      'tests/**/*.ts',
      '**/test-factories/**',
      '**/test-utils/**',
    ],
    languageOptions: {
      globals: {
        // Add console for test files
        console: 'readonly',
        // Re-add globals that might be needed in test files
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
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // Security rules are often false positives in test files
      'security/detect-object-injection': 'off',
      // Relax eslint-comments rules for test files
      'eslint-comments/no-restricted-disable': 'off',
      'eslint-comments/require-description': 'off',
      'eslint-comments/disable-enable-pair': 'off',
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
