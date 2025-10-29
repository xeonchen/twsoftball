# Single Batting Slot InningState Pattern

**Status:** Post-MVP Enhancement **Priority:** Medium **Estimated Effort:** 2-3
days **Type:** Architectural Refactoring **Created:** 2025-10-17

## Executive Summary

This document proposes a refactoring of the `InningState` aggregate to store
only the **active batting team's slot** instead of both teams' slots
simultaneously. This improves **aggregate cohesion** and **semantic
correctness** by ensuring each half-inning state contains only data relevant to
its bounded context.

**Key Insight:** The fielding team's batting position has no bearing on the
current half-inning's business logic or invariants.

---

## Current Implementation Analysis

### Current Design: "Inning Coordinator" Pattern

```typescript
class InningState {
  private readonly awayTeamBatterSlot: number; // Always tracked
  private readonly homeTeamBatterSlot: number; // Always tracked
  private readonly topHalfOfInning: boolean;

  get currentBattingSlot(): number {
    return this.topHalfOfInning
      ? this.awayTeamBatterSlot
      : this.homeTeamBatterSlot;
  }
}
```

**Architecture:** InningState acts as a **coordinator** managing both teams'
progression through the game simultaneously.

**Trade-offs:**

- ✅ Simple, straightforward implementation
- ✅ No conditional logic needed for state access
- ✅ Direct alignment with event structure
- ❌ Carries "passenger data" (non-batting team's slot)
- ❌ Violates aggregate cohesion principle
- ❌ Fielding team's slot is irrelevant to half-inning invariants

---

## Proposed Design: "Active Half-Inning" Pattern

### Architectural Vision

```typescript
class InningState {
  private readonly battingSlot: number; // Only the active batting team
  private readonly topHalfOfInning: boolean; // Determines which team this slot belongs to

  get currentBattingSlot(): number {
    return this.battingSlot; // Direct access, no conditional
  }
}
```

**Architecture:** InningState represents **only the active half-inning's bounded
context**.

**Trade-offs:**

- ✅ Tighter bounded context (half-inning state = half-inning data only)
- ✅ Improved aggregate cohesion (all fields serve aggregate invariants)
- ✅ Semantic purity (no irrelevant data)
- ✅ Domain accuracy (reflects reality: one team bats per half)
- ✅ Clearer intent (no ambiguity about active slot)
- ⚠️ Requires extracting correct slot from `HalfInningEnded` events during
  replay

---

## Event Sourcing Reconstruction Proof

### The Event Handoff Pattern

The `HalfInningEnded` event serves as the **inter-context communication
mechanism**, carrying both team positions forward while each half-inning state
maintains only its own active slot.

```typescript
// Event Stream Example - Shows slot handoff pattern

1. InningStateCreated(inning=1, isTopHalf=true)
   → Reconstructed State: { inning: 1, isTopHalf: true, battingSlot: 1 }
   → Comment: Away team starts at slot 1

2. CurrentBatterChanged(newSlot=2)
   → Reconstructed State: { inning: 1, isTopHalf: true, battingSlot: 2 }
   → Comment: Away team advances to slot 2

3. CurrentBatterChanged(newSlot=3)
   → Reconstructed State: { inning: 1, isTopHalf: true, battingSlot: 3 }
   → Comment: Away team advances to slot 3

4. HalfInningEnded(wasTopHalf=true, awaySlot=3, homeSlot=1)
   → Transition: Top → Bottom
   → Extract: homeSlot (because new half is bottom)
   → Reconstructed State: { inning: 1, isTopHalf: false, battingSlot: 1 }
   → Comment: Home team starts bottom half at slot 1 (their continuation point)

5. CurrentBatterChanged(newSlot=2)
   → Reconstructed State: { inning: 1, isTopHalf: false, battingSlot: 2 }
   → Comment: Home team advances to slot 2

6. HalfInningEnded(wasTopHalf=false, awaySlot=3, homeSlot=2)
   → Transition: Bottom → Top (next inning)
   → Extract: awaySlot (because new half is top)
   → Reconstructed State: { inning: 2, isTopHalf: true, battingSlot: 3 }
   → Comment: Away team resumes at slot 3 in 2nd inning (their continuation point)
```

### Reconstruction Logic

```typescript
private applyHalfInningEndedEvent(event: HalfInningEndedEventData): void {
  const wasTopHalf = event.wasTopHalf ?? this.topHalfOfInning;

  // Determine new half
  const newIsTopHalf = !wasTopHalf;

  // Extract relevant slot based on NEW half
  const relevantSlot = this.extractRelevantBattingSlot(event, newIsTopHalf);

  // Update state
  (this as unknown as { topHalfOfInning: boolean }).topHalfOfInning = newIsTopHalf;
  (this as unknown as { battingSlot: number }).battingSlot = relevantSlot;

  // Reset tactical state
  (this as unknown as { outsCount: number }).outsCount = 0;
  (this as unknown as { currentBasesState: BasesState }).currentBasesState = BasesState.empty();
}

private static extractRelevantBattingSlot(
  event: HalfInningEndedEventData,
  isTopHalf: boolean
): number {
  // Top half → away team bats → extract awayTeamBatterSlot
  // Bottom half → home team bats → extract homeTeamBatterSlot
  return isTopHalf ? event.awayTeamBatterSlot : event.homeTeamBatterSlot;
}
```

**Key Point:** The `HalfInningEnded` event **must still contain both slots**
because it's the handoff mechanism. Only the in-memory aggregate state changes.

---

## Domain-Driven Design Benefits

### 1. Aggregate Cohesion

**Before:**

```typescript
// InningState carries data not relevant to its invariants
{
  inning: 3,
  isTopHalf: true,          // Away team batting
  awayTeamBatterSlot: 5,    // ✅ Relevant to current half
  homeTeamBatterSlot: 7,    // ❌ Not relevant until bottom half
  outs: 1,
  basesState: {...}
}
```

**After:**

```typescript
// InningState contains only data relevant to its bounded context
{
  inning: 3,
  isTopHalf: true,          // Away team batting
  battingSlot: 5,           // ✅ Only relevant data
  outs: 1,
  basesState: {...}
}
```

### 2. Bounded Context Clarity

Each half-inning is a **distinct bounded context** in the domain:

- **Top Half Context:** Away team offense, home team defense
- **Bottom Half Context:** Home team offense, away team defense

The current implementation **mixes contexts** by tracking both teams
simultaneously. The proposed design **respects context boundaries**.

### 3. Single Responsibility Principle

**Current Responsibility:** "Track the current half-inning state AND coordinate
both teams' progression" **Proposed Responsibility:** "Track the current
half-inning state" (period)

The coordination responsibility moves to where it belongs: the **event stream
itself**.

---

## Implementation Roadmap

### Phase 1: Core Refactoring

**Files to Modify:**

1. **`InningState.ts`** (Primary changes)
   - Replace `awayTeamBatterSlot` + `homeTeamBatterSlot` with
     `battingSlot: number`
   - Simplify `currentBattingSlot` getter → `return this.battingSlot`
   - Add helper: `private static extractRelevantBattingSlot(event, isTopHalf)`
   - Update constructor signature (single slot parameter)
   - Update ~30+ internal `new InningState(...)` instantiations

2. **`InningState.ts` - Event Application**
   - `applyHalfInningEndedEvent()`: Extract relevant slot using helper
   - `applyCurrentBatterChangedEvent()`: Set single `battingSlot`
   - `fromEvents()`: Initialize with default slot

3. **`InningState.ts` - State Transitions**
   - `endHalfInning()`: Continue emitting both slots in event (no change)
   - `advanceBattingOrder()`: Update single `battingSlot`
   - `withCurrentBattingSlot()`: Simplified (no team conditional)

### Phase 2: Test Updates

**Test Files to Update:**

- `InningState.core.test.ts`
- `InningState.event-sourcing.test.ts`
- `HalfInningEnded.test.ts`
- All application-layer tests that construct InningState
- All integration tests with event replay

**New Test Cases:**

- Verify slot extraction during top→bottom transition
- Verify slot extraction during bottom→top transition
- Verify multi-inning slot continuity
- Verify event sourcing reconstruction with 3+ innings

### Phase 3: Documentation

**Documents to Update:**

- `game-flow.md` - Update half-inning transition section
- `event-sourcing.md` - Add event handoff pattern explanation
- `domain-model.md` - Update InningState aggregate description
- `architecture-patterns.md` - Add bounded context pattern example

### Phase 4: Validation

**Validation Checklist:**

- [ ] All 7000+ tests pass
- [ ] Event sourcing reconstruction verified across multiple innings
- [ ] No performance regression
- [ ] JSDoc and code comments updated
- [ ] Architecture validation passes (FSD + dependency-cruiser)

---

## Risk Assessment

### Technical Risks

| Risk                   | Likelihood | Impact | Mitigation                                                      |
| ---------------------- | ---------- | ------ | --------------------------------------------------------------- |
| Event replay bugs      | Medium     | High   | Comprehensive event sourcing tests with multi-inning scenarios  |
| Performance regression | Low        | Medium | Benchmark tests before/after                                    |
| Breaking changes       | Low        | Low    | HalfInningEnded event structure unchanged (backward compatible) |

### Rollback Plan

If issues are discovered post-refactoring:

1. Revert commit (single atomic change)
2. All tests pass on revert (no event structure changes)
3. Zero data migration needed (events unchanged)

---

## Success Criteria

✅ **Functional:**

- All tests pass (7000+ tests)
- Event sourcing reconstruction works across 10+ innings
- Batting slot continuity preserved across half-innings

✅ **Architectural:**

- InningState contains only half-inning relevant data
- Aggregate cohesion improved
- Bounded context boundaries respected

✅ **Quality:**

- No performance regression
- Code coverage maintained (>90%)
- Documentation fully updated

---

## Alternative Approaches Considered

### Alternative 1: Keep Current Design

**Rationale:** "If it ain't broke, don't fix it" **Rejected Because:**
Architectural principles matter for long-term maintainability

### Alternative 2: Store Team Reference Instead

**Idea:** Store `battingTeam: 'HOME' | 'AWAY'` instead of slot number **Rejected
Because:** Slot number is the actual state; team side is derivable from
`isTopHalf`

### Alternative 3: Extract to Separate Aggregate

**Idea:** Create `BattingOrder` aggregate for each team **Rejected Because:**
Over-engineering; batting slot is intrinsic to inning progression

---

## References

### Related Documents

- `/docs/design/game-flow.md` - Half-inning transition logic
- `/docs/design/event-sourcing.md` - Event replay patterns
- `/docs/design/domain-model.md` - InningState aggregate
- `/docs/architecture-patterns.md` - DDD patterns

### Related Code

- `packages/domain/src/aggregates/InningState.ts`
- `packages/domain/src/events/HalfInningEnded.ts`
- `packages/domain/src/aggregates/InningState.event-sourcing.test.ts`

### Domain-Driven Design Principles

- **Aggregate Cohesion:** Only include data relevant to invariants
- **Bounded Context:** Respect context boundaries
- **Ubiquitous Language:** Model reflects domain expert language

---

## Conclusion

This refactoring improves the **semantic correctness** and **architectural
quality** of the InningState aggregate without requiring any event structure
changes. It's a safe, backward-compatible enhancement that aligns the
implementation more closely with Domain-Driven Design principles.

**Recommendation:** Defer until post-MVP to avoid delaying launch, but
prioritize as a first post-MVP refactoring to establish strong architectural
patterns early.

---

**Author:** System Architecture Review **Review Date:** 2025-10-17 **Next
Review:** Post-MVP Planning Phase
