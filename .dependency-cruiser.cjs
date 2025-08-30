module.exports = {
  forbidden: [
    {
      name: 'domain-layer-isolation',
      comment: 'Domain layer must not depend on any other layer',
      severity: 'error',
      from: { path: '^packages/domain' },
      to: {
        path: '^packages/(application|infrastructure|shared)',
        pathNot: '^packages/domain'
      }
    },
    {
      name: 'application-layer-restrictions',
      comment: 'Application layer can only depend on domain layer',
      severity: 'error',
      from: { path: '^packages/application' },
      to: {
        path: '^packages/(infrastructure|shared)',
        pathNot: '^packages/(domain|application)'
      }
    },
    {
      name: 'no-circular-dependencies',
      comment: 'Circular dependencies are not allowed',
      severity: 'error',
      from: {},
      to: { circular: true }
    },
    {
      name: 'infrastructure-layer-restrictions',
      comment: 'Infrastructure layer can only depend on domain and application layers',
      severity: 'error',
      from: { path: '^packages/infrastructure' },
      to: {
        path: '^packages/(web|shared)',
        pathNot: '^packages/(domain|application|infrastructure)'
      }
    },
    {
      name: 'web-layer-restrictions', 
      comment: 'Web layer can only depend on application layer via ports (no direct infrastructure)',
      severity: 'error',
      from: { path: '^apps/web' },
      to: {
        path: '^packages/infrastructure',
        pathNot: [
          '^packages/infrastructure/config', // Allow DI configuration
          '^packages/infrastructure/adapters/web' // Allow web-specific adapters
        ]
      }
    },
    {
      name: 'shared-layer-isolation',
      comment: 'Shared utilities must not depend on any business layer',
      severity: 'error', 
      from: { path: '^packages/shared' },
      to: {
        path: '^packages/(domain|application|infrastructure)'
      }
    },
    {
      name: 'no-direct-framework-imports-in-domain',
      comment: 'Domain layer cannot import framework-specific libraries',
      severity: 'error',
      from: { path: '^packages/domain' },
      to: {
        path: ['react', 'vue', 'angular', 'express', 'fastify', 'axios', 'fetch']
      }
    },
    {
      name: 'ports-and-adapters-pattern',
      comment: 'Infrastructure must implement application ports, not create direct dependencies',
      severity: 'warn',
      from: { path: '^packages/infrastructure' },
      to: {
        path: '^packages/application',
        pathNot: '^packages/application/ports'
      }
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
          'dist/.*'
        ]
      },
      to: {}
    },
    {
      name: 'no-deprecated-core',
      comment: 'Do not use deprecated core modules',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: [
          '^(punycode|domain|constants|sys|_stream_wrap)$'
        ]
      }
    },
    {
      name: 'not-to-dev-dep',
      comment: 'Do not use devDependencies in production code',
      severity: 'error',
      from: {
        path: '^(packages|apps)',
        pathNot: '\\.(?:test|spec)\\.[jt]s$'
      },
      to: { dependencyTypes: ['npm-dev'] }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer']
    },
    includeOnly: '^(packages|apps)/',
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports']
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)'
      }
    }
  }
};