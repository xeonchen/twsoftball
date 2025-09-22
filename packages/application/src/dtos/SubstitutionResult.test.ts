/**
 * @file SubstitutionResult.test.ts
 * Comprehensive tests for the SubstitutionResult DTO interface and various substitution scenarios.
 */

import { GameId, PlayerId, TeamLineupId, FieldPosition, GameStatus } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import { GameStateDTO } from './GameStateDTO.js';
import { SubstitutionResult, SubstitutionDetailsDTO } from './SubstitutionResult.js';

describe('SubstitutionResult', () => {
  // Test data factories
  const createMockGameState = (overrides: Partial<GameStateDTO> = {}): GameStateDTO => ({
    gameId: new GameId('test-game-123'),
    status: GameStatus.IN_PROGRESS,
    score: {
      home: 5,
      away: 3,
      leader: 'HOME',
      difference: 2,
    },
    gameStartTime: new Date('2024-08-30T14:00:00Z'),
    currentInning: 5,
    isTopHalf: false,
    battingTeam: 'HOME',
    outs: 1,
    bases: {
      first: new PlayerId('runner-1st'),
      second: null,
      third: new PlayerId('runner-3rd'),
      runnersInScoringPosition: [new PlayerId('runner-3rd')],
      basesLoaded: false,
    },
    currentBatterSlot: 3,
    homeLineup: {
      teamLineupId: new TeamLineupId('home-lineup'),
      gameId: new GameId('test-game-123'),
      teamSide: 'HOME',
      teamName: 'Home Eagles',
      strategy: 'DETAILED',
      battingSlots: [],
      fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
      benchPlayers: [],
      substitutionHistory: [],
    },
    awayLineup: {
      teamLineupId: new TeamLineupId('away-lineup'),
      gameId: new GameId('test-game-123'),
      teamSide: 'AWAY',
      teamName: 'Away Hawks',
      strategy: 'SIMPLE',
      battingSlots: [],
      fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
      benchPlayers: [],
      substitutionHistory: [],
    },
    currentBatter: null,
    lastUpdated: new Date(),
    ...overrides,
  });

  const createSubstitutionDetails = (
    overrides: Partial<SubstitutionDetailsDTO> = {}
  ): SubstitutionDetailsDTO => ({
    battingSlot: 1,
    outgoingPlayerName: 'John Starter',
    incomingPlayerName: 'Relief Johnson',
    newFieldPosition: FieldPosition.PITCHER,
    inning: 5,
    wasReentry: false,
    timestamp: new Date('2024-08-30T15:30:00Z'),
    ...overrides,
  });

  const createSuccessResult = (
    overrides: Partial<SubstitutionResult> = {}
  ): SubstitutionResult => ({
    success: true,
    gameState: createMockGameState(),
    substitutionDetails: createSubstitutionDetails(),
    positionChanged: false,
    reentryUsed: false,
    ...overrides,
  });

  const createErrorResult = (
    errors: string[],
    overrides: Partial<SubstitutionResult> = {}
  ): SubstitutionResult => ({
    success: false,
    gameState: createMockGameState(),
    positionChanged: false,
    reentryUsed: false,
    errors,
    ...overrides,
  });

  describe('Success Results', () => {
    it('should represent successful regular substitution', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          battingSlot: 1,
          outgoingPlayerName: 'Starting Pitcher',
          incomingPlayerName: 'Relief Pitcher',
          newFieldPosition: FieldPosition.PITCHER,
          wasReentry: false,
        }),
        positionChanged: false, // Same position
        reentryUsed: false,
      });

      expect(result.success).toBe(true);
      expect(result.substitutionDetails).toBeDefined();
      expect(result.substitutionDetails!.outgoingPlayerName).toBe('Starting Pitcher');
      expect(result.substitutionDetails!.incomingPlayerName).toBe('Relief Pitcher');
      expect(result.substitutionDetails!.wasReentry).toBe(false);
      expect(result.positionChanged).toBe(false);
      expect(result.reentryUsed).toBe(false);
      expect(result.errors).toBeUndefined();
    });

    it('should represent successful starter re-entry', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          battingSlot: 3,
          outgoingPlayerName: 'Substitute Smith',
          incomingPlayerName: 'Original Jones',
          newFieldPosition: FieldPosition.FIRST_BASE,
          previousFieldPosition: FieldPosition.FIRST_BASE,
          wasReentry: true,
          notes: 'Starter returning for final innings',
        }),
        positionChanged: false,
        reentryUsed: true,
      });

      expect(result.success).toBe(true);
      expect(result.substitutionDetails!.wasReentry).toBe(true);
      expect(result.substitutionDetails!.notes).toBe('Starter returning for final innings');
      expect(result.reentryUsed).toBe(true);
    });

    it('should represent successful position change substitution', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          outgoingPlayerName: 'Outfield Johnson',
          incomingPlayerName: 'Infield Wilson',
          previousFieldPosition: FieldPosition.RIGHT_FIELD,
          newFieldPosition: FieldPosition.SECOND_BASE,
        }),
        positionChanged: true,
      });

      expect(result.success).toBe(true);
      expect(result.substitutionDetails!.previousFieldPosition).toBe(FieldPosition.RIGHT_FIELD);
      expect(result.substitutionDetails!.newFieldPosition).toBe(FieldPosition.SECOND_BASE);
      expect(result.positionChanged).toBe(true);
    });

    it('should include complete game state for UI updates', () => {
      const gameState = createMockGameState({
        currentInning: 6,
        outs: 2,
        battingTeam: 'AWAY',
      });

      const result = createSuccessResult({ gameState });

      expect(result.gameState.currentInning).toBe(6);
      expect(result.gameState.outs).toBe(2);
      expect(result.gameState.battingTeam).toBe('AWAY');
    });
  });

  describe('Error Results', () => {
    it('should represent re-entry rule violation', () => {
      const errors = [
        'Starter can only re-enter once per game',
        'Player has already used their re-entry opportunity in inning 6',
      ];

      const result = createErrorResult(errors);

      expect(result.success).toBe(false);
      expect(result.substitutionDetails).toBeUndefined();
      expect(result.errors).toEqual(errors);
      expect(result.reentryUsed).toBe(false);
    });

    it('should represent timing constraint violation', () => {
      const errors = [
        'Cannot substitute in the same inning the current player entered',
        'Player entered in inning 5, substitution attempted in inning 5',
      ];

      const result = createErrorResult(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });

    it('should represent player eligibility issues', () => {
      const errors = [
        'Player is not currently in batting slot 3',
        'Expected player: John Smith, found: Jane Doe',
      ];

      const result = createErrorResult(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });

    it('should represent game state violations', () => {
      const errors = [
        'Game must be in progress to make substitutions',
        'Current game status: COMPLETED',
      ];

      const gameState = createMockGameState({ status: GameStatus.COMPLETED });
      const result = createErrorResult(errors, { gameState });

      expect(result.success).toBe(false);
      expect(result.gameState.status).toBe(GameStatus.COMPLETED);
      expect(result.errors).toEqual(errors);
    });

    it('should represent data validation failures', () => {
      const errors = [
        'Jersey number 12 is already assigned to another player',
        'Invalid field position for current game rules',
        'Player name cannot be empty',
      ];

      const result = createErrorResult(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors![0]).toContain('Jersey number');
      expect(result.errors![1]).toContain('Invalid field position');
      expect(result.errors![2]).toContain('Player name');
    });

    it('should maintain current game state for error context', () => {
      const currentState = createMockGameState({
        currentInning: 4,
        outs: 1,
        score: { home: 2, away: 5, leader: 'AWAY', difference: 3 },
      });

      const result = createErrorResult(['Substitution validation failed'], {
        gameState: currentState,
      });

      expect(result.success).toBe(false);
      expect(result.gameState).toBe(currentState);
      expect(result.gameState.score.away).toBe(5);
    });
  });

  describe('Substitution Details', () => {
    it('should include all batting slot positions', () => {
      for (let slot = 1; slot <= 30; slot++) {
        const details = createSubstitutionDetails({ battingSlot: slot });
        expect(details.battingSlot).toBe(slot);
      }
    });

    it('should support all field positions', () => {
      const positions = [
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        FieldPosition.THIRD_BASE,
        FieldPosition.SHORTSTOP,
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        FieldPosition.RIGHT_FIELD,
        FieldPosition.EXTRA_PLAYER,
      ];

      positions.forEach(position => {
        const details = createSubstitutionDetails({
          newFieldPosition: position,
          previousFieldPosition: FieldPosition.CENTER_FIELD,
        });
        expect(details.newFieldPosition).toBe(position);
      });
    });

    it('should handle position changes with different previous positions', () => {
      const details = createSubstitutionDetails({
        previousFieldPosition: FieldPosition.LEFT_FIELD,
        newFieldPosition: FieldPosition.THIRD_BASE,
      });

      expect(details.previousFieldPosition).toBe(FieldPosition.LEFT_FIELD);
      expect(details.newFieldPosition).toBe(FieldPosition.THIRD_BASE);
    });

    it('should handle same position substitutions', () => {
      const details = createSubstitutionDetails({
        previousFieldPosition: FieldPosition.PITCHER,
        newFieldPosition: FieldPosition.PITCHER,
      });

      expect(details.previousFieldPosition).toBe(FieldPosition.PITCHER);
      expect(details.newFieldPosition).toBe(FieldPosition.PITCHER);
    });

    it('should include timing information', () => {
      const timestamp = new Date('2024-08-30T16:45:30Z');
      const details = createSubstitutionDetails({
        inning: 8,
        timestamp,
      });

      expect(details.inning).toBe(8);
      expect(details.timestamp).toBe(timestamp);
    });

    it('should handle optional notes', () => {
      const notesDetails = createSubstitutionDetails({
        notes: 'Strategic move for late-game defense',
      });
      const noNotesDetails = createSubstitutionDetails();

      expect(notesDetails.notes).toBe('Strategic move for late-game defense');
      expect(noNotesDetails.notes).toBeUndefined();
    });

    it('should handle previous position when not available', () => {
      const details = createSubstitutionDetails({
        newFieldPosition: FieldPosition.SHORTSTOP,
      });

      expect(details.previousFieldPosition).toBeUndefined();
      expect(details.newFieldPosition).toBe(FieldPosition.SHORTSTOP);
    });
  });

  describe('Position Change Tracking', () => {
    it('should indicate position change when positions differ', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          previousFieldPosition: FieldPosition.RIGHT_FIELD,
          newFieldPosition: FieldPosition.FIRST_BASE,
        }),
        positionChanged: true,
      });

      expect(result.positionChanged).toBe(true);
    });

    it('should indicate no position change when positions same', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          previousFieldPosition: FieldPosition.CATCHER,
          newFieldPosition: FieldPosition.CATCHER,
        }),
        positionChanged: false,
      });

      expect(result.positionChanged).toBe(false);
    });
  });

  describe('Re-entry Tracking', () => {
    it('should track when starter re-entry is used', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          wasReentry: true,
        }),
        reentryUsed: true,
      });

      expect(result.substitutionDetails!.wasReentry).toBe(true);
      expect(result.reentryUsed).toBe(true);
    });

    it('should track when regular substitution does not use re-entry', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          wasReentry: false,
        }),
        reentryUsed: false,
      });

      expect(result.substitutionDetails!.wasReentry).toBe(false);
      expect(result.reentryUsed).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle emergency substitution scenario', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          battingSlot: 4,
          outgoingPlayerName: 'Injured Player',
          incomingPlayerName: 'Emergency Sub',
          inning: 3,
          notes: 'Emergency substitution due to injury',
        }),
      });

      expect(result.substitutionDetails!.notes).toContain('injury');
      expect(result.substitutionDetails!.inning).toBe(3);
    });

    it('should handle strategic late-game substitution', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          battingSlot: 7,
          outgoingPlayerName: 'Average Fielder',
          incomingPlayerName: 'Gold Glove',
          previousFieldPosition: FieldPosition.CENTER_FIELD,
          newFieldPosition: FieldPosition.CENTER_FIELD,
          inning: 9,
          notes: 'Defensive specialist for final inning',
        }),
        positionChanged: false, // Same position, different player
      });

      expect(result.substitutionDetails!.notes).toContain('Defensive specialist');
      expect(result.positionChanged).toBe(false);
    });

    it('should handle pinch hitter substitution', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          battingSlot: 9,
          outgoingPlayerName: 'Pitcher Johnson',
          incomingPlayerName: 'Clutch Henderson',
          previousFieldPosition: FieldPosition.PITCHER,
          newFieldPosition: FieldPosition.EXTRA_PLAYER,
          notes: 'Pinch hitter in crucial situation',
        }),
        positionChanged: true,
      });

      expect(result.substitutionDetails!.newFieldPosition).toBe(FieldPosition.EXTRA_PLAYER);
      expect(result.positionChanged).toBe(true);
      expect(result.substitutionDetails!.notes).toContain('Pinch hitter');
    });

    it('should handle tournament format with extended lineup', () => {
      const result = createSuccessResult({
        substitutionDetails: createSubstitutionDetails({
          battingSlot: 15,
          outgoingPlayerName: 'Tournament Player A',
          incomingPlayerName: 'Tournament Player B',
          newFieldPosition: FieldPosition.RIGHT_FIELD,
          notes: 'Tournament rotation keeping players fresh',
        }),
      });

      expect(result.substitutionDetails!.battingSlot).toBe(15);
      expect(result.substitutionDetails!.notes).toContain('Tournament');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain game state reference integrity', () => {
      const gameState = createMockGameState();
      const result = createSuccessResult({ gameState });

      expect(result.gameState).toBe(gameState);
      expect(result.gameState.gameId.equals(gameState.gameId)).toBe(true);
    });

    it('should maintain substitution details reference integrity', () => {
      const details = createSubstitutionDetails();
      const result = createSuccessResult({ substitutionDetails: details });

      expect(result.substitutionDetails).toBe(details);
    });

    it('should preserve error message arrays', () => {
      const originalErrors = ['Error 1', 'Error 2', 'Error 3'];
      const result = createErrorResult(originalErrors);

      expect(result.errors).toBe(originalErrors);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error arrays', () => {
      const result = createErrorResult([]);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle extremely long player names', () => {
      const longName = 'Francisco Antonio Rodriguez-Martinez de la Cruz Jr. III';
      const details = createSubstitutionDetails({
        outgoingPlayerName: longName,
        incomingPlayerName: longName,
      });

      expect(details.outgoingPlayerName).toBe(longName);
      expect(details.incomingPlayerName).toBe(longName);
    });

    it('should handle very detailed notes', () => {
      const detailedNotes = `Strategic substitution analysis:
        - Incoming player has .350 batting average vs left-handed pitching
        - Defensive upgrade in late innings critical for lead preservation
        - Player matchup advantages based on scouting report
        - Maintains platoon advantage for potential extra innings`;

      const details = createSubstitutionDetails({ notes: detailedNotes });

      expect(details.notes).toBe(detailedNotes);
    });

    it('should handle extra inning scenarios', () => {
      const details = createSubstitutionDetails({
        inning: 12,
        notes: 'Extra innings strategic substitution',
      });

      expect(details.inning).toBe(12);
    });

    it('should handle minimum inning values', () => {
      const details = createSubstitutionDetails({
        inning: 1,
        notes: 'Very early game substitution',
      });

      expect(details.inning).toBe(1);
    });
  });
});
