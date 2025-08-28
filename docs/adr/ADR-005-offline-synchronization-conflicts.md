# ADR-005: Offline Synchronization and Conflict Resolution

## Status

**Accepted** - Date: 2025-08-28

## Context

Our application is a Progressive Web App (PWA) designed to be "offline-first"
([ADR-003](./ADR-003-pwa-first-approach.md)). This is critical for our users,
who will be recording game data in real-time at sports fields where network
connectivity is often unreliable or unavailable.

The use of Event Sourcing ([ADR-002](./ADR-002-event-sourcing-pattern.md)) means
that all actions are stored as a sequence of events. When a user is offline,
these events are stored locally on their device. When they reconnect, these
local events must be synchronized with the central server.

This creates a classic distributed systems challenge: what happens if the state
on the server has changed while the user was offline? For example, another user
(e.g., a coach) with intermittent connectivity might have made a change to the
same game. This results in a data conflict that must be resolved.

## Decision

We will implement a **User-Driven Conflict Resolution** strategy. The system
will first attempt to merge data automatically and will only require human
intervention when a logical conflict occurs that the system cannot resolve on
its own.

### Synchronization Flow

1.  **Detect Reconnection**: The application detects that it has regained
    network connectivity.
2.  **Fetch Remote Events**: The client fetches the latest events for the
    current game from the server.
3.  **Detect Divergence**: The client compares the server's event stream with
    its local event stream. If the server has new events that the client doesn't
    have, and the client has local events the server doesn't have, a divergence
    has occurred.
4.  **Enter Syncing State**: The UI will indicate that it is "Syncing..." and
    will temporarily lock the user from making further changes.
5.  **Attempt Automatic Merge**: The system will optimistically try to apply the
    user's local, un-synced events on top of the new state from the server.
6.  **Validate Merged Events**: Each local event will be re-validated against
    the business rules of the game state _after_ the server's changes have been
    applied.
7.  **Success Case (No Conflict)**: If all local events are still valid, they
    are sent to the server and the sync is complete. The UI returns to normal.
8.  **Failure Case (Conflict Detected)**: If a local event is now invalid (e.g.,
    it tries to substitute a player that the server-side events have already
    removed from the game), the automatic merge fails.
9.  **Present Conflict to User**: The process stops, and the UI presents a
    conflict resolution screen. This screen will clearly explain the conflict,
    showing both the server's change and the user's conflicting local change.
10. **User Resolution**: The user will be given clear choices, such as:
    - "Keep the server's version and discard my change."
    - "Keep my change and discard the server's version." (If applicable and
      safe).
    - In some cases, a manual resolution might be required.
11. **Complete Sync**: Once the user has resolved all conflicts, the resulting
    consistent event stream is saved to the server.

## Alternatives Considered

### Last-Write-Wins (LWW)

- **Description**: The last change to be synced, based on a timestamp,
  overwrites any other conflicting changes.
- **Pros**: Simple to implement.
- **Cons**: High risk of silent data loss. A user's important changes could be
  overwritten without their knowledge. This is unacceptable for a scorekeeping
  application where every action is significant.
- **Rejected**: Too risky and error-prone for our use case.

### First-Write-Wins (FWW)

- **Description**: The first version of a change to reach the server is kept,
  and later conflicting changes are rejected.
- **Pros**: Also simple to implement.
- **Cons**: Can be very frustrating for users who find their work rejected. Not
  suitable for a collaborative environment.
- **Rejected**: Poor user experience.

### Fully Automated Resolution (OT/CRDTs)

- **Description**: Using advanced algorithms like Operational Transformation or
  Conflict-Free Replicated Data Types to automatically merge all changes without
  conflicts.
- **Pros**: Provides a seamless, real-time collaborative experience (like Google
  Docs).
- **Cons**: Extremely complex to implement correctly.
- **Rejected**: Over-engineering for our current requirements. We can evolve
  towards this if necessary in the future.

## Consequences

### Positive

- **No Data Loss**: Ensures that user actions are not silently overwritten.
- **User Control**: The user, who has the full context of the game, makes the
  final decision in ambiguous cases.
- **Reliability**: Builds trust in the application's ability to handle data
  accurately, even in poor network conditions.
- **Leverages Event Sourcing**: The log-based nature of our architecture makes
  detecting divergence and re-basing events straightforward.

### Negative

- **Interrupts User Workflow**: A conflict resolution screen will be a modal
  interruption for the user.
- **Increased UI Complexity**: We must design and build a clear and intuitive
  conflict resolution interface.
- **Potential for User Error**: A user could potentially make the "wrong" choice
  when resolving a conflict, though this is preferable to the system making the
  wrong choice automatically.

---

**Decision made by**: Development Team, Stakeholder **Review date**: 2025-09-28
