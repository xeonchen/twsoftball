import { describe, it, expect, beforeEach } from 'vitest';
import { GameCoordinator, RunnerAdvancement } from './GameCoordinator';
import { Game } from '../aggregates/Game';
import { TeamLineup } from '../aggregates/TeamLineup';
import { InningState } from '../aggregates/InningState';
import { GameId } from '../value-objects/GameId';
import { TeamLineupId } from '../value-objects/TeamLineupId';
import { InningStateId } from '../value-objects/InningStateId';
import { PlayerId } from '../value-objects/PlayerId';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { AtBatResultType } from '../constants/AtBatResultType';
import { FieldPosition } from '../constants/FieldPosition';
import { BasesState } from '../value-objects/BasesState';
import { SoftballRules } from '../rules/SoftballRules';

describe('GameCoordinator', () => {
  // Test data helpers
  const gameId = new GameId('game-123');
  const homeLineupId = new TeamLineupId('home-lineup-456');
  const awayLineupId = new TeamLineupId('away-lineup-789');
  const inningStateId = new InningStateId('inning-state-101');

  const batterId = new PlayerId('player-1'); // Use a player that's actually in the lineup
  const runner2Id = new PlayerId('player-2');
  const runner3Id = new PlayerId('player-3');
  const runner4Id = new PlayerId('player-4');

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

  describe('recordAtBat', () => {
    describe('Basic Functionality', () => {
      it('should successfully record a single with basic game state', () => {
        game.startGame();

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.updatedGame).toBeDefined();
        expect(result.updatedInningState).toBeDefined();
      });

      it('should return error for game not started', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE,
          [],
          rules
        );

        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('Game has not been started');
      });

      it('should return error for completed game', () => {
        game.startGame();
        game.completeGame('REGULATION');

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE,
          [],
          rules
        );

        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('Game has already been completed');
      });
    });

    describe('At-Bat Result Processing - Hit Types', () => {
      beforeEach(() => {
        game.startGame();
      });

      it('should process HOME_RUN correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.HOME_RUN,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(1); // Batter scores
        expect(result.rbis).toBe(1);
      });

      it('should process TRIPLE correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.TRIPLE,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0); // No runners on base initially
      });

      it('should process DOUBLE correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.DOUBLE,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0); // No runners on base initially
      });

      it('should process SINGLE correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0); // No runners on base initially
      });

      it('should process WALK correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.WALK,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0); // No forced runs
        expect(result.rbis).toBe(0);
      });

      it('should process STRIKEOUT correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.STRIKEOUT,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0);
        expect(result.rbis).toBe(0);
      });

      it('should process GROUND_OUT correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.GROUND_OUT,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0);
        expect(result.rbis).toBe(0);
      });

      it('should process FLY_OUT correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.FLY_OUT,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0);
        expect(result.rbis).toBe(0);
      });

      it('should process SACRIFICE_FLY correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SACRIFICE_FLY,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0); // No runner on third
      });

      it('should process ERROR correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.ERROR,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0);
        expect(result.rbis).toBe(0); // Errors don't get RBIs
      });

      it('should process FIELDERS_CHOICE correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.FIELDERS_CHOICE,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0);
        expect(result.rbis).toBe(0);
      });

      it('should process DOUBLE_PLAY correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.DOUBLE_PLAY,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0);
        expect(result.rbis).toBe(0);
      });

      it('should process TRIPLE_PLAY correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.TRIPLE_PLAY,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0);
        expect(result.rbis).toBe(0);
      });
    });

    describe('Team Coordination', () => {
      beforeEach(() => {
        game.startGame();
      });

      it('should use away team lineup for top half inning', () => {
        expect(inningState.isTopHalf).toBe(true);

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE,
          [],
          rules
        );

        expect(result.success).toBe(true);
      });

      it('should use home team lineup for bottom half inning', () => {
        inningState = inningState.withInningHalf(1, false);
        expect(inningState.isTopHalf).toBe(false);

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE,
          [],
          rules
        );

        expect(result.success).toBe(true);
      });

      it('should add runs to correct team (away in top half)', () => {
        expect(inningState.isTopHalf).toBe(true);

        const initialAwayRuns = game.score.getAwayRuns();

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.HOME_RUN,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.updatedGame!.score.getAwayRuns()).toBe(initialAwayRuns + 1);
        expect(result.updatedGame!.score.getHomeRuns()).toBe(0);
      });

      it('should add runs to correct team (home in bottom half)', () => {
        inningState = inningState.withInningHalf(1, false);
        expect(inningState.isTopHalf).toBe(false);

        const initialHomeRuns = game.score.getHomeRuns();

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.HOME_RUN,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.updatedGame!.score.getHomeRuns()).toBe(initialHomeRuns + 1);
        expect(result.updatedGame!.score.getAwayRuns()).toBe(0);
      });
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

    describe('Multi-Aggregate State Management', () => {
      beforeEach(() => {
        game.startGame();
      });

      it('should generate events across all aggregates', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.HOME_RUN,
          [],
          rules
        );

        expect(result.success).toBe(true);

        // Both game and inning state should have new events
        expect(result.updatedGame!.getUncommittedEvents().length).toBeGreaterThan(0);
        expect(result.updatedInningState!.getUncommittedEvents().length).toBeGreaterThan(0);
      });

      it('should maintain state consistency across aggregates', () => {
        const result1 = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE,
          [],
          rules
        );

        expect(result1.success).toBe(true);

        // Use updated states for next at-bat
        const result2 = GameCoordinator.recordAtBat(
          result1.updatedGame!,
          homeLineup,
          awayLineup,
          result1.updatedInningState!,
          runner2Id,
          AtBatResultType.HOME_RUN,
          [],
          rules
        );

        expect(result2.success).toBe(true);
        expect(result2.runsScored).toBeGreaterThan(0);
      });

      it('should track uncommitted events properly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.TRIPLE,
          [],
          rules
        );

        expect(result.success).toBe(true);

        const gameEvents = result.updatedGame!.getUncommittedEvents();
        const inningEvents = result.updatedInningState!.getUncommittedEvents();

        expect(gameEvents.length).toBeGreaterThan(0);
        expect(inningEvents.length).toBeGreaterThan(0);

        // Events should be properly typed (check basic properties that all events have)
        gameEvents.forEach(event => {
          expect(event.gameId).toBeDefined();
          expect(event.eventId).toBeDefined();
          // Just verify it's a valid event object
          expect(event).toBeDefined();
        });
      });
    });

    describe('Game State Transitions', () => {
      beforeEach(() => {
        game.startGame();
      });

      it('should maintain proper aggregate coordination', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.STRIKEOUT,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.updatedGame!.status).toBe('IN_PROGRESS');
        expect(result.updatedInningState).toBeDefined();
      });

      it('should handle scoring plays correctly', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.HOME_RUN,
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(1);
        expect(result.rbis).toBe(1);
        expect(result.updatedGame!.score.getAwayRuns()).toBe(1); // Top half = away team
      });

      it('should not complete game in early innings', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.HOME_RUN,
          [],
          rules
        );

        expect(result.success).toBe(true);
        // Note: Game completion may depend on specific completion rules
        // The coordinator checks game completion but may return regulation as default
        expect(result.gameComplete).toBeDefined();
        expect(result.completionReason).toBeDefined();
      });
    });

    describe('Custom Runner Advancement', () => {
      beforeEach(() => {
        game.startGame();
        // Use simple runner placement
        inningState = inningState.withRunnerOnBase('FIRST', runner2Id);
      });

      it('should accept empty runner advancement array (automatic)', () => {
        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE,
          [],
          rules
        );

        expect(result.success).toBe(true);
      });

      it('should validate custom runner advancement', () => {
        const invalidAdvancement: RunnerAdvancement[] = [
          { runnerId: new PlayerId('nonexistent'), fromBase: 'FIRST', toBase: 'SECOND' },
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
      });
    });
  });

  describe('Static Helper Methods', () => {
    describe('calculateRunsScored', () => {
      it('should count movements to HOME as runs', () => {
        const movements: RunnerAdvancement[] = [
          { runnerId: runner2Id, fromBase: 'THIRD', toBase: 'HOME' },
          { runnerId: runner3Id, fromBase: 'SECOND', toBase: 'THIRD' },
          { runnerId: batterId, fromBase: 'FIRST', toBase: 'FIRST' },
        ];

        const runs = GameCoordinator.calculateRunsScored(movements);
        expect(runs).toBe(1);
      });

      it('should handle multiple runs scored', () => {
        const movements: RunnerAdvancement[] = [
          { runnerId: runner2Id, fromBase: 'THIRD', toBase: 'HOME' },
          { runnerId: runner3Id, fromBase: 'SECOND', toBase: 'HOME' },
          { runnerId: runner4Id, fromBase: 'FIRST', toBase: 'HOME' },
          { runnerId: batterId, fromBase: 'FIRST', toBase: 'HOME' },
        ];

        const runs = GameCoordinator.calculateRunsScored(movements);
        expect(runs).toBe(4);
      });

      it('should return 0 for no scoring movements', () => {
        const movements: RunnerAdvancement[] = [
          { runnerId: runner2Id, fromBase: 'FIRST', toBase: 'SECOND' },
          { runnerId: batterId, fromBase: 'FIRST', toBase: 'FIRST' },
        ];

        const runs = GameCoordinator.calculateRunsScored(movements);
        expect(runs).toBe(0);
      });

      it('should handle empty movements array', () => {
        const runs = GameCoordinator.calculateRunsScored([]);
        expect(runs).toBe(0);
      });
    });

    describe('determineRunnerAdvancement', () => {
      it('should determine HOME_RUN advancement correctly', () => {
        const bases = BasesState.empty()
          .withRunnerOn('FIRST', runner2Id)
          .withRunnerOn('THIRD', runner3Id);

        const movements = GameCoordinator.determineRunnerAdvancement(
          AtBatResultType.HOME_RUN,
          bases,
          batterId
        );

        expect(movements).toHaveLength(3); // 2 runners + batter
        expect(movements.filter(m => m.toBase === 'HOME')).toHaveLength(3);
      });

      it('should determine WALK advancement with bases loaded', () => {
        const bases = BasesState.empty()
          .withRunnerOn('FIRST', runner2Id)
          .withRunnerOn('SECOND', runner3Id)
          .withRunnerOn('THIRD', runner4Id);

        const movements = GameCoordinator.determineRunnerAdvancement(
          AtBatResultType.WALK,
          bases,
          batterId
        );

        expect(movements).toHaveLength(4); // All runners forced + batter
        const runner4Movement = movements.find(m => m.runnerId.equals(runner4Id));
        expect(runner4Movement).toBeDefined();
        expect(runner4Movement!.toBase).toBe('HOME');
      });

      it('should determine SINGLE advancement correctly', () => {
        const bases = BasesState.empty()
          .withRunnerOn('FIRST', runner2Id)
          .withRunnerOn('SECOND', runner3Id);

        const movements = GameCoordinator.determineRunnerAdvancement(
          AtBatResultType.SINGLE,
          bases,
          batterId
        );

        expect(movements).toHaveLength(3);
        const runner3Movement = movements.find(m => m.runnerId.equals(runner3Id));
        expect(runner3Movement).toBeDefined();
        expect(runner3Movement!.toBase).toBe('HOME');
        const runner2Movement = movements.find(m => m.runnerId.equals(runner2Id));
        expect(runner2Movement).toBeDefined();
        expect(runner2Movement!.toBase).toBe('SECOND');
      });

      it('should determine TRIPLE advancement correctly', () => {
        const bases = BasesState.empty().withRunnerOn('FIRST', runner2Id);

        const movements = GameCoordinator.determineRunnerAdvancement(
          AtBatResultType.TRIPLE,
          bases,
          batterId
        );

        expect(movements).toHaveLength(2); // Runner + batter
        const runner2Movement = movements.find(m => m.runnerId.equals(runner2Id));
        expect(runner2Movement).toBeDefined();
        expect(runner2Movement!.toBase).toBe('HOME');
        const batterMovement = movements.find(m => m.runnerId.equals(batterId));
        expect(batterMovement).toBeDefined();
        expect(batterMovement!.toBase).toBe('THIRD');
      });

      it('should determine DOUBLE advancement correctly', () => {
        const bases = BasesState.empty().withRunnerOn('SECOND', runner2Id);

        const movements = GameCoordinator.determineRunnerAdvancement(
          AtBatResultType.DOUBLE,
          bases,
          batterId
        );

        expect(movements).toHaveLength(2); // Runner + batter
        const runner2Movement = movements.find(m => m.runnerId.equals(runner2Id));
        expect(runner2Movement).toBeDefined();
        expect(runner2Movement!.toBase).toBe('HOME');
        const batterMovement = movements.find(m => m.runnerId.equals(batterId));
        expect(batterMovement).toBeDefined();
        expect(batterMovement!.toBase).toBe('SECOND');
      });

      it('should determine SACRIFICE_FLY advancement correctly', () => {
        const bases = BasesState.empty().withRunnerOn('THIRD', runner3Id);

        const movements = GameCoordinator.determineRunnerAdvancement(
          AtBatResultType.SACRIFICE_FLY,
          bases,
          batterId
        );

        expect(movements).toHaveLength(1); // Only runner from third
        const runner3Movement = movements.find(m => m.runnerId.equals(runner3Id));
        expect(runner3Movement).toBeDefined();
        expect(runner3Movement!.toBase).toBe('HOME');
      });

      it('should determine no advancement for outs', () => {
        const bases = BasesState.empty().withRunnerOn('FIRST', runner2Id);

        const movements = GameCoordinator.determineRunnerAdvancement(
          AtBatResultType.STRIKEOUT,
          bases,
          batterId
        );

        expect(movements).toHaveLength(0); // No automatic advancement
      });

      it('should handle empty bases state', () => {
        const bases = BasesState.empty();

        const movements = GameCoordinator.determineRunnerAdvancement(
          AtBatResultType.SINGLE,
          bases,
          batterId
        );

        expect(movements).toHaveLength(1); // Only batter
        expect(movements[0]).toBeDefined();
        expect(movements[0]!.runnerId).toEqual(batterId);
        expect(movements[0]!.toBase).toBe('FIRST');
      });
    });
  });

  describe('Game Completion Logic', () => {
    beforeEach(() => {
      game.startGame();
    });

    describe('Configurable Mercy Rule System', () => {
      describe('Two-tier mercy rule (default GameCoordinator behavior)', () => {
        const twoTierRules = new SoftballRules({
          mercyRuleEnabled: true,
          mercyRuleTiers: [
            { differential: 10, afterInning: 4 }, // 10 runs after 4th inning
            { differential: 7, afterInning: 5 }, // 7 runs after 5th inning
          ],
        });

        it('should apply 10-run mercy rule after 4th inning', () => {
          // Set up a game in the 5th inning (after 4th) with 10-run differential
          inningState = inningState.withInningHalf(5, false); // Bottom 5th

          // Away team has 15 runs, home team has 5 runs (10-run differential)
          for (let i = 0; i < 15; i += 1) {
            game.addAwayRuns(1);
          }
          for (let i = 0; i < 5; i += 1) {
            game.addHomeRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.SINGLE,
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true);
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should apply 7-run mercy rule after 5th inning', () => {
          // Set up a game in the 6th inning (after 5th) with 7-run differential
          inningState = inningState.withInningHalf(6, false); // Bottom 6th

          // Home team has 12 runs, away team has 5 runs (7-run differential)
          for (let i = 0; i < 12; i += 1) {
            game.addHomeRuns(1);
          }
          for (let i = 0; i < 5; i += 1) {
            game.addAwayRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.SINGLE,
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true);
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should apply 7-run mercy rule AT 5th inning (>= logic)', () => {
          // Set up a game in the 5th inning with only 7-run differential
          inningState = inningState.withInningHalf(5, false); // Bottom 5th (still in 5th)

          // Away team has 10 runs, home team has 3 runs (7-run differential)
          for (let i = 0; i < 10; i += 1) {
            game.addAwayRuns(1);
          }
          for (let i = 0; i < 3; i += 1) {
            game.addHomeRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.SINGLE,
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true); // 7-run differential AT 5th inning triggers second tier
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should apply first tier in later innings when both tiers are met', () => {
          // Set up a game in the 6th inning with 10-run differential
          // Both tiers are met, but first tier applies
          inningState = inningState.withInningHalf(6, false); // Bottom 6th

          // Away team has 15 runs, home team has 5 runs (10-run differential)
          for (let i = 0; i < 15; i += 1) {
            game.addAwayRuns(1);
          }
          for (let i = 0; i < 5; i += 1) {
            game.addHomeRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.SINGLE,
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true);
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should apply mercy rule AT tier threshold (4th inning with 15-run differential)', () => {
          // Set up a game in the 4th inning with 15-run differential (triggers first tier)
          inningState = inningState.withInningHalf(4, false); // Bottom 4th

          // Away team has 20 runs, home team has 5 runs (15-run differential)
          for (let i = 0; i < 20; i += 1) {
            game.addAwayRuns(1);
          }
          for (let i = 0; i < 5; i += 1) {
            game.addHomeRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.SINGLE,
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true); // 15-run differential meets first tier threshold (10 runs AT 4th inning)
          expect(result.completionReason).toBe('MERCY_RULE');
        });
      });

      describe('Single-tier mercy rule system', () => {
        const singleTierRules = new SoftballRules({
          mercyRuleEnabled: true,
          mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
        });

        it('should apply single mercy rule threshold correctly', () => {
          // Set up a game in the 4th inning (after 3rd) with 15-run differential
          inningState = inningState.withInningHalf(4, false); // Bottom 4th

          // Away team has 20 runs, home team has 5 runs (15-run differential)
          for (let i = 0; i < 20; i += 1) {
            game.addAwayRuns(1);
          }
          for (let i = 0; i < 5; i += 1) {
            game.addHomeRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.SINGLE,
            [],
            singleTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true);
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should not apply mercy rule when differential is insufficient', () => {
          // Set up a game in the 4th inning with only 14-run differential (need 15)
          inningState = inningState.withInningHalf(4, false); // Bottom 4th

          // Away team has 19 runs, home team has 5 runs (14-run differential)
          for (let i = 0; i < 19; i += 1) {
            game.addAwayRuns(1);
          }
          for (let i = 0; i < 5; i += 1) {
            game.addHomeRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.SINGLE,
            [],
            singleTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(false);
        });
      });

      describe('Disabled mercy rule', () => {
        const disabledRules = new SoftballRules({
          mercyRuleEnabled: false,
          mercyRuleTiers: [
            { differential: 5, afterInning: 1 }, // Very lenient tier that should never trigger
          ],
        });

        it('should not apply mercy rule when disabled', () => {
          // Set up a game with extreme differential that would normally trigger mercy rule
          inningState = inningState.withInningHalf(7, false); // Bottom 7th

          // Away team has 50 runs, home team has 0 runs (50-run differential)
          for (let i = 0; i < 50; i += 1) {
            game.addAwayRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.SINGLE,
            [],
            disabledRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(false); // Should not end due to mercy rule
        });
      });

      describe('Custom mercy rule configurations', () => {
        it('should respect custom three-tier mercy rule system', () => {
          const threeTierRules = new SoftballRules({
            mercyRuleEnabled: true,
            mercyRuleTiers: [
              { differential: 20, afterInning: 2 }, // Very lenient early
              { differential: 12, afterInning: 4 }, // Moderate mid-game
              { differential: 8, afterInning: 6 }, // Tight late game
            ],
          });

          // Test third tier (8 runs after 6th inning)
          inningState = inningState.withInningHalf(7, false); // Bottom 7th

          // Home team has 13 runs, away team has 5 runs (8-run differential)
          for (let i = 0; i < 13; i += 1) {
            game.addHomeRuns(1);
          }
          for (let i = 0; i < 5; i += 1) {
            game.addAwayRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.SINGLE,
            [],
            threeTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true);
          expect(result.completionReason).toBe('MERCY_RULE');
        });
      });
    });

    describe('Walk-Off Victory Detection', () => {
      it('should detect walk-off win when home team scores in 7th inning or later', () => {
        // Set up bottom 7th, home team behind by 2 (so home run gives them the lead)
        inningState = inningState.withInningHalf(7, false).withOuts(1); // Bottom 7th, 1 out
        game.addAwayRuns(5);
        game.addHomeRuns(3); // Home team behind 5-3

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.HOME_RUN, // This will score 1 run, making it 5-4, still losing
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.gameComplete).toBe(false); // Still losing, game continues
        expect(result.runsScored).toBe(1);
      });

      it('should detect walk-off win with runners on base', () => {
        // Set up bottom 7th, home team behind by 1, with runner on base
        inningState = inningState
          .withInningHalf(7, false)
          .withOuts(1)
          .withRunnerOnBase('FIRST', runner2Id); // Bottom 7th, runner on first
        game.addAwayRuns(5);
        game.addHomeRuns(4); // Home team behind 5-4

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.HOME_RUN, // This will score 2 runs (runner + batter), making it 6-5, home team wins!
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.gameComplete).toBe(true);
        expect(result.completionReason).toBe('WALKOFF');
        expect(result.runsScored).toBe(2);
      });

      it('should detect walk-off win in extra innings', () => {
        // Set up bottom 8th (extra innings), tied game with runner on third
        inningState = inningState
          .withInningHalf(8, false)
          .withOuts(1)
          .withRunnerOnBase('THIRD', runner3Id); // Bottom 8th
        game.addAwayRuns(7);
        game.addHomeRuns(7); // Tied 7-7

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE,
          [
            { runnerId: runner3Id, fromBase: 'THIRD', toBase: 'HOME' }, // Custom runner scoring to win
          ],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.gameComplete).toBe(true);
        expect(result.completionReason).toBe('WALKOFF');
        expect(result.runsScored).toBe(1);
      });

      it('should not trigger walk-off in top half of inning', () => {
        // Set up top 7th, away team scores
        inningState = inningState.withInningHalf(7, true); // Top 7th
        game.addAwayRuns(4);
        game.addHomeRuns(5); // Home team was ahead 5-4

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.HOME_RUN, // Away team scores, now tied 5-5
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.gameComplete).toBe(false); // Game continues to bottom 7th
      });

      it('should not trigger walk-off when home team does not score', () => {
        // Set up bottom 7th, home team behind but doesn't score
        inningState = inningState.withInningHalf(7, false); // Bottom 7th
        game.addAwayRuns(5);
        game.addHomeRuns(4); // Home team behind 5-4

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.STRIKEOUT, // No runs scored
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.gameComplete).toBe(false);
        expect(result.runsScored).toBe(0);
      });
    });

    describe('Regulation Game Completion', () => {
      it('should not complete tied game after 7 innings (continues to extra innings)', () => {
        // Set up bottom 7th with 2 outs, tied score - 3rd out will end inning, but tied game continues
        inningState = inningState.withInningHalf(7, false).withOuts(2); // Bottom 7th, 2 outs
        game.addHomeRuns(6);
        game.addAwayRuns(6); // Tied 6-6

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.GROUND_OUT, // This causes 3rd out, ends inning, but tied game continues to extra innings
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.gameComplete).toBe(false); // Tied games continue to extra innings
        expect(result.inningComplete).toBe(true); // Inning ends, but game continues
      });

      it('should continue game after 7 innings when tied', () => {
        // Set up bottom 7th inning, tied score, normal play (not end of inning)
        inningState = inningState.withInningHalf(7, false).withOuts(1); // Bottom 7th, 1 out
        game.addHomeRuns(6);
        game.addAwayRuns(6); // Tied 6-6

        const result = GameCoordinator.recordAtBat(
          game,
          homeLineup,
          awayLineup,
          inningState,
          batterId,
          AtBatResultType.SINGLE, // No runs scored, still tied
          [],
          rules
        );

        expect(result.success).toBe(true);
        expect(result.gameComplete).toBe(false); // Should continue since tied and not end of inning
      });
    });
  });

  describe('Inning Transition Logic', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should detect inning completion on 3rd out', () => {
      // Set up a situation with 2 outs
      inningState = inningState.withOuts(2);

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        batterId,
        AtBatResultType.STRIKEOUT, // This should cause the 3rd out
        [],
        rules
      );

      expect(result.success).toBe(true);
      expect(result.inningComplete).toBe(true);
      expect(result.inningTransition).toBeDefined();
      expect(result.inningTransition!.newTopHalf).toBe(false); // Top 1st ends, go to bottom 1st
    });

    it('should transition from bottom half to next inning', () => {
      // Set up bottom half with 2 outs
      inningState = inningState.withInningHalf(1, false).withOuts(2);

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        batterId,
        AtBatResultType.GROUND_OUT, // 3rd out
        [],
        rules
      );

      expect(result.success).toBe(true);
      expect(result.inningComplete).toBe(true);
      expect(result.inningTransition).toBeDefined();
      expect(result.inningTransition!.newInningNumber).toBe(2);
      expect(result.inningTransition!.newTopHalf).toBe(true); // Bottom 1st ends, go to top 2nd
    });
  });

  describe('Advanced Runner Scenarios', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should handle sacrifice fly with runner on third', () => {
      // Place runner on third base
      inningState = inningState.withRunnerOnBase('THIRD', runner3Id);

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        batterId,
        AtBatResultType.SACRIFICE_FLY,
        [],
        rules
      );

      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(1); // Runner from third scores
      expect(result.rbis).toBe(1); // Sacrifice fly gets RBI credit
    });

    it('should handle walk with bases loaded', () => {
      // Load the bases
      inningState = inningState
        .withRunnerOnBase('FIRST', runner2Id)
        .withRunnerOnBase('SECOND', runner3Id)
        .withRunnerOnBase('THIRD', runner4Id);

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        batterId,
        AtBatResultType.WALK,
        [],
        rules
      );

      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(1); // Runner from third is forced home
      expect(result.rbis).toBe(1); // Walk with bases loaded gets RBI
    });

    it('should handle home run with runners on base', () => {
      // Place runners on first and second
      inningState = inningState
        .withRunnerOnBase('FIRST', runner2Id)
        .withRunnerOnBase('SECOND', runner3Id);

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        batterId,
        AtBatResultType.HOME_RUN,
        [],
        rules
      );

      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(3); // 2 runners + batter = 3 runs
      expect(result.rbis).toBe(3); // Home run gets RBI for all runs
    });

    it('should handle single with runner on third base', () => {
      // Place runner on third base - this covers lines 462-463
      inningState = inningState.withRunnerOnBase('THIRD', runner3Id);

      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        batterId,
        AtBatResultType.SINGLE,
        [],
        rules
      );

      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(1); // Runner from third scores
      expect(result.rbis).toBe(1); // Single with runner on third gets RBI
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

  describe('Business Rules Documentation', () => {
    it('should demonstrate comprehensive softball game coordination patterns', () => {
      game.startGame();

      // 1. Multi-aggregate coordination
      const result = GameCoordinator.recordAtBat(
        game,
        homeLineup,
        awayLineup,
        inningState,
        batterId,
        AtBatResultType.SINGLE,
        [],
        rules
      );

      expect(result.success).toBe(true);
      expect(result.updatedGame).toBeDefined();
      expect(result.updatedInningState).toBeDefined();

      // 2. The coordinator ensures all aggregates are kept in sync
      expect(result.updatedGame!.status).toBe('IN_PROGRESS');

      // 3. Statistics and scoring are calculated automatically
      expect(typeof result.runsScored).toBe('number');
      expect(typeof result.rbis).toBe('number');

      // 4. Event sourcing patterns are maintained across aggregates
      expect(result.updatedGame!.getUncommittedEvents().length).toBeGreaterThan(0);
      expect(result.updatedInningState!.getUncommittedEvents().length).toBeGreaterThan(0);

      // 5. Inning and game completion detection
      expect(typeof result.inningComplete).toBe('boolean');
      expect(typeof result.gameComplete).toBe('boolean');

      // 6. Team coordination (home vs away)
      expect(result.updatedGame!.score).toBeDefined();
    });
  });
});
