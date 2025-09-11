# ADR-004: Adopt Monorepo Structure with pnpm Workspaces

## Status

**Accepted** - Date: 2025-08-27

## Context

We're building a softball game recording application using Domain-Driven Design
and Hexagonal Architecture, which naturally leads to multiple distinct packages:

- **Domain Layer**: Core business logic with no external dependencies
- **Application Layer**: Use cases and port definitions
- **Infrastructure Layer**: Database adapters, web controllers, external
  integrations
- **Shared Utilities**: Common code used across layers
- **Web Application**: Progressive Web App consuming the application services
- **Mobile Application**: Future Capacitor-based mobile app
- **Testing Utilities**: Shared test helpers and fixtures

Each layer needs strict dependency boundaries to maintain our hexagonal
architecture. We also need to share TypeScript configurations, tooling, and
common utilities while keeping packages focused and independently testable.

We evaluated several code organization strategies:

1. **Single Repository (Monolith)**: Everything in one package
2. **Multiple Repositories**: Each layer in separate git repositories
3. **Monorepo with npm/yarn Workspaces**: Single repo, multiple packages
4. **Monorepo with pnpm Workspaces**: Single repo with pnpm package manager
5. **Nx/Lerna Monorepo**: Tool-managed monorepo with advanced features

## Decision

We will adopt a **Monorepo structure using pnpm Workspaces** for the following
reasons:

### Core Benefits for Our Architecture

#### 1. Architectural Boundary Enforcement

Monorepo structure naturally enforces our hexagonal architecture layers:

```
packages/
├── domain/           # Zero external dependencies
├── application/      # Depends only on domain
├── infrastructure/   # Implements application ports
└── shared/          # Common utilities

apps/
├── web/             # PWA consuming application layer
└── mobile/          # Future mobile app
```

#### 2. Dependency Management Excellence

pnpm provides superior dependency management with workspace support:

```json
// Root package.json
{
  "name": "twsoftball",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}

// packages/application/package.json
{
  "name": "@twsoftball/application",
  "dependencies": {
    "@twsoftball/domain": "workspace:*",
    "@twsoftball/shared": "workspace:*"
  }
}
```

#### 3. Shared Tooling and Configuration

Common configurations automatically apply across all packages:

```javascript
// Root-level shared configuration
// tsconfig.json - Base TypeScript configuration
// eslint.config.js - Shared linting rules
// vitest.config.ts - Unified testing setup
// pnpm-workspace.yaml - Workspace configuration
```

#### 4. Atomic Changes Across Boundaries

Single commits can modify multiple packages when implementing cross-cutting
features:

```bash
# Example: Adding new domain event affects multiple layers
git add packages/domain/src/events/lineup-changed.ts
git add packages/application/src/handlers/lineup-change-handler.ts
git add packages/infrastructure/src/projections/lineup-projection.ts
git commit -m "feat: add lineup change event and handlers"
```

### pnpm Advantages Over npm/yarn

#### 1. Disk Space Efficiency

pnpm uses content-addressable storage with hard links:

```bash
# Traditional node_modules (each package has full copies)
node_modules/
├── packages/domain/node_modules/typescript/
├── packages/application/node_modules/typescript/  # Duplicate
└── apps/web/node_modules/typescript/              # Duplicate

# pnpm approach (shared store with hard links)
.pnpm-store/
└── typescript@5.0.0/
packages/domain/node_modules/typescript -> .pnpm-store/typescript@5.0.0
```

**Result**: 70% less disk usage, faster installations

#### 2. Strict Dependency Resolution

pnpm prevents phantom dependencies that break builds:

```json
// This would fail with pnpm (good!)
// packages/application trying to use lodash without declaring it
import _ from 'lodash'; // ❌ Error: lodash not in dependencies

// Forces explicit dependencies
{
  "dependencies": {
    "lodash": "^4.17.21"  // ✅ Must be declared
  }
}
```

#### 3. Performance Benefits

```bash
# Installation speed comparison (typical project)
npm install      # ~45 seconds
yarn install     # ~35 seconds
pnpm install     # ~12 seconds

# Cold cache vs warm cache
pnpm install --frozen-lockfile  # ~3 seconds (CI builds)
```

