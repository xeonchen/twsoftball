# Development Guide - TW Softball

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- TypeScript 5+
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-username/twsoftball.git
cd twsoftball

# Install all dependencies
pnpm install

# Run tests to verify setup
pnpm test
```

### Project Structure

```
twsoftball/
├── packages/
│   ├── domain/           # Core business logic (⏳ Not Started)
│   ├── application/      # Use cases and ports (⏳ Blocked by Domain)
│   ├── infrastructure/   # Adapters (⏳ Blocked by Application)
│   └── shared/          # Common utilities (⏳ Pending)
├── apps/
│   └── web/             # PWA application (⏳ Pending)
├── docs/                # Documentation
└── tools/               # Build and configuration tools
```

## Development Commands

### Core Commands

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test
pnpm test:watch          # Watch mode
pnpm test:coverage       # With coverage report

# Type checking
pnpm typecheck

# Code quality
pnpm lint                # ESLint check
pnpm format             # Prettier formatting
pnpm deps:check         # Architecture violation check
```

### Package-Specific Commands

```bash
# Domain package (scaffolding only - ready for implementation)
pnpm --filter @twsoftball/domain test         # 1 placeholder test currently
pnpm --filter @twsoftball/domain test:coverage
pnpm --filter @twsoftball/domain typecheck

# Application package (when domain is implemented)
pnpm --filter @twsoftball/application test
pnpm --filter @twsoftball/application typecheck

# Infrastructure package (when application is implemented)
pnpm --filter @twsoftball/infrastructure test
pnpm --filter @twsoftball/infrastructure typecheck
```

### Development Workflow

```bash
# 1. Start development
pnpm dev                # (TODO: Start web app in dev mode)

# 2. Run tests in watch mode
pnpm test:watch

# 3. Check code quality before commit
pnpm lint
pnpm typecheck
pnpm deps:check
```

## Development Workflows

### Test-Driven Development (TDD)

We follow strict TDD principles:

1. **Red**: Write a failing test
2. **Green**: Write minimal code to make it pass
3. **Refactor**: Improve the code while keeping tests green
4. **Commit**: Commit with conventional commit message

```bash
# Example TDD cycle
pnpm --filter @twsoftball/domain test:watch

# In separate terminal
git add .
git commit -m "test: add GameScore value object creation test"
# ... implement until test passes
git commit -m "feat: implement GameScore value object"
# ... refactor
git commit -m "refactor: simplify GameScore equality check"
```

### Adding New Features

#### 1. Domain Layer Implementation (Next Phase)

```bash
# 1. Create test file
touch packages/domain/src/entities/new-entity.test.ts

# 2. Write failing test
# 3. Implement entity
# 4. Ensure tests pass
pnpm --filter @twsoftball/domain test

# 5. Check coverage
pnpm --filter @twsoftball/domain test:coverage
```

#### 2. Application Layer (After Domain)

```bash
# 1. Define port interface
touch packages/application/src/ports/out/new-repository.ts

# 2. Create use case
touch packages/application/src/use-cases/new-use-case.ts

# 3. Write tests
touch packages/application/src/use-cases/new-use-case.test.ts

# 4. Implement and test
pnpm --filter @twsoftball/application test
```

#### 3. Infrastructure Layer (Future)

```bash
# 1. Implement adapter
touch packages/infrastructure/src/repositories/indexeddb-new-repository.ts

# 2. Integration tests
touch packages/infrastructure/src/repositories/indexeddb-new-repository.test.ts

# 3. Test with real dependencies
pnpm --filter @twsoftball/infrastructure test
```

### Architecture Validation

Our build process includes architecture violation detection:

```bash
# Check architecture rules
pnpm deps:check

# This validates:
# - Domain has no external dependencies
# - Application only depends on Domain
# - Infrastructure implements Application ports
# - No circular dependencies
```

### Code Quality Gates

#### Pre-commit Checks

```bash
# Automatically run via husky pre-commit hook:
pnpm lint                # ESLint rules
pnpm format             # Prettier formatting
pnpm typecheck          # TypeScript strict mode
pnpm test               # All tests pass
pnpm deps:check         # Architecture rules
```

#### Coverage Requirements

- **Domain Layer**: 95%+ coverage (target for Phase 2)
- **Application Layer**: 90%+ coverage (target for Phase 3)
- **Infrastructure Layer**: 80%+ coverage (target for Phase 4)
- **Overall Project**: 85%+ coverage (target for MVP)

## IDE Setup

### VS Code Configuration

Recommended extensions:

- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Test Explorer UI
- GitLens

