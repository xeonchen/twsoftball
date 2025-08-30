import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainEvent } from './DomainEvent';
import { GameId } from '../value-objects/GameId';

// Test implementation of DomainEvent for testing
class TestDomainEvent extends DomainEvent {
  readonly type = 'TestEvent';

  constructor(
    readonly gameId: GameId,
    public readonly payload: string
  ) {
    super();
  }
}

describe('DomainEvent', () => {
  beforeEach(() => {
    // Reset Date mock before each test
    vi.useRealTimers();
  });

  it('should generate unique event ID', () => {
    const gameId = new GameId('game-1');
    const event1 = new TestDomainEvent(gameId, 'test1');
    const event2 = new TestDomainEvent(gameId, 'test2');

    expect(event1.eventId).toBeDefined();
    expect(event2.eventId).toBeDefined();
    expect(event1.eventId).not.toBe(event2.eventId);
    expect(typeof event1.eventId).toBe('string');
    expect(event1.eventId.length).toBeGreaterThan(0);
  });

  it('should set timestamp to current time', () => {
    const beforeTime = new Date();
    const gameId = new GameId('game-1');
    const event = new TestDomainEvent(gameId, 'test');
    const afterTime = new Date();

    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  it('should have version 1', () => {
    const gameId = new GameId('game-1');
    const event = new TestDomainEvent(gameId, 'test');

    expect(event.version).toBe(1);
  });

  it('should require type to be implemented by subclass', () => {
    const gameId = new GameId('game-1');
    const event = new TestDomainEvent(gameId, 'test');

    expect(event.type).toBe('TestEvent');
  });

  it('should require gameId to be implemented by subclass', () => {
    const gameId = new GameId('game-123');
    const event = new TestDomainEvent(gameId, 'test');

    expect(event.gameId).toBe(gameId);
    expect(event.gameId.value).toBe('game-123');
  });

  it('should have consistent timestamp for same instance', () => {
    const gameId = new GameId('game-1');
    const event = new TestDomainEvent(gameId, 'test');
    const firstRead = event.timestamp;

    // Small delay to ensure time would be different if recreated
    setTimeout(() => {
      const secondRead = event.timestamp;
      expect(secondRead).toBe(firstRead);
    }, 10);
  });

  it('should be serializable', () => {
    const gameId = new GameId('game-1');
    const event = new TestDomainEvent(gameId, 'test payload');

    // Should be able to serialize and deserialize
    const serialized = JSON.stringify(event);
    const parsed = JSON.parse(serialized);

    expect(parsed.eventId).toBe(event.eventId);
    expect(parsed.type).toBe('TestEvent');
    expect(parsed.version).toBe(1);
    expect(parsed.gameId.value).toBe('game-1');
    expect(parsed.payload).toBe('test payload');
    expect(new Date(parsed.timestamp as string)).toEqual(event.timestamp);
  });
});
