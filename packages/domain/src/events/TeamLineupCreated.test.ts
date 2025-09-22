import { GameId } from '../value-objects/GameId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { TeamLineupCreated } from './TeamLineupCreated.js';

describe('TeamLineupCreated', () => {
  let teamLineupId: TeamLineupId;
  let gameId: GameId;

  beforeEach(() => {
    teamLineupId = TeamLineupId.generate();
    gameId = GameId.generate();
  });

  describe('constructor', () => {
    it('creates event with valid parameters', () => {
      const event = new TeamLineupCreated(teamLineupId, gameId, 'Springfield Tigers');

      expect(event.type).toBe('TeamLineupCreated');
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.gameId).toBe(gameId);
      expect(event.teamName).toBe('Springfield Tigers');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('preserves team name exactly as provided', () => {
      const teamName = 'Team with Special Characters @#$%';
      const event = new TeamLineupCreated(teamLineupId, gameId, teamName);

      expect(event.teamName).toBe(teamName);
    });

    it('handles empty team name', () => {
      const event = new TeamLineupCreated(teamLineupId, gameId, '');

      expect(event.teamName).toBe('');
    });

    it('inherits from DomainEvent with timestamp', () => {
      const before = new Date();
      const event = new TeamLineupCreated(teamLineupId, gameId, 'Test Team');
      const after = new Date();

      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('event properties', () => {
    it('has immutable properties', () => {
      const event = new TeamLineupCreated(teamLineupId, gameId, 'Test Team');

      // Properties should be accessible
      expect(event.type).toBe('TeamLineupCreated');
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.gameId).toBe(gameId);
      expect(event.teamName).toBe('Test Team');
    });
  });
});
