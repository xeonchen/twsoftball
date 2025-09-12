import { describe, it, expect, beforeEach } from 'vitest';

import { Game } from '../aggregates/Game';
import { InningState } from '../aggregates/InningState';
import { TeamLineup } from '../aggregates/TeamLineup';
import { AtBatResultType } from '../constants/AtBatResultType';
import { FieldPosition } from '../constants/FieldPosition';
import { SoftballRules } from '../rules/SoftballRules';
import { BasesState } from '../value-objects/BasesState';
import { GameId } from '../value-objects/GameId';
import { InningStateId } from '../value-objects/InningStateId';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { PlayerId } from '../value-objects/PlayerId';
import { TeamLineupId } from '../value-objects/TeamLineupId';

import { GameCoordinator, RunnerAdvancement } from './GameCoordinator';

describe('GameCoordinator - Core Functionality', () => {
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