### Monorepo Implementation Strategy

#### Project Structure

```
twsoftball/
├── packages/
│   ├── domain/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── application/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── infrastructure/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   └── mobile/              # Future
│       ├── src/
│       ├── package.json
│       ├── capacitor.config.ts
│       └── tsconfig.json
├── tools/
│   ├── config/             # Shared configurations
│   └── scripts/            # Build and utility scripts
├── docs/                   # Documentation
├── package.json            # Root workspace configuration
├── pnpm-workspace.yaml     # Workspace definition
├── pnpm-lock.yaml         # Locked dependencies
└── tsconfig.json          # Base TypeScript config
```

#### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'tools/*'
```

#### Shared Scripts Management

```json
// Root package.json
{
  "scripts": {
    "test": "pnpm -r test",
    "test:watch": "pnpm -r --parallel test:watch",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "build": "pnpm -r build",
    "dev": "pnpm --filter @twsoftball/web dev"
  }
}
```

## Alternatives Considered

### Alternative 1: Single Repository (Monolith)

**Pros:**

- Simple setup and deployment
- No workspace complexity
- Easy to understand for new developers

**Cons:**

- Violates hexagonal architecture boundaries
- Impossible to enforce dependency rules
- All code changes affect entire application
- Difficult to test layers in isolation
- Poor separation of concerns

**Rejected:** Completely undermines our architectural decisions.

### Alternative 2: Multiple Repositories (Polyrepo)

**Pros:**

- Complete isolation between components
- Independent versioning and releases
- Clear ownership boundaries
- Separate CI/CD pipelines possible

**Cons:**

- Complex dependency management across repos
- Difficult to make atomic changes across boundaries
- Shared tooling configuration becomes complex
- Version coordination nightmare
- Cross-repository refactoring is extremely difficult
- Integration testing becomes complex

**Rejected:** Too much operational overhead for our team size.

### Alternative 3: npm/yarn Workspaces

**Pros:**

- Familiar tooling for most developers
- Good ecosystem support
- Mature workspace implementation

**Cons:**

- Slower installation and execution
- Less efficient disk usage
- Phantom dependency issues
- Weaker dependency resolution

**Rejected:** pnpm provides superior performance and reliability.

### Alternative 4: Nx/Lerna Managed Monorepo

**Pros:**

- Advanced build caching and optimization
- Sophisticated dependency graph analysis
- Rich CLI and development tools
- Automatic change detection

**Cons:**

- Significant additional complexity and learning curve
- Tool lock-in and migration difficulties
- Overkill for current project size
- Additional abstraction layer to learn and maintain

**Rejected:** Too complex for our current needs. Can be added later if needed.

### Alternative 5: Turborepo

**Pros:**

- Fast, intelligent build system
- Excellent caching capabilities
- Good monorepo tooling
- Growing ecosystem

**Cons:**

- Relatively new tool with smaller community
- Additional complexity layer
- Learning curve for the team
- May be overkill for current scope

**Rejected:** Adds unnecessary complexity at current scale.

## Implementation Details

### Package Interdependencies

#### Dependency Flow (Hexagonal Architecture)

```
Apps (Web, Mobile)
       ↓
Infrastructure Layer
       ↓
Application Layer
       ↓
Domain Layer ← Shared Utilities
```

#### Allowed Dependencies Matrix

```typescript
// packages/domain/package.json - ✅ No external dependencies
{
  "dependencies": {
    // Only shared utilities allowed
    "@twsoftball/shared": "workspace:*"
  }
}

// packages/application/package.json - ✅ Domain + shared only
{
  "dependencies": {
    "@twsoftball/domain": "workspace:*",
    "@twsoftball/shared": "workspace:*"
  }
}

// packages/infrastructure/package.json - ✅ Application + external adapters
{
  "dependencies": {
    "@twsoftball/application": "workspace:*",
    "@twsoftball/domain": "workspace:*",
    "@twsoftball/shared": "workspace:*",
    // External dependencies for adapters
    "indexed-db": "^1.0.0"
  }
}
```

### Build and Development Workflow

#### Development Commands

```bash
# Install all dependencies
pnpm install

# Run specific package tests
pnpm --filter @twsoftball/domain test
pnpm --filter @twsoftball/application test

