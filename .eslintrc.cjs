module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: [
      './tsconfig.lint.json',
      './packages/*/tsconfig.lint.json'
    ],
  },
  plugins: ['@typescript-eslint', 'boundaries'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'airbnb-base',
    'airbnb-typescript/base',
    'prettier',
  ],
  rules: {
    // TypeScript specific
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    
    // Import rules
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', {
      'devDependencies': [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/vitest.config.ts',
        '**/vite.config.ts',
        'tools/**',
        'tests/**'
      ]
    }],
    
    // General rules
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Architecture boundaries
    'boundaries/element-types': ['error', {
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
    }],
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
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
      },
    },
  ],
};