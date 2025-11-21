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

#### Test Distribution (Target)

| Test Type         | Percentage | Purpose                                      |
| ----------------- | ---------- | -------------------------------------------- |
| Unit Tests        | 75%        | Individual components in isolation           |
| Integration Tests | 15%        | Cross-layer and cross-aggregate coordination |
| E2E Tests         | 10%        | Complete user workflows                      |

**Critical:** Integration tests fill the gap between unit and E2E tests. They
test multiple components working together with real implementations (using
in-memory storage), not mocks.

#### Integration Test Requirements

- **Use real DI Container** with
  `createApplicationServicesWithContainerAndFactory()` and in-memory factory
- **No mocking of business logic** (SoftballRules, Game, InningState)
- **Test realistic scenarios** - complete games with incremental progression,
  not artificial state jumps
- **Validate cross-layer flows** - UI → Application → Domain → Infrastructure
- **File pattern:** `*.integration.test.ts`

**Example Integration Test:**

```typescript
describe('Game Completion Integration', () => {
  let appServices: ApplicationServices;

  beforeEach(async () => {
    appServices = await createApplicationServicesWithContainerAndFactory(
      { storage: 'memory' },
      createMemoryFactory()
    );
  });

  it('should complete game via 10-run mercy rule after 4th inning', async () => {
    // Start real game with real rules
    const game = await appServices.startNewGame.execute({
      homeTeamName: 'Warriors',
      awayTeamName: 'Eagles',
      rulesConfig: SoftballRules.standard(),
    });

    // Play through 4 innings with realistic at-bats
    for (let inning = 1; inning <= 4; inning++) {
      // ... simulate complete innings with real use cases
    }

    // Verify completion
    const gameState = await appServices.getGameState.execute({
      gameId: game.gameId,
    });
    expect(gameState.status).toBe('completed');
    expect(gameState.completionReason).toBe('MERCY_RULE');
  });
});
```

#### Anti-Patterns to Avoid

**❌ Over-Mocking in Application Tests:**

```typescript
// ❌ BAD: Mocks hide integration issues
const mockRules = { isGameComplete: vi.fn().mockReturnValue(false) };
const mockRepo = { findById: vi.fn(), save: vi.fn() };
```

**✅ Minimal Mocking:**

```typescript
// ✅ GOOD: Use real implementations with in-memory storage
const rules = new SoftballRules();
const eventStore = new InMemoryEventStore();
const repo = new EventSourcedGameRepository(eventStore);
```

**❌ Artificial State Jumps:**

```typescript
// ❌ BAD: Jumps to final state, doesn't test progression
game.addAwayRuns(10);
inningState = inningState.withInningHalf(4, false);
```

**✅ Realistic Scenarios:**

```typescript
// ✅ GOOD: Plays through complete game incrementally
for (let inning = 1; inning <= 4; inning++) {
  await simulateCompleteInning(inning);
}
```

**For comprehensive testing guidance, see `/docs/testing-strategy.md`**

#### Test Priorities

**Must Test:** Business rules, error handling, security, data validation
**Should Test:** Integration points, user workflows, edge cases **Can Skip:**
Port interfaces, type definitions, constants, simple getters

#### Test Types

- **Unit Tests**: Domain entities, value objects, use cases (co-located
  .test.ts)
- **Integration Tests**: Cross-aggregate coordination, use case orchestration
  with real services
- **E2E Tests**: Complete user workflows
- **TDD Required**: Write tests before implementation

## Complex Bug Investigation Methodology

When facing complex bugs—especially those involving multiple test failures,
cross-layer integration issues, flaky tests, production incidents, or CI/CD
pipeline failures—use this systematic, hypothesis-driven investigation approach.
This methodology respects the hexagonal architecture layers and prevents context
loss during deep investigations.

**File Convention**: Document investigations in `DEBUG-{issue-name}.local.md`
files (e.g., `DEBUG-e2e-game-completion.local.md`,
`DEBUG-ci-build-failure.local.md`). The `.local.md` suffix keeps investigation
notes out of version control.

**Works With Orchestrator-Worker Pattern**: While this methodology can be used
independently by any agent, it pairs naturally with the orchestrator-worker
pattern. The Main Agent creates the DEBUG file, forms hypotheses, and delegates
investigation phases to the Worker Agent, with the DEBUG file preserving context
across handoffs.

### Core Investigation Principles

1. **Structured Documentation First** Create the investigation file upfront with
   clear sections. This prevents context loss, enables agent handoffs, and
   provides an audit trail of what's been tried.

2. **Architecture-Aware Investigation** Follow the hexagonal architecture
   dependency flow. Start where symptoms appear and drill down through layers
   only as needed: Web → Application → Domain → Infrastructure → Event Sourcing.

