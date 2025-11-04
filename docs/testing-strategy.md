# TW Softball - Testing Strategy

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Test Pyramid Distribution](#2-test-pyramid-distribution)
3. [Testing Principles](#3-testing-principles)
4. [Test Types and When to Use Them](#4-test-types-and-when-to-use-them)
5. [Integration Testing Guidelines](#5-integration-testing-guidelines)
6. [Anti-Patterns to Avoid](#6-anti-patterns-to-avoid)
7. [Coverage Requirements by Layer](#7-coverage-requirements-by-layer)
8. [Test Organization and File Structure](#8-test-organization-and-file-structure)
9. [Testing Tools and Utilities](#9-testing-tools-and-utilities)
10. [Continuous Integration](#10-continuous-integration)
11. [Test Performance](#11-test-performance)
12. [Appendix: Examples](#12-appendix-examples)

## 1. Executive Summary

### Testing Philosophy

TW Softball follows a comprehensive testing strategy that emphasizes **realistic
scenarios over artificial isolation**. Our testing approach is built on the
foundation that high unit test coverage alone is insufficient for complex,
multi-layer applications.

### Key Insight: The Isolation Paradox

During Phase 5.3.F development, we discovered a critical issue:

**Despite achieving 96% domain layer coverage with unit tests, E2E tests
revealed game completion bugs that unit tests missed.**

The root cause: Unit tests validated individual components in isolation, but
failed to catch issues in:

- Cross-aggregate coordination (Game + InningState + TeamLineup)
- Rules configuration propagation across layers
- State transitions during realistic game progression
- Completion logic precedence (walk-off > mercy > regulation)

This led to the **Integration Testing Gap** - the space between unit tests (too
isolated) and E2E tests (too slow and brittle).

### Solution: Strategic Integration Testing

Integration tests fill this gap by:

1. Using **real implementations** with in-memory storage (not mocks)
2. Testing **complete workflows** (full games, not artificial state jumps)
3. Validating **cross-layer flows** (UI → Application → Domain → Infrastructure)
4. Verifying **business rule coordination** across multiple aggregates

## 2. Test Pyramid Distribution

### Target Distribution

```
        /\
       /  \
      / E2E \      10% - Complete user workflows
     /--------\
    /          \
   / Integration \   15% - Cross-layer coordination
  /--------------\
 /                \
/   Unit Tests     \  75% - Individual components
--------------------
```

**Distribution:**

- **Unit Tests: 75%** - Individual components in isolation
- **Integration Tests: 15%** - Cross-layer and cross-aggregate coordination
- **E2E Tests: 10%** - Complete user workflows

### Why This Matters: The Isolation Paradox

**Problem:** High unit test coverage can create a false sense of security.

**Example from TW Softball:**

- Domain layer: 96% coverage with unit tests
- All individual methods tested and passing
- E2E tests revealed game completion bugs

**Root Cause:**

```typescript
// Unit test validates method in isolation ✅
it('should check mercy rule correctly', () => {
  const rules = new SoftballRules();
  const isMercy = rules.checkMercyRule(4, false, 15, 5);
  expect(isMercy).toBe(true); // Passes
});

// But integration issues hidden:
// - GameCoordinator might not call this method at the right time
// - Game aggregate might not propagate completion status
// - InningState might transition before completion check
// - Rules configuration might not be restored from events
```

**Solution:** Integration tests validate the **coordination** between
components:

```typescript
// Integration test validates complete workflow ✅
it('should complete game via mercy rule', async () => {
  const appServices = await createApplicationServicesWithContainerAndFactory(
    { storage: 'memory' },
    createMemoryFactory()
  );

  // Start real game
  const game = await appServices.startNewGame.execute({...});

  // Play through 4 innings with realistic at-bats
  for (let inning = 1; inning <= 4; inning++) {
    await simulateCompleteInning(inning);
  }

  // Verify completion (tests coordination of all components)
  const gameState = await appServices.getGameState.execute({...});
  expect(gameState.status).toBe('completed');
  expect(gameState.completionReason).toBe('MERCY_RULE');
});
```

## 3. Testing Principles

### 1. Real Dependencies Over Mocks

**Why:** Mocks hide integration issues and test implementation details instead
of behavior.

```typescript
// ❌ BAD: Mocks hide integration issues
const mockRules = { isGameComplete: vi.fn().mockReturnValue(false) };
const mockRepo = { findById: vi.fn(), save: vi.fn() };

// ✅ GOOD: Real implementations catch integration issues
const rules = new SoftballRules();
const eventStore = new InMemoryEventStore();
const repo = new EventSourcedGameRepository(eventStore);
```

### 2. Realistic Scenarios

**Why:** Artificial state jumps bypass the exact logic we need to validate.

```typescript
// ❌ BAD: Jumps to final state
game.addAwayRuns(10);
inningState = inningState.withInningHalf(4, false);

// ✅ GOOD: Plays through complete game
for (let inning = 1; inning <= 4; inning++) {
  for (let atBat of generateInningAtBats(inning)) {
    await appServices.recordAtBat.execute(atBat);
  }
}
```

### 3. Cross-Layer Validation

**Why:** Bugs often occur at layer boundaries, not within layers.

Test the complete flow: **UI → Application → Domain → Infrastructure**

### 4. Business Rule Focus

**Why:** We're building a softball game recorder - the slow-pitch softball rules
are our core value.

Validate:

- Regulation completion (7 innings, decisive score)
- Mercy rules (10-run after 4th, 7-run after 5th)
- Walk-off victories (bottom of final inning, home team takes lead)
- Extra innings (tied after regulation)
- Tie games (tied after regulation, no extra innings allowed)
- Completion precedence (walk-off > mercy > regulation)

### 5. TDD Throughout

**Why:** Tests drive design and ensure testability from the start.

**Process:**

1. Write failing test (Red)
2. Implement minimal code to pass (Green)
3. Refactor while keeping tests green (Refactor)

### 6. No Compromise on Quality

**Why:** Technical debt compounds exponentially.

**Never:**

- Skip tests to "save time"
- Mock business logic in application layer
- Test implementation details instead of behavior
- Create artificial test scenarios that don't match real usage

## 4. Test Types and When to Use Them

### Unit Tests (75%)

**Purpose:** Test individual components in isolation

**File Pattern:** `*.test.ts` (co-located with source)

**When to Use:**

- Domain entities and value objects
- Individual aggregate methods
- Business rule validation (isolated rules)
- Pure functions and utilities
- Value object validation
- Simple state transitions

**Characteristics:**

- Fast (< 5ms per test)
- No external dependencies
- Tests single responsibility
- Isolated from other components

**Example:**

```typescript
// ✅ Good unit test - tests single method in isolation
describe('Game.createNew', () => {
  it('should create new game with correct initial state', () => {
    const gameId = GameId.generate();
    const rules = SoftballRules.standard();

    const game = Game.createNew(gameId, 'Home', 'Away', rules);

    expect(game.status).toBe(GameStatus.NOT_STARTED);
    expect(game.homeTeamName).toBe('Home');
    expect(game.awayTeamName).toBe('Away');
    expect(game.homeScore).toBe(0);
    expect(game.awayScore).toBe(0);
  });

  it('should throw error for invalid team names', () => {
    const gameId = GameId.generate();
    const rules = SoftballRules.standard();

    expect(() => Game.createNew(gameId, '', 'Away', rules)).toThrow();
    expect(() => Game.createNew(gameId, 'Home', '', rules)).toThrow();
  });
});
```

**What NOT to Unit Test:**

- Integration between components (use integration tests)
- Complete workflows (use integration/E2E tests)
- Infrastructure concerns (use integration tests)

### Integration Tests (15%)

**Purpose:** Test multiple components working together

**File Pattern:** `*.integration.test.ts`

**When to Use:**

- Cross-aggregate coordination (Game + InningState + TeamLineup)
- Use case orchestration with real services
- Event sourcing reconstruction
- State persistence and recovery
- Rules configuration propagation
- Cross-layer flows (Application → Domain)

**Characteristics:**

- Moderate speed (< 100ms per test)
- Uses real implementations (in-memory)
- Tests component coordination
- Validates end-to-end workflows within a layer

**Example:**

```typescript
// ✅ Good integration test - tests multiple components together
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

    // Play through innings 1-3 (close game)
    for (let inning = 1; inning <= 3; inning++) {
      await simulateBalancedInning(game.gameId, inning);
    }

    // Inning 4: Away team scores 10 runs
    await simulateBigInning(game.gameId, 4, true, 10);

    // Complete top of 4th
    await completeHalfInning(game.gameId, 4, true);

    // Verify game completed by mercy rule
    const gameState = await appServices.getGameState.execute({
      gameId: game.gameId,
    });

    expect(gameState.status).toBe('completed');
    expect(gameState.completionReason).toBe('MERCY_RULE');
    expect(gameState.completionDetails).toContain('10-run mercy rule');
    expect(gameState.inning).toBe(4);
  });

  it('should persist rules configuration in event stream', async () => {
    // Create game with custom rules
    const customRules = {
      ...SoftballRules.standard(),
      maxExtraInnings: 2,
      mercyRuleRuns: [{ afterInning: 3, runDifferential: 15 }],
    };

    const game = await appServices.startNewGame.execute({
      homeTeamName: 'Warriors',
      awayTeamName: 'Eagles',
      rulesConfig: customRules,
    });

    // Retrieve game and verify rules restored correctly
    const gameState = await appServices.getGameState.execute({
      gameId: game.gameId,
    });

    expect(gameState.rulesConfig.maxExtraInnings).toBe(2);
    expect(gameState.rulesConfig.mercyRuleRuns).toHaveLength(1);
    expect(gameState.rulesConfig.mercyRuleRuns[0].afterInning).toBe(3);
  });
});
```

**What NOT to Integration Test:**

- Simple unit-level logic (use unit tests)
- UI interactions (use E2E tests)
- Visual regression (use E2E tests)

### E2E Tests (10%)

**Purpose:** Test complete user workflows

**File Pattern:** `*.spec.ts` in `apps/web/e2e/`

**When to Use:**

- Complete game flows (setup wizard → 7 innings → completion)
- Cross-layer integration (UI → Application → Domain → Infrastructure)
- State persistence (sessionStorage, IndexedDB)
- Visual regression testing
- Performance testing under realistic conditions
- User journey validation

**Characteristics:**

- Slow (< 10 seconds per test)
- Uses real browser (Playwright)
- Tests complete user experience
- Validates all layers working together

**Example:**

```typescript
// ✅ Good E2E test - tests complete user workflow
import { test, expect } from '@playwright/test';
import { GameRecordingPage } from '../page-objects/GameRecordingPage';
import { createMercyRuleGameState } from '../fixtures/gameStateFixtures';

test.describe('Mercy Rule Scenarios', () => {
  let gamePage: GameRecordingPage;

  test.beforeEach(async ({ page }) => {
    gamePage = new GameRecordingPage(page);
    await gamePage.goto();
  });

  test('should complete game via 10-run mercy rule after 4th inning', async ({
    page,
  }) => {
    // Inject game state with 3 completed innings
    const gameState = createMercyRuleGameState({
      inning: 4,
      isTopHalf: false,
      homeScore: 5,
      awayScore: 15,
      outs: 3,
    });

    await gamePage.injectGameState(gameState);

    // Verify game completed
    await expect(page.getByTestId('game-status')).toHaveText('Completed');
    await expect(page.getByTestId('completion-reason')).toContainText(
      '10-run mercy rule'
    );

    // Verify UI reflects completion
    await expect(page.getByTestId('record-at-bat-button')).toBeDisabled();
    await expect(page.getByTestId('final-score')).toBeVisible();
  });
});
```

**What NOT to E2E Test:**

- Business logic edge cases (use unit/integration tests)
- Error handling details (use unit/integration tests)
- Performance benchmarks (use dedicated performance tests)

## 5. Integration Testing Guidelines

### Setting Up Integration Tests

#### Use Real DI Container

**Always use the Composition Root pattern:**

```typescript
import { createApplicationServicesWithContainerAndFactory } from '@twsoftball/application/services/ApplicationFactory';
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
import type { ApplicationServices } from '@twsoftball/application/types';

let appServices: ApplicationServices;

beforeEach(async () => {
  const factory = createMemoryFactory();
  appServices = await createApplicationServicesWithContainerAndFactory(
    { storage: 'memory' },
    factory
  );
});

afterEach(async () => {
  // Cleanup if needed
  await appServices.dispose?.();
});
```

**Why this approach:**

- Tests the real DI Container setup
- Validates service registration
- Catches circular dependency issues
- Tests lazy loading and resolution
- Mirrors production configuration

#### Use In-Memory Implementations

**Never mock, use real in-memory implementations:**

```typescript
// ✅ GOOD: Real implementations
const factory = createMemoryFactory(); // Provides InMemoryEventStore, etc.

// ❌ BAD: Mocks
const mockEventStore = {
  append: vi.fn(),
  getEventsForAggregate: vi.fn(),
};
```

**Benefits:**

- Catches real integration issues
- Tests actual data flows
- Validates event sourcing reconstruction
- Fast enough for CI (< 100ms per test)

### What to Test in Integration Tests

#### 1. Game Completion Scenarios

**Test all completion paths:**

```typescript
describe('Game Completion Integration', () => {
  // Regulation completion
  it('should complete game after 7 innings with decisive score', async () => {
    // Play 7 complete innings, home team ahead
    // Verify: status = completed, reason = regulation
  });

  // Mercy rule completion
  it('should complete game via 10-run mercy after 4th inning', async () => {
    // Play 4 innings, away team ahead by 10+
    // Verify: status = completed, reason = mercy_rule
  });

  it('should complete game via 7-run mercy after 5th inning', async () => {
    // Play 5 innings, home team ahead by 7+
    // Verify: status = completed, reason = mercy_rule
  });

  // Walk-off victory
  it('should complete game via walk-off in bottom of 7th', async () => {
    // Bottom of 7th, home team scores to take lead
    // Verify: status = completed, reason = walk_off
  });

  // Tie game completion
  it('should complete tied game after 7 innings (no extra innings)', async () => {
    // Play 7 innings, tied score, maxExtraInnings = 0
    // Verify: status = completed, reason = regulation, tied = true
  });

  // Extra innings
  it('should continue to extra innings when tied (maxExtraInnings > 0)', async () => {
    // Play 7 innings, tied score, maxExtraInnings = 2
    // Verify: status = in_progress, inning = 8
  });

  // Completion precedence
  it('should prioritize walk-off over mercy rule', async () => {
    // Bottom of 7th, mercy rule eligible, home scores to win
    // Verify: reason = walk_off (not mercy_rule)
  });
});
```

#### 2. Cross-Aggregate Coordination

**Test component coordination:**

```typescript
describe('Cross-Aggregate Coordination', () => {
  it('should coordinate Game + InningState + TeamLineup', async () => {
    const game = await appServices.startNewGame.execute({...});

    // Record multiple at-bats
    for (let i = 0; i < 5; i++) {
      await appServices.recordAtBat.execute({
        gameId: game.gameId,
        result: { type: 'OUT', fieldedBy: [{ position: 'P' }] }
      });
    }

    // Verify coordination:
    const gameState = await appServices.getGameState.execute({...});

    // Game aggregate updated
    expect(gameState.inning).toBe(2);
    expect(gameState.isTopHalf).toBe(true);

    // InningState transitioned correctly
    expect(gameState.outs).toBe(2);  // 5 outs = inning transition + 2 outs

    // TeamLineup rotated
    expect(gameState.currentBatterIndex).not.toBe(0);
  });

  it('should maintain event stream consistency', async () => {
    const game = await appServices.startNewGame.execute({...});

    // Record 10 at-bats
    for (let i = 0; i < 10; i++) {
      await appServices.recordAtBat.execute({...});
    }

    // Retrieve events and verify
    const events = await appServices.getGameEvents.execute({
      gameId: game.gameId
    });

    expect(events).toHaveLength(11);  // 1 GameCreated + 10 AtBatCompleted
    expect(events[0].type).toBe('GameCreated');
    expect(events.slice(1).every(e => e.type === 'AtBatCompleted')).toBe(true);
  });
});
```

#### 3. Rules Configuration Propagation

**Test rules persist and restore correctly:**

```typescript
describe('Rules Configuration Integration', () => {
  it('should persist custom rules in GameCreated event', async () => {
    const customRules = {
      ...SoftballRules.standard(),
      maxExtraInnings: 3,
      mercyRuleRuns: [
        { afterInning: 3, runDifferential: 15 },
        { afterInning: 5, runDifferential: 7 },
      ],
    };

    const game = await appServices.startNewGame.execute({
      homeTeamName: 'Warriors',
      awayTeamName: 'Eagles',
      rulesConfig: customRules,
    });

    // Retrieve and verify
    const gameState = await appServices.getGameState.execute({
      gameId: game.gameId,
    });

    expect(gameState.rulesConfig.maxExtraInnings).toBe(3);
    expect(gameState.rulesConfig.mercyRuleRuns).toHaveLength(2);
  });

  it('should restore rules from event stream', async () => {
    // Create game with custom rules
    const customRules = { ...SoftballRules.youth() };
    const game = await appServices.startNewGame.execute({
      homeTeamName: 'Warriors',
      awayTeamName: 'Eagles',
      rulesConfig: customRules,
    });

    // Simulate app restart by creating new services
    const newFactory = createMemoryFactory();
    const newServices = await createApplicationServicesWithContainerAndFactory(
      { storage: 'memory' },
      newFactory
    );

    // Copy event store (simulate persistence)
    // ... (implementation detail)

    // Retrieve game with new services
    const gameState = await newServices.getGameState.execute({
      gameId: game.gameId,
    });

    expect(gameState.rulesConfig).toEqual(customRules);
  });

  it('should propagate rules to GameCoordinator', async () => {
    const customRules = {
      ...SoftballRules.standard(),
      maxExtraInnings: 0, // No extra innings allowed
    };

    const game = await appServices.startNewGame.execute({
      homeTeamName: 'Warriors',
      awayTeamName: 'Eagles',
      rulesConfig: customRules,
    });

    // Play 7 innings to a tie
    await playToTie(game.gameId, 7, 5);

    // Verify game completed (not continuing to extras)
    const gameState = await appServices.getGameState.execute({
      gameId: game.gameId,
    });

    expect(gameState.status).toBe('completed');
    expect(gameState.inning).toBe(7);
    expect(gameState.isTied).toBe(true);
  });
});
```

#### 4. State Persistence & Recovery

**Test event sourcing reconstruction:**

```typescript
describe('State Persistence & Recovery', () => {
  it('should reconstruct game from event stream', async () => {
    // Create and play game
    const game = await appServices.startNewGame.execute({...});

    for (let i = 0; i < 100; i++) {
      await appServices.recordAtBat.execute({...});
    }

    // Get current state
    const originalState = await appServices.getGameState.execute({
      gameId: game.gameId
    });

    // Simulate reconstruction (get events and replay)
    const events = await appServices.getGameEvents.execute({
      gameId: game.gameId
    });

    const reconstructedGame = Game.fromEvents(events);

    // Verify state matches
    expect(reconstructedGame.status).toBe(originalState.status);
    expect(reconstructedGame.homeScore).toBe(originalState.homeScore);
    expect(reconstructedGame.awayScore).toBe(originalState.awayScore);
  });

  it('should handle reconstruction performance (< 10ms for 100 events)', async () => {
    // Create game with 100 events
    const game = await appServices.startNewGame.execute({...});
    for (let i = 0; i < 100; i++) {
      await appServices.recordAtBat.execute({...});
    }

    const events = await appServices.getGameEvents.execute({
      gameId: game.gameId
    });

    // Benchmark reconstruction
    const start = performance.now();
    const reconstructedGame = Game.fromEvents(events);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);  // < 10ms
    expect(reconstructedGame).toBeDefined();
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApplicationServicesWithContainerAndFactory } from '@twsoftball/application/services/ApplicationFactory';
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
import type { ApplicationServices } from '@twsoftball/application/types';

describe('Integration: [Feature Name]', () => {
  let appServices: ApplicationServices;

  beforeEach(async () => {
    const factory = createMemoryFactory();
    appServices = await createApplicationServicesWithContainerAndFactory(
      { storage: 'memory' },
      factory
    );
  });

  afterEach(async () => {
    await appServices.dispose?.();
  });

  describe('[Scenario Category]', () => {
    it('should [expected behavior] with real services', async () => {
      // 1. Arrange - Set up scenario using real use cases
      const game = await appServices.startNewGame.execute({
        homeTeamName: 'Warriors',
        awayTeamName: 'Eagles',
        rulesConfig: SoftballRules.standard(),
      });

      // 2. Act - Execute the workflow being tested
      for (const step of scenario) {
        await appServices.recordAtBat.execute({
          gameId: game.gameId,
          result: step.result,
        });
      }

      // 3. Assert - Verify end state and side effects
      const finalState = await appServices.getGameState.execute({
        gameId: game.gameId,
      });

      expect(finalState.status).toBe('completed');
      expect(finalState.completionReason).toBe('MERCY_RULE');
    });
  });
});
```

## 6. Anti-Patterns to Avoid

### Anti-Pattern 1: Over-Mocking in Integration Tests

**Problem:** Mocks hide the exact integration issues we need to catch.

**Bad Example:**

```typescript
// ❌ This is NOT an integration test - it's a unit test with mocks
describe('RecordAtBat (ANTI-PATTERN)', () => {
  it('should record at-bat', async () => {
    const mockRules = {
      isGameComplete: vi.fn().mockReturnValue(false),
      checkMercyRule: vi.fn().mockReturnValue(false)
    };
    const mockRepo = {
      findById: vi.fn().mockResolvedValue(mockGame),
      save: vi.fn()
    };

    const useCase = new RecordAtBat(mockRepo, mockRules);
    await useCase.execute({...});

    expect(mockRepo.save).toHaveBeenCalled();  // Tests mock, not reality
  });
});
```

**Why it's bad:**

- Doesn't test real rules logic
- Doesn't test real repository implementation
- Doesn't catch event sourcing issues
- Doesn't validate cross-aggregate coordination

**Good Example:**

```typescript
// ✅ Real integration test - uses real implementations
describe('RecordAtBat Integration', () => {
  it('should record at-bat with real services', async () => {
    const appServices = await createApplicationServicesWithContainerAndFactory(
      { storage: 'memory' },
      createMemoryFactory()
    );

    const game = await appServices.startNewGame.execute({...});

    await appServices.recordAtBat.execute({
      gameId: game.gameId,
      result: { type: 'SINGLE', fieldedBy: [] }
    });

    const gameState = await appServices.getGameState.execute({
      gameId: game.gameId
    });

    expect(gameState.outs).toBe(0);
    expect(gameState.inning).toBe(1);
  });
});
```

### Anti-Pattern 2: Artificial State Jumps

**Problem:** Jumping directly to final state bypasses the progression logic we
need to test.

**Bad Example:**

```typescript
// ❌ Jumps directly to final state - doesn't test progression
describe('Mercy Rule (ANTI-PATTERN)', () => {
  it('should complete via mercy rule', () => {
    const game = Game.createNew(gameId, 'Home', 'Away', rules);

    // Artificial state jump
    game.addAwayRuns(10);
    const inningState = InningState.create().withInningHalf(4, false);

    const result = GameCoordinator.recordAtBat(
      game,
      inningState,
      lineup,
      outResult,
      rules
    );

    expect(result.game.status).toBe('completed');
  });
});
```

**Why it's bad:**

- Doesn't test incremental score updates
- Doesn't test inning transitions
- Doesn't test completion check timing
- Doesn't test batter rotation
- Creates unrealistic game state

**Good Example:**

```typescript
// ✅ Plays through complete game - tests incremental progression
describe('Mercy Rule Integration', () => {
  it('should complete via 10-run mercy rule after 4th inning', async () => {
    const appServices = await createApplicationServicesWithContainerAndFactory(
      { storage: 'memory' },
      createMemoryFactory()
    );

    const game = await appServices.startNewGame.execute({...});

    // Play through innings 1-3 (realistic progression)
    for (let inning = 1; inning <= 3; inning++) {
      await simulateCompleteInning(game.gameId, inning);
    }

    // Inning 4: Away team builds 10-run lead
    for (let i = 0; i < 12; i++) {
      await appServices.recordAtBat.execute({
        gameId: game.gameId,
        result: { type: 'HOME_RUN', fieldedBy: [] }
      });
    }

    // Verify game completed via mercy rule
    const gameState = await appServices.getGameState.execute({
      gameId: game.gameId
    });

    expect(gameState.status).toBe('completed');
    expect(gameState.completionReason).toBe('MERCY_RULE');
  });
});
```

### Anti-Pattern 3: Testing Implementation Details

**Problem:** Tests become brittle and don't reflect actual behavior.

**Bad Example:**

```typescript
// ❌ Tests internal implementation (private methods, internal state)
describe('Game (ANTI-PATTERN)', () => {
  it('should accumulate uncommitted events', () => {
    const game = Game.createNew(gameId, 'Home', 'Away', rules);

    // Accessing private implementation
    expect(game['_uncommittedEvents'].length).toBe(1);
    expect(game['_uncommittedEvents'][0]).toBeInstanceOf(GameCreated);

    game.recordAtBat(result);

    // Testing internal state
    expect(game['_uncommittedEvents'].length).toBe(2);
  });
});
```

**Why it's bad:**

- Tests private implementation (brittle)
- Breaks when refactoring (even if behavior unchanged)
- Doesn't test public API
- Doesn't verify actual business value

**Good Example:**

```typescript
// ✅ Tests public API and observable behavior
describe('Game', () => {
  it('should track domain events via public API', () => {
    const game = Game.createNew(gameId, 'Home', 'Away', rules);

    // Use public API
    const initialEvents = game.getUncommittedEvents();
    expect(initialEvents).toHaveLength(1);
    expect(initialEvents[0]).toBeInstanceOf(GameCreated);

    game.recordAtBat(result);

    const updatedEvents = game.getUncommittedEvents();
    expect(updatedEvents).toHaveLength(2);
    expect(updatedEvents[1]).toBeInstanceOf(AtBatCompleted);
  });
});
```

### Anti-Pattern 4: Mocking Critical Business Logic

**Problem:** Mocking the exact logic we need to validate defeats the purpose of
testing.

**Bad Example:**

```typescript
// ❌ Mocks the exact logic we need to test
describe('Game Completion (ANTI-PATTERN)', () => {
  it('should complete game', async () => {
    const mockRules = {
      isGameComplete: vi.fn().mockReturnValue(true),  // ❌ Mocking business logic
      getCompletionReason: vi.fn().mockReturnValue('MERCY_RULE')
    };

    const useCase = new RecordAtBat(repo, mockRules);
    const result = await useCase.execute({...});

    expect(result.isComplete).toBe(true);  // Tests mock, not reality
  });
});
```

**Why it's bad:**

- Doesn't validate mercy rule calculations
- Doesn't test completion precedence
- Doesn't catch edge cases in rules logic
- Mock always returns what we tell it to (circular testing)

**Good Example:**

```typescript
// ✅ Uses real rules - validates business logic
describe('Game Completion Integration', () => {
  it('should complete game via mercy rule with real rules', async () => {
    const appServices = await createApplicationServicesWithContainerAndFactory(
      { storage: 'memory' },
      createMemoryFactory()
    );

    // Real rules configuration
    const rules = SoftballRules.standard();

    const game = await appServices.startNewGame.execute({
      homeTeamName: 'Warriors',
      awayTeamName: 'Eagles',
      rulesConfig: rules, // Real rules, not mocked
    });

    // Play realistic scenario
    await playToMercyRule(game.gameId);

    // Verify real business logic executed correctly
    const gameState = await appServices.getGameState.execute({
      gameId: game.gameId,
    });

    expect(gameState.status).toBe('completed');
    expect(gameState.completionReason).toBe('MERCY_RULE');
  });
});
```

### Anti-Pattern 5: Testing Happy Path Only

**Problem:** Edge cases and error scenarios often reveal critical bugs.

**Bad Example:**

```typescript
// ❌ Only tests successful scenarios
describe('RecordAtBat (ANTI-PATTERN)', () => {
  it('should record successful at-bat', async () => {
    const result = await appServices.recordAtBat.execute({
      gameId: validGameId,
      result: validResult,
    });

    expect(result.success).toBe(true);
  });
});
```

**Good Example:**

```typescript
// ✅ Tests both success and failure scenarios
describe('RecordAtBat Integration', () => {
  it('should record successful at-bat', async () => {
    // ... happy path test
  });

  it('should reject at-bat for completed game', async () => {
    // Complete game
    await completeGame(gameId);

    // Attempt to record at-bat
    await expect(
      appServices.recordAtBat.execute({
        gameId,
        result: validResult
      })
    ).rejects.toThrow('Cannot record at-bat for completed game');
  });

  it('should reject at-bat with invalid game ID', async () => {
    await expect(
      appServices.recordAtBat.execute({
        gameId: 'invalid-id',
        result: validResult
      })
    ).rejects.toThrow('Game not found');
  });

  it('should handle concurrent at-bat attempts', async () => {
    // Test race conditions
    const promises = [
      appServices.recordAtBat.execute({...}),
      appServices.recordAtBat.execute({...})
    ];

    await expect(Promise.all(promises)).rejects.toThrow();
  });
});
```

## 7. Coverage Requirements by Layer

### Coverage Thresholds

| Layer              | CI Gate | Target | Focus Areas                                                |
| ------------------ | ------- | ------ | ---------------------------------------------------------- |
| **Domain**         | 96%     | 98%+   | Business rules, aggregates, value objects, domain services |
| **Application**    | 90%     | 95%+   | Use case orchestration, DTOs, application services         |
| **Infrastructure** | 80%     | 90%+   | Persistence adapters, event stores, repositories           |
| **Shared/Utils**   | 85%     | 95%+   | Utilities, helpers, common functions                       |
| **Web/UI**         | 70%     | 85%+   | Components, hooks, stores, UI logic                        |

### What to Test (Priorities)

#### Must Test (Critical)

- **Business rules** - Core domain logic (mercy rules, completion logic,
  scoring)
- **Error handling** - Validation, domain errors, boundary conditions
- **Security** - Input validation, data sanitization
- **Data validation** - Value object constraints, aggregate invariants
- **State transitions** - Inning transitions, game status changes
- **Event sourcing** - Event creation, event replay, state reconstruction

#### Should Test (Important)

- **Integration points** - Cross-aggregate coordination, use case orchestration
- **User workflows** - Complete game scenarios, realistic progressions
- **Edge cases** - Tie games, walk-offs, mercy rules, extra innings
- **Configuration** - Rules variants, custom settings
- **Performance** - Event reconstruction speed, query performance

#### Can Skip (Low Priority)

- **Port interfaces** - TypeScript ensures type safety
- **Type definitions** - Compiler validates these
- **Constants** - No logic to test
- **Simple getters** - Trivial accessors without logic
- **DTO mappers** - Simple property mapping (unless complex transformation)

### Coverage Quality Over Quantity

**80% well-designed tests > 95% with mocks**

Example of quality coverage:

```typescript
// ❌ BAD: 100% coverage with mocks (low quality)
describe('RecordAtBat', () => {
  it('should call repository save', async () => {
    const mockRepo = { save: vi.fn() };
    const useCase = new RecordAtBat(mockRepo, mockRules);
    await useCase.execute({...});
    expect(mockRepo.save).toHaveBeenCalled();  // 100% line coverage, 0% value
  });
});

// ✅ GOOD: 80% coverage with integration tests (high quality)
describe('RecordAtBat Integration', () => {
  it('should record at-bat and update game state', async () => {
    const appServices = await createApplicationServicesWithContainerAndFactory(
      { storage: 'memory' },
      createMemoryFactory()
    );

    const game = await appServices.startNewGame.execute({...});

    await appServices.recordAtBat.execute({
      gameId: game.gameId,
      result: { type: 'HOME_RUN', fieldedBy: [] }
    });

    const gameState = await appServices.getGameState.execute({
      gameId: game.gameId
    });

    expect(gameState.homeScore).toBe(1);  // Validates complete flow
  });
});
```

## 8. Test Organization and File Structure

### Domain Layer

```
packages/domain/src/
├── aggregates/
│   ├── Game.ts
│   ├── Game.core.test.ts              # Core functionality unit tests
│   ├── Game.edge-cases.test.ts        # Edge cases and error handling
│   ├── InningState.ts
│   ├── InningState.core.test.ts
│   └── InningState.edge-cases.test.ts
├── rules/
│   ├── SoftballRules.ts
│   ├── SoftballRules.test.ts          # Unit tests for rule calculations
│   ├── SoftballRules.verification.test.ts   # Business rule verification
│   └── SoftballRules.edge-cases.test.ts     # Edge cases
├── services/
│   ├── GameCoordinator.ts
│   ├── GameCoordinator.core.test.ts
│   └── GameCoordinator.complex-scenarios.test.ts
├── integration/
│   └── cross-aggregate-coordination.integration.test.ts
└── scenarios/
    └── complete-game-scenarios.test.ts
```

### Application Layer

```
packages/application/src/
├── use-cases/
│   ├── RecordAtBat.ts
│   ├── RecordAtBat.test.ts            # Unit tests (minimal mocking)
│   ├── StartNewGame.ts
│   └── StartNewGame.core.test.ts
├── services/
│   ├── ApplicationFactory.ts
│   └── ApplicationFactory.test.ts
└── integration/
    ├── game-completion-scenarios.integration.test.ts
    ├── rules-configuration.integration.test.ts
    ├── state-persistence.integration.test.ts
    └── cross-layer-flows.integration.test.ts
```

### Infrastructure Layer

```
packages/infrastructure/src/
├── memory/
│   ├── InMemoryEventStore.ts
│   └── InMemoryEventStore.test.ts     # Unit tests
├── web/
│   ├── IndexedDBEventStore.ts
│   └── IndexedDBEventStore.integration.test.ts
└── integration/
    └── event-store-compliance.integration.test.ts
```

### Web Layer (E2E)

```
apps/web/e2e/
├── integration/
│   ├── extra-innings-scenarios.spec.ts
│   ├── mercy-rule-scenarios.spec.ts
│   ├── walk-off-victory-scenarios.spec.ts
│   ├── configurable-innings-scenarios.spec.ts
│   └── combined-edge-cases.spec.ts
├── fixtures/
│   ├── gameStateFixtures.ts
│   └── playerFixtures.ts
└── page-objects/
    ├── GameRecordingPage.ts
    └── GameSetupPage.ts
```

### Naming Conventions

**Unit Tests:**

- `*.test.ts` - Co-located with source
- `*.core.test.ts` - Core functionality
- `*.edge-cases.test.ts` - Edge cases and error handling

**Integration Tests:**

- `*.integration.test.ts` - Integration tests
- Located in `/integration` or `/scenarios` folders

**E2E Tests:**

- `*.spec.ts` - E2E tests (Playwright convention)
- Located in `apps/web/e2e/integration/`

## 9. Testing Tools and Utilities

### Test Factories

#### TestGameFactory

Creates Game aggregates with realistic data:

```typescript
import { TestGameFactory } from '@twsoftball/application/test-factories';

const game = TestGameFactory.createInProgress({
  homeTeamName: 'Warriors',
  awayTeamName: 'Eagles',
  inning: 3,
  isTopHalf: false,
  homeScore: 5,
  awayScore: 3,
});
```

#### TestPlayerFactory

Creates player data:

```typescript
import { TestPlayerFactory } from '@twsoftball/application/test-factories';

const players = TestPlayerFactory.createLineup(12, {
  teamName: 'Warriors',
});
```

#### GameTestBuilder

Fluent API for building test games:

```typescript
import { GameTestBuilder } from '@twsoftball/application/test-utils';

const game = new GameTestBuilder()
  .withTeams('Warriors', 'Eagles')
  .withScore(5, 3)
  .atInning(4, false)
  .withOuts(2)
  .build();
```

### In-Memory Implementations

#### InMemoryEventStore

Fast, in-memory event storage for integration tests:

```typescript
import { InMemoryEventStore } from '@twsoftball/infrastructure/memory';

const eventStore = new InMemoryEventStore();
await eventStore.append('game-123', events);
const retrieved = await eventStore.getEventsForAggregate('game-123');
```

#### InMemoryGameRepository

Event-sourced repository using in-memory storage:

```typescript
import { InMemoryGameRepository } from '@twsoftball/infrastructure/memory';

const repo = new InMemoryGameRepository(eventStore);
await repo.save(game);
const retrieved = await repo.findById(gameId);
```

#### createMemoryFactory

Creates complete in-memory infrastructure:

```typescript
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';

const factory = createMemoryFactory();
const appServices = await createApplicationServicesWithContainerAndFactory(
  { storage: 'memory' },
  factory
);
```

### Test Utilities

#### SecureTestUtils

Generates cryptographically secure test IDs:

```typescript
import { SecureTestUtils } from '@twsoftball/application/test-utils';

const gameId = SecureTestUtils.generateTestGameId();
const playerId = SecureTestUtils.generateTestPlayerId();
```

#### EventTestHelper

Validates domain events:

```typescript
import { EventTestHelper } from '@twsoftball/domain/test-utils';

EventTestHelper.assertEventType(event, GameCreated);
EventTestHelper.assertEventSequence(events, [
  GameCreated,
  AtBatCompleted,
  RunScored,
]);
```

#### setupSuccessfulAtBatScenario

Orchestrates complex test setup:

```typescript
import { setupSuccessfulAtBatScenario } from '@twsoftball/application/test-utils';

const { appServices, gameId } = await setupSuccessfulAtBatScenario({
  inning: 3,
  isTopHalf: false,
  homeScore: 5,
  awayScore: 3,
});
```

### E2E Fixtures

#### createCustomGameState

Creates realistic game state for E2E tests:

```typescript
import { createCustomGameState } from '../fixtures/gameStateFixtures';

const gameState = createCustomGameState({
  inning: 7,
  isTopHalf: false,
  homeScore: 5,
  awayScore: 6,
  outs: 2,
  baseRunners: {
    first: player1,
    third: player3,
  },
});
```

#### createMercyRuleGameState

Pre-built mercy rule scenario:

```typescript
import { createMercyRuleGameState } from '../fixtures/gameStateFixtures';

const gameState = createMercyRuleGameState({
  inning: 4,
  isTopHalf: false,
  homeScore: 2,
  awayScore: 15, // 10+ run differential
});
```

## 10. Continuous Integration

### CI Pipeline Test Strategy

#### Fast Feedback Loop (< 2 minutes)

**Trigger:** Every commit to feature branch

**Tests:**

- TypeScript compilation check
- ESLint violations check
- Unit tests only (fastest)

**Purpose:** Catch syntax errors and broken unit tests immediately

**Configuration:**

```yaml
# .github/workflows/fast-feedback.yml
name: Fast Feedback
on: push
jobs:
  quick-checks:
    runs-on: ubuntu-latest
    steps:
      - name: TypeScript Check
        run: pnpm typecheck
      - name: Lint Check
        run: pnpm lint
      - name: Unit Tests
        run: pnpm test --run --coverage=false
```

#### Full Validation (< 10 minutes)

**Trigger:** Pull request opened/updated

**Tests:**

- Unit tests with coverage
- Integration tests with coverage
- E2E tests (chromium only for speed)
- Dependency graph validation
- Architecture validation (Steiger)

**Purpose:** Comprehensive validation before code review

**Configuration:**

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation
on: pull_request
jobs:
  full-validation:
    runs-on: ubuntu-latest
    steps:
      - name: Unit + Integration Tests
        run: pnpm test --run --coverage
      - name: Coverage Thresholds
        run: pnpm test:coverage-check
      - name: E2E Tests (Chromium)
        run: pnpm test:e2e --project=chromium
      - name: Dependency Graph
        run: pnpm deps:check
      - name: Architecture Validation
        run: pnpm fsd:check
```

#### Comprehensive Testing (< 30 minutes)

**Trigger:** Before merge to main

**Tests:**

- All tests (unit + integration + E2E)
- E2E on all browsers (chromium, firefox, webkit)
- Coverage reports uploaded
- Performance benchmarks
- Bundle size analysis

**Purpose:** Final gate before production deployment

**Configuration:**

```yaml
# .github/workflows/pre-merge.yml
name: Pre-Merge Validation
on:
  pull_request:
    types: [ready_for_review]
jobs:
  comprehensive:
    runs-on: ubuntu-latest
    steps:
      - name: All Tests with Coverage
        run: pnpm test --run --coverage
      - name: E2E All Browsers
        run: pnpm test:e2e
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
      - name: Performance Benchmarks
        run: pnpm test:perf
      - name: Bundle Size
        run: pnpm build && pnpm bundle-size
```

### Coverage Enforcement

**Per-Layer Coverage Gates:**

```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        // Global defaults
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,

        // Per-layer overrides
        'packages/domain/**': {
          lines: 96,
          functions: 96,
          branches: 96,
          statements: 96
        },
        'packages/application/**': {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90
        }
      }
    }
  }
});
```

### Fail Fast Strategy

1. **TypeScript errors** → Fail immediately (< 30 seconds)
2. **Lint errors** → Fail immediately (< 1 minute)
3. **Unit test failures** → Fail fast (< 2 minutes)
4. **Integration test failures** → Fail before E2E (< 5 minutes)
5. **E2E test failures** → Fail before coverage upload (< 10 minutes)

## 11. Test Performance

### Performance Targets

#### Unit Tests

**Individual Test:**

- Target: < 5ms
- Maximum: < 10ms

**Full Suite:**

- Domain: < 30 seconds
- Application: < 60 seconds
- Infrastructure: < 30 seconds
- Web: < 60 seconds

**Total:** < 3 minutes for all unit tests

#### Integration Tests

**Individual Test:**

- Target: < 100ms
- Maximum: < 500ms

**Full Suite:**

- Application integration: < 2 minutes
- Infrastructure integration: < 1 minute

**Total:** < 3 minutes for all integration tests

#### E2E Tests

**Individual Scenario:**

- Target: < 10 seconds
- Maximum: < 30 seconds

**Full Suite (Single Browser):**

- Target: < 5 minutes
- Maximum: < 10 minutes

**Full Suite (All Browsers):**

- Target: < 15 minutes
- Maximum: < 30 minutes

### Performance Optimization Techniques

#### 1. Use In-Memory Implementations

```typescript
// ✅ Fast: In-memory storage
const factory = createMemoryFactory();
appServices = await createApplicationServicesWithContainerAndFactory(
  { storage: 'memory' },
  factory
);

// ❌ Slow: Real IndexedDB
const factory = createIndexedDBFactory();
```

**Impact:** 10-100x faster for integration tests

#### 2. Parallelize Independent Tests

```typescript
// Vitest runs tests in parallel by default
describe.concurrent('Parallel tests', () => {
  it('test 1', async () => {
    /* ... */
  });
  it('test 2', async () => {
    /* ... */
  });
  it('test 3', async () => {
    /* ... */
  });
});
```

**Impact:** 2-4x faster test execution

#### 3. Use Test Fixtures

```typescript
// ✅ Fast: Pre-built fixtures
import { mercyRuleGameState } from '../fixtures/gameStateFixtures';

it('should handle mercy rule', async () => {
  await gamePage.injectGameState(mercyRuleGameState);
  // Test continues...
});

// ❌ Slow: Generate data per test
it('should handle mercy rule', async () => {
  await playCompleteGame(4); // Slow setup
  // Test continues...
});
```

**Impact:** 5-10x faster E2E tests

#### 4. Snapshot Testing for Large Objects

```typescript
// ✅ Fast: Snapshot comparison
expect(gameState).toMatchSnapshot();

// ❌ Slow: Manual assertion
expect(gameState.players).toHaveLength(18);
expect(gameState.players[0].name).toBe('...');
// ... 100 more assertions
```

**Impact:** Faster test writing, faster execution

#### 5. Mock External Services (E2E Only)

```typescript
// E2E: Mock API calls, not business logic
await page.route('**/api/external/**', route => {
  route.fulfill({ status: 200, body: mockResponse });
});
```

**Impact:** Eliminates network latency and flakiness

### Performance Monitoring

**Track test performance over time:**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    reporters: ['default', 'junit'],
    outputFile: './test-results/junit.xml',
  },
});
```

**Alert on performance regression:**

```yaml
# CI: Fail if tests take > 2x baseline
- name: Check Test Performance
  run: |
    DURATION=$(cat test-results/junit.xml | grep 'time=' | awk '{print $3}')
    if [ $DURATION -gt $THRESHOLD ]; then
      echo "Test performance regression detected"
      exit 1
    fi
```

## 12. Appendix: Examples

### Example 1: Complete Integration Test

**File:**
`packages/application/src/integration/game-completion-scenarios.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createApplicationServicesWithContainerAndFactory } from '../services/ApplicationFactory';
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
import { SoftballRules } from '@twsoftball/domain/rules/SoftballRules';
import type { ApplicationServices } from '../types';

describe('Integration: Game Completion Scenarios', () => {
  let appServices: ApplicationServices;

  beforeEach(async () => {
    const factory = createMemoryFactory();
    appServices = await createApplicationServicesWithContainerAndFactory(
      { storage: 'memory' },
      factory
    );
  });

  describe('Mercy Rule Completion', () => {
    it('should complete game via 10-run mercy rule after 4th inning', async () => {
      // Arrange: Start new game with standard rules
      const game = await appServices.startNewGame.execute({
        homeTeamName: 'Warriors',
        awayTeamName: 'Eagles',
        rulesConfig: SoftballRules.standard(),
      });

      // Act: Play through innings 1-3 with close scores
      await simulateBalancedInning(appServices, game.gameId, 1, 2, 2);
      await simulateBalancedInning(appServices, game.gameId, 2, 1, 1);
      await simulateBalancedInning(appServices, game.gameId, 3, 2, 2);

      // Play top of 4th: Away team scores 10 runs
      for (let i = 0; i < 10; i++) {
        await appServices.recordAtBat.execute({
          gameId: game.gameId,
          battingTeam: 'away',
          result: {
            type: 'HOME_RUN',
            fieldedBy: [],
          },
        });
      }

      // Complete top of 4th with 3 outs
      for (let i = 0; i < 3; i++) {
        await appServices.recordAtBat.execute({
          gameId: game.gameId,
          battingTeam: 'away',
          result: {
            type: 'OUT',
            fieldedBy: [{ position: 'P' }],
          },
        });
      }

      // Assert: Game should be completed via mercy rule
      const gameState = await appServices.getGameState.execute({
        gameId: game.gameId,
      });

      expect(gameState.status).toBe('completed');
      expect(gameState.completionReason).toBe('MERCY_RULE');
      expect(gameState.completionDetails).toContain('10-run mercy rule');
      expect(gameState.inning).toBe(4);
      expect(gameState.isTopHalf).toBe(false);
      expect(gameState.awayScore).toBeGreaterThanOrEqual(
        gameState.homeScore + 10
      );
    });

    it('should complete game via 7-run mercy rule after 5th inning', async () => {
      // Similar structure for 7-run mercy rule
      // ... (implementation)
    });
  });

  describe('Walk-Off Victory', () => {
    it('should complete game immediately when home team takes lead in bottom of 7th', async () => {
      const game = await appServices.startNewGame.execute({
        homeTeamName: 'Warriors',
        awayTeamName: 'Eagles',
        rulesConfig: SoftballRules.standard(),
      });

      // Play through 6.5 innings with away team ahead 5-4
      await playThroughInnings(appServices, game.gameId, 6);
      await simulateTopOfSeventh(appServices, game.gameId, 5, 4);

      // Bottom of 7th: Home team hits walk-off home run
      await appServices.recordAtBat.execute({
        gameId: game.gameId,
        battingTeam: 'home',
        result: {
          type: 'HOME_RUN',
          fieldedBy: [],
          runsBattedIn: 2, // Wins game 6-5
        },
      });

      // Verify walk-off completion
      const gameState = await appServices.getGameState.execute({
        gameId: game.gameId,
      });

      expect(gameState.status).toBe('completed');
      expect(gameState.completionReason).toBe('WALK_OFF');
      expect(gameState.homeScore).toBe(6);
      expect(gameState.awayScore).toBe(5);
      expect(gameState.inning).toBe(7);
      expect(gameState.isTopHalf).toBe(false);
    });
  });

  describe('Extra Innings', () => {
    it('should continue to extra innings when tied after 7 innings', async () => {
      const game = await appServices.startNewGame.execute({
        homeTeamName: 'Warriors',
        awayTeamName: 'Eagles',
        rulesConfig: {
          ...SoftballRules.standard(),
          maxExtraInnings: 2,
        },
      });

      // Play 7 complete innings to a tie (5-5)
      await playToTie(appServices, game.gameId, 7, 5);

      // Verify game continues to extra innings
      const gameState = await appServices.getGameState.execute({
        gameId: game.gameId,
      });

      expect(gameState.status).toBe('in_progress');
      expect(gameState.inning).toBe(8);
      expect(gameState.isTopHalf).toBe(true);
      expect(gameState.homeScore).toBe(5);
      expect(gameState.awayScore).toBe(5);
    });
  });
});

// Helper functions
async function simulateBalancedInning(
  appServices: ApplicationServices,
  gameId: string,
  inning: number,
  awayRuns: number,
  homeRuns: number
) {
  // Top of inning
  for (let i = 0; i < awayRuns; i++) {
    await appServices.recordAtBat.execute({
      gameId,
      battingTeam: 'away',
      result: { type: 'SINGLE', fieldedBy: [] },
    });
  }
  for (let i = 0; i < 3; i++) {
    await appServices.recordAtBat.execute({
      gameId,
      battingTeam: 'away',
      result: { type: 'OUT', fieldedBy: [{ position: 'P' }] },
    });
  }

  // Bottom of inning
  for (let i = 0; i < homeRuns; i++) {
    await appServices.recordAtBat.execute({
      gameId,
      battingTeam: 'home',
      result: { type: 'SINGLE', fieldedBy: [] },
    });
  }
  for (let i = 0; i < 3; i++) {
    await appServices.recordAtBat.execute({
      gameId,
      battingTeam: 'home',
      result: { type: 'OUT', fieldedBy: [{ position: 'P' }] },
    });
  }
}
```

### Example 2: Business Rule Verification Test

**File:** `packages/domain/src/rules/SoftballRules.verification.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { SoftballRules } from './SoftballRules';

describe('SoftballRules - Business Rule Verification', () => {
  describe('Mercy Rule Calculations', () => {
    it('should enforce 10-run mercy rule after 4th inning', () => {
      const rules = SoftballRules.standard();

      // Before 4th inning: mercy rule not active
      expect(rules.checkMercyRule(3, false, 15, 5)).toBe(false);
      expect(rules.checkMercyRule(3, true, 15, 5)).toBe(false);

      // After top of 4th: mercy rule active
      expect(rules.checkMercyRule(4, false, 15, 5)).toBe(true);
      expect(rules.checkMercyRule(4, false, 5, 15)).toBe(true);

      // Exactly 10 runs: mercy rule active
      expect(rules.checkMercyRule(4, false, 15, 5)).toBe(true);

      // Less than 10 runs: mercy rule not active
      expect(rules.checkMercyRule(4, false, 14, 5)).toBe(false);
    });

    it('should enforce 7-run mercy rule after 5th inning', () => {
      const rules = SoftballRules.standard();

      // 7-run differential after 5th inning
      expect(rules.checkMercyRule(5, false, 12, 5)).toBe(true);

      // Less than 7 runs: no mercy
      expect(rules.checkMercyRule(5, false, 11, 5)).toBe(false);

      // Before 5th inning: 7-run rule not active yet
      expect(rules.checkMercyRule(4, false, 12, 5)).toBe(false);
    });
  });

  describe('Completion Logic', () => {
    it('should complete regulation game after 7 innings with decisive score', () => {
      const rules = SoftballRules.standard();

      // After 7 complete innings, home ahead
      const result = rules.isGameComplete(7, false, 5, 3);
      expect(result.isComplete).toBe(true);
      expect(result.reason).toBe('REGULATION');

      // After 7 complete innings, away ahead
      const result2 = rules.isGameComplete(7, false, 3, 5);
      expect(result2.isComplete).toBe(true);
      expect(result2.reason).toBe('REGULATION');
    });

    it('should continue to extra innings when tied after 7 innings', () => {
      const rules = {
        ...SoftballRules.standard(),
        maxExtraInnings: 2,
      };

      // Tied after 7 innings: continue to extras
      const result = rules.isGameComplete(7, false, 5, 5);
      expect(result.isComplete).toBe(false);
    });

    it('should complete tied game when extra innings not allowed', () => {
      const rules = {
        ...SoftballRules.standard(),
        maxExtraInnings: 0,
      };

      // Tied after 7 innings, no extras allowed
      const result = rules.isGameComplete(7, false, 5, 5);
      expect(result.isComplete).toBe(true);
      expect(result.reason).toBe('REGULATION');
      expect(result.isTied).toBe(true);
    });
  });

  describe('Walk-Off Victory Logic', () => {
    it('should detect walk-off in bottom of 7th when home takes lead', () => {
      const rules = SoftballRules.standard();

      // Bottom of 7th, home team takes lead
      const result = rules.checkWalkOff(7, false, 6, 5);
      expect(result).toBe(true);
    });

    it('should not detect walk-off in top of inning', () => {
      const rules = SoftballRules.standard();

      // Top of 7th: no walk-off possible
      const result = rules.checkWalkOff(7, true, 6, 5);
      expect(result).toBe(false);
    });

    it('should detect walk-off in extra innings', () => {
      const rules = {
        ...SoftballRules.standard(),
        maxExtraInnings: 2,
      };

      // Bottom of 8th (extra inning), home takes lead
      const result = rules.checkWalkOff(8, false, 7, 6);
      expect(result).toBe(true);
    });
  });
});
```

### Example 3: Realistic Scenario Test

**File:** `packages/domain/src/scenarios/complete-game-scenarios.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { Game } from '../aggregates/Game';
import { InningState } from '../aggregates/InningState';
import { GameCoordinator } from '../services/GameCoordinator';
import { SoftballRules } from '../rules/SoftballRules';
import { GameId } from '../value-objects/GameId';

describe('Complete Game Scenarios', () => {
  describe('Realistic Game Progression', () => {
    it('should play complete 7-inning game with realistic at-bats', () => {
      // Arrange
      const gameId = GameId.generate();
      const rules = SoftballRules.standard();
      let game = Game.createNew(gameId, 'Warriors', 'Eagles', rules);
      let inningState = InningState.create();

      const scenario = [
        // Inning 1
        { inning: 1, isTop: true, outs: 3, runs: 2 },
        { inning: 1, isTop: false, outs: 3, runs: 1 },
        // Inning 2
        { inning: 2, isTop: true, outs: 3, runs: 1 },
        { inning: 2, isTop: false, outs: 3, runs: 2 },
        // ... continue through inning 7
      ];

      // Act: Play through complete game
      for (const halfInning of scenario) {
        for (let i = 0; i < halfInning.runs; i++) {
          const result = GameCoordinator.recordAtBat(
            game,
            inningState,
            lineup,
            { type: 'SINGLE', fieldedBy: [] },
            rules
          );
          game = result.game;
          inningState = result.inningState;
        }

        for (let i = 0; i < halfInning.outs; i++) {
          const result = GameCoordinator.recordAtBat(
            game,
            inningState,
            lineup,
            { type: 'OUT', fieldedBy: [{ position: 'P' }] },
            rules
          );
          game = result.game;
          inningState = result.inningState;
        }
      }

      // Assert
      expect(game.status).toBe('completed');
      expect(game.completionReason).toBe('REGULATION');
      expect(inningState.inning).toBe(7);
    });
  });
});
```

### Example 4: E2E Test with Page Object

**File:** `apps/web/e2e/integration/mercy-rule-scenarios.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { GameRecordingPage } from '../page-objects/GameRecordingPage';
import { createMercyRuleGameState } from '../fixtures/gameStateFixtures';

test.describe('Mercy Rule Scenarios', () => {
  let gamePage: GameRecordingPage;

  test.beforeEach(async ({ page }) => {
    gamePage = new GameRecordingPage(page);
    await gamePage.goto();
  });

  test('should complete game via 10-run mercy rule after 4th inning', async ({
    page,
  }) => {
    // Arrange: Inject game state with 10+ run differential after 4th
    const gameState = createMercyRuleGameState({
      inning: 4,
      isTopHalf: false,
      homeScore: 5,
      awayScore: 15,
      outs: 3,
    });

    await gamePage.injectGameState(gameState);

    // Assert: Verify game completed via mercy rule
    await expect(page.getByTestId('game-status')).toHaveText('Completed');
    await expect(page.getByTestId('completion-reason')).toContainText(
      '10-run mercy rule'
    );
    await expect(page.getByTestId('completion-details')).toContainText(
      'after 4th inning'
    );

    // Verify UI reflects completion
    await expect(page.getByTestId('record-at-bat-button')).toBeDisabled();
    await expect(page.getByTestId('final-score')).toBeVisible();
    await expect(page.getByTestId('final-score')).toContainText(
      'Eagles 15, Warriors 5'
    );
  });

  test('should display mercy rule alert when eligible', async ({ page }) => {
    // Arrange: Set up game approaching mercy rule
    const gameState = createMercyRuleGameState({
      inning: 4,
      isTopHalf: false,
      homeScore: 5,
      awayScore: 14, // 9-run differential
      outs: 2,
    });

    await gamePage.injectGameState(gameState);

    // Act: Record at-bat that triggers mercy rule
    await gamePage.recordAtBat({
      result: 'HOME_RUN',
      runsBattedIn: 1,
    });

    // Assert: Verify mercy rule completion
    await expect(page.getByTestId('game-status')).toHaveText('Completed');
    await expect(page.getByTestId('completion-reason')).toContainText(
      'mercy rule'
    );
  });
});
```

---

## Key Takeaways

1. **Integration tests are critical** - They fill the gap between unit and E2E
   tests, catching coordination issues that unit tests miss.

2. **Avoid over-mocking** - Use real implementations with in-memory storage.
   Mocks hide the exact integration issues we need to catch.

3. **Test realistic scenarios** - Play through complete games with incremental
   progression, not artificial state jumps.

4. **Business rules first** - Verify slow-pitch softball rules comprehensively
   (mercy rules, walk-offs, extra innings).

5. **Cross-layer validation** - Test complete flows from UI → Application →
   Domain → Infrastructure.

6. **Quality over coverage** - 80% well-designed tests with real
   implementations > 95% coverage with mocks.

7. **Use the test pyramid** - 75% unit, 15% integration, 10% E2E. Each layer
   serves a specific purpose.

8. **TDD throughout** - Write tests before implementation. Tests drive design
   and ensure testability.

9. **Performance matters** - Keep unit tests fast (< 5ms), integration tests
   moderate (< 100ms), E2E tests acceptable (< 10s).

10. **Document learnings** - When E2E tests reveal bugs, add integration tests
    to prevent regression.

---

_For current project progress, see TODO.local.md_ _For architecture patterns,
see /docs/architecture-patterns.md_ _For project overview, see CLAUDE.md_