# Run all tests
pnpm test

# Build all packages in dependency order
pnpm build

# Start development server
pnpm dev  # Runs web app with hot reload

# Type checking across all packages
pnpm typecheck

# Linting with shared rules
pnpm lint
```

#### Package-Specific Development

```bash
# Work on domain package only
cd packages/domain
pnpm test:watch

# Work on application layer
cd packages/application
pnpm test:watch

# Full app development
pnpm --filter @twsoftball/web dev
```

### Continuous Integration Strategy

#### Build Matrix

```yaml
# .github/workflows/ci.yml
strategy:
  matrix:
    package: [domain, application, infrastructure, web]

steps:
  - name: Test specific package
    run: pnpm --filter @twsoftball/${{ matrix.package }} test

  - name: Check architecture boundaries
    run: pnpm deps:check
```

#### Incremental Testing

```bash
# Only test packages affected by changes
pnpm --filter ...[HEAD~1] test

# Build only changed packages and dependents
pnpm --filter ...[HEAD~1] build
```

### Configuration Sharing

#### TypeScript Configuration Hierarchy

```json
// tsconfig.json (root)
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node"
  }
}

// packages/domain/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

#### ESLint Configuration Sharing

```javascript
// eslint.config.js (root)
export default [
  {
    files: ['packages/*/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Shared rules
    },
  },
  {
    files: ['packages/domain/src/**/*.ts'],
    rules: {
      'import/no-extraneous-dependencies': 'error', // Domain-specific rules
    },
  },
];
```

### Dependency Boundary Enforcement

#### Architecture Testing

```typescript
// tools/arch-test.ts
import { createArchTest } from 'dependency-cruiser';

const architectureRules = {
  forbidden: [
    {
      name: 'domain-no-external-deps',
      from: { path: '^packages/domain' },
      to: { path: 'node_modules', pathNot: '@twsoftball/shared' },
      severity: 'error',
    },
    {
      name: 'application-only-domain',
      from: { path: '^packages/application' },
      to: { path: 'node_modules', pathNot: '@twsoftball/(domain|shared)' },
      severity: 'error',
    },
  ],
};
```

#### Pre-commit Architecture Validation

```json
// package.json
{
  "scripts": {
    "deps:check": "dependency-cruiser --config .dependency-cruiser.cjs packages",
    "precommit": "pnpm lint && pnpm typecheck && pnpm deps:check && pnpm test"
  }
}
```

## Consequences

### Positive

#### ✅ Architectural Integrity

- Package boundaries enforce hexagonal architecture
- Dependency rules prevent architectural violations
- Clear separation of concerns at code level
- Easy to validate architecture compliance

#### ✅ Development Efficiency

- Single repository for all related code
- Shared tooling and configuration
- Atomic commits across package boundaries
- Simplified dependency management

#### ✅ Performance Benefits

- pnpm provides 70% faster installations
- Hard links save significant disk space
- Strict dependency resolution catches issues early
- Efficient CI builds with smart caching

#### ✅ Team Collaboration

- Single clone covers entire project
- Unified development workflow
- Shared coding standards and tooling
- Easy onboarding for new developers

#### ✅ Testing and Quality

- Run tests across all packages with single command
- Shared testing utilities and configurations
- Integration testing across package boundaries
- Consistent quality gates

#### ✅ Deployment Simplicity

- Single repository to deploy from
- Coordinated releases across all components
- Simplified CI/CD pipeline management
- Easy rollback of related changes

### Negative

#### ❌ Initial Setup Complexity

- More complex initial project structure
- Learning curve for workspace concepts
- Additional tooling configuration required
- Dependency resolution debugging can be complex

**Mitigation:**

- Comprehensive documentation and examples
- Standardized workspace setup scripts
- Clear troubleshooting guides
- Team training on monorepo concepts

#### ❌ Build Tool Dependency

- Locked into pnpm ecosystem
- Migration complexity if changing tools
- Tool-specific features and behaviors
- Potential version compatibility issues

**Mitigation:**

- pnpm has excellent stability and growth
- Standard package.json structure remains portable
- Document migration procedures if needed
- Regular tool updates and monitoring

#### ❌ Potential for Tight Coupling

