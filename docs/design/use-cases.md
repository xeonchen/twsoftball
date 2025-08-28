# Use Cases and User Stories

> **Note**: This document defines the planned use cases and user stories for the
> application. The actual implementation is not yet started (Phases 2-3). This
> serves as the requirements specification for development.

## Overview

This document defines all use cases for the TW Softball application, organized
by user roles and functional areas. Each use case includes user stories,
acceptance criteria, and implementation priority.

## User Roles

### Primary Users

- **Scorekeeper**: Records game events in real-time during games
- **Coach**: Reviews game progress, manages lineup, makes strategic decisions
- **Player**: Views personal and team statistics

### Future Users

- **Team Manager**: Manages roster, schedules, team settings
- **League Administrator**: Manages multiple teams, tournaments, rules
- **Spectator**: Views live game updates and statistics

## Core Use Cases (MVP - Phase 2-3)

### UC-001: Start New Game

**Actor**: Scorekeeper, Coach **Priority**: High (MVP)

**User Story**:

> As a scorekeeper, I want to start a new game by entering team information and
> initial lineup, so that I can begin recording game events.

**Acceptance Criteria**:

- [ ] User can enter home team name and away team name
- [ ] User can specify which team is "our team" (the one we're tracking in
      detail)
- [ ] User can set up initial batting order for our team (9-20 players)
- [ ] User can assign jersey numbers to each player
- [ ] User can assign field positions to each player
- [ ] System validates that all required positions are filled
- [ ] System validates no duplicate jersey numbers
- [ ] System validates no duplicate players in lineup
- [ ] Game starts in the top of the 1st inning
- [ ] Initial score is 0-0

**Pre-conditions**: None **Post-conditions**: New game exists in IN_PROGRESS
status with complete lineup

**Basic Flow**:

1. User selects "Start New Game"
2. System presents game setup form
3. User enters team names and selects our team side (Home/Away)
4. User adds players to lineup with names, jersey numbers, and positions
5. System validates lineup completeness and uniqueness
6. User confirms lineup
7. System creates game and displays recording interface

**Alternative Flows**:

- **3a**: User cancels setup - return to main menu
- **5a**: Validation fails - display error messages, allow corrections

---

### UC-002: Record At-Bat Result

**Actor**: Scorekeeper **Priority**: High (MVP)

**User Story**:

> As a scorekeeper, I want to record the result of each at-bat (hit, walk, out,
> etc.), so that the game state and score are accurately maintained.

**Acceptance Criteria**:

- [ ] User can select from all standard at-bat results (HR, 3B, 2B, 1B, BB, E,
      FC, K, GO, FO, DP, TP, SF)
- [ ] System automatically calculates and displays runner advancement
- [ ] System automatically calculates RBI based on business rules
- [ ] System updates bases state after each at-bat
- [ ] System updates score when runs are scored
- [ ] System advances to next batter in order
- [ ] System tracks outs and automatically ends inning at 3 outs
- [ ] System applies mercy rule if conditions are met
- [ ] All changes are immediately persisted for offline use

**Pre-conditions**: Game is in progress, current batter is known
**Post-conditions**: At-bat is recorded, game state is updated

**Basic Flow**:

1. System displays current game situation (inning, score, bases, outs, current
   batter)
2. User selects at-bat result from available options
3. System calculates runner advancement and RBI
4. System presents preview of changes (score change, bases after)
5. User confirms the at-bat
6. System updates game state and displays next batter

**Alternative Flows**:

- **2a**: User selects "Other" - system provides text input for unusual
  situations
- **5a**: User selects "Undo" - system reverts to previous state
- **6a**: Inning ends due to 3 outs - system advances to next half-inning
- **6b**: Game ends due to mercy rule - system displays final score

---

### UC-003: Undo Last Action

**Actor**: Scorekeeper, Coach **Priority**: High (MVP)

**User Story**:

> As a scorekeeper, I want to undo the last recorded action when I make a
> mistake, so that the game state remains accurate without having to restart the
> game.

**Acceptance Criteria**:

- [ ] User can undo any recorded at-bat or game action
- [ ] System shows preview of what will be undone
- [ ] System restores exact previous game state (score, bases, outs, batter)
- [ ] Undo is available immediately after any action
- [ ] Multiple levels of undo are supported (undo multiple actions in sequence)
- [ ] Undone actions can be redone if needed
- [ ] Undo/redo history is maintained throughout the game
- [ ] Visual indicator shows undo/redo availability

