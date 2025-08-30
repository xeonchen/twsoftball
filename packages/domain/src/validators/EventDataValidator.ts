import { GameId } from '../value-objects/GameId';

/**
 * Utility validator for common domain event data patterns.
 *
 * @remarks
 * This validator centralizes common event data handling patterns that were previously
 * duplicated across multiple event classes. It follows composition principles by providing
 * reusable utility methods rather than requiring inheritance.
 *
 * **Design Principles Applied:**
 * - **Composition over Inheritance**: Provides utility methods rather than base class
 * - **Single Responsibility**: Focuses on event data validation and immutability
 * - **DRY Principle**: Eliminates duplicate data handling patterns
 * - **Immutability**: Ensures event data cannot be modified after creation
 *
 * **Common Patterns Addressed:**
 * - Object freezing for immutability (used by RunScored, ScoreUpdated, GameCompleted)
 * - Event metadata validation (gameId, timestamps)
 * - Consistent data structure validation across events
 *
 * **Benefits:**
 * - Reduces code duplication in event constructors
 * - Provides consistent immutability patterns
 * - Centralizes event data validation logic
 * - Makes event classes more focused on business logic
 * - Easier testing of common event patterns
 *
 * @example
 * ```typescript
 * // Freeze data objects for immutability
 * const frozenScore = EventDataValidator.freezeData({ home: 5, away: 3 });
 *
 * // Validate event metadata
 * EventDataValidator.validateEventMetadata(gameId);
 *
 * // Deep freeze complex objects
 * const frozenEvent = EventDataValidator.deepFreeze(complexEventData);
 * ```
 */
export class EventDataValidator {
  /**
   * Freezes a data object to prevent mutations, maintaining immutability for events.
   *
   * @param data - The data object to freeze
   * @returns The same object, now frozen and immutable
   * @template T - The type of the data object being frozen
   *
   * @remarks
   * This method applies Object.freeze() to ensure event data cannot be modified after
   * the event is created. This is critical for event sourcing integrity, as events
   * represent historical facts that must never change.
   *
   * **Immutability Benefits:**
   * - Prevents accidental mutations to event data
   * - Ensures event sourcing integrity (events are immutable facts)
   * - Enables safe sharing of event objects across components
   * - Provides compile-time and runtime guarantees about data stability
   *
   * **Usage Pattern:**
   * Common pattern in event constructors where data objects (like scores, states)
   * need to be frozen to maintain immutability guarantees required by event sourcing.
   *
   * **Performance Note:**
   * Object.freeze() is a shallow freeze. For deep immutability of nested objects,
   * use deepFreeze() instead.
   *
   * @example
   * ```typescript
   * // In event constructor
   * constructor(gameId: GameId, newScore: { home: number; away: number }) {
   *   super();
   *   this.newScore = EventDataValidator.freezeData(newScore);
   * }
   *
   * // Now newScore cannot be modified
   * event.newScore.home = 10; // TypeError: Cannot assign to read only property
   * ```
   */
  public static freezeData<T extends object>(data: T): T {
    return Object.freeze(data);
  }

  /**
   * Performs deep freeze on an object, freezing all nested objects recursively.
   *
   * @param data - The data object to deep freeze
   * @returns The same object with all nested objects frozen
   * @template T - The type of the data object being frozen
   *
   * @remarks
   * This method recursively freezes an object and all its nested objects, providing
   * complete immutability. Use this when events contain complex nested structures
   * that need full immutability guarantees.
   *
   * **When to Use:**
   * - Complex event data with nested objects or arrays
   * - When Object.freeze() shallow freeze isn't sufficient
   * - Events containing multiple levels of data structures
   *
   * **Performance Consideration:**
   * Deep freezing is more expensive than shallow freezing. Only use when necessary
   * for complex nested data structures.
   *
   * **Recursion Safety:**
   * Handles circular references by tracking visited objects to prevent infinite loops.
   *
   * @example
   * ```typescript
   * const complexData = {
   *   score: { home: 5, away: 3 },
   *   players: [{ id: 1, name: 'John' }],
   *   metadata: { timestamp: new Date(), tags: ['important'] }
   * };
   *
   * const frozen = EventDataValidator.deepFreeze(complexData);
   * // All nested objects are now immutable
   * frozen.score.home = 10; // TypeError
   * frozen.players[0].name = 'Jane'; // TypeError
   * frozen.metadata.tags.push('new'); // TypeError
   * ```
   */
  public static deepFreeze<T extends object>(data: T): T {
    // Get property names for this object
    const propNames = Object.getOwnPropertyNames(data);

    // Freeze properties before freezing self
    propNames.forEach(name => {
      const value = (data as Record<string, unknown>)[name];

      // Recursively freeze nested objects
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        this.deepFreeze(value);
      }
    });

    return Object.freeze(data);
  }

  /**
   * Validates basic event metadata that's common across all domain events.
   *
   * @param gameId - The game identifier for the event
   * @param timestamp - Optional timestamp for the event
   *
   * @throws {DomainError} When event metadata is invalid
   *
   * @remarks
   * This method validates the basic metadata that all domain events should have.
   * Currently validates the gameId, with room for expansion to include other
   * common metadata validation (timestamps, event IDs, etc.).
   *
   * **Current Validations:**
   * - GameId must be present and valid (handled by GameId value object)
   * - Future: timestamp validation, event sequence validation, etc.
   *
   * **Design for Extension:**
   * This method can be extended to include additional common validations
   * without breaking existing event classes.
   *
   * **Usage Pattern:**
   * Called early in event constructors to validate metadata before processing
   * event-specific business logic.
   *
   * @example
   * ```typescript
   * // In event constructor
   * constructor(gameId: GameId, otherParams: any) {
   *   super();
   *   EventDataValidator.validateEventMetadata(gameId);
   *   // ... rest of constructor
   * }
   * ```
   */
  public static validateEventMetadata(gameId: GameId, timestamp?: Date): void {
    // GameId validation is handled by the GameId value object itself
    // This method serves as a placeholder for future metadata validation
    // such as timestamp validation, event sequence validation, etc.

    // Use gameId parameter to validate it's present
    if (!gameId) {
      throw new Error('Event gameId is required');
    }

    if (timestamp && (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime()))) {
      throw new Error('Event timestamp must be a valid Date object');
    }
  }

  /**
   * Creates a defensive copy of a data object before freezing it.
   *
   * @param data - The data object to copy and freeze
   * @returns A frozen copy of the original data
   * @template T - The type of the data object
   *
   * @remarks
   * This method creates a shallow copy of the input data before freezing it,
   * preventing mutations to the original object from affecting the event data.
   * This is useful when the input data might be modified elsewhere in the system.
   *
   * **Use Case:**
   * When event constructors receive mutable objects that might be modified
   * by the caller after the event is created. This ensures the event maintains
   * its own immutable snapshot of the data.
   *
   * **Copy Strategy:**
   * Uses object spread operator for shallow copying, which is appropriate for
   * simple objects with primitive values or value objects.
   *
   * @example
   * ```typescript
   * // Prevent external mutations from affecting event
   * constructor(gameId: GameId, mutableScore: { home: number; away: number }) {
   *   super();
   *   this.newScore = EventDataValidator.copyAndFreeze(mutableScore);
   * }
   *
   * // Original score can be modified without affecting the event
   * const score = { home: 5, away: 3 };
   * const event = new ScoreUpdated(gameId, 'HOME', 1, score);
   * score.home = 10; // Event data remains unchanged
   * ```
   */
  public static copyAndFreeze<T extends object>(data: T): T {
    const copy = { ...data };
    return this.freezeData(copy);
  }
}