3. **Hypothesis-Driven Approach** Apply the scientific method: form multiple
   hypotheses upfront, define validation methods for each, then systematically
   eliminate or confirm with evidence. Update documentation as hypotheses are
   proven/disproven.

4. **Enhanced Diagnostic Logging** Add targeted logging at suspected failure
   points. Log actual vs expected values, state transitions, and architectural
   layer boundaries. Make logs actionable and interpretable.

5. **Single Failure Deep-Dive** Focus on ONE representative case at a time, not
   all failures simultaneously. Analyze logs thoroughly before attempting fixes.
   This prevents information overload and reveals patterns.

6. **Iterative Fix-Verify-Repeat** Acknowledge that multiple bugs may exist. Fix
   one bug at a time, verify with tests, and if failures persist, repeat the
   investigation cycle. Don't give up after the first fix.

### Investigation Workflow

#### Phase 1: Setup & Documentation

- Create `DEBUG-{issue-name}.local.md` file
- Catalog all failures/symptoms with file locations and line numbers
- Identify test types affected (unit, integration, E2E, production)
- Document environment details and architecture context

#### Phase 2: Pattern Recognition

- Group failures by common patterns or symptoms
- Distinguish what's working vs what's failing
- Identify scope: single layer, cross-layer, timing-related, data-related
- Look for commonalities (same method, same layer, same scenario type)

#### Phase 3: Hypothesis Formation

- List 3-5 possible root causes based on patterns
- For each hypothesis, define a clear validation method
- Prioritize hypotheses by likelihood and ease of testing
- Consider architecture boundaries (layer violations, circular deps, DI issues)

#### Phase 4: Diagnostic Logging

- Add logging at critical points based on top hypotheses
- Log state before/after transitions
- Log actual vs expected values at failure points
- Add timestamps for async/timing issues

#### Phase 5: Single Case Analysis

- Select ONE representative failing case
- Run with enhanced logging enabled
- Analyze logs to understand actual behavior vs expected
- Compare with passing cases if available

#### Phase 6: Root Cause Analysis

- Trace through architecture layers following the failure path
- Verify assumptions at each layer boundary
- Check event sourcing replay if applicable
- Identify exact location and nature of bug

#### Phase 7: Fix Implementation

- Fix ONE bug at a time
- Document the fix in DEBUG file with before/after code
- Explain why the bug occurred and why the fix works
- Update tests if needed

#### Phase 8: Verification & Iteration

**Step 1: Verify Original Fix**

- Re-run the originally failing test(s) to confirm the fix resolved the issue
- Document which specific tests now pass

**Step 2: Regression Testing**

- Run the full test suite for affected layers (Domain, Application,
  Infrastructure, Web)
- Check if the fix introduced new failures elsewhere
- Pay special attention to:
  - Tests in the same layer as the fix
  - Tests that depend on the modified code
  - Integration tests that cross layer boundaries
  - E2E tests covering related user flows

**Step 3: Decision Point**

- If new failures appeared: acknowledge multiple bugs or unintended side effects
  exist
  - Document new failures in DEBUG file
  - Return to Phase 5 with the new failure as the focus
  - Consider if the original fix needs revision
- If original tests still failing: acknowledge multiple bugs exist, return to
  Phase 5
- If all tests passing: proceed to documentation

**Step 4: Final Documentation**

- Document final findings and learnings in DEBUG file
- Update complete resolution summary
- Note any architectural insights or patterns discovered

### Investigation Paths by Symptom Type

**E2E/Integration Test Failures:** Start at Web layer → Application use cases →
Domain aggregates → Infrastructure repositories → Event sourcing. Look for state
synchronization issues, persistence timing, or business logic bugs.

**Unit Test Failures:** Start at the failing layer, check test setup and mocks,
verify dependencies are correct. If multiple layers affected, follow dependency
flow downward.

**CI/CD Pipeline Failures:** Build errors → Test failures → Infrastructure
config → Environment variables → Dependency versions. Check for
environment-specific issues.

**Production Issues:** Application logs → Web layer → Application layer → Domain
layer → Infrastructure layer → Event sourcing replay. Check for data corruption,
concurrency issues, or state inconsistencies.

**Flaky/Intermittent Failures:** Timing/async operations → State management race
conditions → Event ordering → Persistence timing. Add extensive logging around
async boundaries.

**Regression Testing Strategy:** After any fix, run layer-specific tests to
catch side effects early:

- Domain changes: `pnpm --filter @twsoftball/domain test`
- Application changes: `pnpm --filter @twsoftball/application test`
- Infrastructure changes: `pnpm --filter @twsoftball/infrastructure test`
- Web changes: `pnpm --filter @twsoftball/web test` + E2E tests
- Cross-layer changes: `pnpm test` (full suite)

### DEBUG File Structure

Every investigation file should include these sections:

**Executive Summary** High-level problem statement, impact (how many tests
failing, severity), and key findings discovered so far.

