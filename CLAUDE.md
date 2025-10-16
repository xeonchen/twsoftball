# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**TW Softball** - A slow-pitch softball game recording Progressive Web App (PWA)
with offline-first capabilities, built using Hexagonal Architecture, Dependency
Injection Container, and Event Sourcing patterns.

## Quick Reference (AI: Read This First)

### 🔴 CRITICAL - Always Follow These Rules

- **ALWAYS use TodoWrite** for task tracking and progress management
- **ALWAYS run commit-readiness-reviewer** before any git commit
- **ALWAYS complete Post-Commit Checklist** after EVERY commit
- **ALWAYS typecheck, lint, format, and test** after a worker finished a job and
  fix errors right away
- **NEVER create workarounds** - raise issues after 3 failed attempts
- **NEVER compromise on code quality** - no shortcuts, quick fixes, or technical
  debt
- **NEVER import infrastructure into application layer**
- **ALWAYS use DI Container pattern** for dependency injection
- **ALWAYS use orchestrator-worker pattern** for complex tasks (Main Agent
  coordinates, General Agent implements)

### 🟡 IMPORTANT - Core Workflow

1. Plan with TodoWrite → Delegate via Task tool → Review with
   commit-readiness-reviewer → Handle git operations → Complete Post-Commit
   Checklist
2. Write tests before implementation (TDD)
3. Follow existing patterns and conventions
4. Achieve target test coverage for each layer
5. After creating new files, run lint immediately and address issues right away

### 🟢 HELPFUL - Key Commands

```bash
pnpm test                     # Run all tests
pnpm test:e2e                 # Run E2E tests
pnpm test:e2e:headed          # Run E2E with UI (for debugging)
pnpm typecheck                # TypeScript check
pnpm lint                     # ESLint check
pnpm format:check             # Format files
pnpm deps:check               # Check dependency graph violations
pnpm fsd:staged               # Check FSD architecture on staged files
pnpm --filter @twsoftball/domain test    # Domain tests only
```

## Architecture

**Hexagonal Architecture (Ports & Adapters) + Domain-Driven Design + DI
Container + SOLID Principles**

```
Domain Layer (Core Business Logic)
├── constants/    # AtBatResultType, GameStatus, FieldPosition
├── value-objects/# GameId, PlayerId, JerseyNumber, Score
├── events/       # DomainEvent, AtBatCompleted, RunScored
├── aggregates/   # Game, TeamLineup, InningState
├── strategies/   # TeamStrategy pattern implementations
├── services/     # GameCoordinator, RBICalculator, validators
└── rules/        # SoftballRules, RuleVariants

Application Layer (Use Cases)
├── use-cases/    # RecordAtBat, StartGame, etc.
├── ports/        # Interface definitions
├── services/     # Application services (orchestration, event sourcing)
├── dtos/         # Data Transfer Objects
├── test-factories/ # Test utilities
└── test-utils/   # Core testing utilities

Infrastructure Layer (Adapters)
├── persistence/  # IndexedDB, SQLite implementations
├── auth/         # Authentication adapters
└── config/       # Dependency injection

Web Layer (Presentation) - Feature-Sliced Design (FSD)
├── app/          # Application layer (providers, routing, global config)
├── pages/        # Page components (route targets)
├── widgets/      # Complex composite UI blocks
├── features/     # Business logic features and user scenarios
├── entities/     # Business entities UI representations
└── shared/       # Reusable infrastructure (UI kit, utils, API)
```

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Frontend**: PWA with Vite + React
- **State Management**: Event Sourcing
- **Database**: IndexedDB (web), SQLite (mobile via Capacitor)
- **Package Manager**: pnpm (monorepo)
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Build**: Vite
- **CI/CD**: GitHub Actions
- **Architecture Validation**: Steiger with Feature-Sliced Design plugin

## Feature-Sliced Design (FSD) Architecture

### FSD Layer Hierarchy (Bottom-Up Dependencies)

```
app/         # Application initialization (Level 6)
pages/       # Complete screen implementations (Level 5)
widgets/     # Complex UI blocks (Level 4)
features/    # Business logic features (Level 3)
entities/    # Business entities (Level 2)
shared/      # Reusable infrastructure (Level 1)
```

