/**
 * @file BasesStateDTO Tests
 * Tests for DTO representing current state of all bases and runners.
 */

import { PlayerId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { BasesStateDTO } from './BasesStateDTO.js';

describe('BasesStateDTO', () => {
  let runner1: PlayerId;
  let runner2: PlayerId;
  let runner3: PlayerId;

  beforeEach(() => {
    runner1 = PlayerId.generate();
    runner2 = PlayerId.generate();
    runner3 = PlayerId.generate();
  });

  describe('Empty Bases', () => {
    it('should handle empty bases state', () => {
      const bases: BasesStateDTO = {
        first: null,
        second: null,
        third: null,
        runnersInScoringPosition: [],
        basesLoaded: false,
      };

      expect(bases.first).toBeNull();
      expect(bases.second).toBeNull();
      expect(bases.third).toBeNull();
      expect(bases.runnersInScoringPosition).toHaveLength(0);
      expect(bases.basesLoaded).toBe(false);
    });
  });

  describe('Single Runners', () => {
    it('should handle runner on first only', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: null,
        third: null,
        runnersInScoringPosition: [],
        basesLoaded: false,
      };

      expect(bases.first).toEqual(runner1);
      expect(bases.second).toBeNull();
      expect(bases.third).toBeNull();
      expect(bases.runnersInScoringPosition).toHaveLength(0);
      expect(bases.basesLoaded).toBe(false);
    });

    it('should handle runner on second only (scoring position)', () => {
      const bases: BasesStateDTO = {
        first: null,
        second: runner2,
        third: null,
        runnersInScoringPosition: [runner2],
        basesLoaded: false,
      };

      expect(bases.first).toBeNull();
      expect(bases.second).toEqual(runner2);
      expect(bases.third).toBeNull();
      expect(bases.runnersInScoringPosition).toContain(runner2);
      expect(bases.runnersInScoringPosition).toHaveLength(1);
      expect(bases.basesLoaded).toBe(false);
    });

    it('should handle runner on third only (scoring position)', () => {
      const bases: BasesStateDTO = {
        first: null,
        second: null,
        third: runner3,
        runnersInScoringPosition: [runner3],
        basesLoaded: false,
      };

      expect(bases.first).toBeNull();
      expect(bases.second).toBeNull();
      expect(bases.third).toEqual(runner3);
      expect(bases.runnersInScoringPosition).toContain(runner3);
      expect(bases.runnersInScoringPosition).toHaveLength(1);
      expect(bases.basesLoaded).toBe(false);
    });
  });

  describe('Multiple Runners', () => {
    it('should handle runners on first and second', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: runner2,
        third: null,
        runnersInScoringPosition: [runner2],
        basesLoaded: false,
      };

      expect(bases.first).toEqual(runner1);
      expect(bases.second).toEqual(runner2);
      expect(bases.third).toBeNull();
      expect(bases.runnersInScoringPosition).toContain(runner2);
      expect(bases.runnersInScoringPosition).toHaveLength(1);
      expect(bases.basesLoaded).toBe(false);
    });

    it('should handle runners on second and third', () => {
      const bases: BasesStateDTO = {
        first: null,
        second: runner2,
        third: runner3,
        runnersInScoringPosition: [runner2, runner3],
        basesLoaded: false,
      };

      expect(bases.first).toBeNull();
      expect(bases.second).toEqual(runner2);
      expect(bases.third).toEqual(runner3);
      expect(bases.runnersInScoringPosition).toContain(runner2);
      expect(bases.runnersInScoringPosition).toContain(runner3);
      expect(bases.runnersInScoringPosition).toHaveLength(2);
      expect(bases.basesLoaded).toBe(false);
    });

    it('should handle runners on first and third', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: null,
        third: runner3,
        runnersInScoringPosition: [runner3],
        basesLoaded: false,
      };

      expect(bases.first).toEqual(runner1);
      expect(bases.second).toBeNull();
      expect(bases.third).toEqual(runner3);
      expect(bases.runnersInScoringPosition).toContain(runner3);
      expect(bases.runnersInScoringPosition).toHaveLength(1);
      expect(bases.basesLoaded).toBe(false);
    });
  });

  describe('Bases Loaded', () => {
    it('should handle bases loaded situation', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: runner2,
        third: runner3,
        runnersInScoringPosition: [runner2, runner3],
        basesLoaded: true,
      };

      expect(bases.first).toEqual(runner1);
      expect(bases.second).toEqual(runner2);
      expect(bases.third).toEqual(runner3);
      expect(bases.runnersInScoringPosition).toContain(runner2);
      expect(bases.runnersInScoringPosition).toContain(runner3);
      expect(bases.runnersInScoringPosition).toHaveLength(2);
      expect(bases.basesLoaded).toBe(true);
    });

    it('should properly identify basesLoaded when all bases occupied', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: runner2,
        third: runner3,
        runnersInScoringPosition: [runner2, runner3],
        basesLoaded: true,
      };

      // Verify all bases are occupied
      expect(bases.first).not.toBeNull();
      expect(bases.second).not.toBeNull();
      expect(bases.third).not.toBeNull();
      expect(bases.basesLoaded).toBe(true);
    });
  });

  describe('Scoring Position Logic', () => {
    it('should correctly identify runners in scoring position (2nd and 3rd)', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: runner2,
        third: runner3,
        runnersInScoringPosition: [runner2, runner3],
        basesLoaded: true,
      };

      // Only runners on 2nd and 3rd should be in scoring position
      expect(bases.runnersInScoringPosition).toContain(runner2);
      expect(bases.runnersInScoringPosition).toContain(runner3);
      expect(bases.runnersInScoringPosition).not.toContain(runner1); // First base is not scoring position
    });

    it('should handle no runners in scoring position', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: null,
        third: null,
        runnersInScoringPosition: [],
        basesLoaded: false,
      };

      expect(bases.runnersInScoringPosition).toHaveLength(0);
    });

    it('should handle only third base occupied (scoring position)', () => {
      const bases: BasesStateDTO = {
        first: null,
        second: null,
        third: runner3,
        runnersInScoringPosition: [runner3],
        basesLoaded: false,
      };

      expect(bases.runnersInScoringPosition).toHaveLength(1);
      expect(bases.runnersInScoringPosition).toContain(runner3);
    });
  });

  describe('PlayerId Types', () => {
    it('should properly handle PlayerId instances', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: runner2,
        third: runner3,
        runnersInScoringPosition: [runner2, runner3],
        basesLoaded: true,
      };

      expect(bases.first).toBeInstanceOf(PlayerId);
      expect(bases.second).toBeInstanceOf(PlayerId);
      expect(bases.third).toBeInstanceOf(PlayerId);

      bases.runnersInScoringPosition.forEach(runner => {
        expect(runner).toBeInstanceOf(PlayerId);
      });
    });

    it('should handle null values properly', () => {
      const bases: BasesStateDTO = {
        first: null,
        second: runner2,
        third: null,
        runnersInScoringPosition: [runner2],
        basesLoaded: false,
      };

      expect(bases.first).toBeNull();
      expect(bases.second).toBeInstanceOf(PlayerId);
      expect(bases.third).toBeNull();
    });
  });

  describe('Consistency Validation', () => {
    it('should maintain consistency between base occupancy and derived fields', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: runner2,
        third: null,
        runnersInScoringPosition: [runner2],
        basesLoaded: false,
      };

      // basesLoaded should be false when third base is empty
      expect(bases.basesLoaded).toBe(false);

      // runnersInScoringPosition should only contain runner on second
      expect(bases.runnersInScoringPosition).toHaveLength(1);
      expect(bases.runnersInScoringPosition).toContain(runner2);
    });

    it('should maintain consistency in bases loaded scenario', () => {
      const bases: BasesStateDTO = {
        first: runner1,
        second: runner2,
        third: runner3,
        runnersInScoringPosition: [runner2, runner3],
        basesLoaded: true,
      };

      // All bases should be occupied when basesLoaded is true
      expect(bases.first).not.toBeNull();
      expect(bases.second).not.toBeNull();
      expect(bases.third).not.toBeNull();
      expect(bases.basesLoaded).toBe(true);

      // Scoring position should have both 2nd and 3rd base runners
      expect(bases.runnersInScoringPosition).toHaveLength(2);
    });
  });
});
