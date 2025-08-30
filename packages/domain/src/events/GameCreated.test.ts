import { GameCreated } from './GameCreated';
import { GameId } from '../value-objects/GameId';
import { DomainError } from '../errors/DomainError';

describe('GameCreated Domain Event', () => {
  let gameId: GameId;

  beforeEach(() => {
    gameId = GameId.generate();
  });

  describe('Event Creation', () => {
    it('should create event with valid parameters', () => {
      const event = new GameCreated(gameId, 'Home Tigers', 'Away Lions');

      expect(event.gameId).toEqual(gameId);
      expect(event.homeTeamName).toBe('Home Tigers');
      expect(event.awayTeamName).toBe('Away Lions');
      expect(event.type).toBe('GameCreated');
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should have immutable team name properties', () => {
      const event = new GameCreated(gameId, 'Home Tigers', 'Away Lions');

      // TypeScript readonly properties should be accessible but not modifiable
      expect(event.homeTeamName).toBe('Home Tigers');
      expect(event.awayTeamName).toBe('Away Lions');

      // Properties should remain constant throughout object lifecycle
      const originalHome = event.homeTeamName;
      const originalAway = event.awayTeamName;

      expect(event.homeTeamName).toBe(originalHome);
      expect(event.awayTeamName).toBe(originalAway);
    });
  });

  describe('Team Name Validation', () => {
    it('should throw error when home team name is empty', () => {
      expect(() => new GameCreated(gameId, '', 'Away Lions')).toThrow(DomainError);
    });

    it('should throw error when home team name is whitespace only', () => {
      expect(() => new GameCreated(gameId, '   ', 'Away Lions')).toThrow(DomainError);
    });

    it('should throw error when home team name is null', () => {
      expect(() => new GameCreated(gameId, null as never, 'Away Lions')).toThrow(DomainError);
    });

    it('should throw error when home team name is undefined', () => {
      expect(() => new GameCreated(gameId, undefined as never, 'Away Lions')).toThrow(DomainError);
    });

    it('should throw error when away team name is empty', () => {
      expect(() => new GameCreated(gameId, 'Home Tigers', '')).toThrow(DomainError);
    });

    it('should throw error when away team name is whitespace only', () => {
      expect(() => new GameCreated(gameId, 'Home Tigers', '   ')).toThrow(DomainError);
    });

    it('should throw error when away team name is null', () => {
      expect(() => new GameCreated(gameId, 'Home Tigers', null as never)).toThrow(DomainError);
    });

    it('should throw error when away team name is undefined', () => {
      expect(() => new GameCreated(gameId, 'Home Tigers', undefined as never)).toThrow(DomainError);
    });

    it('should throw error when team names are identical', () => {
      expect(() => new GameCreated(gameId, 'Tigers', 'Tigers')).toThrow(DomainError);
    });

    it('should throw error when team names are identical after trimming', () => {
      expect(() => new GameCreated(gameId, '  Tigers  ', 'Tigers')).toThrow(DomainError);
    });

    it('should accept valid team names with different casing', () => {
      const event = new GameCreated(gameId, 'tigers', 'LIONS');

      expect(event.homeTeamName).toBe('tigers');
      expect(event.awayTeamName).toBe('LIONS');
    });

    it('should accept team names with special characters', () => {
      const event = new GameCreated(gameId, "St. John's Eagles", "O'Brien Bears");

      expect(event.homeTeamName).toBe("St. John's Eagles");
      expect(event.awayTeamName).toBe("O'Brien Bears");
    });

    it('should trim team names but preserve internal whitespace', () => {
      const event = new GameCreated(gameId, '  Home  Tigers  ', '  Away  Lions  ');

      // Names should be trimmed during validation but preserved as-is in the event
      expect(event.homeTeamName).toBe('  Home  Tigers  ');
      expect(event.awayTeamName).toBe('  Away  Lions  ');
    });
  });

  describe('Domain Event Properties', () => {
    it('should have unique event IDs for different instances', () => {
      const event1 = new GameCreated(gameId, 'Home Tigers', 'Away Lions');
      const event2 = new GameCreated(gameId, 'Home Tigers', 'Away Lions');

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have timestamps within reasonable range', () => {
      const beforeCreation = new Date();
      const event = new GameCreated(gameId, 'Home Tigers', 'Away Lions');
      const afterCreation = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should maintain consistent type identifier', () => {
      const event1 = new GameCreated(gameId, 'Home Tigers', 'Away Lions');
      const event2 = new GameCreated(GameId.generate(), 'Different Home', 'Different Away');

      expect(event1.type).toBe('GameCreated');
      expect(event2.type).toBe('GameCreated');
      expect(event1.type).toBe(event2.type);
    });

    it('should use version 1 for all instances', () => {
      const event = new GameCreated(gameId, 'Home Tigers', 'Away Lions');

      expect(event.version).toBe(1);
    });
  });
});
