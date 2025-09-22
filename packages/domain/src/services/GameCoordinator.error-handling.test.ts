import { describe, it, expect, beforeEach } from 'vitest';

import { Game } from '../aggregates/Game.js';
import { InningState } from '../aggregates/InningState.js';
import { TeamLineup } from '../aggregates/TeamLineup.js';
import { AtBatResultType } from '../constants/AtBatResultType.js';
import { FieldPosition } from '../constants/FieldPosition.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { GameId } from '../value-objects/GameId.js';
import { InningStateId } from '../value-objects/InningStateId.js';
import { JerseyNumber } from '../value-objects/JerseyNumber.js';
import { PlayerId } from '../value-objects/PlayerId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { GameCoordinator, RunnerAdvancement } from './GameCoordinator.js';

describe('GameCoordinator - Error Handling', () => {
  // Test data helpers
  const gameId = new GameId('game-123');
  const homeLineupId = new TeamLineupId('home-lineup-456');
  const awayLineupId = new TeamLineupId('away-lineup-789');
  const inningStateId = new InningStateId('inning-state-101');

  const batterId = new PlayerId('player-1'); // Use a player that's actually in the lineup
  const runner2Id = new PlayerId('player-2');

  // Common test state
  let game: Game;
  let homeLineup: TeamLineup;
  let awayLineup: TeamLineup;
  let inningState: InningState;
  let rules: SoftballRules;

  const createTestGame = (): Game => Game.createNew(gameId, 'Home Team', 'Away Team');

  const createTestLineup = (lineupId: TeamLineupId, teamName: string): TeamLineup => {
    let lineup = TeamLineup.createNew(lineupId, gameId, teamName);

    // Standard softball positions for 9 players
    const positions = [
      FieldPosition.PITCHER, // 1
      FieldPosition.CATCHER, // 2
      FieldPosition.FIRST_BASE, // 3
      FieldPosition.SECOND_BASE, // 4
      FieldPosition.THIRD_BASE, // 5
      FieldPosition.SHORTSTOP, // 6
      FieldPosition.LEFT_FIELD, // 7
      FieldPosition.CENTER_FIELD, // 8
      FieldPosition.RIGHT_FIELD, // 9
    ];

    // Add minimum required players (addPlayer returns new instance)
    for (let i = 1; i <= 9; i += 1) {
      const fieldPosition = positions[i - 1];
      if (!fieldPosition) {
        throw new Error(`No field position defined for player ${i}`);
      }
      lineup = lineup.addPlayer(
        new PlayerId(`player-${i}`),
        new JerseyNumber(i.toString()),
        `Player ${i}`,
        i, // batting position
        fieldPosition,
        new SoftballRules()
      );
    }

    return lineup;
  };

  const createTestInningState = (): InningState => InningState.createNew(inningStateId, gameId);

  beforeEach(() => {
    game = createTestGame();
    homeLineup = createTestLineup(homeLineupId, 'Home Team');
    awayLineup = createTestLineup(awayLineupId, 'Away Team');
    inningState = createTestInningState();
    rules = new SoftballRules();
  });

  describe('Error Handling', () => {
    it('should validate batter exists in current team lineup', () => {
      game.startGame();
      const invalidBatterId = new PlayerId('invalid-player');

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        invalidBatterId,
        AtBatResultType.SINGLE,
        [],
        rules
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("not in the current batting team's lineup");
    });

    it('should handle unexpected errors gracefully', () => {
      game.startGame();

      // Force an error by providing a scenario that will cause validateBatterEligibility to fail
      // Use an inning state that's out of sync with the current batter
      const invalidInningState = inningState.withCurrentBattingSlot(10); // Slot 10 doesn't match player-1

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        invalidInningState,
        batterId,
        AtBatResultType.SINGLE,
        [],
        rules
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.updatedGame).toBe(null);
      expect(result.updatedInningState).toBe(null);
      expect(result.runsScored).toBe(0);
      expect(result.rbis).toBe(0);
    });
  });

  describe('Error Handling Edge Cases', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should handle invalid runner advancement gracefully', () => {
      // Try to advance a runner that doesn't exist
      const invalidAdvancement: RunnerAdvancement[] = [
        { runnerId: new PlayerId('nonexistent'), fromBase: 'SECOND', toBase: 'THIRD' },
      ];

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        batterId,
        AtBatResultType.SINGLE,
        invalidAdvancement,
        rules
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('is not on');
      expect(result.updatedGame).toBe(null);
      expect(result.updatedInningState).toBe(null);
    });

    it('should handle missing batter in lineup gracefully', () => {
      const nonexistentBatter = new PlayerId('not-in-lineup');

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        nonexistentBatter,
        AtBatResultType.SINGLE,
        [],
        rules
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("not in the current batting team's lineup");
    });

    it('should validate runner exists on specified base', () => {
      // Place runner on first, then try to advance from second
      inningState = inningState.withRunnerOnBase('FIRST', runner2Id);

      const invalidAdvancement: RunnerAdvancement[] = [
        { runnerId: runner2Id, fromBase: 'SECOND', toBase: 'THIRD' }, // Wrong base
      ];

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        batterId,
        AtBatResultType.SINGLE,
        invalidAdvancement,
        rules
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('is not on SECOND base');
    });
  });
});
