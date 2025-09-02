import { describe, it, expect } from 'vitest';

import { AtBatResultType } from '../constants/AtBatResultType';
import { DomainError } from '../errors/DomainError';
import { BasesState } from '../value-objects/BasesState';
import { PlayerId } from '../value-objects/PlayerId';

import { RBICalculator } from './RBICalculator';

describe('RBICalculator', () => {
  // Test data
  const runner1 = new PlayerId('runner-1');
  const runner2 = new PlayerId('runner-2');
  const runner3 = new PlayerId('runner-3');

  describe('calculateRBIs', () => {
    describe('Home Runs', () => {
      it('should award RBIs for batter plus all runners on a home run', () => {
        // Bases loaded scenario
        const basesLoaded = BasesState.empty()
          .withRunnerOn('FIRST', runner1)
          .withRunnerOn('SECOND', runner2)
          .withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(
          AtBatResultType.HOME_RUN,
          basesLoaded,
          0 // outs before at-bat
        );

        expect(rbis).toBe(4); // Batter + 3 runners
      });

      it('should award 1 RBI for solo home run with empty bases', () => {
        const emptyBases = BasesState.empty();

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.HOME_RUN, emptyBases, 0);

        expect(rbis).toBe(1); // Just the batter
      });

      it('should award RBIs for home run with runners on first and third', () => {
        const bases = BasesState.empty()
          .withRunnerOn('FIRST', runner1)
          .withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.HOME_RUN, bases, 0);

        expect(rbis).toBe(3); // Batter + 2 runners
      });
    });

    describe('Sacrifice Flies', () => {
      it('should award 1 RBI for sacrifice fly that scores runner from third', () => {
        const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.SACRIFICE_FLY, runnerOnThird, 0);

        expect(rbis).toBe(1);
      });

      it('should award 0 RBIs for sacrifice fly with no runner on third', () => {
        const runnerOnSecond = BasesState.empty().withRunnerOn('SECOND', runner2);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.SACRIFICE_FLY, runnerOnSecond, 0);

        expect(rbis).toBe(0);
      });

      it('should award 1 RBI for sacrifice fly with bases loaded (only third base runner scores)', () => {
        const basesLoaded = BasesState.empty()
          .withRunnerOn('FIRST', runner1)
          .withRunnerOn('SECOND', runner2)
          .withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.SACRIFICE_FLY, basesLoaded, 0);

        expect(rbis).toBe(1); // Only runner on third scores on sac fly
      });
    });

    describe('Base Hits', () => {
      it('should award RBIs for single that scores runners in scoring position', () => {
        const bases = BasesState.empty()
          .withRunnerOn('SECOND', runner2)
          .withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.SINGLE, bases, 0);

        expect(rbis).toBe(2); // Both runners in scoring position score
      });

      it('should award 0 RBIs for single with only runner on first', () => {
        const runnerOnFirst = BasesState.empty().withRunnerOn('FIRST', runner1);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.SINGLE, runnerOnFirst, 0);

        expect(rbis).toBe(0); // Runner on first typically doesn't score on single
      });

      it('should award RBIs for double that scores all runners', () => {
        const basesLoaded = BasesState.empty()
          .withRunnerOn('FIRST', runner1)
          .withRunnerOn('SECOND', runner2)
          .withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.DOUBLE, basesLoaded, 0);

        expect(rbis).toBe(3); // All runners score on double
      });

      it('should award RBIs for triple that scores all runners', () => {
        const bases = BasesState.empty()
          .withRunnerOn('FIRST', runner1)
          .withRunnerOn('SECOND', runner2);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.TRIPLE, bases, 0);

        expect(rbis).toBe(2); // All runners score on triple
      });
    });

    describe('Force Outs with RBI', () => {
      it('should award RBI for force out that still allows runner to score from third', () => {
        // Runner on third with less than 2 outs - even on force out, runner scores
        const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(
          AtBatResultType.FIELDERS_CHOICE,
          runnerOnThird,
          0 // 0 outs
        );

        expect(rbis).toBe(1); // Runner scores from third on contact
      });

      it('should award 0 RBIs for force out with 2 outs already', () => {
        const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(
          AtBatResultType.FIELDERS_CHOICE,
          runnerOnThird,
          2 // 2 outs - third out ends inning
        );

        expect(rbis).toBe(0); // Third out prevents run from scoring
      });
    });

    describe('Ground Outs and Fly Outs', () => {
      it('should award RBI for ground out that scores runner from third with less than 2 outs', () => {
        const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(
          AtBatResultType.GROUND_OUT,
          runnerOnThird,
          1 // 1 out
        );

        expect(rbis).toBe(1);
      });

      it('should award 0 RBIs for ground out with 2 outs (inning ending)', () => {
        const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.GROUND_OUT, runnerOnThird, 2);

        expect(rbis).toBe(0);
      });

      it('should award RBI for fly out that scores runner from third with less than 2 outs', () => {
        const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.FLY_OUT, runnerOnThird, 0);

        expect(rbis).toBe(1);
      });
    });

    describe('Walks and Errors', () => {
      it('should award RBI for walk that forces runner home (bases loaded)', () => {
        const basesLoaded = BasesState.empty()
          .withRunnerOn('FIRST', runner1)
          .withRunnerOn('SECOND', runner2)
          .withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.WALK, basesLoaded, 0);

        expect(rbis).toBe(1); // Forces runner from third home
      });

      it('should award 0 RBIs for walk without bases loaded', () => {
        const bases = BasesState.empty()
          .withRunnerOn('FIRST', runner1)
          .withRunnerOn('SECOND', runner2);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.WALK, bases, 0);

        expect(rbis).toBe(0);
      });

      it('should award 0 RBIs for error - defensive mistake, not batting achievement', () => {
        const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.ERROR, runnerOnThird, 0);

        expect(rbis).toBe(0); // No RBI credit for defensive errors
      });
    });

    describe('Strikeouts and Multiple Outs', () => {
      it('should award 0 RBIs for strikeout regardless of runners', () => {
        const basesLoaded = BasesState.empty()
          .withRunnerOn('FIRST', runner1)
          .withRunnerOn('SECOND', runner2)
          .withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.STRIKEOUT, basesLoaded, 0);

        expect(rbis).toBe(0);
      });

      it('should award 0 RBIs for double play with 2 outs (inning ending)', () => {
        const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(AtBatResultType.DOUBLE_PLAY, runnerOnThird, 2);

        expect(rbis).toBe(0);
      });

      it('should award RBI for double play that scores runner with less than 2 outs', () => {
        const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner3);

        const rbis = RBICalculator.calculateRBIs(
          AtBatResultType.DOUBLE_PLAY,
          runnerOnThird,
          0 // 0 outs, double play makes it 2 outs but doesn't end inning
        );

        expect(rbis).toBe(1);
      });
    });

    describe('Edge Cases and Validation', () => {
      it('should throw error for invalid outs count (negative)', () => {
        const bases = BasesState.empty();

        expect(() => {
          RBICalculator.calculateRBIs(AtBatResultType.SINGLE, bases, -1);
        }).toThrow(DomainError);
      });

      it('should throw error for invalid outs count (greater than 2)', () => {
        const bases = BasesState.empty();

        expect(() => {
          RBICalculator.calculateRBIs(AtBatResultType.SINGLE, bases, 3);
        }).toThrow(DomainError);
      });

      it('should handle empty bases for all result types', () => {
        const emptyBases = BasesState.empty();
        const nonScoringResults = [
          AtBatResultType.SINGLE,
          AtBatResultType.DOUBLE,
          AtBatResultType.TRIPLE,
          AtBatResultType.WALK,
          AtBatResultType.ERROR,
          AtBatResultType.FIELDERS_CHOICE,
          AtBatResultType.STRIKEOUT,
          AtBatResultType.GROUND_OUT,
          AtBatResultType.FLY_OUT,
          AtBatResultType.SACRIFICE_FLY,
          AtBatResultType.DOUBLE_PLAY,
          AtBatResultType.TRIPLE_PLAY,
        ];

        nonScoringResults.forEach(result => {
          const rbis = RBICalculator.calculateRBIs(result, emptyBases, 0);
          if (result === AtBatResultType.HOME_RUN) {
            expect(rbis).toBe(1); // Solo home run
          } else {
            expect(rbis).toBe(0); // No runners to drive in
          }
        });
      });
    });
  });

  describe('Business Logic Documentation', () => {
    it('should document RBI rules correctly in comments and tests', () => {
      // This test serves as living documentation for softball RBI rules:

      // 1. Home runs always count batter + all runners
      expect(
        RBICalculator.calculateRBIs(
          AtBatResultType.HOME_RUN,
          BasesState.empty().withRunnerOn('FIRST', runner1),
          0
        )
      ).toBe(2);

      // 2. Sacrifice flies only count if runner scores from third
      expect(
        RBICalculator.calculateRBIs(
          AtBatResultType.SACRIFICE_FLY,
          BasesState.empty().withRunnerOn('THIRD', runner3),
          0
        )
      ).toBe(1);

      // 3. Force walks with bases loaded drive in runs
      expect(
        RBICalculator.calculateRBIs(
          AtBatResultType.WALK,
          BasesState.empty()
            .withRunnerOn('FIRST', runner1)
            .withRunnerOn('SECOND', runner2)
            .withRunnerOn('THIRD', runner3),
          0
        )
      ).toBe(1);

      // 4. No RBI if third out ends inning before run scores
      expect(
        RBICalculator.calculateRBIs(
          AtBatResultType.GROUND_OUT,
          BasesState.empty().withRunnerOn('THIRD', runner3),
          2 // Third out
        )
      ).toBe(0);

      // 5. Errors don't award RBIs (defensive mistake, not offensive achievement)
      expect(
        RBICalculator.calculateRBIs(
          AtBatResultType.ERROR,
          BasesState.empty().withRunnerOn('THIRD', runner3),
          0
        )
      ).toBe(0);
    });
  });
});
