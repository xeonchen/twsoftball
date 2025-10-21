# Game Flow - Softball Game Recording

> **Purpose**: This document specifies the complete game lifecycle and automatic
> batter selection behavior in the TW Softball application. It defines how the
> system manages game state transitions and batting order progression.

## Table of Contents

- [Game Lifecycle Overview](#game-lifecycle-overview)
- [Automatic Batter Selection](#automatic-batter-selection)
- [State Transitions](#state-transitions)
- [Runner Advancement Rules](#runner-advancement-rules)
- [Substitution Flow](#substitution-flow)
- [Half-Inning Transitions](#half-inning-transitions)
- [Edge Cases and Validations](#edge-cases-and-validations)
- [Implementation References](#implementation-references)

## Game Lifecycle Overview

A softball game progresses through distinct phases, each with specific state
requirements and automatic behaviors:

```
┌─────────────────────────────────────────────────────────────────┐
│                      GAME LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ Game Setup   │  User configures teams, lineups, rules
│ (Wizard)     │  ✓ Team names and sides (HOME/AWAY)
└──────┬───────┘  ✓ Batting order (slots 1-N with players)
       │          ✓ Field positions for each player
       │          ✓ Game rules (innings, mercy rule, etc.)
       ▼
┌──────────────┐
│ Game Start   │  System initializes game state
│ (StartNewGame│  ✓ Creates Game, TeamLineup, InningState aggregates
│  Use Case)   │  ✓ Sets currentBatterSlot = 1
└──────┬───────┘  ✓ Sets currentBatter = away team slot #1 player
       │          ✓ Sets isTopHalf = true (away bats first)
       │          🎯 ACTION BUTTONS ENABLED (ready to record)
       ▼
┌──────────────┐
│ Game         │  User records at-bats sequentially
│ Recording    │  ✓ Record at-bat for current batter
│              │  ✓ System advances to next batter automatically
└──────┬───────┘  ✓ System manages outs, runs, bases
       │          ✓ System triggers half-inning transitions
       │          ✓ User can substitute players as needed
       ▼
┌──────────────┐
│ Game         │  System or user determines completion
│ Completion   │  ✓ Regulation innings completed + not tied
└──────────────┘  ✓ Mercy rule triggered (automatic)
                  ✓ Extra innings: max reached + tie allowed (ends in tie)
                  ✓ Extra innings: one team ahead (winner determined)
                  ✓ Manual termination (rain out, forfeit, time limit, etc.)
```

## Automatic Batter Selection

**Core Principle**: The batting order is deterministic and managed entirely by
the system. Once lineups are submitted, the system automatically knows who bats
next at every point in the game.

### Rule: First Batter Selection on Game Start

**When**: After `StartNewGame` use case completes **Behavior**: System
automatically selects the first batter **Who**: Away team, batting slot #1 **UI
State**: Action buttons (SINGLE, OUT, HOMERUN, etc.) immediately enabled **No
User Action Required**: Game is ready to record first at-bat immediately

```typescript
// Implementation: StartNewGame.execute() method
// Determine current batter (first in away team for top of 1st)
const firstBattingSlot = awayLineupDTO.battingSlots.find(
  slot => slot.slotNumber === 1
);
const currentBatter = firstBattingSlot?.currentPlayer || null;
```

**Business Rationale**: In softball, the away team always bats first (top of the
1st inning), and the leadoff hitter (slot #1) is the first batter. This is not a
user choice—it's a rule of the game.

### Rule: Automatic Batter Advancement After Each At-Bat

**When**: After any at-bat is recorded (regardless of outcome) **Behavior**:
System automatically advances to next batting slot **Sequence**: 1 → 2 → 3 → 4 →
... → N → 1 (wraps around) **No User Action Required**: Next batter is
automatically selected

```typescript
// Implementation: InningState.advanceBattingOrder() method
private advanceBattingOrder(currentSlot: number): InningState {
  const maxSlot = InningState.determineMaxBattingSlot(currentSlot);

  let nextSlot: number;
  if (currentSlot >= maxSlot) {
    nextSlot = 1; // Cycle back to 1
  } else {
    nextSlot = currentSlot + 1;
  }
  // Returns new InningState with updated batting slot
  // Emits CurrentBatterChanged event
}
```

**Business Rationale**: Batting order is legally binding in softball once
submitted to the umpire. Teams must follow the order sequentially. The only
exception is player substitution, which replaces a player in their slot but
maintains the slot sequence.

### Rule: Batting Order Continuation Across Innings

**When**: Half-inning ends (3 outs) **Behavior**: Batting slot position is
maintained for each team (NOT reset to 1). Each team continues from where they
left off when their next turn to bat comes around. **Example**:

- Top of 1st: Away team bats slots 1, 2, 3, 4 (slot #4 makes 3rd out)
- Bottom of 1st: Home team bats from slot #1 (their first time batting)
- Top of 2nd: Away team **resumes from slot #5** (continues where they left off)
- Bottom of 2nd: Home team continues from where they left off in the bottom of
  1st

```typescript
// Implementation: InningState.endHalfInning() method
endHalfInning(): InningState {
  // IMPORTANT: Batting slot is NOT reset - teams maintain their position
  // See JSDoc at line 671-681 in InningState.ts for details
  const finalState = new InningState(
    this.id,
    this.gameId,
    newInning,
    newIsTopHalf,
    0, // Reset outs
    currentBatterSlot, // Maintained - NOT reset to 1
    BasesState.empty(), // Clear bases
    ...
  );
}
```

**Business Rationale**: This is standard softball behavior where teams maintain
their batting position throughout the game. This ensures continuous batting
order progression - once you've batted through your entire lineup, you start
over at slot #1, regardless of which inning it is.

### Rule: No Manual Batter Selection Required

**Exception**: Only during substitutions **Normal Flow**: System always knows
next batter from batting order **UI Behavior**:

- ✅ "Now batting" display shows current batter automatically
- ✅ Action buttons always enabled (when game is in progress)
- ❌ No "select next batter" button needed
- ❌ No manual clicking required to advance batting order

## State Transitions

### Detailed State Flow: From Game Start to First At-Bat

```
┌─────────────────────────────────────────────────────────────────┐
│  STATE TRANSITION: Game Initialization → Ready to Record        │
└─────────────────────────────────────────────────────────────────┘

1. User completes game setup wizard
   ├─ Teams configured (HOME: "Red Sox", AWAY: "Yankees")
   ├─ Lineups submitted (each team has 10-12 players in slots 1-N)
   └─ Rules configured (7 innings, mercy rule, etc.)

2. User clicks "Start Game" button
   └─ Triggers: StartNewGame use case

3. StartNewGame use case execution
   ├─ Creates Game aggregate (score: 0-0, status: IN_PROGRESS)
   ├─ Creates TeamLineup aggregates (HOME and AWAY)
   ├─ Creates InningState aggregate
   │  ├─ inning = 1
   │  ├─ isTopHalf = true (away team bats first)
   │  ├─ outs = 0
   │  ├─ bases = empty
   │  ├─ currentBatterSlot = 1 ✅ AUTOMATIC SELECTION
   │  └─ currentBatter = awayTeam.battingSlots[1].currentPlayer ✅
   └─ Persists initial state to event store

4. System navigates to Game Recording Page
   └─ Page loads with:
      ├─ Current batter display: "Now batting: John Smith (#12)" ✅
      ├─ Action buttons: ENABLED ✅
      ├─ Scoreboard: 0-0, Top 1st, 0 outs
      └─ User can immediately click SINGLE/OUT/HOMERUN/etc.

🎯 KEY POINT: No manual selection needed. Game is ready to record first at-bat.
```

### State Flow: After Each At-Bat

```
┌─────────────────────────────────────────────────────────────────┐
│  STATE TRANSITION: At-Bat Recorded → Next Batter Ready          │
└─────────────────────────────────────────────────────────────────┘

1. User clicks at-bat result button (e.g., "SINGLE")
   └─ Triggers: RecordAtBat use case

2. RecordAtBat use case execution
   ├─ Records at-bat for current batter
   ├─ Updates bases, outs, score as needed
   ├─ Emits AtBatCompleted event
   ├─ Calls InningState.advanceBattingOrder() ✅ AUTOMATIC
   └─ Emits CurrentBatterChanged event

3. InningState.advanceBattingOrder() execution
   ├─ Increments currentBatterSlot: N → N+1 (or N → 1 if wraparound)
   ├─ Looks up player in batting slot from TeamLineup
   └─ Sets currentBatter to new player ✅ AUTOMATIC SELECTION

4. UI updates automatically (event-driven)
   ├─ "Now batting" display updates to new player
   ├─ Action buttons remain enabled
   ├─ Scoreboard updates (score, outs, bases)
   └─ User can immediately record next at-bat

🎯 KEY POINT: Batter advancement is fully automatic. User just clicks results.
```

### State Flow: Half-Inning Transition

```
┌─────────────────────────────────────────────────────────────────┐
│  STATE TRANSITION: 3rd Out → Teams Switch → Next Batter Ready   │
└─────────────────────────────────────────────────────────────────┘

1. User records 3rd out of the inning
   └─ Triggers: RecordAtBat use case (result: OUT/GROUND_OUT/FLY_OUT/etc.)

2. System detects 3 outs reached
   ├─ Calls InningState.endHalfInning()
   ├─ Emits HalfInningEnded event
   └─ Calls InningState.startNewHalfInning()

3. InningState.endHalfInning() execution
   ├─ Creates new state with tactical reset values
   ├─ Maintains currentBatterSlot position ✅
   ├─ Resets outs to 0
   ├─ Clears bases
   └─ Team continues from their current batting position next time they bat

🔍 **Technical Note: Dual-Slot Batting Position Architecture**

The system maintains batting position across innings using a dual-slot design:
- **Dual-Slot Storage**: InningState tracks `awayTeamBatterSlot` and
  `homeTeamBatterSlot` internally
- **Computed Accessor**: `currentBatterSlot` is a getter that returns the
  appropriate slot based on `isTopHalf`
- **No Cross-Aggregate Queries**: Both teams' batting positions are preserved
  within InningState
- **Team Independence**: Each team maintains their own batting position
  independently throughout the game

When teams switch at half-inning transitions:
1. System ends the current half-inning (3 outs reached)
2. System resets outs to 0, clears bases
3. System preserves both awayTeamBatterSlot and homeTeamBatterSlot (NOT reset)
4. System switches teams (isTopHalf toggles)
5. System continues batting order from the appropriate preserved slot

Example:
- Top 1st: Away bats slots 1, 2, 3, 4 → Slot #4 makes 3rd out
- Bottom 1st: Home bats from slot #1 (their first time batting)
- Top 2nd: Away bats from slot #5 (continues from where they left off, NOT reset
  to #1)

4. InningState.endHalfInning() execution
   ├─ Emits HalfInningEnded event with both team slots preserved
   ├─ Toggles isTopHalf (TOP → BOTTOM or BOTTOM → TOP)
   ├─ Resets outs to 0
   ├─ Clears bases
   ├─ Preserves both awayTeamBatterSlot and homeTeamBatterSlot ✅
   │  └─ Each team continues from where they left off
   └─ currentBatterSlot getter returns the appropriate team's slot ✅ AUTOMATIC

5. UI updates to show new half-inning
   ├─ Scoreboard: "Bottom 1st" or "Top 2nd"
   ├─ "Now batting" display: New team's batter at continued position
   ├─ Action buttons: ENABLED
   └─ User can immediately record next at-bat

Example:
- Top 1st: Away team bats slots 1, 2, 3, 4 (slot #4 makes 3rd out)
- Bottom 1st: Home team bats from slot #1 (their first time batting)
- Top 2nd: Away team bats from slot #5 (continues from where they left off)
- Bottom 2nd: Home team continues from where they left off in bottom 1st

🎯 KEY POINT: Batting position continues across innings. Each team maintains their
batting order progression throughout the entire game.
```

## Runner Advancement Rules

When an at-bat is recorded, the system automatically determines default runner
advancement positions and presents them in the **Runner Adjustment Modal** for
the scorer's review and adjustment. This section documents the default
advancement strategy and how the UI modal behaves.

### Overview

**Core Design Principle**: The system provides **intelligent defaults** that the
scorer can override to match the actual play on the field.

**Default Strategy**:

- **Hit Types**: "Runners advance the same number of bases as the batter"
- **WALK**: Force chain only (consecutive occupied bases force advancement)
- **Hit + Error**: Batter AND runners can be adjusted beyond defaults
- **Special Cases**: Sacrifice fly, outs, fielder's choice have specific rules

**UI Integration**:

- **Runner Adjustment Modal** (see Screen 6 in
  `docs/design/ui-ux/wireframes.md`)
- **Settings Toggle**: "Auto-advance runners / Smart defaults" (see Screen 9 in
  `docs/design/ui-ux/wireframes.md`)
  - OFF (default): Modal shows with basic defaults (standard softball
    advancement rules)
  - ON: Modal shows with "smart defaults" (intelligent analysis of game
    situation)
  - **Important**: The modal ALWAYS appears for scorer confirmation regardless
    of toggle state. The toggle only controls which default runner positions are
    pre-selected in the modal.

**What's Adjustable**:

- **Batter position**: Can advance beyond default due to errors
- **Each runner position**: Can advance extra bases, stay, or be thrown out

### Default Advancement Rules by Result Type

#### Hit Types - "Same Bases as Batter" Principle

The fundamental rule for hits: **runners advance the same number of bases as the
batter reaches**.

**SINGLE** (batter → 1st base, +1 base movement):

- All runners advance 1 base automatically
- Runner on 1st → 2nd
- Runner on 2nd → 3rd
- Runner on 3rd → HOME (scores)
- **Example**: With bases loaded, SINGLE results in 1 run scoring and bases
  remain loaded

**DOUBLE** (batter → 2nd base, +2 bases movement):

- All runners advance 2 bases automatically
- Runner on 1st → 3rd
- Runner on 2nd → HOME (scores)
- Runner on 3rd → HOME (scores)
- **Example**: With runner on 1st, DOUBLE results in runners on 2nd and 3rd

**TRIPLE** (batter → 3rd base, +3 bases movement):

- All runners advance 3 bases (all score)
- Runner on 1st → HOME (scores)
- Runner on 2nd → HOME (scores)
- Runner on 3rd → HOME (scores)
- **Example**: With bases loaded, TRIPLE results in 3 runs scoring plus batter
  on 3rd

**HOME RUN** (batter → HOME, +4 bases movement):

- Everyone scores
- All runners → HOME
- Batter → HOME
- **Example**: With bases loaded, HOME RUN results in 4 runs (grand slam)

#### Non-Hit Types

**WALK** (batter → 1st base):

⚠️ **Important**: WALK does NOT follow the "same bases as batter" rule. It uses
**force chain logic** instead.

**Force Chain Rule**: A runner advances ONLY if forced by consecutive occupied
bases behind them.

- **Force chain propagates** through consecutive occupied bases
- **Chain breaks** at the first empty base
- Runners advance the **minimum required** (1 base when forced)

**WALK Examples**:

- Runner on 1st only → R1 to 2nd (forced by batter taking 1st)
- Runner on 2nd only → R2 STAYS (not forced - 1st empty breaks chain)
- Runners on 1st + 2nd → R1 to 2nd, R2 to 3rd (both forced - chain continues)
- Runners on 1st + 3rd → R1 to 2nd, R3 STAYS (chain breaks at empty 2nd)
- Bases loaded → R1 to 2nd, R2 to 3rd, R3 to HOME (all forced - complete chain =
  walk-in run)

**ERROR** (batter reaches 1st base safely):

- Treated same as **SINGLE** for default advancement
- Batter → 1st, all runners advance 1 base
- **Note**: Scorer can adjust positions if errors allow extra advancement

**SACRIFICE FLY** (batter is OUT):

- Runner on 3rd → HOME (scores)
- All other runners STAY (batter is out, no force situation)
- **Business Rule**: Sacrifice fly only credits run from 3rd base

**OUT types** (STRIKEOUT, GROUND_OUT, FLY_OUT, FOUL_OUT, etc.):

- All runners STAY at their current bases by default
- **Exception**: SACRIFICE_FLY (covered above)
- **Note**: Scorer can adjust if runner advances on out (e.g., tag-up)

**FIELDER'S CHOICE**:

- **No automatic defaults** - too situational
- Recorder manually adjusts all runner positions
- **Reason**: Outcome depends entirely on which runner was put out and fielding
  decisions

### Hit + Error Combinations

In softball, a **defensive error** can allow the batter or runners to advance
beyond the normal result of a hit.

**Common Scenarios**:

- **SINGLE + Error**: Batter reaches 2nd, 3rd, or HOME
- **DOUBLE + Error**: Batter reaches 3rd or HOME
- **TRIPLE + Error**: Batter scores (becomes inside-the-park home run)

**Default Behavior**:

- System shows defaults based on the **base hit type** (SINGLE, DOUBLE, etc.)
- Example: "SINGLE" defaults show batter → 1st, runners +1

**Recorder Adjustment in Modal**:

- **Batter dropdown**: Adjust from default (1st) → 2nd/3rd/HOME due to error
- **Runner dropdowns**: May also advance extra bases due to error
- **Independent control**: Each position (batter + all runners) adjustable
  separately

**Real-World Example 1 - Single with Throwing Error**:

```
Situation: Runner on 1st
Result: SINGLE
Default: Batter → 1st, R1 → 2nd

Error: Right fielder bobbles ball, both runners take extra base
Adjustment:
  - Batter → 2nd (advanced on error)
  - R1 → 3rd (advanced on error)

Final: Runners on 2nd and 3rd
```

**Real-World Example 2 - Double with Wild Throw**:

```
Situation: Runner on 2nd
Result: DOUBLE
Default: Batter → 2nd, R2 → HOME

Error: Throw to cutoff man goes wild into dugout
Adjustment:
  - Batter → 3rd (extra base on error)
  - R2 → HOME (already scored, no change)

Final: 1 run scores, runner on 3rd
```

**Real-World Example 3 - Single with Multiple Errors**:

```
Situation: Bases empty
Result: SINGLE
Default: Batter → 1st

Error: Multiple defensive errors on the play
Adjustment:
  - Batter → HOME (scored from 1st on errors)

Final: 1 run scores, bases empty
```

### Detailed Examples (Standard Plays)

**Example 1: SINGLE with bases loaded**

```
Before: Runners on 1st, 2nd, 3rd
At-Bat Result: SINGLE

Default Modal Display:
  - Batter (#12): Goes to 1st Base ✓
  - Runner on 1st (#8): Advances to 2nd ✓
  - Runner on 2nd (#5): Advances to 3rd ✓
  - Runner on 3rd (#23): Scores ✓

Result: 1 run scores, bases remain loaded (1st, 2nd, 3rd occupied)
```

**Example 2: DOUBLE with runner on 1st**

```
Before: Runner on 1st only
At-Bat Result: DOUBLE

Default Modal Display:
  - Batter (#12): Goes to 2nd Base ✓
  - Runner on 1st (#8): Advances to 3rd (+2 bases) ✓

Result: 0 runs score, runners on 2nd and 3rd
```

**Example 3: WALK with runner on 2nd only**

```
Before: Runner on 2nd, 1st empty
At-Bat Result: WALK

Default Modal Display:
  - Batter (#12): Goes to 1st Base ✓
  - Runner on 2nd (#8): Stays at 2nd ✓ (NOT forced - chain broken at 1st)

Result: 0 runs score, runners on 1st and 2nd
```

**Example 4: WALK with bases loaded**

```
Before: Runners on 1st, 2nd, 3rd
At-Bat Result: WALK

Default Modal Display:
  - Batter (#12): Goes to 1st Base ✓
  - Runner on 1st (#8): Advances to 2nd ✓ (forced)
  - Runner on 2nd (#5): Advances to 3rd ✓ (forced)
  - Runner on 3rd (#23): Scores ✓ (forced - walk-in run)

Result: 1 run scores (walk-in), bases remain loaded
```

**Example 5: ERROR with runner on 2nd**

```
Before: Runner on 2nd only
At-Bat Result: ERROR (batter reaches safely)

Default Modal Display:
  - Batter (#12): Goes to 1st Base ✓
  - Runner on 2nd (#8): Advances to 3rd (+1 base, same as SINGLE) ✓

Result: 0 runs score, runners on 1st and 3rd
```

**Example 6: TRIPLE with runner on 1st**

```
Before: Runner on 1st only
At-Bat Result: TRIPLE

Default Modal Display:
  - Batter (#12): Goes to 3rd Base ✓
  - Runner on 1st (#8): Scores ✓ (+3 bases = HOME)

Result: 1 run scores, runner on 3rd
```

### Runner Adjustment Modal UI

**When Modal Opens** (see Screen 6: Runner Adjustment Modal in
`docs/design/ui-ux/wireframes.md`):

- Displays the at-bat result context (e.g., "After: SINGLE by #12 Sarah
  Johnson")
- Shows default positions for **batter AND all base runners**
- Each position has a dropdown selector with all valid options
- Defaults are pre-selected based on the result type rules above

**Dropdown Options**:

**For Batter** (currently at plate):

- ○ Goes to 1st Base (default for SINGLE, WALK, ERROR)
- ○ Goes to 2nd Base (default for DOUBLE)
- ○ Goes to 3rd Base (default for TRIPLE)
- ○ Scores / Goes to HOME (default for HOME RUN)
- ○ Out (for out results, or thrown out advancing)

**For Runners** (currently on base):

- ○ Stays at [current base]
- ● Advances to [next base] (default when forced or following batter
  advancement)
- ○ Advances to [next+1 base] (for aggressive advancement)
- ○ Advances to [next+2 base] / Scores
- ○ Out at [attempted base]

**Default Pre-Selected Examples**:

- **SINGLE**: Batter → "Goes to 1st Base", all runners → "Advances 1 base" (2nd,
  3rd, or HOME)
- **DOUBLE**: Batter → "Goes to 2nd Base", all runners → "Advances 2 bases" (3rd
  or HOME)
- **WALK**: Batter → "Goes to 1st Base", forced runners → "Advances to
  2nd/3rd/HOME", non-forced → "Stays"
- **SACRIFICE FLY**: Runner on 3rd → "Scores", other runners → "Stays"

**Recorder Can Override Any Default**:

- **Batter advances extra bases** (e.g., 1st → 2nd on throwing error)
- **Runner thrown out** attempting to advance (select "Out at 2nd")
- **Runner takes extra base** on hit (aggressive baserunning)
- **Runner held at base** (cautious baserunning or coach's decision)

**Preview Section**: Shows the outcome summary before confirmation:

```
Preview Result:
• Batter safe at 1st
• Runner advances to 2nd
• No runs scored
• 0 RBI awarded
```

**Action Buttons**:

- **CANCEL**: Discards changes, returns to game recording
- **CONFIRM**: Applies the selected positions, updates game state

**Settings Toggle Integration** (see Screen 9: Settings in
`docs/design/ui-ux/wireframes.md`):

```
┌─────────────────────┐
│ Auto-advance runners│
│ Smart defaults      │
│              ●━━━○  │  ← Toggle ON/OFF
└─────────────────────┘
```

- **Toggle OFF** (default): Modal shows with basic defaults (standard softball
  advancement rules)
- **Toggle ON**: Modal shows with "smart defaults" (intelligent game situation
  analysis)
  - Smart defaults consider: game situation, score, inning, outs, runner speed
  - Basic defaults follow: standard softball advancement rules only
  - **Important**: Modal ALWAYS appears for scorer confirmation regardless of
    toggle state. The toggle only controls which set of default positions are
    pre-selected in the modal

### Force Chain Definition (for WALK)

The **force chain** is a critical concept for understanding runner advancement
on walks and force plays.

**Definition**: A runner is FORCED to advance when:

1. The batter or another runner must occupy their current base
2. This creates a chain reaction through consecutive occupied bases
3. The chain BREAKS at the first empty base

**Chain Propagation Logic**:

```
Batter reaches 1st
  ↓
Runner on 1st FORCED to 2nd (batter needs 1st)
  ↓
Runner on 2nd FORCED to 3rd (R1 needs 2nd)
  ↓
Runner on 3rd FORCED to HOME (R2 needs 3rd)
  ↓
Run scores (forced walk-in)
```

**Chain Breaking Example**:

```
Batter reaches 1st
  ↓
Runner on 1st FORCED to 2nd (batter needs 1st)
  ↓
[EMPTY 2nd base]
  ↓
Runner on 3rd NOT FORCED (R1 can go to 2nd, no conflict)
  ↓
R3 stays at 3rd
```

**WALK Force Chain Examples**:

**Example A: R1 only**

```
Before: Runner on 1st
Force Chain: Batter → 1st, R1 FORCED → 2nd
Reason: R1 must vacate 1st for batter
Result: Runners on 1st and 2nd
```

**Example B: R2 only**

```
Before: Runner on 2nd
Force Chain: Batter → 1st, R2 NOT FORCED (stays)
Reason: 1st is empty, R2 has no conflict
Result: Runners on 1st and 2nd
```

**Example C: R1 + R2**

```
Before: Runners on 1st and 2nd
Force Chain:
  - Batter → 1st
  - R1 FORCED → 2nd (batter needs 1st)
  - R2 FORCED → 3rd (R1 needs 2nd)
Result: Bases loaded (1st, 2nd, 3rd)
```

**Example D: R1 + R3 (gap at 2nd)**

```
Before: Runners on 1st and 3rd
Force Chain:
  - Batter → 1st
  - R1 FORCED → 2nd (batter needs 1st)
  - [EMPTY 2nd - CHAIN BREAKS]
  - R3 NOT FORCED (stays at 3rd)
Result: Bases loaded (1st, 2nd, 3rd)
```

**Example E: Bases loaded**

```
Before: Runners on 1st, 2nd, 3rd
Force Chain (complete):
  - Batter → 1st
  - R1 FORCED → 2nd
  - R2 FORCED → 3rd
  - R3 FORCED → HOME (scores - walk-in run)
Result: 1 run scores, bases remain loaded
```

**Key Takeaway**: Force chain ONLY applies when bases are CONSECUTIVE. Any gap
breaks the chain.

### Edge Cases and Special Situations

**Edge Case 1: Runner Can't Advance Past HOME**

- If default advancement would put runner beyond HOME, runner scores
- Example: TRIPLE with R2 → R2 + 3 bases = beyond HOME → R2 scores at HOME
- System automatically caps advancement at HOME (run scored)

**Edge Case 2: Multiple Runners Can't Occupy Same Base**

- Invalid in normal gameplay - system prevents this through validation
- UI modal validates that final positions don't create conflicts
- Example: Two runners can't both end at 2nd base

**Edge Case 3: Batter-Runner Thrown Out**

- If batter doesn't reach base safely (e.g., thrown out at 1st on grounder)
- Modal shows all runners at **original positions** by default
- Runners may still advance on the play (scorer adjusts manually)
- Special case: Batter out, but runners successfully advance (e.g., sacrifice
  situations)

**Edge Case 4: Hit + Error Validation**

- Batter can only advance **forward** (can't go from 2nd back to 1st)
- Runners can only advance forward or stay at current base
- System validates final positions are logically valid
- Example validation: Batter can't reach 3rd on a SINGLE + Error if runner on
  2nd only went to 3rd (passing not allowed)

**Edge Case 5: Tag-Up Rules (Out of Scope)**

- **Current implementation**: Scorer manually adjusts runner positions
- **Future consideration**: Automatic tag-up detection for fly balls
- Example: Runner on 3rd tags up on fly out, advances to HOME (scorer selects
  "Scores")

**Edge Case 6: Bases Loaded WALK Scoring**

- Force chain causes runner on 3rd to score (walk-in run)
- This is NOT a Hit-driven RBI, it's a Walk-driven RBI
- System correctly attributes 1 RBI to the batter for the walk
- Bases remain loaded after the walk

**Edge Case 7: Double Play Scenarios**

- **Not part of runner advancement** - this is a separate at-bat result type
- When DOUBLE_PLAY is selected, modal shows which runners were out
- Typically: Batter out + one runner out (e.g., runner on 1st)
- Result: 2 outs recorded, remaining runners stay

**Edge Case 8: Runner Advancing on Passed Ball / Wild Pitch**

- **Out of scope** for at-bat recording
- These are separate events that occur between at-bats
- Future consideration: Separate "Runner Advancement" recording for non-at-bat
  events

### Implementation References

**UI Components**:

- **Runner Adjustment Modal** (Screen 6 in `docs/design/ui-ux/wireframes.md`)
  - Shows batter and runner dropdowns
  - Pre-selects defaults based on result type
  - Allows full customization of final positions
- **Settings Toggle** (Screen 9 in `docs/design/ui-ux/wireframes.md`)
  - "Auto-advance runners / Smart defaults" setting
  - Controls whether modal is shown or defaults auto-applied

**Domain Concepts**:

- **BasesState**: `packages/domain/src/value-objects/BasesState.ts`
  - Immutable value object representing current base occupancy
  - Methods: `getRunner()`, `getOccupiedBases()`, `withRunnerAdvanced()`
- **RunnerAdvanceDTO**: `packages/application/src/dtos/RunnerAdvanceDTO.ts`
  - Data transfer object for runner movement
  - Fields: `playerId`, `fromBase`, `toBase`, `advanceReason`
- **RecordAtBat Use Case**: `packages/application/src/use-cases/RecordAtBat.ts`
  - Accepts `runnerAdvances: RunnerAdvanceDTO[]` from UI modal
  - Validates and applies runner movements to game state

**Modal Wireframe Note**: The wireframe (Screen 6) shows the batter dropdown:

```
│ Batter (#12):           │
│ ┌─────────────────────┐ │
│ │ ▼ Goes to 1st Base  │ │
│ └─────────────────────┘ │
```

This confirms the **batter position is adjustable** in the modal (dropdown
selector), enabling Hit + Error scenarios where the batter advances beyond the
default base.

**Related Documentation**:

- **Game Flow**: This document - complete game lifecycle and state transitions
- **Domain Model**: `docs/design/domain-model.md` - BasesState value object
  design
- **Use Cases**: `docs/requirements/use-cases.md` - UC-002 (Record At-Bat)
  specification
- **UI/UX Wireframes**: `docs/design/ui-ux/wireframes.md` - Complete screen
  designs

## Substitution Flow

Substitution is the **only** point where manual user interaction affects batter
selection, and even then, it integrates seamlessly with automatic advancement.

### User-Initiated Substitution

**When**: User clicks "Substitute Player" button during game **What Gets
Substituted**: The player in the **current batter's slot** **Effect**: Replaces
the player, maintains the slot in the batting order **After Substitution**:
Automatic batter advancement resumes normally

```
┌─────────────────────────────────────────────────────────────────┐
│  SUBSTITUTION FLOW: Replace Current Batter                      │
└─────────────────────────────────────────────────────────────────┘

1. Current game state
   ├─ Now batting: John Smith, Slot #5
   ├─ User needs to substitute John Smith (injury/strategy)
   └─ Action buttons: DISABLED during substitution

2. User initiates substitution
   ├─ Clicks "Substitute Player" button
   ├─ Selects outgoing player: John Smith (automatically pre-selected)
   ├─ Selects incoming player: Mike Johnson (from bench)
   └─ Confirms substitution

3. System executes SubstitutePlayer use case
   ├─ Validates eligibility (re-entry rules, etc.)
   ├─ Updates TeamLineup: Slot #5 now has Mike Johnson
   ├─ Emits PlayerSubstitutedIntoGame event
   ├─ currentBatterSlot remains 5 ✅
   └─ currentBatter = Mike Johnson ✅

4. UI returns to game recording mode
   ├─ "Now batting" display: Mike Johnson (#22), Slot #5
   ├─ Action buttons: RE-ENABLED ✅
   └─ User records at-bat for Mike Johnson

5. After at-bat is recorded
   ├─ System advances to slot #6 automatically ✅
   └─ Normal automatic flow resumes

🎯 KEY POINT: Substitution replaces player in slot, then automatic advancement
continues as normal.
```

### Substitution Before At-Bat vs During At-Bat

**Before At-Bat** (Most common):

- User substitutes before player steps up to bat
- New player becomes current batter
- User records at-bat for new player

**During At-Bat** (Injury scenario):

- Player injured after some pitches but before at-bat completes
- New player inherits the current count/situation
- At-bat is credited to the new player

Both cases integrate with automatic batter advancement after the at-bat
completes.

## Half-Inning Transitions

### Away Team Bats First (Top of Innings)

Softball rule: The **away team** (visiting team) always bats first in every
inning. This is the "top" of the inning.

```
Top of 1st: Away team, starting from slot #1 (first batter in lineup)
Top of 2nd: Away team, continuing from where they left off (e.g., slot #4)
Top of 3rd: Away team, continuing from where they left off (e.g., slot #7)
...
```

### Home Team Bats Second (Bottom of Innings)

The **home team** always bats second in every inning. This is the "bottom" of
the inning.

```
Bottom of 1st: Home team, starting from slot #1 (first batter in lineup)
Bottom of 2nd: Home team, continuing from where they left off (e.g., slot #5)
Bottom of 3rd: Home team, continuing from where they left off (e.g., slot #8)
...
```

### Half-Inning State Reset

When half-inning ends:

- ✅ Outs reset to 0
- ✅ Bases cleared
- ✅ Teams switch (batting ↔ fielding)
- ✅ Batting team changes (away ↔ home)
- ✅ Batting slot position MAINTAINED for each team (NOT reset)
- ✅ New batting team continues from their previous batting position

## Game Completion Scenarios

A softball game can end through several different mechanisms, each with specific
business rules defined in the `SoftballRules` value object.

### Scenario 1: Natural Completion (Winner After Regulation)

**Trigger**: Regulation innings completed + one team ahead **Implementation**:
`SoftballRules.isGameComplete()`

```typescript
// After regulation innings, game is complete if not tied
if (currentInning >= this.totalInnings && homeScore !== awayScore) {
  return true;
}
```

**Example**:

- 7 innings completed (regulation)
- Score: Home 8, Away 5
- **Result**: Game complete, Home team wins

### Scenario 2: Mercy Rule (Automatic Termination)

**Trigger**: Score differential exceeds mercy rule threshold at specified inning
**Implementation**: `SoftballRules.isMercyRule()`

```typescript
// Check mercy rule first (can end game at any point)
if (this.isMercyRule(homeScore, awayScore, currentInning)) {
  return true;
}
```

**Examples with Two-Tier Mercy Rule** (10 runs after 4th, 7 runs after 5th):

- After 4th inning: Home 15, Away 4 → **11-run differential, mercy rule
  applies**
- After 5th inning: Home 12, Away 5 → **7-run differential, mercy rule applies**
- After 3rd inning: Home 15, Away 5 → **No mercy rule (too early)**

**Business Rule**: Mercy rule applies regardless of which team is ahead,
preventing unnecessarily lopsided games.

### Scenario 3: Tie Game (Extra Innings Exhausted)

**Trigger**: Max extra innings reached + tie games allowed **Implementation**:
`SoftballRules.isGameComplete()`

```typescript
const extraInningsPlayed = currentInning - this.totalInnings;
if (extraInningsPlayed >= this.maxExtraInnings) {
  // Maximum extra innings reached, game ends in tie if allowed
  return this.allowTieGames;
}
```

**Example** (with maxExtraInnings = 2, allowTieGames = true):

- 7 innings completed (regulation): Score 5-5 (tied)
- 8th inning completed: Score 6-6 (still tied)
- 9th inning completed: Score 7-7 (still tied, 2 extra innings played)
- **Result**: Game ends in tie (7-7)

**Configuration Variants**:

- `maxExtraInnings = null`: Unlimited extra innings (game continues until
  decided)
- `maxExtraInnings = 0`: No extra innings allowed (game ends in tie after
  regulation if `allowTieGames = true`)
- `maxExtraInnings = N, allowTieGames = false`: Invalid configuration (throws
  `DomainError`)

### Scenario 4: Winner in Extra Innings

**Trigger**: One team ahead after **both halves** of an extra inning (or
walk-off during bottom half) **Implementation**: Same logic as natural
completion, but timing matters

**Critical Rule**: The home team ALWAYS gets their turn to bat (bottom of
inning), even if the away team takes the lead in the top half.

**Example 1 - Walk-Off in Regulation** (game ends immediately):

- 7 innings completed (regulation): Score 5-5 entering bottom of 7th
- Top of 7th: Away team doesn't score → Score still 5-5
- Bottom of 7th: Home team scores 1 run → Score 6-5 (Home ahead)
- ✅ **Game ends immediately** - Walk-off win for home team

**Example 2 - Away Team Leads After Top Half of Extra Inning** (game does NOT
end yet):

- 7 innings completed (regulation): Score 5-5 (tied, continue to extras)
- Top of 8th: Away team scores 2 runs → Score 7-5 (Away ahead)
- ❌ **Game does NOT end here** - Home team gets to bat in bottom of 8th
- Bottom of 8th: Home team scores 1 run → Score 7-6 (Away still ahead)
- ✅ **Now game ends** - Home team had their chance, away team wins 7-6

**Example 3 - Walk-Off in Extra Innings (Home Team Takes Lead)** (game ends
immediately):

- 7 innings completed (regulation): Score 5-5 (tied, continue to extras)
- Top of 8th: Away team scores 1 run → Score 6-5 (Away ahead)
- Bottom of 8th: Home team scores 2 runs → Score 7-6 (Home ahead)
- ✅ **Game ends immediately** - Walk-off win for home team

**Example 4 - Home Team Ahead Going Into Extra Inning** (cannot happen):

- This scenario is impossible - if the home team is ahead after regulation, the
  game already ended

### Scenario 5: Manual Early Termination

**Trigger**: User manually ends game (not in domain logic, requires UI action)
**Examples**:

- **Rain out**: Weather conditions prevent continuation
- **Forfeit**: One team cannot field minimum players
- **Time limit**: League time limit reached (requires user to click "End Game")
- **Mutual agreement**: Both teams agree to end early

**Implementation Note**: This scenario requires a manual "End Game" action in
the UI. The domain's `isGameComplete()` only handles automatic completion
scenarios (mercy rule, regulation/extra innings logic).

### Game Completion State Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│  GAME COMPLETION DECISION TREE                                  │
└─────────────────────────────────────────────────────────────────┘

After each at-bat or half-inning:

1. Check Mercy Rule (can trigger at any point)
   └─ If differential >= threshold at current inning → END GAME (mercy)

2. Check if still in regulation
   └─ If currentInning < totalInnings → CONTINUE GAME

3. Regulation Innings Complete (currentInning >= totalInnings):

   A. After TOP HALF (away team just batted):
      ├─ If home team STILL ahead from previous inning → SKIP bottom half, END GAME (home wins)
      ├─ If tied or away team ahead → CONTINUE to bottom half
      └─ Home team ALWAYS gets their turn unless already winning

   B. After BOTTOM HALF (home team just batted):
      ├─ If home team ahead → END GAME (home wins)
      ├─ If away team ahead → END GAME (away wins)
      └─ If tied → Check extra innings rules

4. Extra Innings Logic (after bottom half ends tied):
   ├─ If maxExtraInnings === null → CONTINUE GAME (unlimited)
   ├─ If extraInningsPlayed < maxExtraInnings → CONTINUE to next extra inning
   └─ If extraInningsPlayed >= maxExtraInnings:
      ├─ If allowTieGames === true → END GAME (tie)
      └─ If allowTieGames === false → Invalid configuration

5. During BOTTOM of Extra Inning (home team batting):
   └─ If home team takes lead → END GAME immediately (walk-off)

6. After BOTTOM of Extra Inning completes:
   ├─ If home team ahead → Already ended (walk-off)
   ├─ If away team ahead → END GAME (away wins)
   └─ If tied → Loop back to step 4
```

**Key Timing Rules**:

- **After completion of the top of the final or extra innings**: Game can end if
  home team is already ahead (bottom half doesn't need to be played)
- **During the bottom of any inning**: Game can end immediately when home team
  takes lead (walk-off in regulation or extras)
- **After bottom half completes**: Game can end via mercy rule OR if not tied;
  continues if tied (unless max extras reached)

### SoftballRules Configuration Examples

**Standard Recreation League** (allows ties after regulation):

```typescript
const rules = new SoftballRules({
  totalInnings: 7,
  mercyRuleEnabled: true,
  mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
  maxExtraInnings: 0, // No extra innings
  allowTieGames: true, // Ties allowed
});
```

**Tournament Play** (no ties, time-constrained):

```typescript
const rules = new SoftballRules({
  totalInnings: 7,
  mercyRuleEnabled: true,
  mercyRuleTiers: [{ differential: 10, afterInning: 4 }],
  maxExtraInnings: 3, // Limited extras
  allowTieGames: false, // Would throw error - invalid!
  timeLimitMinutes: 90, // User must manually end if time expires
});
```

**Competitive League** (unlimited extras, must decide winner):

```typescript
const rules = new SoftballRules({
  totalInnings: 7,
  mercyRuleEnabled: true,
  mercyRuleTiers: [
    { differential: 10, afterInning: 4 },
    { differential: 7, afterInning: 5 },
  ],
  maxExtraInnings: null, // Unlimited extras
  allowTieGames: false, // Ignored when maxExtraInnings is null
});
```

### Implementation References

| Component                        | Location                                      | Purpose                                             |
| -------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| `SoftballRules.isGameComplete()` | `packages/domain/src/rules/SoftballRules.ts`  | Determines if game should end (automatic scenarios) |
| `SoftballRules.isMercyRule()`    | `packages/domain/src/rules/SoftballRules.ts`  | Checks if mercy rule applies                        |
| `GameCompleted` event            | `packages/domain/src/events/GameCompleted.ts` | Records final game state and winner                 |

## Edge Cases and Validations

### Edge Case 1: Empty Batting Slots

**Scenario**: What if a batting slot has no player? **Answer**: **This cannot
happen.** Business rule violation.

**Validation**:

- All batting slots (1 through N) must be filled at game start
- Lineup validation prevents empty slots
- If a player is removed (ejection), substitution is required before game
  continues

**Implementation**: `TeamLineup.validateLineup()` enforces this constraint

### Edge Case 2: Player Ejection/Injury Without Substitution

**Scenario**: Player is ejected or injured and cannot continue **Answer**:
**Substitution required to fill the slot**

**Flow**:

1. User clicks "Substitute Player" button
2. System validates that bench has eligible players
3. If no eligible players available → Game cannot continue (forfeit)
4. If eligible players available → Substitution proceeds normally

### Edge Case 3: Batting Order Wraparound

**Scenario**: 10-player lineup, currently at slot #10, next at-bat? **Answer**:
**Automatically wraps to slot #1**

**Implementation**:

```typescript
// InningState.advanceBattingOrder() method
const maxSlot = InningState.determineMaxBattingSlot(currentSlot);

let nextSlot: number;
if (currentSlot >= maxSlot) {
  nextSlot = 1; // Cycle back to 1
} else {
  nextSlot = currentSlot + 1;
}
// If totalSlots = 10, currentBatterSlot = 10:
// currentSlot (10) >= maxSlot (10) → nextSlot = 1 ✅
```

**Business Rationale**: Batting order is a circular sequence. After the last
batter, it cycles back to the first.

### Edge Case 4: Timing Plays and Force-Out Rules

**Scenario**: In softball, if the 3rd out is a force-out, runs don't score even
if runners crossed home before the out. **Answer**: **Out of scope** for current
implementation.

**Manual Scorer Adjustment**: The scorer manually adjusts runs if needed based
on timing play rules. Future versions may include automatic timing play
detection.

### Edge Case 5: Lineup Size Variations

**Scenario**: Different teams have different lineup sizes (9, 10, 11, 12
players) **Answer**: **Each team maintains their own currentBatterSlot
independently**

**Example**:

- Away team: 10-player lineup (slots 1-10)
- Home team: 12-player lineup (slots 1-12)
- Each team's batting slot advances independently
- Wraparound happens at different points (10 vs 12)

### Edge Case 6: Game Starts with Wrong Batter

**Scenario**: UI shows "Select next batter" instead of actual first batter
**Answer**: **This is a bug.** Domain has set the first batter; UI state is out
of sync.

**Root Cause Analysis**:

- Domain layer: `StartNewGame` correctly sets `currentBatterSlot = 1` and
  `currentBatter`
- Application layer: State initialization propagates to service layer
- UI layer: May not be reading the initialized state correctly

**Fix Required**:

- UI must read `currentBatter` from game state after initialization
- Action buttons must enable when `currentBatter` is not null
- No "select batter" step should exist in the normal flow

## Implementation References

### Key Domain Classes

| Class                  | Responsibility                              | Location                                             |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `StartNewGame`         | Initializes game with first batter          | `packages/application/src/use-cases/StartNewGame.ts` |
| `InningState`          | Manages current batter slot and advancement | `packages/domain/src/aggregates/InningState.ts`      |
| `CurrentBatterChanged` | Domain event for batter transitions         | `packages/domain/src/events/CurrentBatterChanged.ts` |
| `TeamLineup`           | Stores batting slots and player assignments | `packages/domain/src/aggregates/TeamLineup.ts`       |

### Key Domain Events

| Event                       | When Emitted          | Purpose                               |
| --------------------------- | --------------------- | ------------------------------------- |
| `GameStarted`               | Game initialization   | Records game start with initial state |
| `CurrentBatterChanged`      | After each at-bat     | Tracks batting order progression      |
| `AtBatCompleted`            | At-bat recorded       | Triggers batter advancement           |
| `HalfInningEnded`           | 3 outs reached        | Records half-inning completion        |
| `PlayerSubstitutedIntoGame` | Substitution executed | Updates lineup and current batter     |

### Code References for Automatic Behavior

```typescript
// 1. First batter selection at game start
// File: packages/application/src/use-cases/StartNewGame.ts
// Method: StartNewGame.execute()
const firstBattingSlot = awayLineupDTO.battingSlots.find(
  slot => slot.slotNumber === 1
);
const currentBatter = firstBattingSlot?.currentPlayer || null;

// 2. Initial currentBatterSlot set to 1
// File: packages/application/src/use-cases/StartNewGame.ts
// Method: StartNewGame.execute()
currentBatterSlot: 1,

// 3. Batter advancement after each at-bat
// File: packages/domain/src/aggregates/InningState.ts
// Method: InningState.advanceBattingOrder()
private advanceBattingOrder(currentSlot: number): InningState {
  const maxSlot = InningState.determineMaxBattingSlot(currentSlot);

  let nextSlot: number;
  if (currentSlot >= maxSlot) {
    nextSlot = 1; // Cycle back to 1
  } else {
    nextSlot = currentSlot + 1;
  }
  // Returns new InningState with updated batting slot
  // Emits CurrentBatterChanged event
}

// 4. Half-inning transition preserves both team slots
// File: packages/domain/src/aggregates/InningState.ts
// Method: InningState.endHalfInning()
endHalfInning(): InningState {
  // Both teams' batting slots are preserved (NOT reset to 1)
  // Each team continues from where they left off when their turn comes again
  // Returns new InningState with both awayTeamBatterSlot and homeTeamBatterSlot maintained
}
```

## Summary: Key Automatic Behaviors

| Event                        | Automatic Behavior                         | User Action Required     |
| ---------------------------- | ------------------------------------------ | ------------------------ |
| **Game Start**               | First batter (away team, slot #1) selected | ❌ None                  |
| **After At-Bat**             | Advance to next slot (N → N+1)             | ❌ None                  |
| **Half-Inning End**          | Switch teams, resume from last slot        | ❌ None                  |
| **Batting Order Wraparound** | Slot N → Slot 1 automatically              | ❌ None                  |
| **Cross-Inning**             | Continue from previous position            | ❌ None                  |
| **Substitution**             | Replace player in current slot             | ✅ Initiate substitution |

**Core Design Principle**: The batting order is a deterministic, automatic
system. The user's role is to **record results**, not to **manage batting
order**. The system handles all sequencing automatically based on softball
rules.

---

## Related Documentation

- **[Domain Model](domain-model.md)** - Aggregate design and business rules
- **[Use Cases](../requirements/use-cases.md)** - UC-001 (Start Game), UC-002
  (Record At-Bat)
- **[Event Sourcing](event-sourcing.md)** - Event-driven state management
- **[CurrentBatterChanged Event](../../packages/domain/src/events/CurrentBatterChanged.ts)** -
  Detailed event documentation

---

_This document establishes the specification for automatic batter selection
behavior. Any deviation from these patterns should be considered a bug._
