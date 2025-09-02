/**
 * @type {import('@commitlint/types').UserConfig}
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit format
    'type-enum': [
      2,
      'always',
      [
        // Standard conventional commit types
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'build', // Changes to build system or dependencies
        'ci', // Changes to CI configuration
        'chore', // Maintenance tasks
        'revert', // Reverting previous commits

        // Project-specific types
        'config', // Configuration changes
        'deps', // Dependency updates
        'release', // Release-related changes
      ],
    ],

    // Scope validation (optional but recommended)
    'scope-enum': [
      1,
      'always',
      [
        // Architecture layers
        'domain',
        'application',
        'infrastructure',
        'shared',
        'web',

        // Cross-cutting concerns
        'ci',
        'config',
        'build',
        'deps',
        'docs',
        'test',
        'release',

        // Domain-specific areas
        'game',
        'lineup',
        'scoring',
        'stats',
        'events',
        'rules',

        // Infrastructure areas
        'auth',
        'storage',
        'sync',
        'offline',
      ],
    ],

    // Enforce proper case for subject
    'subject-case': [2, 'always', 'sentence-case'],

    // Subject length limits
    'subject-max-length': [2, 'always', 100],
    'subject-min-length': [2, 'always', 10],

    // No period at end of subject
    'subject-full-stop': [2, 'never', '.'],

    // Body and footer formatting
    'body-max-line-length': [1, 'always', 100],
    'footer-max-line-length': [1, 'always', 100],

    // Header length (including type, scope, and subject)
    'header-max-length': [2, 'always', 120],
  },

  // Custom parsing options
  parserPreset: {
    parserOpts: {
      // Allow custom breaking change patterns
      noteKeywords: ['BREAKING CHANGE', 'BREAKING-CHANGE'],
    },
  },

  // Ignore certain commit patterns (for automated commits)
  ignores: [
    commit => commit.includes('WIP'),
    commit => commit.includes('[skip ci]'),
    commit => commit.includes('Generated with Claude Code'),
  ],

  // Help message for invalid commits
  helpUrl: 'https://www.conventionalcommits.org/',
};