### Settings (.vscode/settings.json)

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "jest.jestCommandLine": "pnpm test",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  }
}
```

## Debugging

### Domain Layer Tests

```bash
# Run single test file
pnpm --filter @twsoftball/domain test -- game.test.ts

# Run single test case
pnpm --filter @twsoftball/domain test -- --grep "should record at-bat"

# Debug mode (add debugger; statements)
pnpm --filter @twsoftball/domain test -- --inspect-brk
```

### TypeScript Issues

```bash
# Check specific package
pnpm --filter @twsoftball/domain typecheck

# Build with detailed errors
npx tsc --noEmit --project packages/domain/tsconfig.json
```

### Architecture Violations

```bash
# Detailed dependency analysis
pnpm deps:check --output-type err-long

# Visual dependency graph
npx dependency-cruiser --output-type dot packages/domain/src | dot -T svg > deps.svg
```

## Common Issues

### 1. Tests Not Finding Modules

```bash
# Clear all caches
rm -rf node_modules
rm -rf packages/*/node_modules
rm pnpm-lock.yaml
pnpm install
```

### 2. TypeScript Compilation Errors

```bash
# Check all packages individually
pnpm --filter @twsoftball/domain typecheck
pnpm --filter @twsoftball/application typecheck
pnpm --filter @twsoftball/infrastructure typecheck
```

### 3. ESLint Configuration Conflicts

```bash
# Check ESLint config
npx eslint --print-config packages/domain/src/index.ts
```

### 4. Husky Pre-commit Failing

```bash
# Run pre-commit checks manually
npx lint-staged

# Skip hooks temporarily (emergency only)
git commit -m "message" --no-verify
```

## Performance

### Test Performance

- Domain tests should run in <2 seconds
- Use `test:watch` for continuous feedback
- Mock external dependencies in Application layer tests

### Build Performance

- TypeScript compilation should be <10 seconds
- Use project references for incremental builds
- Consider `tsc --build` for large changes

### Architecture Performance

- Keep aggregate sizes reasonable (<1000 LOC)
- Event sourcing snapshots every 100 events
- Use read models for complex queries

## Contributing

### Branch Naming

- `feature/phase-N-description` - New features
- `fix/issue-description` - Bug fixes
- `refactor/description` - Code improvements
- `docs/description` - Documentation updates

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new use case for player substitution`
- `fix: resolve RBI calculation for sacrifice flies`
- `test: add coverage for GameState edge cases`
- `refactor: extract common validation logic`
- `docs: update architecture decision records`

### Pull Request Process

1. Create feature branch from `main`
2. Implement with TDD approach
3. Ensure all quality gates pass
4. Create PR with detailed description
5. Address review feedback
6. Squash merge to main

## Current Development Status

### ✅ Completed (2025-08-27)

- **Phase 0**: Project setup with TypeScript, pnpm, testing, CI/CD ✅
- **Phase 1**: Complete documentation (4 ADRs, technical guides, use cases, API
  contracts) ✅
- Architecture validation and quality gates ✅
- Cross-referenced documentation with proper links ✅
- Foundation ready for domain layer implementation ✅

### 🔄 Next Phase (Phase 2 - Domain Layer Implementation)

**Status**: Ready to begin - scaffolding in place, comprehensive specs written

**Deliverables**:

- [ ] Game aggregate with event sourcing
- [ ] All value objects (GameId, PlayerId, Score, etc.)
- [ ] Domain events (GameStarted, AtBatRecorded, etc.)
- [ ] Domain services (RBICalculator, LineupValidator)
- [ ] Target: 99%+ test coverage using TDD approach

**Estimated Duration**: 2-3 weeks with TDD approach

### ⏳ Future Phases

- **Phase 3**: Application layer (use cases, ports)
- **Phase 4**: Infrastructure adapters (IndexedDB)
- **Phase 5**: Web application setup (React + Vite)
- **Phase 6**: E2E testing with Playwright

## See Also

- **[Architecture Guide](design/architecture.md)** - Understanding the DDD +
  Hexagonal approach
- **[Domain Model](design/domain-model.md)** - Complete domain specification for
  Phase 2
- **[Event Sourcing Guide](design/event-sourcing.md)** - Technical
  implementation details
- **[API Contracts](design/api-contracts.md)** - Interface contracts for future
  phases
- **[Use Cases](design/use-cases.md)** - Requirements and acceptance criteria
- **[ADR Documents](adr/)** - All architectural decision records

---

For questions or issues, refer to the architectural documentation above or
create an issue in the repository.
