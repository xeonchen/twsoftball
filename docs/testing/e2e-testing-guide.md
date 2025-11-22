# E2E Testing Guide - TW Softball

**Last Updated:** October 24, 2025 **Test Framework:** Playwright 1.48+
**Architecture:** PWA with offline-first capabilities

## Table of Contents

1. [Introduction](#introduction)
2. [E2E Testing Architecture](#e2e-testing-architecture)
3. [Page Object Model Pattern](#page-object-model-pattern)
4. [Test Patterns and Best Practices](#test-patterns-and-best-practices)
5. [Complete Example](#complete-example)
6. [Running E2E Tests](#running-e2e-tests)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of E2E Testing

End-to-End (E2E) testing validates complete user workflows in the TW Softball
application, ensuring that all layers (Web UI, Application, Domain,
Infrastructure) work together correctly to deliver the expected user experience.

**Key Benefits:**

- **User-Centric Validation:** Tests real user journeys from start to finish
- **Integration Verification:** Validates cross-layer interactions and data flow
- **Regression Protection:** Catches breaking changes in production workflows
- **Confidence in Deployment:** Ensures critical paths work before release

### Technologies Used

- **Playwright:** Cross-browser testing framework for E2E automation
- **Page Object Model:** Design pattern for maintainable test code
- **TypeScript:** Type-safe test authoring with IDE support
- **Fixtures:** Reusable test data for consistent scenarios

### PWA Offline-First Architecture Considerations

The TW Softball application is a Progressive Web App (PWA) with offline-first
capabilities:

- **Zustand Store:** Client-side state management with persistence
- **sessionStorage:** Primary persistence layer for game state
- **IndexedDB:** Long-term persistence for event sourcing
- **No Backend API:** All game logic runs client-side

This architecture influences our E2E testing strategy:

- Tests inject data directly into `sessionStorage` (offline-first data source)
- No API mocking required - tests work against real client-side implementations
- Storage events trigger Zustand store synchronization
- Tests can verify state persistence across page reloads

---

## E2E Testing Architecture

### Zustand Store with sessionStorage Persistence

The Web application uses Zustand for state management with persist middleware
that syncs to `sessionStorage`:

```typescript
// Zustand store with persist middleware
const useGameStore = create(
  persist(
    (set, get) => ({
      currentGame: null,
      activeGameState: null,
      // ... state and actions
    }),
    {
      name: 'game-state', // sessionStorage key
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
```

**Key Characteristics:**

- State persists to `sessionStorage.getItem('game-state')`
- Changes to sessionStorage trigger store rehydration via storage events
- Tests can read/write sessionStorage to inspect/modify state
- No network requests - pure client-side state management

### Why We Inject Data into sessionStorage

**Problem:** Traditional E2E tests mock API responses, but our PWA has no
backend API.

**Solution:** Inject test data directly into `sessionStorage` and trigger
storage events.

**Benefits:**

1. **Matches Production Architecture:** Tests use the same persistence layer as
   production
2. **No Mocking Required:** Real Zustand store, real persistence, real game
   logic
3. **Fast Test Setup:** Inject complex game states instantly
4. **State Verification:** Read sessionStorage to assert outcomes

### Storage Event Pattern for Store Synchronization

Zustand's persist middleware listens for storage events to detect external
changes:

```typescript
// E2E test injects data and triggers sync
await page.evaluate(state => {
  // 1. Write to sessionStorage
  sessionStorage.setItem('game-state', JSON.stringify(state));

  // 2. Dispatch storage event to notify Zustand
  window.dispatchEvent(new Event('storage'));
}, gameStateFixture);
```

**Event Flow:**

1. Test writes to `sessionStorage`
2. Test dispatches `storage` event
3. Zustand persist middleware detects event
4. Store rehydrates from updated sessionStorage
5. React components re-render with new state

### Data Fixtures Pattern

Test fixtures provide reusable, type-safe game state data:

**Location:** `apps/web/e2e/fixtures/gameStateFixtures.ts`

**Available Fixtures:**

- `mockActiveGame` - Game in progress (inning 5, score 4-3)
- `mockGameStart` - Fresh game (inning 1, score 0-0)
- `mockGameWithSubstitutions` - Game with substitution history
- `mockEmptyLineup` - Empty state for error testing
- Helper functions: `createCustomGameState()`, `createLineupWithPlayers()`

**Example Usage:**

```typescript
import { mockActiveGame } from '../fixtures/gameStateFixtures';

test('should load game state', async ({ page }) => {
  const gamePageObject = new GameRecordingPageObject(page);

  // Inject fixture into sessionStorage
  await gamePageObject.injectGameState(mockActiveGame);

  // Navigate to page (Zustand rehydrates from sessionStorage)
  await gamePageObject.goto();

  // Verify state loaded correctly
  expect(await gamePageObject.getCurrentInning()).toBe(5);
});
```

---

## Page Object Model Pattern

### What is Page Object Model?

The Page Object Model (POM) is a design pattern that:

1. **Encapsulates page structure** - All selectors in one place
2. **Provides semantic methods** - `clickStartButton()` instead of
   `page.click('[data-testid="start"]')`
3. **Improves maintainability** - UI changes update one file, not every test
4. **Enables reusability** - Common workflows shared across tests
5. **Supports type safety** - TypeScript interfaces for method parameters

### Benefits for Maintainability

**Without Page Objects (fragile):**

```typescript
// ❌ Selectors duplicated across tests
test('test 1', async ({ page }) => {
  await page.click('[data-testid="action-single"]');
  const score = await page.locator('[data-testid="home-score"]').textContent();
});

test('test 2', async ({ page }) => {
  await page.click('[data-testid="action-single"]'); // Duplicate
  const score = await page.locator('[data-testid="home-score"]').textContent(); // Duplicate
});
```

**With Page Objects (maintainable):**

```typescript
// ✅ Selectors centralized in page object
test('test 1', async ({ page }) => {
  const gamePageObject = new GameRecordingPageObject(page);
  await gamePageObject.recordAtBat({ result: 'single' });
  const score = await gamePageObject.getScore('home');
});

test('test 2', async ({ page }) => {
  const gamePageObject = new GameRecordingPageObject(page);
  await gamePageObject.recordAtBat({ result: 'single' }); // Reused method
  const score = await gamePageObject.getScore('home'); // Reused method
});
```

**If the selector changes:**

- Without POM: Update every test file
- With POM: Update one line in the page object

### Location

**Directory:** `apps/web/e2e/page-objects/`

**Available Page Objects:**

- `GameRecordingPage.ts` - Game recording interface (at-bats, scoring, state)
- `GameSetupTeamsPage.ts` - Team setup wizard page
- `GameSetupLineupPage.ts` - Lineup editor wizard page
- `GameSetupConfirmPage.ts` - Game confirmation page
- `LineupManagementPage.ts` - Substitution and lineup management

### Example from GameRecordingPage.ts

````typescript
/**
 * GameRecordingPageObject - Page object for game recording interface
 */
export class GameRecordingPageObject {
  // Selectors (private, encapsulated)
  private readonly homeScore: Locator;
  private readonly awayScore: Locator;

  constructor(private readonly page: Page) {
    // Initialize selectors using data-testid attributes
    this.homeScore = page.locator('[data-testid="home-score"]');
    this.awayScore = page.locator('[data-testid="away-score"]');
  }

  /**
   * Record an at-bat result
   *
   * @param data - At-bat data (result type, runner advances)
   *
   * @example
   * ```typescript
   * await gamePageObject.recordAtBat({ result: 'single' });
   * await gamePageObject.recordAtBat({ result: 'homerun' });
   * ```
   */
  async recordAtBat(data: AtBatData): Promise<void> {
    const actionButtonSelector = `[data-testid="action-${data.result.toLowerCase()}"]`;
    await this.page.locator(actionButtonSelector).click();

    // Wait for async flow to complete (use case → DTO → state update)
    await this.page.waitForFunction(
      selector => {
        const button = document.querySelector(selector);
        return button && !button.hasAttribute('disabled');
      },
      actionButtonSelector,
      { timeout: 10000 }
    );
  }

  /**
   * Get current score for a team
   *
   * @param team - Team identifier ('home' or 'away')
   * @returns Current score as a number
   */
  async getScore(team: 'home' | 'away'): Promise<number> {
    const scoreLocator = team === 'home' ? this.homeScore : this.awayScore;
    const scoreText = await scoreLocator.textContent();
    return parseInt(scoreText?.trim() || '0', 10);
  }
}
````

**Key Features:**

- **Encapsulation:** Selectors are private, methods are public
- **Semantic APIs:** `recordAtBat()`, `getScore()` describe intent
- **Type Safety:** TypeScript interfaces for parameters
- **Documentation:** JSDoc with examples for each method
- **Wait Strategies:** Built-in waits for async operations

---

## Test Patterns and Best Practices

### Using data-testid Attributes (kebab-case convention)

The application uses `data-testid` attributes for stable, semantic selectors:

**Naming Convention:** kebab-case (e.g., `action-single`, `home-score`,
`game-recording-page`)

**Benefits:**

- **Stable:** Not affected by CSS class changes or text content updates
- **Semantic:** Clearly identifies element purpose
- **Accessible:** Works alongside ARIA attributes
- **Searchable:** Easy to find usages in codebase

**Example Component:**

```tsx
// Component implementation
<button data-testid="action-single" onClick={handleSingle}>
  Single
</button>

<div data-testid="home-score">{homeScore}</div>
```

**Example Test:**

```typescript
// E2E test
const singleButton = page.locator('[data-testid="action-single"]');
await singleButton.click();

const score = await page.locator('[data-testid="home-score"]').textContent();
expect(score).toBe('1');
```

**Best Practices:**

- Add `data-testid` to all interactive elements (buttons, inputs, links)
- Add `data-testid` to elements displaying critical state (scores, innings,
  outs)
- Use descriptive names that reflect element purpose
- Keep names consistent with domain terminology

### Test Isolation with beforeEach Cleanup

PWA apps use `sessionStorage`/`localStorage` for offline-first functionality.
Without cleanup, tests interfere with each other.

**Problem:**

```typescript
// Test 1 sets state
test('test 1', async ({ page }) => {
  await page.evaluate(() => {
    sessionStorage.setItem('game-state', JSON.stringify({ inning: 5 }));
  });
  // ... test logic
});

// Test 2 sees stale data from Test 1 ❌
test('test 2', async ({ page }) => {
  // Expects inning: 1, but gets inning: 5 from Test 1
});
```

**Solution:**

```typescript
test.describe('Game Recording', () => {
  // Clean up before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test('test 1', async ({ page }) => {
    // Fresh state, isolated from other tests ✅
  });

  test('test 2', async ({ page }) => {
    // Fresh state, isolated from other tests ✅
  });
});
```

**Explanation:**

- Zustand persist middleware rehydrates from `sessionStorage` on component mount
- Without cleanup, Test 2 would see stale data from Test 1
- `beforeEach` ensures each test starts with clean state
- Clear both `sessionStorage` and `localStorage` for complete isolation

### Waiting for State Transitions

After recording an at-bat, multiple async operations occur:

1. Use case execution (recordAtBat)
2. DTO return (GameDTO)
3. React state update (useEffect triggers)
4. Store sync (useGameStateSync)
5. UI re-render with new currentBatter
6. Button re-enabled for next action

**Problem:** Clicking too early causes flaky tests.

**Solution:** Wait for button to be re-enabled:

```typescript
async recordAtBat(data: AtBatData): Promise<void> {
  const actionButtonSelector = `[data-testid="action-${data.result.toLowerCase()}"]`;
  const actionButton = this.page.locator(actionButtonSelector);

  // Click the action button
  await actionButton.click();

  // Wait for complete async flow (button re-enabled = ready for next action)
  await this.page.waitForFunction(
    selector => {
      const button = document.querySelector(selector);
      return button && !button.hasAttribute('disabled');
    },
    actionButtonSelector,
    { timeout: 10000 }
  );

  // Small buffer to ensure React has fully rendered
  await this.page.waitForTimeout(100);
}
```

**Alternative Wait Strategies:**

```typescript
// Wait for specific element to appear
await page.locator('[data-testid="success-message"]').waitFor();

// Wait for text content to change
await expect(page.locator('[data-testid="home-score"]')).toHaveText('3');

// Wait for sessionStorage to update
await page.waitForFunction(() => {
  const state = JSON.parse(sessionStorage.getItem('game-state') || '{}');
  return state.currentInning === 6;
});
```

### Using Fixtures from apps/web/e2e/fixtures/

**Location:** `apps/web/e2e/fixtures/gameStateFixtures.ts`

**Import Pattern:**

```typescript
import {
  mockActiveGame,
  mockGameStart,
  createCustomGameState,
} from '../fixtures/gameStateFixtures';
```

**Usage Examples:**

```typescript
// Use pre-built fixture
test('should display active game', async ({ page }) => {
  const gamePageObject = new GameRecordingPageObject(page);
  await gamePageObject.injectGameState(mockActiveGame);
  await gamePageObject.goto();

  expect(await gamePageObject.getCurrentInning()).toBe(5);
  expect(await gamePageObject.getScore('home')).toBe(4);
});

// Customize fixture
test('should handle 7th inning', async ({ page }) => {
  const gamePageObject = new GameRecordingPageObject(page);
  const lateGameState = createCustomGameState({
    currentInning: 7,
    isTopHalf: false,
    homeScore: 8,
    awayScore: 5,
  });
  await gamePageObject.injectGameState(lateGameState);
  await gamePageObject.goto();

  expect(await gamePageObject.getCurrentInning()).toBe(7);
});
```

**Benefits:**

- **Consistency:** Same data structures across tests
- **Type Safety:** TypeScript interfaces prevent errors
- **Reusability:** Build complex scenarios from simple fixtures
- **Maintainability:** Update fixture once, affects all tests

### Handling Timing Issues (Explicit Waits)

**Problem:** Race conditions between test actions and async operations.

**Solution:** Use explicit waits with conditions.

**Common Patterns:**

```typescript
// 1. Wait for element to be visible
await page.locator('[data-testid="game-recording-page"]').waitFor({
  state: 'visible',
  timeout: 5000,
});

// 2. Wait for element to be enabled
await page.locator('[data-testid="action-single"]').waitFor({
  state: 'attached',
});
await page.waitForFunction(selector => {
  const el = document.querySelector(selector);
  return el && !el.hasAttribute('disabled');
}, '[data-testid="action-single"]');

// 3. Wait for state transition (e.g., inning change)
await page.waitForFunction(
  expectedInning => {
    const state = JSON.parse(sessionStorage.getItem('game-state') || '{}');
    return state.state?.activeGameState?.currentInning === expectedInning;
  },
  7, // Expected inning
  { timeout: 10000, polling: 100 }
);

// 4. Wait for network idle (after navigation)
await page.goto('/game/test-game/record', { waitUntil: 'networkidle' });

// 5. Wait for storage event propagation
await page.evaluate(state => {
  sessionStorage.setItem('game-state', JSON.stringify(state));
  window.dispatchEvent(new Event('storage'));
}, gameState);
await page.waitForTimeout(100); // Small buffer for event propagation
```

**Best Practices:**

- Prefer `waitForFunction()` over `waitForTimeout()` (more reliable)
- Use realistic timeouts (5-10s) to catch real issues
- Log console messages for debugging timing issues
- Test on multiple browsers (WebKit has different timing than Chromium)

---

## Complete Example

### Walk Through: complete-seven-inning-game.spec.ts

This test validates a complete 7-inning game workflow, simulating realistic game
progression from setup to completion.

**File:** `apps/web/e2e/integration/complete-seven-inning-game.spec.ts`

#### Test Structure

```typescript
test.describe('Complete 7-Inning Game', () => {
  // 1. Test Isolation - Clean storage before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  // 2. Helper Function - Reusable game setup workflow
  async function setupAndStartGame(page: Page): Promise<void> {
    // Step 1: Teams Page
    const teamsPage = new GameSetupTeamsPage(page);
    await teamsPage.goto();
    await teamsPage.waitForLoad();
    await teamsPage.fillTeamNames('Warriors', 'Eagles', 'away');
    await teamsPage.clickContinue();

    // Step 2: Lineup Page
    const lineupPage = new GameSetupLineupPage(page);
    await lineupPage.waitForLoad();
    await lineupPage.setPlayerCount(10);
    await lineupPage.addMultiplePlayers([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
    ]);
    await lineupPage.waitForValidation();
    await lineupPage.clickContinue();

    // Step 3: Confirm and Start
    const confirmPage = new GameSetupConfirmPage(page);
    await confirmPage.waitForLoad();
    await confirmPage.clickStartGame();
    await confirmPage.waitForGameStart();

    // Verify navigation to recording page
    await expect(page).toHaveURL(/\/game\/.*\/record/);
  }

  // 3. Test Case - Complete game with scoring
  test('should complete a full 7-inning game with scoring', async ({
    page,
  }) => {
    // Setup: Use wizard to create game
    await setupAndStartGame(page);

    const gamePageObject = new GameRecordingPageObject(page);

    // Wait for IndexedDB to load game state
    await page.waitForTimeout(2000);

    // Verify initial state
    expect(await gamePageObject.getCurrentInning()).toBe(1);
    expect(await gamePageObject.isTopOfInning()).toBe(true);

    // Simulate all 7 innings with varied scoring
    const scoringPlan = [
      { top: 0, bottom: 1 }, // Inning 1
      { top: 2, bottom: 0 }, // Inning 2
      { top: 0, bottom: 2 }, // Inning 3
      { top: 1, bottom: 0 }, // Inning 4
      { top: 0, bottom: 1 }, // Inning 5
      { top: 1, bottom: 0 }, // Inning 6
      { top: 0, bottom: 3 }, // Inning 7
    ];

    for (let inning = 1; inning <= 7; inning++) {
      const plan = scoringPlan[inning - 1];

      // Top of inning (away team bats)
      await gamePageObject.simulateHalfInning({ runs: plan.top });

      // Verify transition to bottom of inning
      expect(await gamePageObject.isTopOfInning()).toBe(false);
      expect(await gamePageObject.getCurrentInning()).toBe(inning);

      // Bottom of inning (home team bats)
      await gamePageObject.simulateHalfInning({ runs: plan.bottom });

      // Verify inning progression (except after inning 7)
      if (inning < 7) {
        expect(await gamePageObject.getCurrentInning()).toBe(inning + 1);
        expect(await gamePageObject.isTopOfInning()).toBe(true);
      }
    }

    // Verify game completion
    expect(await gamePageObject.isGameComplete()).toBe(true);
  });
});
```

#### Explanation of Key Parts

**1. Test Isolation (beforeEach)**

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
});
```

- Clears storage before each test to prevent interference
- Ensures each test starts with fresh state
- Critical for PWA apps with persistent state

**2. Helper Function (setupAndStartGame)**

```typescript
async function setupAndStartGame(page: Page): Promise<void> {
  const teamsPage = new GameSetupTeamsPage(page);
  await teamsPage.goto();
  await teamsPage.fillTeamNames('Warriors', 'Eagles', 'away');
  // ... more setup steps
}
```

- Reusable game setup workflow (DRY principle)
- Uses Page Objects for maintainability
- Encapsulates complex multi-page wizard flow
- Used by multiple tests in the file

**3. Test Assertions**

```typescript
expect(await gamePageObject.getCurrentInning()).toBe(1);
expect(await gamePageObject.isTopOfInning()).toBe(true);
expect(await gamePageObject.isGameComplete()).toBe(true);
```

- Use Page Object methods for semantic assertions
- Verify state at key checkpoints (inning transitions, game completion)
- Read from sessionStorage for state verification

**4. Game Simulation**

```typescript
await gamePageObject.simulateHalfInning({ runs: plan.top });
```

- High-level method that records multiple at-bats
- Abstracts complex workflows (hits, outs, state transitions)
- Waits for async flows to complete before returning

### How to Use GameRecordingPageObject

**Basic Usage:**

```typescript
import { GameRecordingPageObject } from '../page-objects/GameRecordingPage';

test('should record single hit', async ({ page }) => {
  // 1. Create page object
  const gamePageObject = new GameRecordingPageObject(page);

  // 2. Set up game state
  await gamePageObject.injectGameState(mockActiveGame);
  await gamePageObject.goto();

  // 3. Perform action
  await gamePageObject.recordAtBat({ result: 'single' });

  // 4. Verify outcome
  const score = await gamePageObject.getScore('home');
  expect(score).toBeGreaterThanOrEqual(0);
});
```

**Advanced Usage:**

```typescript
test('should complete half-inning', async ({ page }) => {
  const gamePageObject = new GameRecordingPageObject(page);
  await gamePageObject.injectGameState(mockGameStart);
  await gamePageObject.goto();

  // Record 3 outs to end half-inning
  await gamePageObject.simulateHalfInning({ runs: 0 });

  // Verify inning transition
  expect(await gamePageObject.isTopOfInning()).toBe(false);
  expect(await gamePageObject.getOuts()).toBe(0);
});
```

**Custom Workflows:**

```typescript
test('should handle complex scoring scenario', async ({ page }) => {
  const gamePageObject = new GameRecordingPageObject(page);
  await gamePageObject.injectGameState(mockActiveGame);
  await gamePageObject.goto();

  // Score 3 runs with homeruns
  await gamePageObject.recordAtBat({ result: 'homerun' });
  await gamePageObject.recordAtBat({ result: 'homerun' });
  await gamePageObject.recordAtBat({ result: 'homerun' });

  // End half-inning
  await gamePageObject.recordAtBat({ result: 'groundout' });
  await gamePageObject.recordAtBat({ result: 'groundout' });
  await gamePageObject.recordAtBat({ result: 'groundout' });

  // Verify scoring and state transition
  const score = await gamePageObject.getScore('away');
  expect(score).toBeGreaterThanOrEqual(3);
  expect(await gamePageObject.isTopOfInning()).toBe(false);
});
```

---

## Running E2E Tests

### Commands

```bash
# Run all E2E tests (headless)
pnpm --filter @twsoftball/web test:e2e

# Run with UI (headed mode) - for debugging
pnpm --filter @twsoftball/web test:e2e:headed

# Run specific test file
pnpm --filter @twsoftball/web test:e2e complete-seven-inning-game

# Run in debug mode (step through tests)
pnpm --filter @twsoftball/web test:e2e:debug

# Run on specific browser
pnpm --filter @twsoftball/web test:e2e --project=chromium
pnpm --filter @twsoftball/web test:e2e --project=webkit
pnpm --filter @twsoftball/web test:e2e --project=firefox
```

### Debugging Tips with Headed Mode

**Run with UI visible:**

```bash
pnpm --filter @twsoftball/web test:e2e:headed
```

**Benefits:**

- Watch browser interactions in real-time
- See element highlighting during selector queries
- Pause execution to inspect state
- Identify timing issues visually
- Verify data-testid attributes exist

**Debugging Console Logs:**

```typescript
test('should debug game state', async ({ page }) => {
  // Capture browser console logs
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log('[Page error]:', error.message);
  });

  // Your test logic...
});
```

**Inspect State During Test:**

```typescript
test('should inspect state', async ({ page }) => {
  const gamePageObject = new GameRecordingPageObject(page);
  await gamePageObject.injectGameState(mockActiveGame);
  await gamePageObject.goto();

  // Pause execution and inspect in headed browser
  await page.pause();

  // Or evaluate JavaScript to check state
  const state = await page.evaluate(() => {
    return JSON.parse(sessionStorage.getItem('game-state') || '{}');
  });
  console.log('Current state:', state);
});
```

### WebKit Keyboard Navigation Note (Alt+Tab)

**Issue:** On macOS, WebKit requires special keyboard navigation settings.

**Problem:**

```typescript
// This may not work on WebKit/Safari without configuration
await page.keyboard.press('Tab');
```

**Workaround:**

```typescript
// Use Alt+Tab for WebKit on macOS
await page.keyboard.press('Alt+Tab');
```

**Why:** macOS "Full Keyboard Access" setting affects Tab key behavior in
WebKit.

**Alternative:** Use mouse clicks instead of keyboard navigation:

```typescript
// More reliable across browsers
await page.locator('[data-testid="next-button"]').click();
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Test Fails with "Element not found"

**Problem:**

```
Error: Locator: [data-testid="action-single"]
Expected: visible
Received: <element not found>
```

**Solutions:**

```typescript
// Verify element exists in DOM
await page.locator('[data-testid="game-recording-page"]').waitFor();

// Add explicit wait before interaction
await page.waitForTimeout(1000);

// Use headed mode to see what's rendered
// pnpm --filter @twsoftball/web test:e2e:headed
```

#### 2. Flaky Test Due to Timing

**Problem:** Test passes sometimes, fails other times.

**Solutions:**

```typescript
// ❌ Bad: No wait
await page.click('[data-testid="action-single"]');
const score = await page.locator('[data-testid="home-score"]').textContent();

// ✅ Good: Wait for state update
await page.click('[data-testid="action-single"]');
await page.waitForFunction(() => {
  const button = document.querySelector('[data-testid="action-single"]');
  return button && !button.hasAttribute('disabled');
});
const score = await page.locator('[data-testid="home-score"]').textContent();
```

#### 3. Storage Not Persisting

**Problem:** State doesn't persist after page reload.

**Solutions:**

```typescript
// Verify storage event was dispatched
await page.evaluate(state => {
  sessionStorage.setItem('game-state', JSON.stringify(state));
  window.dispatchEvent(new Event('storage')); // ← Critical
}, gameState);

// Wait for Zustand to rehydrate
await page.waitForTimeout(100);

// Reload page to test persistence
await page.reload({ waitUntil: 'networkidle' });

// Verify state survived reload
const state = await page.evaluate(() => {
  return JSON.parse(sessionStorage.getItem('game-state') || '{}');
});
expect(state.currentInning).toBe(5);
```

### Verifying data-testid Attributes

**In Code:**

```bash
# Search for data-testid usage
grep -r "data-testid" apps/web/src
```

**In Browser (headed mode):**

```typescript
// Open DevTools in headed browser and inspect element
await page.pause();

// Or query in test
const hasTestId = await page.locator('[data-testid="action-single"]').count();
console.log('Element found:', hasTestId > 0);
```

**In Page Object:**

```typescript
// Add logging to page object methods
async recordAtBat(data: AtBatData): Promise<void> {
  const selector = `[data-testid="action-${data.result.toLowerCase()}"]`;

  // Verify element exists
  const count = await this.page.locator(selector).count();
  if (count === 0) {
    throw new Error(`Element not found: ${selector}`);
  }

  await this.page.locator(selector).click();
}
```

### Checking sessionStorage in DevTools

**During Headed Test:**

1. Run test in headed mode:

   ```bash
   pnpm --filter @twsoftball/web test:e2e:headed
   ```

2. Add `await page.pause()` in your test

3. In browser DevTools:
   - Open "Application" tab (Chrome) or "Storage" tab (Firefox)
   - Navigate to "Session Storage" → `http://localhost:3000`
   - View `game-state` key contents
   - Verify structure matches expected format

**Programmatically:**

```typescript
test('should check sessionStorage', async ({ page }) => {
  const gamePageObject = new GameRecordingPageObject(page);
  await gamePageObject.injectGameState(mockActiveGame);
  await gamePageObject.goto();

  // Read sessionStorage
  const stateJson = await page.evaluate(() => {
    return sessionStorage.getItem('game-state');
  });

  console.log('sessionStorage contents:', stateJson);

  const state = JSON.parse(stateJson || '{}');
  expect(state.state?.currentGame?.homeTeamName).toBe('Home Team');
});
```

### Using Explicit Waits

**Pattern 1: Wait for Element State**

```typescript
// Wait for visible
await page.locator('[data-testid="game-recording-page"]').waitFor({
  state: 'visible',
  timeout: 5000,
});

// Wait for hidden
await page.locator('[data-testid="loading-spinner"]').waitFor({
  state: 'hidden',
});

// Wait for attached to DOM
await page.locator('[data-testid="action-single"]').waitFor({
  state: 'attached',
});
```

**Pattern 2: Wait for Condition**

```typescript
// Wait for button to be enabled
await page.waitForFunction(
  selector => {
    const el = document.querySelector(selector);
    return el && !el.hasAttribute('disabled');
  },
  '[data-testid="action-single"]',
  { timeout: 10000 }
);

// Wait for inning to advance
await page.waitForFunction(
  expectedInning => {
    const state = JSON.parse(sessionStorage.getItem('game-state') || '{}');
    return state.state?.activeGameState?.currentInning === expectedInning;
  },
  7,
  { timeout: 10000, polling: 100 }
);
```

**Pattern 3: Wait for Network**

```typescript
// Wait for navigation to complete
await page.goto('/game/test-game/record', {
  waitUntil: 'networkidle',
});

// Wait for specific network request
await page.waitForResponse(
  response => response.url().includes('/api/games') && response.status() === 200
);
```

---

## Summary

This guide establishes best practices for E2E testing in the TW Softball PWA:

1. **Architecture:** Zustand + sessionStorage + storage events for offline-first
   testing
2. **Page Objects:** Centralized selectors and semantic methods for
   maintainability
3. **Fixtures:** Reusable test data for consistent scenarios
4. **Isolation:** Clean storage before each test to prevent interference
5. **Waits:** Explicit waits for async operations to prevent flaky tests
6. **Debugging:** Headed mode, console logs, and DevTools for troubleshooting

**Key Takeaways:**

- Always clean `sessionStorage`/`localStorage` in `beforeEach`
- Use Page Object Model for maintainable test code
- Add `data-testid` attributes in kebab-case to all testable elements
- Wait for async flows to complete before assertions
- Use fixtures for reusable test data
- Run headed mode to debug timing issues

**Related Documentation:**

- `/docs/performance-baseline.md` - Performance testing guide
- `/docs/architecture-patterns.md` - DI Container and architecture
- `/CLAUDE.md` - Testing strategy and coverage requirements
- `apps/web/e2e/page-objects/` - Page object implementations
- `apps/web/e2e/fixtures/` - Test data fixtures

---

**Maintained by:** TW Softball Development Team **Questions?** Review test files
in `apps/web/e2e/` for real-world examples.
