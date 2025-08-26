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
      name: 'no-orphans',
      comment: 'No orphaned modules',
      severity: 'warn',
      from: { 
        orphan: true,
        pathNot: [
          '\\.(test|spec)\\.[jt]s$',
          '\\.d\\.ts$',
          'src/index\\.[jt]s$'
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