### FSD Import Rules

```typescript
// ✅ CORRECT: Higher layers import from lower layers
import { AtBatPanel } from 'widgets/at-bat-panel'; // widgets (4) → pages (5)
import { useRecordAtBat } from 'features/record-at-bat'; // features (3) → pages (5)

// ❌ FORBIDDEN: Lower layers cannot import from higher layers
import { PlayerCard } from 'entities/player'; // ❌ shared (1) cannot import entities (2)

// ❌ FORBIDDEN: Same-level direct imports (use shared instead)
import { useLineup } from 'features/lineup-management'; // ❌ features → features
```

**Key Requirements:**

- Higher layers (app→pages→widgets→features→entities→shared) import from lower
  layers only
- All slices export through `index.ts` files (`fsd/public-api` rule)
- Components organized in `ui/` subfolders for FSD compliance
- Web layer uses DI Container to access Application services, never imports
  Infrastructure directly

## Development Workflow: Orchestrator-Worker Pattern

### Core 5-Step Workflow

1. **Plan & Track**
   - Main Agent creates TodoWrite list for complex tasks
   - Break work into focused, discrete units

2. **Delegate Implementation**
   - Main Agent assigns ALL implementation tasks to General-Purpose Agent via
     Task tool
   - General-Purpose Agent implements using TDD (test → code → refactor)

3. **Review & Validate**
   - Main Agent triggers commit-readiness-reviewer for quality validation
   - Main Agent summarizes review feedback and displays to user
   - If issues found, delegate ALL fixes to General-Purpose Agent (max 3
     attempts)
   - Always get reviewed again after issues are fixed

4. **Delegate Git Operations**
   - Main Agent delegates ALL git operations to General-Purpose Agent
   - General-Purpose Agent handles git add, commit, pre-commit hook fixes, and
     PR creation

5. **Delegate Documentation Updates**
   - Main Agent delegates Post-Commit Checklist to General-Purpose Agent
   - General-Purpose Agent updates relevant documentation

### Agent Roles

- **Main Agent (Orchestrator)**: Plans with TodoWrite, delegates ALL work,
  triggers reviews, summarizes feedback, monitors progress, escalates issues
  only
- **General-Purpose Agent (Worker)**: Implements ALL tasks with TDD, handles git
  operations, fixes issues, updates documentation, reports back with
  deliverables
- **Commit-Readiness-Reviewer (Validator)**: Validates architecture, checks
  quality gates, returns detailed feedback for main agent to summarize

### Post-Commit Checklist

After every commit, delegate to General-Purpose Agent:

1. Update architectural diagrams if package structure changed
2. Add new scripts or commands discovered/created to documentation
3. Update JSDoc examples if novel patterns emerged
4. Run quick verification that documented commands still work
5. Check that file paths mentioned in docs still exist
6. Verify architecture matches actual implementation

## Code Standards

### Architecture Rules

#### Hexagonal Architecture (Domain/Application/Infrastructure)

- **Domain layer**: NO dependencies on other layers (pure business logic)
- **Application layer**: Depends only on Domain + uses DI Container pattern
- **Infrastructure layer**: Provides factory implementations for Application
  layer
- **DI Container**: Enterprise-grade dependency injection with service registry,
  lazy loading, and dynamic imports

#### Composition Root Pattern (CRITICAL)

Infrastructure selection happens at the Web layer (entry point), not in the
Application layer.

```typescript
// ✅ CORRECT: Composition Root pattern
import { createApplicationServicesWithContainerAndFactory } from '@twsoftball/application/services/ApplicationFactory';
import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';

const factory =
  config.storage === 'memory'
    ? createMemoryFactory()
    : createIndexedDBFactory();

const services = await createApplicationServicesWithContainerAndFactory(
  config,
  factory
);

// ❌ DEPRECATED: Old pattern (creates circular dependency)
const services = await createApplicationServicesWithContainer(config);
```

**Why:** No circular dependencies, clean architecture, easy testing, Web layer
controls infrastructure.

### Testing Strategy

#### Coverage Requirements by Layer

