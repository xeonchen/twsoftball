/**
 * @file TeamLineupDTO Tests
 * Tests for DTO representing a team's lineup state including batting order and field positions.
 */

import { GameId, PlayerId, TeamLineupId, JerseyNumber, FieldPosition } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { PlayerInGameDTO } from './PlayerInGameDTO.js';
import { TeamLineupDTO, BattingSlotDTO, SubstitutionRecordDTO } from './TeamLineupDTO.js';

describe('TeamLineupDTO', () => {
  let validTeamLineupData: TeamLineupDTO;
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let player1: PlayerId;
  let player2: PlayerId;
  let player3: PlayerId;

  beforeEach(() => {
    gameId = GameId.generate();
    teamLineupId = TeamLineupId.generate();
    player1 = PlayerId.generate();
    player2 = PlayerId.generate();
    player3 = PlayerId.generate();

    const mockPlayerInGame: PlayerInGameDTO = {
      playerId: player1,
      name: 'John Smith',
      jerseyNumber: JerseyNumber.fromNumber(15),
      battingOrderPosition: 1,
      currentFieldPosition: FieldPosition.FIRST_BASE,
      preferredPositions: [FieldPosition.FIRST_BASE],
      plateAppearances: [],
      statistics: {
        playerId: player1,
        name: 'John Smith',
        jerseyNumber: JerseyNumber.fromNumber(15),
        plateAppearances: 0,
        atBats: 0,
        hits: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        homeRuns: 0,
        walks: 0,
        strikeouts: 0,
        rbi: 0,
        runs: 0,
        battingAverage: 0,
        onBasePercentage: 0,
        sluggingPercentage: 0,
        fielding: {
          positions: [FieldPosition.FIRST_BASE],
          putouts: 0,
          assists: 0,
          errors: 0,
          fieldingPercentage: 1.0,
        },
      },
    };

    const battingSlot: BattingSlotDTO = {
      slotNumber: 1,
      currentPlayer: mockPlayerInGame,
      history: [
        {
          playerId: player1,
          playerName: 'John Smith',
          enteredInning: 1,
          exitedInning: undefined,
          wasStarter: true,
          isReentry: false,
        },
      ],
    };

    validTeamLineupData = {
      teamLineupId,
      gameId,
      teamSide: 'HOME',
      teamName: 'Home Team',
      strategy: 'DETAILED',
      battingSlots: [battingSlot],
      fieldPositions: {
        [FieldPosition.PITCHER]: player1,
        [FieldPosition.CATCHER]: player2,
        [FieldPosition.FIRST_BASE]: player1,
        [FieldPosition.SECOND_BASE]: null,
        [FieldPosition.THIRD_BASE]: null,
        [FieldPosition.SHORTSTOP]: null,
        [FieldPosition.LEFT_FIELD]: null,
        [FieldPosition.CENTER_FIELD]: null,
        [FieldPosition.RIGHT_FIELD]: null,
        [FieldPosition.SHORT_FIELDER]: null,
        [FieldPosition.EXTRA_PLAYER]: null,
      },
      benchPlayers: [],
      substitutionHistory: [],
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid TeamLineupDTO with all required fields', () => {
      const lineup = validTeamLineupData;

      expect(lineup.teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(lineup.gameId).toBeInstanceOf(GameId);
      expect(lineup.teamSide).toBe('HOME');
      expect(lineup.teamName).toBe('Home Team');
      expect(lineup.strategy).toBe('DETAILED');
      expect(Array.isArray(lineup.battingSlots)).toBe(true);
      expect(typeof lineup.fieldPositions).toBe('object');
      expect(Array.isArray(lineup.benchPlayers)).toBe(true);
      expect(Array.isArray(lineup.substitutionHistory)).toBe(true);
    });

    it('should support AWAY team side', () => {
      const awayLineup = {
        ...validTeamLineupData,
        teamSide: 'AWAY' as const,
        teamName: 'Away Team',
      };

      expect(awayLineup.teamSide).toBe('AWAY');
      expect(awayLineup.teamName).toBe('Away Team');
    });

    it('should support SIMPLE strategy', () => {
      const simpleLineup = {
        ...validTeamLineupData,
        strategy: 'SIMPLE' as const,
      };

      expect(simpleLineup.strategy).toBe('SIMPLE');
    });
  });

  describe('Batting Slots', () => {
    it('should handle multiple batting slots', () => {
      const multipleSlots: BattingSlotDTO[] = [
        {
          slotNumber: 1,
          currentPlayer: {
            playerId: player1,
            name: 'Player 1',
            jerseyNumber: JerseyNumber.fromNumber(1),
            battingOrderPosition: 1,
            currentFieldPosition: FieldPosition.PITCHER,
            preferredPositions: [],
            plateAppearances: [],
            statistics: {
              playerId: player1,
              name: 'Player 1',
              jerseyNumber: JerseyNumber.fromNumber(1),
              plateAppearances: 0,
              atBats: 0,
              hits: 0,
              singles: 0,
              doubles: 0,
              triples: 0,
              homeRuns: 0,
              walks: 0,
              strikeouts: 0,
              rbi: 0,
              runs: 0,
              battingAverage: 0,
              onBasePercentage: 0,
              sluggingPercentage: 0,
              fielding: {
                positions: [],
                putouts: 0,
                assists: 0,
                errors: 0,
                fieldingPercentage: 1.0,
              },
            },
          },
          history: [],
        },
        {
          slotNumber: 2,
          currentPlayer: null,
          history: [],
        },
      ];

      const lineup = {
        ...validTeamLineupData,
        battingSlots: multipleSlots,
      };

      expect(lineup.battingSlots).toHaveLength(2);
      expect(lineup.battingSlots[0]?.slotNumber).toBe(1);
      expect(lineup.battingSlots[0]?.currentPlayer).toBeDefined();
      expect(lineup.battingSlots[1]?.slotNumber).toBe(2);
      expect(lineup.battingSlots[1]?.currentPlayer).toBeNull();
    });

    it('should handle batting slot history', () => {
      const slotWithHistory: BattingSlotDTO = {
        slotNumber: 3,
        currentPlayer: null,
        history: [
          {
            playerId: player1,
            playerName: 'Original Player',
            enteredInning: 1,
            exitedInning: 3,
            wasStarter: true,
            isReentry: false,
          },
          {
            playerId: player2,
            playerName: 'Substitute Player',
            enteredInning: 4,
            exitedInning: undefined,
            wasStarter: false,
            isReentry: false,
          },
        ],
      };

      const lineup = {
        ...validTeamLineupData,
        battingSlots: [slotWithHistory],
      };

      expect(lineup.battingSlots[0]?.history).toHaveLength(2);
      expect(lineup.battingSlots[0]?.history[0]?.wasStarter).toBe(true);
      expect(lineup.battingSlots[0]?.history[1]?.wasStarter).toBe(false);
    });
  });

  describe('Field Positions', () => {
    it('should handle all field positions', () => {
      const allPositions: Record<FieldPosition, PlayerId | null> = {
        [FieldPosition.PITCHER]: player1,
        [FieldPosition.CATCHER]: player2,
        [FieldPosition.FIRST_BASE]: player3,
        [FieldPosition.SECOND_BASE]: player1,
        [FieldPosition.THIRD_BASE]: player2,
        [FieldPosition.SHORTSTOP]: player3,
        [FieldPosition.LEFT_FIELD]: player1,
        [FieldPosition.CENTER_FIELD]: player2,
        [FieldPosition.RIGHT_FIELD]: player3,
        [FieldPosition.SHORT_FIELDER]: null,
        [FieldPosition.EXTRA_PLAYER]: null,
      };

      const lineup = {
        ...validTeamLineupData,
        fieldPositions: allPositions,
      };

      expect(lineup.fieldPositions[FieldPosition.PITCHER]).toEqual(player1);
      expect(lineup.fieldPositions[FieldPosition.CATCHER]).toEqual(player2);
      expect(lineup.fieldPositions[FieldPosition.SHORT_FIELDER]).toBeNull();
    });

    it('should handle null positions (unassigned)', () => {
      const sparsePositions: Record<FieldPosition, PlayerId | null> = {
        [FieldPosition.PITCHER]: player1,
        [FieldPosition.CATCHER]: null,
        [FieldPosition.FIRST_BASE]: null,
        [FieldPosition.SECOND_BASE]: null,
        [FieldPosition.THIRD_BASE]: null,
        [FieldPosition.SHORTSTOP]: null,
        [FieldPosition.LEFT_FIELD]: null,
        [FieldPosition.CENTER_FIELD]: null,
        [FieldPosition.RIGHT_FIELD]: null,
        [FieldPosition.SHORT_FIELDER]: null,
        [FieldPosition.EXTRA_PLAYER]: null,
      };

      const lineup = {
        ...validTeamLineupData,
        fieldPositions: sparsePositions,
      };

      expect(lineup.fieldPositions[FieldPosition.PITCHER]).toEqual(player1);
      expect(lineup.fieldPositions[FieldPosition.CATCHER]).toBeNull();
    });
  });

  describe('Bench Players', () => {
    it('should handle empty bench', () => {
      const lineup = validTeamLineupData;

      expect(lineup.benchPlayers).toHaveLength(0);
    });

    it('should handle multiple bench players', () => {
      const benchPlayers: PlayerInGameDTO[] = [
        {
          playerId: player2,
          name: 'Bench Player 1',
          jerseyNumber: JerseyNumber.fromNumber(20),
          battingOrderPosition: 0, // Not in batting order
          currentFieldPosition: FieldPosition.SHORT_FIELDER,
          preferredPositions: [FieldPosition.SHORT_FIELDER],
          plateAppearances: [],
          statistics: {
            playerId: player2,
            name: 'Bench Player 1',
            jerseyNumber: JerseyNumber.fromNumber(20),
            plateAppearances: 0,
            atBats: 0,
            hits: 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            homeRuns: 0,
            walks: 0,
            strikeouts: 0,
            rbi: 0,
            runs: 0,
            battingAverage: 0,
            onBasePercentage: 0,
            sluggingPercentage: 0,
            fielding: {
              positions: [],
              putouts: 0,
              assists: 0,
              errors: 0,
              fieldingPercentage: 1.0,
            },
          },
        },
      ];

      const lineup = {
        ...validTeamLineupData,
        benchPlayers,
      };

      expect(lineup.benchPlayers).toHaveLength(1);
      expect(lineup.benchPlayers[0]?.name).toBe('Bench Player 1');
      expect(lineup.benchPlayers[0]?.battingOrderPosition).toBe(0);
    });
  });

  describe('Substitution History', () => {
    it('should handle empty substitution history', () => {
      const lineup = validTeamLineupData;

      expect(lineup.substitutionHistory).toHaveLength(0);
    });

    it('should handle multiple substitutions', () => {
      const substitutions: SubstitutionRecordDTO[] = [
        {
          incomingPlayerId: player2,
          outgoingPlayerId: player1,
          incomingPlayerName: 'New Player',
          outgoingPlayerName: 'Original Player',
          battingSlot: 3,
          inning: 5,
          isReentry: false,
          timestamp: new Date('2024-08-30T15:00:00Z'),
        },
        {
          incomingPlayerId: player1,
          outgoingPlayerId: player3,
          incomingPlayerName: 'Returning Player',
          outgoingPlayerName: 'Substitute Player',
          battingSlot: 7,
          inning: 6,
          isReentry: true,
          timestamp: new Date('2024-08-30T15:30:00Z'),
        },
      ];

      const lineup = {
        ...validTeamLineupData,
        substitutionHistory: substitutions,
      };

      expect(lineup.substitutionHistory).toHaveLength(2);
      expect(lineup.substitutionHistory[0]?.isReentry).toBe(false);
      expect(lineup.substitutionHistory[1]?.isReentry).toBe(true);
      expect(lineup.substitutionHistory[0]?.inning).toBe(5);
      expect(lineup.substitutionHistory[1]?.inning).toBe(6);
    });

    it('should handle re-entry substitutions', () => {
      const reentrySubstitution: SubstitutionRecordDTO = {
        incomingPlayerId: player1,
        outgoingPlayerId: player2,
        incomingPlayerName: 'Original Starter',
        outgoingPlayerName: 'Temporary Substitute',
        battingSlot: 4,
        inning: 6,
        isReentry: true,
        timestamp: new Date(),
      };

      const lineup = {
        ...validTeamLineupData,
        substitutionHistory: [reentrySubstitution],
      };

      expect(lineup.substitutionHistory[0]?.isReentry).toBe(true);
    });
  });

  describe('Team Strategy Types', () => {
    it('should support DETAILED strategy type', () => {
      const detailedLineup = {
        ...validTeamLineupData,
        strategy: 'DETAILED' as const,
      };

      expect(detailedLineup.strategy).toBe('DETAILED');
    });

    it('should support SIMPLE strategy type', () => {
      const simpleLineup = {
        ...validTeamLineupData,
        strategy: 'SIMPLE' as const,
      };

      expect(simpleLineup.strategy).toBe('SIMPLE');
    });
  });

  describe('Domain Integration', () => {
    it('should properly use domain value objects', () => {
      const lineup = validTeamLineupData;

      expect(lineup.teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(lineup.gameId).toBeInstanceOf(GameId);

      // Check field positions contain PlayerId instances
      Object.values(lineup.fieldPositions).forEach(playerId => {
        if (playerId) {
          expect(playerId).toBeInstanceOf(PlayerId);
        }
      });
    });

    it('should maintain proper team side values', () => {
      const homeLineup = validTeamLineupData;
      const awayLineup = { ...validTeamLineupData, teamSide: 'AWAY' as const };

      expect(homeLineup.teamSide).toMatch(/^(HOME|AWAY)$/);
      expect(awayLineup.teamSide).toMatch(/^(HOME|AWAY)$/);
    });
  });
});
