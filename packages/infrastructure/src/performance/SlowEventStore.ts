/**
 * @file SlowEventStore
 * Event store implementation with intentional delays to simulate real database performance.
 *
 * @remarks
 * This implementation wraps the InMemoryEventStore and adds configurable delays
 * to simulate real-world database performance characteristics. This allows us to
 * properly benchmark snapshot optimizations that would be invisible with purely
 * in-memory operations.
 */

import type { EventStore, StoredEvent } from '@twsoftball/application/ports/out/EventStore';
import type { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';

import { InMemoryEventStore } from '../persistence/InMemoryEventStore';

/**
 * Event store with configurable delays to simulate database latency.
 */
export class SlowEventStore implements EventStore {
  private readonly baseStore: InMemoryEventStore;
  private readonly eventReadDelayMs: number;
  private readonly eventWriteDelayMs: number;

  constructor(eventReadDelayMs = 1, eventWriteDelayMs = 2) {
    this.baseStore = new InMemoryEventStore();
    this.eventReadDelayMs = eventReadDelayMs;
    this.eventWriteDelayMs = eventWriteDelayMs;
  }

  async append(
    aggregateId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState',
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    // Simulate database write latency
    await this.delay(this.eventWriteDelayMs * events.length);
    return this.baseStore.append(aggregateId, aggregateType, events, expectedVersion);
  }

  async getEvents(
    aggregateId: GameId | TeamLineupId | InningStateId,
    fromVersion?: number
  ): Promise<StoredEvent[]> {
    const events = await this.baseStore.getEvents(aggregateId, fromVersion);

    // Simulate database read latency proportional to number of events ACTUALLY READ
    // This is the key optimization - snapshots reduce the number of events to read
    await this.delay(this.eventReadDelayMs * events.length);

    return events;
  }

  async getAllEvents(): Promise<StoredEvent[]> {
    const events = await this.baseStore.getAllEvents();
    // Simulate scanning entire database
    await this.delay(this.eventReadDelayMs * events.length * 0.1);
    return events;
  }

  async getEventsByType(eventType: string): Promise<StoredEvent[]> {
    const events = await this.baseStore.getEventsByType(eventType);
    // Simulate index scan
    await this.delay(this.eventReadDelayMs * events.length * 0.5);
    return events;
  }

  async getEventsByTimeRange(startTime: Date, endTime: Date): Promise<StoredEvent[]> {
    // Get all events and filter by time range
    const allEvents = await this.baseStore.getAllEvents();
    const events = allEvents.filter(
      event =>
        event.timestamp.getTime() >= startTime.getTime() &&
        event.timestamp.getTime() <= endTime.getTime()
    );
    // Simulate time-based query
    await this.delay(this.eventReadDelayMs * events.length * 0.3);
    return events;
  }

  async getGameEvents(gameId: GameId): Promise<StoredEvent[]> {
    const events = await this.baseStore.getGameEvents(gameId);
    // Simulate game-specific query
    await this.delay(this.eventReadDelayMs * events.length);
    return events;
  }

  async getEventsByGameId(gameId: GameId): Promise<StoredEvent[]> {
    const events = await this.baseStore.getEventsByGameId(gameId);
    // Simulate game-based query
    await this.delay(this.eventReadDelayMs * events.length);
    return events;
  }

  async exists(aggregateId: GameId | TeamLineupId | InningStateId): Promise<boolean> {
    // Simulate existence check
    await this.delay(0.5);
    const events = await this.baseStore.getEvents(aggregateId);
    return events.length > 0;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