| Layer              | CI Gate | Target |
| ------------------ | ------- | ------ |
| **Domain**         | 96%     | 98%+   |
| **Application**    | 90%     | 95%+   |
| **Infrastructure** | 80%     | 90%+   |
| **Shared/Utils**   | 85%     | 95%+   |
| **Web/UI**         | 70%     | 85%+   |

#### Test Priorities

**Must Test:** Business rules, error handling, security, data validation
**Should Test:** Integration points, user workflows, edge cases **Can Skip:**
Port interfaces, type definitions, constants, simple getters

#### Test Types

- **Unit Tests**: Domain entities, value objects, use cases (co-located
  .test.ts)
- **Integration Tests**: Database adapters, application services
- **E2E Tests**: Complete user workflows
- **TDD Required**: Write tests before implementation

### E2E Testing with Playwright

**Architecture:** Zustand store with sessionStorage persistence (offline-first
PWA). Tests inject data directly into sessionStorage and trigger store updates
via storage events.

**Key Patterns:**

- Inject data via `sessionStorage.setItem()` +
  `window.dispatchEvent(new Event('storage'))`
- Use fixtures from `apps/web/e2e/fixtures/gameStateFixtures.ts`
- Use page objects from `apps/web/e2e/page-objects/`
- Add `data-testid` attributes to E2E-testable elements (kebab-case)
- Clear sessionStorage between tests for isolation
- **WebKit Note:** Use `Alt+Tab` for keyboard navigation (not `Tab`) due to
  macOS "Full Keyboard Access" settings

**Commands:**

```bash
pnpm --filter @twsoftball/web test:e2e          # Run all
pnpm --filter @twsoftball/web test:e2e:headed   # Debug with UI
```

**Troubleshooting:** Use `test:e2e:headed` to watch execution, verify
`data-testid` attributes, check sessionStorage in DevTools, add explicit waits
with `waitForSelector`.

### Code Quality

- **TypeScript**: Strict mode, no `any` types
- **ESLint**: Airbnb config with custom rules
- **Prettier**: Consistent formatting
- **Commits**: Conventional commits (feat:, fix:, test:, refactor:, docs:)

**No Compromise Policy:**

- No quick fixes or temporary solutions
- No skipping tests to "save time"
- No relaxing TypeScript strictness
- No disabling ESLint rules without proper justification

### Documentation Standards

- **Class-level documentation**: JSDoc explaining purpose and business context
- **Method documentation**: Complex methods need examples and @remarks
- **Domain terminology**: Explain softball-specific terms and business rules
- **Validation rules**: Document "why" - the business reason behind constraints

## Quality Assurance

### Quality Gates (Cannot Be Bypassed)

- Coverage thresholds per layer (see table above)
- TypeScript compilation errors
- ESLint violations (unless properly justified)
- Architecture dependency violations
- Missing documentation for public APIs

### When Facing Challenges

1. **First Response**: Find the proper architectural solution
2. **If Blocked**: Document the issue and seek guidance (after 3 attempts)
3. **Never Do**: Create temporary fixes, skip tests, or lower standards
4. **Always Remember**: Clean code is faster to maintain and extend

## Key Patterns

### Event Sourcing

- All changes stored as events
- Current state derived by replaying events
- Perfect undo/redo support with complete audit trail

### DI Container

- Service registry with lazy loading
- Dynamic imports based on configuration
- Singleton management and parallel resolution
- Multiple implementations (memory, indexeddb, sqlite)

### Error Handling

- Domain errors extend DomainError
- Application errors handled at use case level
- Infrastructure errors wrapped appropriately

## Important Notes

- **Always** use Composition Root pattern:
  `createApplicationServicesWithContainerAndFactory()` with explicit factory
  from Web layer
- **Never** import Infrastructure directly into Web layer
- **Never** bypass DI Container for dependency injection
- **Never** compromise on architectural principles for convenience
- **Always** write tests before implementation (TDD)
- **Always** use orchestrator-worker pattern for complex tasks
- **Always** trigger commit-readiness-reviewer and summarize results
- **Delegate** ALL git operations and fixes to General-Purpose Agent

**Architecture Reference:** See `/docs/architecture-patterns.md` for complete DI
Container implementation details

---

_For current project progress and detailed task tracking, see TODO.local.md_
