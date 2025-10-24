import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { BatterAdvancedInLineup } from '../events/BatterAdvancedInLineup.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { GameId } from '../value-objects/GameId.js';
import { JerseyNumber } from '../value-objects/JerseyNumber.js';
import { PlayerId } from '../value-objects/PlayerId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { TeamLineup } from './TeamLineup.js';

describe('TeamLineup - Batting Position Management', () => {
  let lineupId: TeamLineupId;
  let gameId: GameId;
  let rules: SoftballRules;

  beforeEach(() => {
    lineupId = TeamLineupId.generate();
    gameId = GameId.generate();
    rules = new SoftballRules();
  });

  describe('currentBatterSlot initialization', () => {
    it('should initialize with currentBatterSlot = 1', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      expect(lineup.getCurrentBatterSlot()).toBe(1);
    });

    it('should maintain currentBatterSlot = 1 after adding players', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('1'),
        'Player 1',
        1,
        FieldPosition.PITCHER,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('2'),
        'Player 2',
        2,
        FieldPosition.CATCHER,
        rules
      );

      expect(lineup.getCurrentBatterSlot()).toBe(1);
    });
  });

  describe('advanceBatter', () => {
    it('should advance from slot 1 to slot 2', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      const updatedLineup = lineup.advanceBatter(9);

      expect(updatedLineup.getCurrentBatterSlot()).toBe(2);
    });

    it('should advance from slot 2 to slot 3', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.advanceBatter(9); // 1 -> 2
      lineup = lineup.advanceBatter(9); // 2 -> 3

      expect(lineup.getCurrentBatterSlot()).toBe(3);
    });

    it('should cycle from slot 9 back to slot 1 (standard 9-player lineup)', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');

      // Advance to slot 9
      for (let i = 0; i < 8; i += 1) {
        lineup = lineup.advanceBatter(9);
      }
      expect(lineup.getCurrentBatterSlot()).toBe(9);

      // Advance one more - should cycle back to 1
      lineup = lineup.advanceBatter(9);
      expect(lineup.getCurrentBatterSlot()).toBe(1);
    });

    it('should cycle from slot 10 back to slot 1 (10-player lineup)', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');

      // Advance to slot 10
      for (let i = 0; i < 9; i += 1) {
        lineup = lineup.advanceBatter(10);
      }
      expect(lineup.getCurrentBatterSlot()).toBe(10);

      // Advance one more - should cycle back to 1
      lineup = lineup.advanceBatter(10);
      expect(lineup.getCurrentBatterSlot()).toBe(1);
    });

    it('should throw error when totalSlots is less than 1', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      expect(() => lineup.advanceBatter(0)).toThrow(DomainError);
      expect(() => lineup.advanceBatter(-1)).toThrow(DomainError);
    });

    it('should throw error when totalSlots exceeds maximum allowed', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      expect(() => lineup.advanceBatter(21)).toThrow(DomainError);
    });

    it('should emit BatterAdvancedInLineup event when advancing', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      const updatedLineup = lineup.advanceBatter(9);

      const events = updatedLineup.getUncommittedEvents();
      const advanceEvent = events.find(
        e => e.type === 'BatterAdvancedInLineup'
      ) as BatterAdvancedInLineup;

      expect(advanceEvent).toBeDefined();
      expect(advanceEvent.previousSlot).toBe(1);
      expect(advanceEvent.newSlot).toBe(2);
      expect(advanceEvent.gameId).toEqual(gameId);
      expect(advanceEvent.teamLineupId).toEqual(lineupId);
    });

    it('should emit correct event when cycling back to slot 1', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');

      // Advance to slot 9
      for (let i = 0; i < 8; i += 1) {
        lineup = lineup.advanceBatter(9);
      }

      // Clear events to focus on the cycle event
      lineup.markEventsAsCommitted();

      // Cycle back to 1
      lineup = lineup.advanceBatter(9);

      const events = lineup.getUncommittedEvents();
      const cycleEvent = events.find(
        e => e.type === 'BatterAdvancedInLineup'
      ) as BatterAdvancedInLineup;

      expect(cycleEvent).toBeDefined();
      expect(cycleEvent.previousSlot).toBe(9);
      expect(cycleEvent.newSlot).toBe(1);
    });

    it('should return new instance (immutability)', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      const updatedLineup = lineup.advanceBatter(9);

      expect(updatedLineup).not.toBe(lineup);
      expect(lineup.getCurrentBatterSlot()).toBe(1);
      expect(updatedLineup.getCurrentBatterSlot()).toBe(2);
    });
  });

  describe('event sourcing with currentBatterSlot', () => {
    it('should reconstruct currentBatterSlot from events', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.advanceBatter(9); // 1 -> 2
      lineup = lineup.advanceBatter(9); // 2 -> 3

      const events = lineup.getUncommittedEvents();
      const reconstructed = TeamLineup.fromEvents(events);

      expect(reconstructed.getCurrentBatterSlot()).toBe(3);
    });

    it('should reconstruct currentBatterSlot after multiple advances', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');

      // Advance through multiple slots
      for (let i = 0; i < 5; i += 1) {
        lineup = lineup.advanceBatter(9);
      }

      const events = lineup.getUncommittedEvents();
      const reconstructed = TeamLineup.fromEvents(events);

      expect(reconstructed.getCurrentBatterSlot()).toBe(6);
    });

    it('should reconstruct currentBatterSlot after cycling', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');

      // Advance through full cycle and then some
      for (let i = 0; i < 11; i += 1) {
        lineup = lineup.advanceBatter(9);
      }

      const events = lineup.getUncommittedEvents();
      const reconstructed = TeamLineup.fromEvents(events);

      // After 11 advances from slot 1: should be at slot 3 (1 + 11 = 12, 12 % 9 = 3)
      expect(reconstructed.getCurrentBatterSlot()).toBe(3);
    });

    it('should handle mixed events (player additions and batter advances)', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('1'),
        'Player 1',
        1,
        FieldPosition.PITCHER,
        rules
      );
      lineup = lineup.advanceBatter(9); // 1 -> 2
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('2'),
        'Player 2',
        2,
        FieldPosition.CATCHER,
        rules
      );
      lineup = lineup.advanceBatter(9); // 2 -> 3

      const events = lineup.getUncommittedEvents();
      const reconstructed = TeamLineup.fromEvents(events);

      expect(reconstructed.getCurrentBatterSlot()).toBe(3);
      expect(reconstructed.getActiveLineup()).toHaveLength(2);
    });
  });

  describe('version tracking', () => {
    it('should increment version when advancing batter', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      const initialVersion = lineup.getVersion();

      const updatedLineup = lineup.advanceBatter(9);

      expect(updatedLineup.getVersion()).toBe(initialVersion + 1);
    });

    it('should increment version for each advance', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      const initialVersion = lineup.getVersion();

      lineup = lineup.advanceBatter(9);
      lineup = lineup.advanceBatter(9);
      lineup = lineup.advanceBatter(9);

      expect(lineup.getVersion()).toBe(initialVersion + 3);
    });
  });
});