**Pre-conditions**: At least one action has been recorded **Post-conditions**:
Previous action is reversed, game state is restored

**Basic Flow**:

1. User selects "Undo" button/option
2. System displays preview of what will be undone
3. User confirms undo action
4. System reverts to previous game state
5. System displays updated game situation

**Alternative Flows**:

- **3a**: User cancels undo - system returns to current state
- **4a**: User selects "Redo" after undo - system reapplies undone action

---

### UC-004: Substitute Player

**Actor**: Coach, Scorekeeper **Priority**: Medium (MVP)

**User Story**:

> As a coach, I want to substitute players during the game (batting order and/or
> field positions), so that I can make strategic changes while maintaining
> accurate records.

**Acceptance Criteria**:

- [ ] User can substitute any player in batting order
- [ ] User can substitute any player in field positions
- [ ] User can make multiple simultaneous substitutions
- [ ] System maintains batting order continuity
- [ ] System ensures all field positions remain filled
- [ ] System records substitution timestamp and context
- [ ] Substituted players maintain their statistical history
- [ ] New players can be added to game if not in original roster

**Pre-conditions**: Game is in progress **Post-conditions**: Lineup reflects
substitutions, game continues normally

**Basic Flow**:

1. User selects "Substitute Player"
2. System displays current lineup (batting order and field positions)
3. User selects position(s) to modify
4. User selects replacement player(s)
5. System validates substitution (all positions filled, etc.)
6. User confirms substitution
7. System updates lineup and records substitution event

**Alternative Flows**:

- **4a**: Replacement player not in roster - user can add new player
- **5a**: Validation fails - system shows errors and allows corrections

---

### UC-005: End Game

**Actor**: Scorekeeper, Coach  
**Priority**: High (MVP)

**User Story**:

> As a scorekeeper, I want to end the game when it reaches a natural conclusion
> (9 innings, mercy rule, or time limit), so that final statistics are recorded
> and the game is properly closed.

**Acceptance Criteria**:

- [ ] System automatically ends game when mercy rule conditions are met
- [ ] User can manually end game for time limit or other reasons
- [ ] System calculates and displays final score
- [ ] System determines and displays winner
- [ ] System generates game summary with key statistics
- [ ] All game data is marked as final and preserved
- [ ] User can export/share game results

**Pre-conditions**: Game is in progress **Post-conditions**: Game status is
COMPLETED, final statistics are available

**Basic Flow**:

1. Game reaches ending condition (9 innings, mercy rule, or manual end)
2. System calculates final score and determines winner
3. System displays game completion confirmation
4. User confirms game end
5. System marks game as completed and generates summary
6. System displays final statistics and sharing options

**Alternative Flows**:

- **1a**: Mercy rule triggered - system automatically presents end game options
- **4a**: User cancels end game - game continues if conditions allow

## Secondary Use Cases (Post-MVP)

### UC-006: View Game Statistics

**Actor**: Coach, Player, Scorekeeper **Priority**: Medium

**User Story**:

> As a coach, I want to view current game and player statistics during the game,
> so that I can make informed strategic decisions.

**Acceptance Criteria**:

- [ ] User can view current game score and inning
- [ ] User can view individual player batting statistics (at-bats, hits, RBI,
      average)
- [ ] User can view team statistics (runs per inning, hits, errors)
- [ ] User can view defensive statistics by position
- [ ] Statistics update in real-time as game progresses
- [ ] User can view historical statistics from previous games

---

### UC-007: Export Game Data

**Actor**: Coach, Scorekeeper **Priority**: Medium

**User Story**:

> As a coach, I want to export game data in standard formats (CSV, PDF,
> scorebook), so that I can share results with league officials and maintain
> permanent records.

**Acceptance Criteria**:

- [ ] User can export game summary as PDF
- [ ] User can export detailed statistics as CSV
- [ ] User can generate traditional scorebook format
- [ ] Export includes all recorded events with timestamps
- [ ] Export includes player statistics and team totals
- [ ] User can email or share exported files

---

### UC-008: Sync Game Data

**Actor**: Scorekeeper **Priority**: Low

**User Story**:

> As a scorekeeper, I want to sync game data with other devices or cloud
> storage, so that multiple people can follow the game and data is backed up.

**Acceptance Criteria**:

- [ ] User can enable cloud sync for real-time updates
- [ ] Multiple devices can view same game simultaneously
- [ ] Offline changes sync automatically when connection is restored
- [ ] Conflicts are resolved automatically or with user input
- [ ] Sync status is clearly indicated in the interface

