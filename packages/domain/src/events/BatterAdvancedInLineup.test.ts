import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { BatterAdvancedInLineup } from './BatterAdvancedInLineup.js';

describe('BatterAdvancedInLineup', () => {
  let gameId: GameId;
  let teamLineupId: TeamLineupId;

  beforeEach(() => {
    gameId = GameId.generate();
    teamLineupId = TeamLineupId.generate();
  });

  describe('constructor', () => {
    it('creates event with valid parameters', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'HOME');

      expect(event.gameId).toBe(gameId);
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.previousSlot).toBe(1);
      expect(event.newSlot).toBe(2);
      expect(event.teamSide).toBe('HOME');
      expect(event.type).toBe('BatterAdvancedInLineup');
    });

    it('creates event for AWAY team', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 5, 6, 'AWAY');

      expect(event.teamSide).toBe('AWAY');
    });

    it('creates event for cycling back to leadoff', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 9, 1, 'HOME');

      expect(event.previousSlot).toBe(9);
      expect(event.newSlot).toBe(1);
    });

    it('generates unique eventId', () => {
      const event1 = new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'HOME');
      const event2 = new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'HOME');

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('sets timestamp', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'HOME');

      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('sets version to 1', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'HOME');

      expect(event.version).toBe(1);
    });
  });

  describe('validation - previousSlot', () => {
    it('throws error when previousSlot is less than 1', () => {
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, 0, 2, 'HOME')).toThrow(
        DomainError
      );
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, 0, 2, 'HOME')).toThrow(
        'Previous slot must be between 1 and 20'
      );
    });

    it('throws error when previousSlot is negative', () => {
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, -1, 2, 'HOME')).toThrow(
        DomainError
      );
    });

    it('throws error when previousSlot exceeds 20', () => {
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, 21, 2, 'HOME')).toThrow(
        DomainError
      );
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, 21, 2, 'HOME')).toThrow(
        'Previous slot must be between 1 and 20'
      );
    });

    it('accepts previousSlot at boundary (1)', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'HOME');
      expect(event.previousSlot).toBe(1);
    });

    it('accepts previousSlot at boundary (20)', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 20, 1, 'HOME');
      expect(event.previousSlot).toBe(20);
    });
  });

  describe('validation - newSlot', () => {
    it('throws error when newSlot is less than 1', () => {
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, 1, 0, 'HOME')).toThrow(
        DomainError
      );
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, 1, 0, 'HOME')).toThrow(
        'New slot must be between 1 and 20'
      );
    });

    it('throws error when newSlot is negative', () => {
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, 1, -1, 'HOME')).toThrow(
        DomainError
      );
    });

    it('throws error when newSlot exceeds 20', () => {
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, 1, 21, 'HOME')).toThrow(
        DomainError
      );
      expect(() => new BatterAdvancedInLineup(gameId, teamLineupId, 1, 21, 'HOME')).toThrow(
        'New slot must be between 1 and 20'
      );
    });

    it('accepts newSlot at boundary (1)', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 9, 1, 'HOME');
      expect(event.newSlot).toBe(1);
    });

    it('accepts newSlot at boundary (20)', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 19, 20, 'HOME');
      expect(event.newSlot).toBe(20);
    });
  });

  describe('validation - teamSide', () => {
    it('throws error when teamSide is neither HOME nor AWAY', () => {
      expect(
        () => new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'INVALID' as 'HOME' | 'AWAY')
      ).toThrow(DomainError);
      expect(
        () => new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'INVALID' as 'HOME' | 'AWAY')
      ).toThrow('Team side must be either HOME or AWAY');
    });

    it('throws error when teamSide is empty string', () => {
      expect(
        () => new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, '' as 'HOME' | 'AWAY')
      ).toThrow(DomainError);
    });

    it('accepts HOME', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'HOME');
      expect(event.teamSide).toBe('HOME');
    });

    it('accepts AWAY', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 1, 2, 'AWAY');
      expect(event.teamSide).toBe('AWAY');
    });
  });

  describe('event properties', () => {
    it('includes all required domain event properties', () => {
      const event = new BatterAdvancedInLineup(gameId, teamLineupId, 3, 4, 'HOME');

      expect(event).toHaveProperty('eventId');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('version');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('gameId');
      expect(event).toHaveProperty('teamLineupId');
      expect(event).toHaveProperty('previousSlot');
      expect(event).toHaveProperty('newSlot');
      expect(event).toHaveProperty('teamSide');
    });
  });
});
