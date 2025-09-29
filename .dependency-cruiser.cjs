module.exports = {
  forbidden: [
    {
      name: 'domain-layer-allowed-dependencies',
      comment: 'Domain layer can only depend on itself (pure business logic)',
      severity: 'error',
      from: { path: '^packages/domain' },
      to: {
        pathNot: [
          '^packages/domain', // Can import from itself
          '^node_modules', // Can import external packages
          '\\.json$', // Allow JSON imports
        ],
      },
    },
    {
      name: 'application-layer-allowed-dependencies',
      comment: 'Application layer can only depend on domain and shared',
      severity: 'error',
      from: { path: '^packages/application' },
      to: {
        pathNot: [
          '^packages/application', // Can import from itself
          '^packages/domain', // Can import domain layer
          '^packages/shared', // Can import shared utilities
          '^node_modules', // Can import external packages
          '\\.json$', // Allow JSON imports
        ],
        // Exclude dynamic imports from this rule
        dependencyTypesNot: ['dynamic-import'],
      },
    },
    {
      name: 'infrastructure-layer-allowed-dependencies',
      comment: 'Infrastructure can depend on domain, application, and shared',
      severity: 'error',
      from: { path: '^packages/infrastructure' },
      to: {
        pathNot: [
          '^packages/infrastructure', // Can import from itself
          '^packages/domain', // Can import domain types
          '^packages/application', // Can import application layer
          '^packages/shared', // Can import shared utilities
          '^node_modules', // Can import external packages
          '\\.json$', // Allow JSON imports
        ],
      },
    },
    {
      name: 'shared-layer-allowed-dependencies',
      comment: 'Shared utilities can only depend on external packages',
      severity: 'error',
      from: { path: '^packages/shared' },
      to: {
        pathNot: [
          '^packages/shared', // Can import from itself
          '^node_modules', // Can import external packages
          '\\.json$', // Allow JSON imports
        ],
      },
    },
    {
      name: 'application-layer-forbidden-infrastructure',
      comment: 'Application layer must NOT import from infrastructure layer (static imports only)',
      severity: 'error',
      from: { path: '^packages/application' },
      to: {
        path: [
          '^packages/infrastructure', // Explicitly forbidden
          '^@twsoftball/infrastructure$', // Package alias forbidden (exact)
          '^@twsoftball/infrastructure/', // Package alias forbidden (subpaths)
        ],
        // Exclude dynamic imports - they are allowed for ApplicationFactory pattern
        dependencyTypesNot: ['dynamic-import'],
      },
    },
    {
      name: 'web-layer-allowed-dependencies',
      comment: 'Web layer can only import from application layer',
      severity: 'error',
      from: {
        path: '^apps/web',
      },
      to: {
        pathNot: [
          '^apps/web', // Can import from itself
          '^packages/application', // Can import application layer
          '^node_modules', // Can import external packages
          '\\.css$', // Allow CSS imports
          '\\.scss$', // Allow SCSS imports
          '\\.svg$', // Allow SVG imports
          '\\.png$', // Allow image imports
          '\\.jpg$', // Allow image imports
          '\\.json$', // Allow JSON imports
        ],
      },
    },
    {
      name: 'web-layer-forbidden-infrastructure',
      comment: 'Web layer must NOT import from infrastructure layer',
      severity: 'error',
      from: {
        path: '^apps/web',
      },
      to: {
        path: [
          '^packages/infrastructure', // Explicitly forbidden
          '^@twsoftball/infrastructure$', // Package alias forbidden (exact)
          '^@twsoftball/infrastructure/', // Package alias forbidden (subpaths)
        ],
      },
    },
    {
      name: 'web-layer-forbidden-domain',
      comment: 'Web layer must NOT import directly from domain layer',
      severity: 'error',
      from: { path: '^apps/web' },
      to: {
        path: [
          '^packages/domain', // Explicitly forbidden
          '^@twsoftball/domain$', // Package alias forbidden (exact)
          '^@twsoftball/domain/', // Package alias forbidden (subpaths)
        ],
      },
    },
    {
      name: 'package-alias-violations',
      comment: 'Detect violations using package.json aliases that bypass layer boundaries',
      severity: 'error',
      from: { path: '^apps/web' },
      to: {
        path: [
          '^@twsoftball/infrastructure$', // Web cannot use infrastructure alias (exact)
          '^@twsoftball/infrastructure/', // Web cannot use infrastructure alias (subpaths)
          '^@twsoftball/domain$', // Web cannot use domain alias (exact)
          '^@twsoftball/domain/', // Web cannot use domain alias (subpaths)
        ],
      },
    },
    {
      name: 'domain-forbidden-application',
      comment: 'Domain layer must NOT import from application layer (pure business logic)',
      severity: 'error',
      from: { path: '^packages/domain' },
      to: {
        path: [
          '^packages/application', // Explicitly forbidden
          '^@twsoftball/application$', // Package alias forbidden (exact)
          '^@twsoftball/application/', // Package alias forbidden (subpaths)
        ],
      },
    },
    {
      name: 'domain-forbidden-infrastructure',
      comment: 'Domain layer must NOT import from infrastructure layer (pure business logic)',
      severity: 'error',
      from: { path: '^packages/domain' },
      to: {
        path: [
          '^packages/infrastructure', // Explicitly forbidden
          '^@twsoftball/infrastructure$', // Package alias forbidden (exact)
          '^@twsoftball/infrastructure/', // Package alias forbidden (subpaths)
        ],
      },
    },
    {
      name: 'shared-forbidden-application',
      comment: 'Shared utilities must NOT import from application layer',
      severity: 'error',
      from: { path: '^packages/shared' },
      to: {
        path: [
          '^packages/application', // Explicitly forbidden
          '^@twsoftball/application$', // Package alias forbidden (exact)
          '^@twsoftball/application/', // Package alias forbidden (subpaths)
        ],
      },
    },
    {
      name: 'shared-forbidden-infrastructure',
      comment: 'Shared utilities must NOT import from infrastructure layer',
      severity: 'error',
      from: { path: '^packages/shared' },
      to: {
        path: [
          '^packages/infrastructure', // Explicitly forbidden
          '^@twsoftball/infrastructure$', // Package alias forbidden (exact)
          '^@twsoftball/infrastructure/', // Package alias forbidden (subpaths)
        ],
      },
    },
    {
      name: 'no-circular-dependencies',
      comment:
        'Circular dependencies are not allowed (excluding ApplicationFactory dynamic imports)',
      severity: 'error',
      from: {},
      to: {
        circular: true,
        // Exclude circular dependencies involving ApplicationFactory since it uses dynamic imports
        pathNot: [
          '^packages/application/src/services/ApplicationFactory\\.ts$',
          'ApplicationFactory',
        ],
      },
    },
    {
      name: 'no-orphans',
      comment: 'No orphaned modules',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '\\.(test|spec)\\.[jt]s$',
          '\\.d\\.ts$',
          'src/index\\.[jt]s$',
          'vitest\\.config\\.[jt]s$',
          'vitest\\.setup\\.[jt]s$',
          'vite\\.config\\.[jt]s$',
          'coverage/.*',
          'dist/.*',
          'apps/web/tailwind\\.config\\.js$',
          'apps/web/src/app/providers/theme/index\\.ts$',
          'apps/web/postcss\\.config\\.js$',
        ],
      },
      to: {},
    },
    {
      name: 'no-deprecated-core',
      comment: 'Do not use deprecated core modules',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: ['^(punycode|domain|constants|sys|_stream_wrap)$'],
      },
    },
    {
      name: 'not-to-dev-dep',
      comment: 'Do not use devDependencies in production code',
      severity: 'error',
      from: {
        path: '^(packages|apps)',
        pathNot: '\\.(?:test|spec)\\.[jt]s$',
      },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    doNotFollow: {
      path: ['node_modules', 'dist'],
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'],
    },
    includeOnly: '^(packages|apps)/',
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
      },
    },
  },
};