## Advanced Use Cases (Future Phases)

### UC-009: Manage Season Statistics

**Actor**: Coach, Team Manager **Priority**: Low

**User Story**:

> As a coach, I want to track player and team statistics across multiple games
> and seasons, so that I can analyze performance trends and make roster
> decisions.

---

### UC-010: Configure Game Rules

**Actor**: League Administrator, Team Manager **Priority**: Low

**User Story**:

> As a league administrator, I want to configure game rules (mercy rule
> conditions, time limits, roster size), so that the application works for
> different league formats.

---

### UC-011: Schedule Games

**Actor**: Team Manager **Priority**: Low

**User Story**:

> As a team manager, I want to schedule games and manage the team calendar, so
> that players know when and where games are played.

---

### UC-012: Live Game Updates

**Actor**: Spectator, Player **Priority**: Low

**User Story**:

> As a parent/spectator, I want to follow live game updates remotely, so that I
> can stay informed about the game progress even when I can't attend.

## Technical Use Cases (Infrastructure)

### UC-013: Offline Game Recording

**Actor**: System **Priority**: High (MVP)

**User Story**:

> As a system, I need to maintain full functionality when network connectivity
> is unavailable, so that games can be recorded in any location.

**Acceptance Criteria**:

- [ ] All game recording functions work without network connection
- [ ] Data is stored locally using IndexedDB
- [ ] Offline indicator is displayed when network is unavailable
- [ ] Data syncs automatically when connection is restored
- [ ] No data loss occurs due to network issues

---

### UC-014: Data Backup and Recovery

**Actor**: System **Priority**: Medium

**User Story**:

> As a system, I need to automatically backup game data and provide recovery
> options, so that important game records are never lost.

**Acceptance Criteria**:

- [ ] Game data is automatically backed up during recording
- [ ] User can manually export backup files
- [ ] User can restore from backup files
- [ ] Backup includes complete event history for full game reconstruction
- [ ] Recovery process validates data integrity

## Implementation Priority

### Phase 2 (Application Layer) - Current Focus

1. UC-001: Start New Game
2. UC-002: Record At-Bat Result
3. UC-003: Undo Last Action
4. UC-013: Offline Game Recording

### Phase 3 (Infrastructure Layer)

5. UC-004: Substitute Player
6. UC-005: End Game
7. UC-014: Data Backup and Recovery

### Phase 4 (Web Application)

8. UC-006: View Game Statistics
9. UC-007: Export Game Data

### Phase 5 (Advanced Features)

10. UC-008: Sync Game Data
11. UC-009: Manage Season Statistics
12. UC-010: Configure Game Rules

### Future Phases

13. UC-011: Schedule Games
14. UC-012: Live Game Updates

## Cross-Cutting Concerns

### Usability Requirements

- **Mobile-First Design**: All use cases must work effectively on mobile devices
- **Touch-Friendly Interface**: Large touch targets for quick game recording
- **Minimal Clicks**: Common actions (record at-bat) should require minimal user
  input
- **Visual Feedback**: Clear indication of current game state and recent actions

### Performance Requirements

- **Response Time**: All user actions must complete within 200ms
- **Offline Performance**: No degradation when network is unavailable
- **Battery Life**: Optimized for extended use during long games
- **Storage Efficiency**: Minimal local storage usage while maintaining full
  functionality

### Reliability Requirements

- **Zero Data Loss**: Game data must never be lost due to application or device
  issues
- **Error Recovery**: Application must gracefully handle and recover from errors
- **State Consistency**: Game state must always be logically consistent
- **Undo Safety**: Undo/redo operations must never leave the system in an
  invalid state

### Security Requirements

- **Local Data Protection**: Game data stored locally must be secure
- **Export Security**: Exported data should not contain sensitive information
  beyond game statistics
- **Access Control**: Future multi-user features must include appropriate access
  controls

This use case specification provides the foundation for implementing the
application layer of our softball recording system, ensuring all user needs are
met while maintaining technical excellence.

## See Also

- **[Domain Model](domain-model.md)** - Domain entities and business rules that
  support these use cases
- **[API Contracts](api-contracts.md)** - Command/query interfaces for
  implementing use cases
- **[Architecture Guide](architecture.md)** - How use cases fit in the
  application layer
- **[ADR-003: PWA First](../adr/ADR-003-pwa-first-approach.md)** - Technology
  choices supporting user experience
- **[Development Guide](../guides/development.md)** - TDD approach for
  implementing use cases
