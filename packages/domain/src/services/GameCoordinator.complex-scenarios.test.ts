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

import { GameCoordinator } from './GameCoordinator.js';

describe('GameCoordinator - Complex Scenarios', () => {
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
    const teamSide = teamName.includes('Home') ? 'HOME' : 'AWAY';
    let lineup = TeamLineup.createNew(lineupId, gameId, teamName, teamSide);

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
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame(); // startGame() returns void, modifies in place

          // Set up a game in the 4th inning with 10-run differential, bottom half about to complete
          inningState = inningState.withInningHalf(4, false).withOuts(2); // Bottom 4th, 2 outs

          // Away team has 15 runs, home team has 5 runs (10-run differential)
          for (let i = 0; i < 15; i += 1) {
            game.addAwayRuns(1); // addAwayRuns returns void
          }
          for (let i = 0; i < 5; i += 1) {
            game.addHomeRuns(1); // addHomeRuns returns void
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.GROUND_OUT, // 3rd out - completes inning 4
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true);
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should apply 7-run mercy rule after 5th inning', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game in the 5th inning with 7-run differential, bottom half about to complete
          inningState = inningState.withInningHalf(5, false).withOuts(2); // Bottom 5th, 2 outs

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
            AtBatResultType.STRIKEOUT, // 3rd out - completes inning 5
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true);
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should apply 7-run mercy rule AT 5th inning (>= logic)', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game in the 5th inning with only 7-run differential, bottom half about to complete
          inningState = inningState.withInningHalf(5, false).withOuts(2); // Bottom 5th, 2 outs

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
            AtBatResultType.FLY_OUT, // 3rd out - completes inning 5
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true); // 7-run differential AT 5th inning triggers second tier
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should apply first tier in later innings when both tiers are met', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game in the 6th inning with 10-run differential, bottom half about to complete
          // Both tiers are met, but first tier applies
          inningState = inningState.withInningHalf(6, false).withOuts(2); // Bottom 6th, 2 outs

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
            AtBatResultType.FLY_OUT, // 3rd out - completes inning 6
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true);
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should apply mercy rule AT tier threshold (4th inning with 15-run differential)', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game in the 4th inning with 15-run differential, bottom half about to complete
          inningState = inningState.withInningHalf(4, false).withOuts(2); // Bottom 4th, 2 outs

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
            AtBatResultType.GROUND_OUT, // 3rd out - completes inning 4
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true); // 15-run differential meets first tier threshold (10 runs AT 4th inning)
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should NOT trigger mercy rule during mid-inning (bottom 4th with 0 outs)', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game in bottom 4th with 10-run differential but mid-inning (0 outs)
          inningState = inningState.withInningHalf(4, false).withOuts(0); // Bottom 4th, 0 outs (start of inning)

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
            []
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(false); // Should NOT end mid-inning
          expect(result.inningComplete).toBe(false);
        });

        it('should NOT trigger mercy rule after top half only (away team leads after top 4th)', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game where top 4th is about to complete, away team has 10+ run lead
          // But home team hasn't batted yet - should NOT trigger mercy rule
          inningState = inningState.withInningHalf(4, true).withOuts(2); // Top 4th, 2 outs (about to end top half)

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
            AtBatResultType.GROUND_OUT, // 3rd out - completes top 4th
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(false); // Should NOT end - home team must get their chance to bat
          expect(result.inningComplete).toBe(true); // Top half complete, transition to bottom
        });

        it('should trigger mercy rule only after complete inning (bottom 4th complete)', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game where bottom 4th is about to complete with 10-run differential
          inningState = inningState.withInningHalf(4, false).withOuts(2); // Bottom 4th, 2 outs

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
            AtBatResultType.GROUND_OUT, // 3rd out - completes bottom 4th
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true); // Should end - both teams batted in inning 4, mercy rule applies
          expect(result.completionReason).toBe('MERCY_RULE');
          expect(result.inningComplete).toBe(true);
        });

        it('should trigger mercy rule when home team leads after bottom 4th complete', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game where bottom 4th is about to complete with home team leading by 10
          inningState = inningState.withInningHalf(4, false).withOuts(2); // Bottom 4th, 2 outs

          // Home team has 20 runs, away team has 10 runs (10-run differential, home leading)
          for (let i = 0; i < 20; i += 1) {
            game.addHomeRuns(1);
          }
          for (let i = 0; i < 10; i += 1) {
            game.addAwayRuns(1);
          }

          const result = GameCoordinator.recordAtBat(
            game,
            homeLineup,
            awayLineup,
            inningState,
            batterId,
            AtBatResultType.STRIKEOUT, // 3rd out - completes bottom 4th
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true); // Should end - both teams batted, mercy rule applies
          expect(result.completionReason).toBe('MERCY_RULE');
          expect(result.inningComplete).toBe(true);
        });

        it('should trigger 7-run mercy rule after complete 5th inning', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game where bottom 5th is about to complete with 7-run differential
          inningState = inningState.withInningHalf(5, false).withOuts(2); // Bottom 5th, 2 outs

          // Away team has 12 runs, home team has 5 runs (7-run differential)
          for (let i = 0; i < 12; i += 1) {
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
            AtBatResultType.FLY_OUT, // 3rd out - completes bottom 5th
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true); // Should end - tier 2 mercy rule (7 runs after 5th)
          expect(result.completionReason).toBe('MERCY_RULE');
          expect(result.inningComplete).toBe(true);
        });

        it('should NOT trigger mercy rule when differential is below threshold', () => {
          // Create a game with two-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', twoTierRules);
          game.startGame();

          // Set up a game where bottom 5th completes with only 6-run differential (need 7)
          inningState = inningState.withInningHalf(5, false).withOuts(2); // Bottom 5th, 2 outs

          // Away team has 11 runs, home team has 5 runs (6-run differential - below tier 2 threshold)
          for (let i = 0; i < 11; i += 1) {
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
            AtBatResultType.FLY_OUT, // 3rd out - completes bottom 5th
            [],
            twoTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(false); // Should NOT end - 6 runs is below 7-run tier 2 threshold
          expect(result.inningComplete).toBe(true); // Inning completes, game continues to 6th
        });
      });

      describe('Single-tier mercy rule system', () => {
        const singleTierRules = new SoftballRules({
          mercyRuleEnabled: true,
          mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
        });

        it('should apply single mercy rule threshold correctly', () => {
          // Create a game with single-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', singleTierRules);
          game.startGame();

          // Set up a game in the 4th inning (after 3rd) with 15-run differential, bottom half about to complete
          inningState = inningState.withInningHalf(4, false).withOuts(2); // Bottom 4th, 2 outs

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
            AtBatResultType.STRIKEOUT, // 3rd out - completes inning 4
            [],
            singleTierRules
          );

          expect(result.success).toBe(true);
          expect(result.gameComplete).toBe(true);
          expect(result.completionReason).toBe('MERCY_RULE');
        });

        it('should not apply mercy rule when differential is insufficient', () => {
          // Create a game with single-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', singleTierRules);
          game.startGame();

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
            []
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
          // Create a game with mercy rules disabled
          game = Game.createNew(gameId, 'Home Team', 'Away Team', disabledRules);
          game.startGame();

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
            []
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

          // Create a game with three-tier mercy rules
          game = Game.createNew(gameId, 'Home Team', 'Away Team', threeTierRules);
          game.startGame();

          // Test third tier (8 runs after 6th inning) - set up bottom 7th about to complete
          inningState = inningState.withInningHalf(7, false).withOuts(2); // Bottom 7th, 2 outs

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
            AtBatResultType.FLY_OUT, // 3rd out - completes inning 7
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
});
