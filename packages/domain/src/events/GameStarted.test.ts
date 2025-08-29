import { GameStarted } from './GameStarted';
import { GameId } from '../value-objects/GameId';

describe('GameStarted Domain Event', () => {
  let gameId: GameId;

  beforeEach(() => {
    gameId = GameId.generate();
  });

  describe('Event Creation', () => {
    it('should create event with valid game ID', () => {
      const event = new GameStarted(gameId);

      expect(event.gameId).toEqual(gameId);
      expect(event.type).toBe('GameStarted');
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should have immutable gameId property', () => {
      const event = new GameStarted(gameId);

      // gameId should be accessible and remain constant
      expect(event.gameId).toEqual(gameId);
      expect(event.gameId.value).toBe(gameId.value);

      // Property should remain constant throughout object lifecycle
      const originalId = event.gameId;
      expect(event.gameId).toEqual(originalId);
    });
  });

  describe('Domain Event Properties', () => {
    it('should have unique event IDs for different instances', () => {
      const event1 = new GameStarted(gameId);
      const event2 = new GameStarted(gameId);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have timestamps within reasonable range', () => {
      const beforeCreation = new Date();
      const event = new GameStarted(gameId);
      const afterCreation = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should maintain consistent type identifier', () => {
      const event1 = new GameStarted(gameId);
      const event2 = new GameStarted(GameId.generate());

      expect(event1.type).toBe('GameStarted');
      expect(event2.type).toBe('GameStarted');
      expect(event1.type).toBe(event2.type);
    });

    it('should use version 1 for all instances', () => {
      const event = new GameStarted(gameId);

      expect(event.version).toBe(1);
    });

    it('should accept different game IDs', () => {
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      const event1 = new GameStarted(gameId1);
      const event2 = new GameStarted(gameId2);

      expect(event1.gameId).toEqual(gameId1);
      expect(event2.gameId).toEqual(gameId2);
      expect(event1.gameId).not.toEqual(event2.gameId);
    });
  });

  describe('Business Context', () => {
    it('should capture the exact moment of game start', () => {
      const startTime = Date.now();
      const event = new GameStarted(gameId);
      const endTime = Date.now();

      // Event timestamp should be within the creation window
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(endTime);
    });

    it('should be associated with specific game aggregate', () => {
      const event = new GameStarted(gameId);

      // Event should maintain reference to the game it belongs to
      expect(event.gameId).toEqual(gameId);
      expect(event.gameId.value).toBe(gameId.value);
    });
  });
});