- Easy to create unintended dependencies
- Risk of shared utilities becoming dumping ground
- Temptation to bypass architectural boundaries
- Large shared dependencies affect all packages

**Mitigation:**

- Strict architectural testing and validation
- Code review focus on dependency boundaries
- Clear guidelines for shared utility usage
- Regular refactoring to maintain separation

#### ❌ Repository Size Growth

- Single repository grows larger over time
- Potential performance issues with git operations
- More complex branching and merging
- All developers need access to all code

**Mitigation:**

- Git LFS for large assets if needed
- Sparse checkout for focused development
- Clear branching strategies
- Repository size monitoring and cleanup

### Risk Mitigation Strategies

**Risk:** Workspace dependency issues causing build failures

- **Mitigation:** Comprehensive integration tests, dependency validation scripts
- **Monitoring:** CI build success rates, dependency resolution warnings

**Risk:** pnpm-specific issues blocking development

- **Mitigation:** Document npm fallback procedures, maintain package-lock.json
  backup
- **Monitoring:** Build tool stability, community issue tracking

**Risk:** Architectural boundary violations as code grows

- **Mitigation:** Automated architecture testing, code review guidelines
- **Monitoring:** Dependency graph analysis, violation detection alerts

**Risk:** Performance degradation with repository growth

- **Mitigation:** Regular cleanup, efficient git workflows, LFS adoption
- **Monitoring:** Repository size, clone times, build performance

## Compliance and Monitoring

### Success Metrics

- Installation time <15 seconds for fresh installs
- Build time <30 seconds for incremental builds
- Zero architectural boundary violations in main branch
- > 95% developer satisfaction with workflow

### Architecture Validation

```typescript
describe('Architecture Boundaries', () => {
  it('domain package has no external dependencies', () => {
    const dependencies = getDependencies('@twsoftball/domain');
    const external = dependencies.filter(
      dep => !dep.startsWith('@twsoftball/')
    );
    expect(external).toEqual([]);
  });

  it('application depends only on domain and shared', () => {
    const dependencies = getDependencies('@twsoftball/application');
    const allowed = dependencies.every(
      dep =>
        dep.startsWith('@twsoftball/domain') ||
        dep.startsWith('@twsoftball/shared')
    );
    expect(allowed).toBe(true);
  });
});
```

### Performance Monitoring

```bash
# CI performance tracking
time pnpm install --frozen-lockfile  # Target: <15s
time pnpm build                       # Target: <30s
time pnpm test                        # Target: <60s
du -sh node_modules                   # Monitor growth
```

## Migration Strategy

### Phase 1: Foundation Setup (Current)

- ✅ Basic workspace structure created
- ✅ pnpm workspace configuration
- ✅ Shared tooling configuration
- ✅ Domain package implementation

### Phase 2: Application Layer Integration

- [ ] Application package setup
- [ ] Cross-package dependency validation
- [ ] Integration testing setup
- [ ] Build optimization

### Phase 3: Infrastructure and Apps

- [ ] Infrastructure package implementation
- [ ] Web application integration
- [ ] End-to-end testing across packages
- [ ] Performance optimization

### Phase 4: Advanced Features

- [ ] Mobile app package addition
- [ ] Shared component library
- [ ] Advanced build caching
- [ ] Deployment pipeline optimization

## Future Considerations

### Tool Evolution Path

- **Current**: pnpm workspaces with basic configuration
- **Short-term**: Enhanced build scripts and automation
- **Medium-term**: Consider Turborepo for advanced caching if needed
- **Long-term**: Evaluate Nx if advanced monorepo features become necessary

### Scaling Strategy

- **Package Growth**: Clear guidelines for when to create new packages
- **Dependency Management**: Automated dependency updates and security scanning
- **Performance**: Build caching and incremental compilation optimization
- **Team Growth**: Role-based access and development workflow optimization

## References

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
- [Hexagonal Architecture and Monorepos](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Dependency Cruiser for Architecture Validation](https://github.com/sverweij/dependency-cruiser)

---

**Decision made by**: Development Team  
**Review date**: 2025-09-27 (1 month)  
**Dependencies**: ADR-001 (DDD + Hexagonal Architecture)
