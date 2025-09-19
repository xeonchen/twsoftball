/**
 * @file Tests for RunnerAdvancedTestHelpers
 * @description Comprehensive tests for all test helper functions and data structures used in RunnerAdvanced event testing
 */

import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError.js';
import { RunnerAdvanced, AdvanceReason } from '../events/RunnerAdvanced.js';
import { Base } from '../value-objects/BasesState.js';
import { GameId } from '../value-objects/GameId.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import {
  createAdvanceEvent,
  baseToBaseScenarios,
  batterAdvancementScenarios,
  runnerOutScenarios,
  validationErrorScenarios,
  advanceReasonScenarios,
  runEventConstructionTests,
  runValidationErrorTests,
  type RunnerAdvancementScenario,
  type ValidationScenario,
} from './RunnerAdvancedTestHelpers.js';

describe('RunnerAdvancedTestHelpers', () => {
  // Test data setup
  const gameId = GameId.generate();
  const runnerId = PlayerId.generate();

  describe('createAdvanceEvent', () => {
    it('should create RunnerAdvanced event with provided parameters', () => {
      const event = createAdvanceEvent('FIRST', 'SECOND', AdvanceReason.HIT, gameId, runnerId);

      expect(event).toBeInstanceOf(RunnerAdvanced);
      expect(event.gameId).toBe(gameId);
      expect(event.runnerId).toBe(runnerId);
      expect(event.from).toBe('FIRST');
      expect(event.to).toBe('SECOND');
      expect(event.reason).toBe(AdvanceReason.HIT);
      expect(event.type).toBe('RunnerAdvanced');
    });

    it('should create event with default AdvanceReason.HIT when reason not provided', () => {
      const event = createAdvanceEvent('FIRST', 'SECOND', undefined, gameId, runnerId);

      expect(event.reason).toBe(AdvanceReason.HIT);
    });

    it('should generate new GameId when customGameId not provided', () => {
      const event1 = createAdvanceEvent('FIRST', 'SECOND', AdvanceReason.HIT, undefined, runnerId);
      const event2 = createAdvanceEvent('FIRST', 'SECOND', AdvanceReason.HIT, undefined, runnerId);

      expect(event1.gameId).not.toBe(event2.gameId);
      expect(event1.gameId).toBeInstanceOf(GameId);
      expect(event2.gameId).toBeInstanceOf(GameId);
    });

    it('should generate new PlayerId when customRunnerId not provided', () => {
      const event1 = createAdvanceEvent('FIRST', 'SECOND', AdvanceReason.HIT, gameId);
      const event2 = createAdvanceEvent('FIRST', 'SECOND', AdvanceReason.HIT, gameId);

      expect(event1.runnerId).not.toBe(event2.runnerId);
      expect(event1.runnerId).toBeInstanceOf(PlayerId);
      expect(event2.runnerId).toBeInstanceOf(PlayerId);
    });

    it('should create event with null from (batter scenario)', () => {
      const event = createAdvanceEvent(null, 'FIRST', AdvanceReason.HIT, gameId, runnerId);

      expect(event.from).toBe(null);
      expect(event.to).toBe('FIRST');
    });

    it('should create event with HOME destination', () => {
      const event = createAdvanceEvent('THIRD', 'HOME', AdvanceReason.HIT, gameId, runnerId);

      expect(event.from).toBe('THIRD');
      expect(event.to).toBe('HOME');
    });

    it('should create event with OUT destination', () => {
      const event = createAdvanceEvent(
        'FIRST',
        'OUT',
        AdvanceReason.FIELDERS_CHOICE,
        gameId,
        runnerId
      );

      expect(event.from).toBe('FIRST');
      expect(event.to).toBe('OUT');
    });

    it('should work with all advance reasons', () => {
      const reasons = Object.values(AdvanceReason);

      reasons.forEach(reason => {
        const event = createAdvanceEvent('FIRST', 'SECOND', reason, gameId, runnerId);
        expect(event.reason).toBe(reason);
      });
    });
  });

  describe('baseToBaseScenarios', () => {
    it('should contain valid base-to-base advancement scenarios', () => {
      expect(Array.isArray(baseToBaseScenarios)).toBe(true);
      expect(baseToBaseScenarios.length).toBeGreaterThan(0);
    });

    it('should have proper structure for each scenario', () => {
      baseToBaseScenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('from');
        expect(scenario).toHaveProperty('to');
        expect(scenario).toHaveProperty('reason');
        expect(scenario).toHaveProperty('description');
        expect(typeof scenario.description).toBe('string');
        expect(scenario.description.length).toBeGreaterThan(0);
      });
    });

    it('should include FIRST to SECOND scenario', () => {
      const scenario = baseToBaseScenarios.find(s => s.from === 'FIRST' && s.to === 'SECOND');
      expect(scenario).toBeDefined();
      expect(scenario!.reason).toBe(AdvanceReason.HIT);
      expect(scenario!.description).toContain('FIRST to SECOND');
    });

    it('should include SECOND to THIRD scenario', () => {
      const scenario = baseToBaseScenarios.find(s => s.from === 'SECOND' && s.to === 'THIRD');
      expect(scenario).toBeDefined();
      expect(scenario!.reason).toBe(AdvanceReason.SACRIFICE);
    });

    it('should include THIRD to HOME scenario', () => {
      const scenario = baseToBaseScenarios.find(s => s.from === 'THIRD' && s.to === 'HOME');
      expect(scenario).toBeDefined();
      expect(scenario!.reason).toBe(AdvanceReason.HIT);
    });

    it('should include multi-base advancement scenarios', () => {
      const firstToThird = baseToBaseScenarios.find(s => s.from === 'FIRST' && s.to === 'THIRD');
      const firstToHome = baseToBaseScenarios.find(s => s.from === 'FIRST' && s.to === 'HOME');
      const secondToHome = baseToBaseScenarios.find(s => s.from === 'SECOND' && s.to === 'HOME');

      expect(firstToThird).toBeDefined();
      expect(firstToHome).toBeDefined();
      expect(secondToHome).toBeDefined();
    });

    it('should create valid RunnerAdvanced events', () => {
      baseToBaseScenarios.forEach(scenario => {
        expect(() => {
          createAdvanceEvent(scenario.from, scenario.to, scenario.reason, gameId, runnerId);
        }).not.toThrow();
      });
    });
  });

  describe('batterAdvancementScenarios', () => {
    it('should contain valid batter advancement scenarios', () => {
      expect(Array.isArray(batterAdvancementScenarios)).toBe(true);
      expect(batterAdvancementScenarios.length).toBeGreaterThan(0);
    });

    it('should have all scenarios with from: null', () => {
      batterAdvancementScenarios.forEach(scenario => {
        expect(scenario.from).toBe(null);
      });
    });

    it('should include batter to each base', () => {
      const bases: Array<Base | 'HOME'> = ['FIRST', 'SECOND', 'THIRD', 'HOME'];

      bases.forEach(base => {
        const scenario = batterAdvancementScenarios.find(s => s.to === base);
        expect(scenario).toBeDefined();
      });
    });

    it('should include walk scenario', () => {
      const walkScenario = batterAdvancementScenarios.find(s => s.reason === AdvanceReason.WALK);
      expect(walkScenario).toBeDefined();
      expect(walkScenario!.to).toBe('FIRST');
    });

    it('should include hit scenarios for different bases', () => {
      const hitScenarios = batterAdvancementScenarios.filter(s => s.reason === AdvanceReason.HIT);
      expect(hitScenarios.length).toBeGreaterThan(1);

      const destinations = hitScenarios.map(s => s.to);
      expect(destinations).toContain('FIRST');
      expect(destinations).toContain('SECOND');
      expect(destinations).toContain('THIRD');
      expect(destinations).toContain('HOME');
    });

    it('should have descriptive descriptions', () => {
      const singleHit = batterAdvancementScenarios.find(
        s => s.to === 'FIRST' && s.reason === AdvanceReason.HIT
      );
      const doubleHit = batterAdvancementScenarios.find(
        s => s.to === 'SECOND' && s.reason === AdvanceReason.HIT
      );
      const tripleHit = batterAdvancementScenarios.find(
        s => s.to === 'THIRD' && s.reason === AdvanceReason.HIT
      );
      const homeRun = batterAdvancementScenarios.find(
        s => s.to === 'HOME' && s.reason === AdvanceReason.HIT
      );

      expect(singleHit!.description).toContain('single');
      expect(doubleHit!.description).toContain('double');
      expect(tripleHit!.description).toContain('triple');
      expect(homeRun!.description).toContain('home run');
    });

    it('should create valid RunnerAdvanced events', () => {
      batterAdvancementScenarios.forEach(scenario => {
        expect(() => {
          createAdvanceEvent(scenario.from, scenario.to, scenario.reason, gameId, runnerId);
        }).not.toThrow();
      });
    });
  });

  describe('runnerOutScenarios', () => {
    it('should contain valid runner out scenarios', () => {
      expect(Array.isArray(runnerOutScenarios)).toBe(true);
      expect(runnerOutScenarios.length).toBeGreaterThan(0);
    });

    it('should have all scenarios with to: OUT', () => {
      runnerOutScenarios.forEach(scenario => {
        expect(scenario.to).toBe('OUT');
      });
    });

    it('should include scenarios for each base and batter', () => {
      const fromPositions: Array<Base | null> = ['FIRST', 'SECOND', 'THIRD', null];

      fromPositions.forEach(position => {
        const scenario = runnerOutScenarios.find(s => s.from === position);
        expect(scenario).toBeDefined();
      });
    });

    it('should use appropriate advance reason', () => {
      runnerOutScenarios.forEach(scenario => {
        expect(scenario.reason).toBe(AdvanceReason.FIELDERS_CHOICE);
      });
    });

    it('should have descriptive descriptions', () => {
      runnerOutScenarios.forEach(scenario => {
        expect(scenario.description).toContain('out');
        if (scenario.from === null) {
          expect(scenario.description).toContain('batter');
        } else {
          expect(scenario.description).toContain('runner');
          expect(scenario.description).toContain(scenario.from);
        }
      });
    });

    it('should create valid RunnerAdvanced events', () => {
      runnerOutScenarios.forEach(scenario => {
        expect(() => {
          createAdvanceEvent(scenario.from, scenario.to, scenario.reason, gameId, runnerId);
        }).not.toThrow();
      });
    });
  });

  describe('validationErrorScenarios', () => {
    it('should contain validation error scenarios', () => {
      expect(Array.isArray(validationErrorScenarios)).toBe(true);
      expect(validationErrorScenarios.length).toBeGreaterThan(0);
    });

    it('should have proper structure for each scenario', () => {
      validationErrorScenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('from');
        expect(scenario).toHaveProperty('to');
        expect(scenario).toHaveProperty('reason');
        expect(scenario).toHaveProperty('expectedError');
        expect(scenario).toHaveProperty('description');
        expect(typeof scenario.expectedError).toBe('string');
        expect(typeof scenario.description).toBe('string');
        expect(scenario.expectedError.length).toBeGreaterThan(0);
        expect(scenario.description.length).toBeGreaterThan(0);
      });
    });

    it('should include same base scenarios', () => {
      const sameBases: Base[] = ['FIRST', 'SECOND', 'THIRD'];

      sameBases.forEach(base => {
        const scenario = validationErrorScenarios.find(s => s.from === base && s.to === base);
        expect(scenario).toBeDefined();
        expect(scenario!.expectedError).toBe('Runner cannot advance from and to the same base');
      });
    });

    it('should include backward movement scenarios', () => {
      const backwardScenarios = validationErrorScenarios.filter(s =>
        s.expectedError.includes('backward')
      );

      expect(backwardScenarios.length).toBeGreaterThan(0);

      backwardScenarios.forEach(scenario => {
        expect(scenario.expectedError).toMatch(/Runner cannot advance backward from .+ to .+/);
      });
    });

    it('should include SECOND to FIRST backward scenario', () => {
      const scenario = validationErrorScenarios.find(s => s.from === 'SECOND' && s.to === 'FIRST');
      expect(scenario).toBeDefined();
      expect(scenario!.expectedError).toBe('Runner cannot advance backward from SECOND to FIRST');
    });

    it('should include THIRD to FIRST backward scenario', () => {
      const scenario = validationErrorScenarios.find(s => s.from === 'THIRD' && s.to === 'FIRST');
      expect(scenario).toBeDefined();
      expect(scenario!.expectedError).toBe('Runner cannot advance backward from THIRD to FIRST');
    });

    it('should include THIRD to SECOND backward scenario', () => {
      const scenario = validationErrorScenarios.find(s => s.from === 'THIRD' && s.to === 'SECOND');
      expect(scenario).toBeDefined();
      expect(scenario!.expectedError).toBe('Runner cannot advance backward from THIRD to SECOND');
    });

    it('should trigger validation errors when creating events', () => {
      validationErrorScenarios.forEach(scenario => {
        expect(() => {
          void new RunnerAdvanced(gameId, runnerId, scenario.from, scenario.to, scenario.reason);
        }).toThrow(DomainError);
      });
    });
  });

  describe('advanceReasonScenarios', () => {
    it('should contain scenarios for different advance reasons', () => {
      expect(Array.isArray(advanceReasonScenarios)).toBe(true);
      expect(advanceReasonScenarios.length).toBeGreaterThan(0);
    });

    it('should cover all advance reason types', () => {
      const reasons = advanceReasonScenarios.map(s => s.reason);
      const uniqueReasons = new Set(reasons);

      expect(uniqueReasons.has(AdvanceReason.HIT)).toBe(true);
      expect(uniqueReasons.has(AdvanceReason.WALK)).toBe(true);
      expect(uniqueReasons.has(AdvanceReason.SACRIFICE)).toBe(true);
      expect(uniqueReasons.has(AdvanceReason.STOLEN_BASE)).toBe(true);
      expect(uniqueReasons.has(AdvanceReason.FIELDERS_CHOICE)).toBe(true);
      expect(uniqueReasons.has(AdvanceReason.ERROR)).toBe(true);
      expect(uniqueReasons.has(AdvanceReason.WILD_PITCH)).toBe(true);
      expect(uniqueReasons.has(AdvanceReason.BALK)).toBe(true);
    });

    it('should have appropriate scenario for each advance reason', () => {
      const walkScenario = advanceReasonScenarios.find(s => s.reason === AdvanceReason.WALK);
      const stolenBaseScenario = advanceReasonScenarios.find(
        s => s.reason === AdvanceReason.STOLEN_BASE
      );
      const sacrificeScenario = advanceReasonScenarios.find(
        s => s.reason === AdvanceReason.SACRIFICE
      );
      const fieldersChoiceScenario = advanceReasonScenarios.find(
        s => s.reason === AdvanceReason.FIELDERS_CHOICE
      );

      expect(walkScenario).toBeDefined();
      expect(walkScenario!.from).toBe(null);
      expect(walkScenario!.to).toBe('FIRST');

      expect(stolenBaseScenario).toBeDefined();
      expect(stolenBaseScenario!.from).toBe('FIRST');
      expect(stolenBaseScenario!.to).toBe('SECOND');

      expect(sacrificeScenario).toBeDefined();
      expect(sacrificeScenario!.from).toBe('SECOND');
      expect(sacrificeScenario!.to).toBe('HOME');

      expect(fieldersChoiceScenario).toBeDefined();
      expect(fieldersChoiceScenario!.to).toBe('OUT');
    });

    it('should have descriptive descriptions mentioning the reason', () => {
      advanceReasonScenarios.forEach(scenario => {
        const reasonWord = scenario.reason.toLowerCase().replace('_', ' ');
        expect(scenario.description.toLowerCase()).toContain(reasonWord);
      });
    });

    it('should create valid RunnerAdvanced events', () => {
      advanceReasonScenarios.forEach(scenario => {
        expect(() => {
          createAdvanceEvent(scenario.from, scenario.to, scenario.reason, gameId, runnerId);
        }).not.toThrow();
      });
    });
  });

  describe('runEventConstructionTests', () => {
    it('should run tests for provided scenarios', () => {
      const testScenarios: RunnerAdvancementScenario[] = [
        { from: 'FIRST', to: 'SECOND', reason: AdvanceReason.HIT, description: 'test scenario 1' },
        { from: null, to: 'FIRST', reason: AdvanceReason.WALK, description: 'test scenario 2' },
      ];

      // This should not throw if scenarios are valid
      expect(() => {
        runEventConstructionTests(testScenarios, gameId, runnerId);
      }).not.toThrow();
    });

    it('should verify event construction with specific scenario', () => {
      const testScenarios: RunnerAdvancementScenario[] = [
        {
          from: 'SECOND',
          to: 'THIRD',
          reason: AdvanceReason.SACRIFICE,
          description: 'test advancement',
        },
      ];

      // Should not throw and should verify the scenario produces correct events
      expect(() => {
        runEventConstructionTests(testScenarios, gameId, runnerId);
      }).not.toThrow();
    });

    it('should work with empty scenarios array', () => {
      expect(() => {
        runEventConstructionTests([], gameId, runnerId);
      }).not.toThrow();
    });

    it('should work with baseToBaseScenarios', () => {
      expect(() => {
        runEventConstructionTests(baseToBaseScenarios, gameId, runnerId);
      }).not.toThrow();
    });

    it('should work with batterAdvancementScenarios', () => {
      expect(() => {
        runEventConstructionTests(batterAdvancementScenarios, gameId, runnerId);
      }).not.toThrow();
    });
  });

  describe('runValidationErrorTests', () => {
    it('should run validation error tests for provided scenarios', () => {
      const testScenarios: ValidationScenario[] = [
        {
          from: 'FIRST',
          to: 'FIRST',
          reason: AdvanceReason.HIT,
          expectedError: 'Runner cannot advance from and to the same base',
          description: 'same base error',
        },
      ];

      // This should not throw if scenarios properly trigger errors
      expect(() => {
        runValidationErrorTests(testScenarios, gameId, runnerId);
      }).not.toThrow();
    });

    it('should work with empty scenarios array', () => {
      expect(() => {
        runValidationErrorTests([], gameId, runnerId);
      }).not.toThrow();
    });

    it('should work with validationErrorScenarios', () => {
      expect(() => {
        runValidationErrorTests(validationErrorScenarios, gameId, runnerId);
      }).not.toThrow();
    });

    it('should verify DomainError is thrown with correct message', () => {
      const testScenarios: ValidationScenario[] = [
        {
          from: 'SECOND',
          to: 'FIRST',
          reason: AdvanceReason.HIT,
          expectedError: 'Runner cannot advance backward from SECOND to FIRST',
          description: 'backward movement error',
        },
      ];

      // The function should verify the error is thrown correctly
      expect(() => {
        runValidationErrorTests(testScenarios, gameId, runnerId);
      }).not.toThrow();
    });
  });

  describe('type definitions', () => {
    it('should have correct RunnerAdvancementScenario interface', () => {
      const scenario: RunnerAdvancementScenario = {
        from: 'FIRST',
        to: 'SECOND',
        reason: AdvanceReason.HIT,
        description: 'test scenario',
      };

      expect(typeof scenario.from).toBe('string');
      expect(typeof scenario.to).toBe('string');
      expect(typeof scenario.reason).toBe('string');
      expect(typeof scenario.description).toBe('string');
    });

    it('should have correct ValidationScenario interface', () => {
      const scenario: ValidationScenario = {
        from: 'FIRST',
        to: 'FIRST',
        reason: AdvanceReason.HIT,
        expectedError: 'Test error message',
        description: 'test validation scenario',
      };

      expect(typeof scenario.from).toBe('string');
      expect(typeof scenario.to).toBe('string');
      expect(typeof scenario.reason).toBe('string');
      expect(typeof scenario.expectedError).toBe('string');
      expect(typeof scenario.description).toBe('string');
    });

    it('should allow null for from field in scenarios', () => {
      const batterScenario: RunnerAdvancementScenario = {
        from: null,
        to: 'FIRST',
        reason: AdvanceReason.WALK,
        description: 'batter advancement',
      };

      const validationScenario: ValidationScenario = {
        from: null,
        to: 'FIRST',
        reason: AdvanceReason.HIT,
        expectedError: 'Some error',
        description: 'validation test',
      };

      expect(batterScenario.from).toBe(null);
      expect(validationScenario.from).toBe(null);
    });
  });

  describe('integration with RunnerAdvanced event', () => {
    it('should create events that pass domain validation', () => {
      const allScenarios = [
        ...baseToBaseScenarios,
        ...batterAdvancementScenarios,
        ...runnerOutScenarios,
        ...advanceReasonScenarios,
      ];

      allScenarios.forEach(scenario => {
        const event = createAdvanceEvent(scenario.from, scenario.to, scenario.reason);

        expect(event).toBeInstanceOf(RunnerAdvanced);
        expect(event.type).toBe('RunnerAdvanced');
        expect(event.gameId).toBeInstanceOf(GameId);
        expect(event.runnerId).toBeInstanceOf(PlayerId);
        expect(event.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should create events with consistent ID generation', () => {
      const event1 = createAdvanceEvent('FIRST', 'SECOND');
      const event2 = createAdvanceEvent('FIRST', 'SECOND');

      // Should generate different IDs
      expect(event1.gameId).not.toBe(event2.gameId);
      expect(event1.runnerId).not.toBe(event2.runnerId);

      // But both should be valid
      expect(event1.gameId).toBeInstanceOf(GameId);
      expect(event2.gameId).toBeInstanceOf(GameId);
      expect(event1.runnerId).toBeInstanceOf(PlayerId);
      expect(event2.runnerId).toBeInstanceOf(PlayerId);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle all valid Base enum advancement combinations', () => {
      const validAdvancements: Array<{ from: Base; to: Base | 'HOME' }> = [
        { from: 'FIRST', to: 'SECOND' },
        { from: 'FIRST', to: 'THIRD' },
        { from: 'FIRST', to: 'HOME' },
        { from: 'SECOND', to: 'THIRD' },
        { from: 'SECOND', to: 'HOME' },
        { from: 'THIRD', to: 'HOME' },
      ];

      validAdvancements.forEach(({ from, to }) => {
        expect(() => {
          createAdvanceEvent(from, to, AdvanceReason.HIT, gameId, runnerId);
        }).not.toThrow();
      });
    });

    it('should handle all special destinations', () => {
      const specialDestinations: Array<'HOME' | 'OUT'> = ['HOME', 'OUT'];
      const bases: Base[] = ['FIRST', 'SECOND', 'THIRD'];

      specialDestinations.forEach(destination => {
        bases.forEach(from => {
          expect(() => {
            createAdvanceEvent(from, destination, AdvanceReason.HIT, gameId, runnerId);
          }).not.toThrow();
        });
      });
    });

    it('should handle batter scenarios with all destinations', () => {
      const destinations: Array<Base | 'HOME' | 'OUT'> = [
        'FIRST',
        'SECOND',
        'THIRD',
        'HOME',
        'OUT',
      ];

      destinations.forEach(destination => {
        expect(() => {
          createAdvanceEvent(null, destination, AdvanceReason.HIT, gameId, runnerId);
        }).not.toThrow();
      });
    });
  });
});
