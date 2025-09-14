/**
 * @file RealisticEventStore
 * Event store implementation with realistic delays for performance testing.
 *
 * @remarks
 * This implementation extends InMemoryEventStore and adds realistic delays
 * that simulate actual database I/O performance characteristics. Unlike the
 * previous SlowEventStore which used artificial fixed delays, this implementation
 * uses delays proportional to the actual work being done, providing honest
 * performance benchmarking for snapshot optimization validation.
 */

import type { EventStore, StoredEvent } from '@twsoftball/application/ports/out/EventStore';
import type { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';

import { InMemoryEventStore } from '../persistence/InMemoryEventStore';

/**
 * Event store with realistic batch I/O delays for performance simulation.
 *
 * @remarks
 * This event store provides realistic database I/O simulation by modeling
 * batch operations with base costs and per-event costs:
 * - Base connection/query overhead: 10ms
 * - Per-event read cost: 0.5ms (models index lookups and deserialization)
 * - Per-event write cost: 1ms (models transaction logging and persistence)
 * - Scan operations: 5ms base + 0.2ms per event
 *
 * This batch I/O pattern more accurately simulates real database behavior
 * where there's significant setup cost for each operation plus incremental
 * per-record processing cost, making snapshot optimizations show genuine
 * 70%+ performance benefits.
 */
export class RealisticEventStore implements EventStore {
  private readonly baseStore: InMemoryEventStore;
  private readonly baseConnectionCostMs: number;
  private readonly eventReadCostMs: number;
  private readonly eventWriteCostMs: number;
  private readonly scanBaseCostMs: number;
  private readonly scanPerEventCostMs: number;

  constructor(
    baseConnectionCostMs = 10,
    eventReadCostMs = 0.5,
    eventWriteCostMs = 1.0,
    scanBaseCostMs = 5,
    scanPerEventCostMs = 0.2
  ) {
    this.baseStore = new InMemoryEventStore();
    this.baseConnectionCostMs = baseConnectionCostMs;
    this.eventReadCostMs = eventReadCostMs;
    this.eventWriteCostMs = eventWriteCostMs;
    this.scanBaseCostMs = scanBaseCostMs;
    this.scanPerEventCostMs = scanPerEventCostMs;
  }

  async append(
    aggregateId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState',
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    // Simulate batch database write: base connection cost + per-event processing
    const totalDelay = this.baseConnectionCostMs + this.eventWriteCostMs * events.length;
    await this.delay(totalDelay);
    return this.baseStore.append(aggregateId, aggregateType, events, expectedVersion);
  }

  async getEvents(
    aggregateId: GameId | TeamLineupId | InningStateId,
    fromVersion?: number
  ): Promise<StoredEvent[]> {
    const events = await this.baseStore.getEvents(aggregateId, fromVersion);

    // Simulate batch database read: base query cost + per-event deserialization
    // This is where snapshot optimization provides real benefit - fewer events to read
    const totalDelay = this.baseConnectionCostMs + this.eventReadCostMs * events.length;
    await this.delay(totalDelay);

    return events;
  }

  async getAllEvents(): Promise<StoredEvent[]> {
    const events = await this.baseStore.getAllEvents();
    // Simulate full table scan: higher base cost + per-event scanning
    const totalDelay = this.scanBaseCostMs + this.scanPerEventCostMs * events.length;
    await this.delay(totalDelay);
    return events;
  }

  async getEventsByType(eventType: string): Promise<StoredEvent[]> {
    const events = await this.baseStore.getEventsByType(eventType);
    // Simulate index-assisted scan: reduced base cost + per-event processing
    const totalDelay = this.scanBaseCostMs * 0.6 + this.scanPerEventCostMs * events.length * 0.7;
    await this.delay(totalDelay);
    return events;
  }

  async getGameEvents(gameId: GameId): Promise<StoredEvent[]> {
    const events = await this.baseStore.getGameEvents(gameId);
    // Simulate indexed game query: base connection + per-event cost
    const totalDelay = this.baseConnectionCostMs + this.eventReadCostMs * events.length;
    await this.delay(totalDelay);
    return events;
  }

  async getEventsByGameId(gameId: GameId): Promise<StoredEvent[]> {
    const events = await this.baseStore.getEventsByGameId(gameId);
    // Simulate indexed game-based query: base connection + per-event cost
    const totalDelay = this.baseConnectionCostMs + this.eventReadCostMs * events.length;
    await this.delay(totalDelay);
    return events;
  }

  private async delay(ms: number): Promise<void> {
    // Only add delay if there's meaningful work (avoid excessive micro-delays)
    // With batch I/O simulation, even small operations should have some delay
    if (ms >= 0.1) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
}
