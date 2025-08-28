# ADR-006: Cross-Aggregate Consistency

## Status

**Accepted** - Date: 2025-08-28

## Context

As our domain model evolves, we have identified the need for certain business
processes to span multiple aggregates. For example, future requirements will
involve `Player` and `Team` management, which will interact with the `Game`
aggregate. Based on DDD best practices, we have decided to keep `Game`, `Team`,
and `Player` as separate, independent aggregates to ensure each one has a clear
boundary and a single transactional scope.

This decision creates a challenge: we cannot use traditional ACID database
transactions to enforce consistency for an operation that involves changes to
more than one aggregate. For example, assigning a player to a team for a
specific game involves both the `Team` and `Player` aggregates. A simple, atomic
transaction is not possible.

We need a mechanism to coordinate these changes reliably and ensure the system
reaches an eventually consistent state.

## Decision

We will use the **Saga pattern** to manage long-running business processes that
span multiple aggregates. Sagas will coordinate operations by responding to
events from one aggregate and dispatching commands to others.

To ensure reliable event publishing, we will implement the **Outbox Pattern**.
This pattern guarantees that an aggregate's events are published if, and only
if, the aggregate's own state change is successfully persisted. This avoids
issues with dual-writes (e.g., saving state to the database but failing to
publish the event to a message bus).

### Example Saga: Assigning a Player to a Team

This illustrates how we can handle a cross-aggregate operation with eventual
consistency:

1.  **Initiation**: A user action triggers a `AssignPlayerToTeam` command.

2.  **Reserve Slot (Team Aggregate)**: The command is sent to the `Team`
    aggregate. The `Team` validates its invariants (e.g., "does the team have an
    open roster spot?"). If valid, it reserves a spot and emits a
    `PlayerSlotReserved` event. It does _not_ fully add the player yet.

3.  **Start Saga**: A dedicated, stateless `PlayerAssignmentSaga` listens for
    the `PlayerSlotReserved` event.

4.  **Update Player State (Player Aggregate)**: The Saga receives the event and
    sends a `ConfirmPlayerAssignment` command to the `Player` aggregate.

5.  **Player Confirms**: The `Player` aggregate validates the command, updates
    its own state (e.g., `status: 'assigned'`), and emits a
    `PlayerAssignmentConfirmed` event.

6.  **Finalize Assignment (Team Aggregate)**: The `PlayerAssignmentSaga` listens
    for `PlayerAssignmentConfirmed`. Upon receiving it, it sends a final
    `FinalizePlayerAssignment` command to the `Team` aggregate, which moves the
    player from a "reserved" state to a fully confirmed member of the roster.

### Compensation (Error Handling)

If any step in the Saga fails, it is responsible for dispatching compensating
commands to revert the changes. For example, if the `Player` aggregate rejects
the assignment (step 5), it might emit a `PlayerAssignmentRejected` event. The
Saga would catch this and send a `CancelPlayerSlotReservation` command to the
`Team` aggregate to undo the initial reservation.

## Alternatives Considered

### Distributed Transactions (e.g., Two-Phase Commit)

- **Description**: A protocol that ensures all participating systems in a
  distributed transaction either all commit or all abort.
- **Pros**: Provides ACID-like guarantees across multiple systems.
- **Cons**: Creates temporal, tight coupling between services. It significantly
  reduces availability, as all participants must be online to complete the
  transaction. It is not well-supported by many modern database technologies.
- **Rejected**: The loss of autonomy and availability is too high a price to
  pay.

### Large Aggregates

- **Description**: Combine `Team`, `Player`, and `Game` into a single, massive
  aggregate. This would allow a single ACID transaction to manage all state
  changes.
- **Pros**: Simple transactional logic.
- **Cons**: Leads to huge, unmanageable models with high contention, poor
  performance, and unclear boundaries. It violates the core principles of DDD.
- **Rejected**: This approach does not scale and leads to a monolithic,
  tightly-coupled design.

## Consequences

### Positive

- **Loose Coupling**: Aggregates remain completely independent of each other.
  They communicate only via asynchronous events and commands.
- **High Cohesion**: Each aggregate remains focused on its specific set of
  business rules and invariants.
- **Scalability & Resilience**: The system is more resilient as the failure of
  one aggregate does not immediately impact others. Each aggregate can be scaled
  independently.
- **Clear Boundaries**: Reinforces the DDD principle of small, transactional
  aggregates.

### Negative

- **Increased Complexity**: The development model is more complex than simple
  ACID transactions. Developers must now reason about eventual consistency,
  idempotency, and compensating actions.
- **Debugging Challenges**: Tracing a single business process requires
  inspecting multiple, separate transactions across different aggregates.
- **Requires Tooling**: A robust implementation requires an outbox mechanism and
  a reliable message relay to ensure events are published correctly.

---

**Decision made by**: Development Team, Stakeholder **Review date**: 2025-09-28
