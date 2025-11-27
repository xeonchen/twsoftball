# ADR-009: Team Aggregate Design for Roster Management

## Status

**Accepted** - Date: 2025-11-27

## Context

The application needs standalone roster management that persists across games.
Currently, player lineup management is tightly coupled to active games through
the `TeamLineup` aggregate, which requires a `GameId` to exist.

### User Pain Points

Users (coaches, scorekeepers) frequently re-enter the same player information
for every game:

1. Same team plays multiple games per season
2. Player names, jersey numbers, and preferred positions rarely change
3. Manual entry is time-consuming and error-prone
4. No way to save and reuse lineup configurations

### Current Architecture

```
TeamLineup (Aggregate Root) - GAME-BOUND
├── TeamLineupId (Value Object)
├── gameId (REQUIRED - cannot exist without a game)
├── teamName
├── BattingSlots (Map<number, BattingSlot>)
├── FieldPositions (Map<FieldPosition, PlayerId>)
└── BenchPlayers (Set<PlayerId>)
```

The `TeamLineup` aggregate was designed for in-game lineup management
(substitutions, position changes, batting order). It was never intended to be a
persistent roster that exists outside of games.

### Requirements for Roster Management

1. Create team rosters that persist independently of games
2. Reuse rosters across multiple games
3. Pre-populate game lineups from saved rosters
4. Edit rosters without affecting past games
5. Support optional roster usage (rosters not required to start a game)

## Decision

Introduce a new **Team aggregate** that exists independently from `TeamLineup`:

### New Architecture

```
Team (Aggregate Root) - GAME-INDEPENDENT
├── TeamId (Value Object)
├── teamName
├── RosterPlayers[] (persistent roster)
├── createdAt
└── updatedAt

TeamLineup (Aggregate Root) - GAME-BOUND (unchanged)
├── TeamLineupId
├── gameId (required)
├── teamName
├── ActivePlayers[]
└── BenchPlayers[]
```

### Relationship Between Aggregates

```
┌──────────────────────────────────────────────────────────────────┐
│                         WORKFLOW                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User creates Team roster (one-time setup)                     │
│     └── Team aggregate stored in TeamRepository                   │
│                                                                   │
│  2. User starts new game                                          │
│     └── Optionally selects existing Team                          │
│                                                                   │
│  3. System creates TeamLineup                                     │
│     └── COPIES players from Team roster (if selected)             │
│     └── TeamLineup bound to new GameId                            │
│                                                                   │
│  4. User records game (substitutions, etc.)                       │
│     └── Changes affect TeamLineup ONLY                            │
│     └── Original Team roster UNCHANGED                            │
│                                                                   │
│  5. Game ends                                                     │
│     └── TeamLineup preserved with game history                    │
│     └── Team roster still available for next game                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Copy, Not Reference**: When using a roster to start a game, players are
   COPIED into the `TeamLineup`. This prevents game-time changes from affecting
   the master roster.

2. **Optional Roster Usage**: Rosters are optional. Users can still start games
   with manual player entry (backward compatible).

3. **Separate Event Streams**: `Team` and `TeamLineup` have independent event
   streams for proper event sourcing.

4. **No Cross-Aggregate References**: `TeamLineup` does not reference `TeamId`.
   The relationship is only used during game setup to copy player data.

## Alternatives Considered

### Alternative 1: Extend TeamLineup to Support Optional GameId

Make `gameId` optional on `TeamLineup`, allowing it to exist as both a roster
and a game lineup.

**Rejected because:**

- Violates Single Responsibility Principle
- Complicates invariants (different rules for roster vs game lineup)
- Breaks existing code assuming `gameId` is always present
- Makes event sourcing reconstruction ambiguous

### Alternative 2: Local Storage Only (No Aggregate)

Store rosters in localStorage/IndexedDB without a domain aggregate.

**Rejected because:**

- Bypasses domain model (violates Hexagonal Architecture)
- No event sourcing support for roster changes
- Cannot enforce business rules (jersey uniqueness, name validation)
- Harder to sync across devices in future

### Alternative 3: File Import/Export

Allow users to import/export rosters as JSON/CSV files.

**Rejected because:**

- Poor UX for mobile-first PWA
- Doesn't solve the persistent storage problem
- Requires manual file management
- No integration with game setup flow

## Consequences

### Positive

- **Clean Separation**: Roster management and game management are independent
- **Backward Compatible**: Existing game flow unchanged (rosters optional)
- **Event Sourcing**: Full audit trail of roster changes
- **DDD Alignment**: Each aggregate has clear responsibility and boundaries
- **Future-Proof**: Easy to add features like roster sharing, import/export

### Negative

- **Increased Complexity**: New aggregate adds code and storage requirements
- **Data Duplication**: Player info exists in both Team and TeamLineup
- **Migration Needed**: Existing games won't have associated rosters
- **Additional Storage**: More IndexedDB space required

### Risks and Mitigations

| Risk                                 | Mitigation                              |
| ------------------------------------ | --------------------------------------- |
| Users confused by two concepts       | Clear UI labels ("Roster" vs "Lineup")  |
| Stale roster data after game changes | Rosters are always "source of truth"    |
| Storage quota exceeded on mobile     | Implement roster limit (30 players max) |
| Inconsistent jersey numbers          | Validate at copy time, not reference    |

## Implementation Plan

See `TODO.local.md` Phase 6 for detailed implementation tasks:

- **Phase 6.A**: Domain layer (Team aggregate, value objects, events)
- **Phase 6.B**: Application layer (use cases, DTOs, ports)
- **Phase 6.C**: Infrastructure layer (IndexedDB persistence)
- **Phase 6.D**: Web layer - Roster Management page
- **Phase 6.E**: Web layer - Game Setup integration (two-panel view)
- **Phase 6.F**: Cleanup and testing

## References

- **[Domain Model](../design/domain-model.md)** - Team aggregate design
- **[Use Cases](../design/use-cases.md)** - UC-015, UC-016, UC-017
- **[Wireframes](../design/ui-ux/wireframes.md)** - Screen 3, Screen 10
- **[ADR-001](ADR-001-ddd-hexagonal-solid.md)** - DDD + Hexagonal Architecture
- **[ADR-002](ADR-002-event-sourcing-pattern.md)** - Event Sourcing pattern