**Investigation Strategy** Architecture path chosen (top-down, bottom-up,
targeted layer), reasoning for approach, and layer diagram showing investigation
flow.

**Failure Catalog** Organized by pattern/category, with test names, expected
behavior, actual behavior, file paths, and line numbers. Use tables for clarity.

**Common Error Patterns** What all failures share in common (same error message,
same timeout, same layer, same scenario type).

**Hypotheses** List of possible root causes with validation methods for each.
Track status: pending, eliminated, or confirmed. Document evidence for
eliminations/confirmations.

**Investigation Log** Timestamped phases following the 8-phase workflow. For
each phase: timestamp, action taken, finding/result, next step. Creates audit
trail.

**Key Files by Layer** Organized by Domain/Application/Infrastructure/Web. List
relevant files with brief descriptions of their role in the investigation.

**Reproduction Commands** Exact commands to reproduce the issue. Include
environment setup, test commands, and any special flags needed.

**Critical Context for Handoff** Current status, what's been tried, what's been
ruled out, suspected issues remaining, next steps for continuation. Essential
for agent handoffs.

### Best Practices

- **Use Layer Knowledge**: Hexagonal architecture guides investigation path.
  Respect layer boundaries and follow dependency flow.
- **Multi-Bug Awareness**: Don't assume a single root cause. After each fix,
  re-verify all cases and continue if failures persist.
- **Continuous Documentation**: Update the DEBUG file after each phase. Future
  you (or another agent) will thank you.
- **Agent Handoff Ready**: Write documentation assuming someone else will
  continue the investigation. Include all context.
- **Hypothesis Discipline**: Validate with concrete evidence before implementing
  fixes. Avoid guessing.
- **Enhanced Logging Strategy**: Make logs actionable. Show actual vs expected,
  state transitions, and which conditions failed.
- **Pattern Recognition First**: Common symptoms narrow the scope dramatically.
  Find the pattern before diving into code.
- **Respect TDD**: When writing tests to prove root cause, follow TDD
  principles. Test first, then fix.
- **Comprehensive Regression Testing**: Always run the full test suite (or at
  minimum, all tests in affected layers) after applying a fix. A fix that solves
  one problem but creates another is not a successful fix. Use the
  layer-specific test commands from the Quick Reference section.

### When to Use This Methodology

- **Multiple test failures** sharing a common symptom or error pattern
- **Cross-layer integration issues** where Domain ↔ Application ↔
  Infrastructure boundaries are involved
- **Flaky or intermittent failures** requiring systematic hypothesis testing
- **Production bugs** needing root cause analysis and architectural
  understanding
- **CI/CD pipeline failures** with unclear origin spanning build/test/deploy
- **Regression investigations** after significant architecture changes
- **Any complex issue** requiring structured, systematic investigation across
  multiple sessions

### Orchestrator-Worker Integration

When using the orchestrator-worker pattern for investigations:

- **Main Agent (Orchestrator)**: Creates DEBUG file, catalogs failures, forms
  hypotheses based on patterns, delegates investigation phases to Worker,
  reviews findings, makes go/no-go decisions on fixes
- **Worker Agent**: Implements diagnostic logging, runs tests with logging,
  analyzes logs, traces through code layers, implements fixes, reports findings
  back
- **Handoff Pattern**: DEBUG file preserves complete context. Worker can pick up
  investigation at any phase. Main Agent uses DEBUG file to track progress and
  make strategic decisions.

The methodology can also be used independently by any agent for focused
investigation when the scope is clear and delegation isn't needed.

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
pnpm --filter @twsoftball/web test:e2e          # Run all (exits immediately)
pnpm --filter @twsoftball/web test:e2e:headed   # Debug with UI
pnpm --filter @twsoftball/web test:e2e:ui       # Playwright UI mode
pnpm --filter @twsoftball/web test:e2e:report   # View last test report
```

**E2E Command Selection for AI Agents:**

When running E2E tests programmatically or via CLI:

- **`test:e2e --project=chromium`**: Fast execution, exits immediately after
  completion. Use this for CI-like behavior and scripting. HTML reports are
  generated but not auto-opened.
- **`test:e2e:headed`**: Interactive debugging with browser visible. Use when
  you need to watch test execution step-by-step.
- **`test:e2e:ui`**: Playwright UI mode for test development. Best for writing
  and debugging new tests.
- **`test:e2e:report`**: Opens the HTML report from the last test run. Use after
  CLI runs to review results.

**Note:** HTML reports are always generated at `apps/web/e2e/playwright-report/`
but never auto-open to prevent process hanging. Always use `--project=chromium`
(or another single project) for faster execution - running all 7 projects
(chromium, firefox, webkit, Mobile Chrome, Mobile Safari, etc.) is
resource-intensive.

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
