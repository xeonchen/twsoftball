/**
 * @file GameStateDTOBuilder.test.ts
 * Unit tests for GameStateDTOBuilder utility
 */

import {
  Game,
  GameId,
  InningState,
  InningStateId,
  TeamLineup,
  TeamLineupId,
  PlayerId,
  JerseyNumber,
  FieldPosition,
  SoftballRules,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { InningStateRepository } from '../ports/out/InningStateRepository.js';
import type { TeamLineupRepository } from '../ports/out/TeamLineupRepository.js';

import { GameStateDTOBuilder } from './GameStateDTOBuilder.js';

describe('GameStateDTOBuilder', () => {
  let gameId: GameId;
  let game: Game;
  let inningState: InningState;
  let homeLineup: TeamLineup;
  let awayLineup: TeamLineup;
  let inningStateRepository: InningStateRepository;
  let teamLineupRepository: TeamLineupRepository;
  let rules: SoftballRules;

  beforeEach(() => {
    rules = new SoftballRules();
    gameId = GameId.generate();

    // Create game
    game = Game.createNew(gameId, 'Home Warriors', 'Away Eagles', rules);

    // Create inning state
    inningState = InningState.createNew(InningStateId.generate(), gameId);

    // Create home lineup
    homeLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, 'Home Warriors', 'HOME');
    homeLineup = homeLineup.addPlayer(
      PlayerId.generate(),
      new JerseyNumber('1'),
      'Home Player 1',
      1,
      FieldPosition.PITCHER,
      rules
    );

    // Create away lineup
    awayLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, 'Away Eagles', 'AWAY');
    awayLineup = awayLineup.addPlayer(
      PlayerId.generate(),
      new JerseyNumber('2'),
      'Away Player 1',
      1,
      FieldPosition.CATCHER,
      rules
    );

    // Mock repositories
    inningStateRepository = {
      findCurrentByGameId: vi.fn().mockResolvedValue(inningState),
      findById: vi.fn(),
      save: vi.fn(),
      findByGameId: vi.fn(),
    };

    teamLineupRepository = {
      findByGameIdAndSide: vi.fn().mockImplementation((gId: GameId, side: 'HOME' | 'AWAY') => {
        if (side === 'HOME') return Promise.resolve(homeLineup);
        return Promise.resolve(awayLineup);
      }),
      findById: vi.fn(),
      save: vi.fn(),
      findByGameId: vi.fn(),
    };
  });

  describe('buildGameStateDTO', () => {
    it('should build complete GameStateDTO with all fields', async () => {
      const result = await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository
      );

      expect(result.gameId).toEqual(gameId);
      expect(result.status).toBe(game.status); // Use actual game status
      expect(result.score).toBeDefined();
      expect(result.gameStartTime).toBeDefined();
      expect(result.currentInning).toBe(1);
      expect(result.isTopHalf).toBe(true);
      expect(result.battingTeam).toBe('AWAY');
      expect(result.outs).toBe(0);
      expect(result.bases).toBeDefined();
      expect(result.homeLineup).toBeDefined();
      expect(result.awayLineup).toBeDefined();
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should use provided updatedInningState instead of loading from repository', async () => {
      const updatedInning = inningState.withOuts(1);

      const result = await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository,
        updatedInning
      );

      expect(result.outs).toBe(1);
      expect(inningStateRepository.findCurrentByGameId).not.toHaveBeenCalled();
    });

    it('should load inningState from repository when not provided', async () => {
      await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository
      );

      expect(inningStateRepository.findCurrentByGameId).toHaveBeenCalledWith(gameId);
    });

    it('should throw error when inningState not found', async () => {
      inningStateRepository.findCurrentByGameId = vi.fn().mockResolvedValue(null);

      await expect(
        GameStateDTOBuilder.buildGameStateDTO(game, inningStateRepository, teamLineupRepository)
      ).rejects.toThrow('InningState not found for game');
    });

    it('should throw error when home lineup not found', async () => {
      teamLineupRepository.findByGameIdAndSide = vi.fn().mockImplementation((gId, side) => {
        if (side === 'HOME') return Promise.resolve(null);
        return Promise.resolve(awayLineup);
      });

      await expect(
        GameStateDTOBuilder.buildGameStateDTO(game, inningStateRepository, teamLineupRepository)
      ).rejects.toThrow('Team lineups not found for game');
    });

    it('should throw error when away lineup not found', async () => {
      teamLineupRepository.findByGameIdAndSide = vi.fn().mockImplementation((gId, side) => {
        if (side === 'AWAY') return Promise.resolve(null);
        return Promise.resolve(homeLineup);
      });

      await expect(
        GameStateDTOBuilder.buildGameStateDTO(game, inningStateRepository, teamLineupRepository)
      ).rejects.toThrow('Team lineups not found for game');
    });

    it('should use currentBattingSlot parameter when provided', async () => {
      const result = await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository,
        undefined,
        5
      );

      expect(result.currentBatterSlot).toBe(5);
    });

    it('should determine current batter from inningState when slot not provided', async () => {
      const result = await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository
      );

      // Top of inning, so away team bats
      expect(result.currentBatterSlot).toBe(inningState.awayBatterSlot);
    });

    it('should set battingTeam to AWAY when isTopHalf is true', async () => {
      const result = await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository
      );

      expect(result.isTopHalf).toBe(true);
      expect(result.battingTeam).toBe('AWAY');
    });

    it('should set battingTeam to HOME when isTopHalf is false', async () => {
      // Create bottom of inning state by ending the top half
      const bottomInning = inningState.endHalfInning();
      inningStateRepository.findCurrentByGameId = vi.fn().mockResolvedValue(bottomInning);

      const result = await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository
      );

      expect(result.isTopHalf).toBe(false);
      expect(result.battingTeam).toBe('HOME');
    });

    it('should include currentBatter when player exists in batting slot', async () => {
      const result = await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository
      );

      // Since we have a player at slot 1 in away lineup and it's top of inning
      expect(result.currentBatter).not.toBeNull();
      expect(result.currentBatter?.name).toBe('Away Player 1');
    });

    it('should set currentBatter to null when no player in batting slot', async () => {
      // Create empty lineups
      const emptyHomeLineup = TeamLineup.createNew(
        TeamLineupId.generate(),
        gameId,
        'Home Team',
        'HOME'
      );
      const emptyAwayLineup = TeamLineup.createNew(
        TeamLineupId.generate(),
        gameId,
        'Away Team',
        'AWAY'
      );

      teamLineupRepository.findByGameIdAndSide = vi.fn().mockImplementation((gId, side) => {
        if (side === 'HOME') return Promise.resolve(emptyHomeLineup);
        return Promise.resolve(emptyAwayLineup);
      });

      const result = await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository
      );

      expect(result.currentBatter).toBeNull();
    });

    it('should throw error when isTopHalf is undefined', async () => {
      // Mock a bad inning state object (doesn't have isTopHalf property)
      const badInningState = {
        ...inningState,
        isTopHalf: undefined,
      };

      inningStateRepository.findCurrentByGameId = vi.fn().mockResolvedValue(badInningState);

      await expect(
        GameStateDTOBuilder.buildGameStateDTO(game, inningStateRepository, teamLineupRepository)
      ).rejects.toThrow('CRITICAL: InningState.isTopHalf is undefined/null');
    });

    it('should include game status correctly', async () => {
      // Create completed game
      const completedGame = Game.createNew(gameId, 'Home Warriors', 'Away Eagles', rules);

      const result = await GameStateDTOBuilder.buildGameStateDTO(
        completedGame,
        inningStateRepository,
        teamLineupRepository
      );

      expect(result.status).toBe(completedGame.status);
    });

    it('should include base runners information', async () => {
      // Create inning state with runners on base
      const playerId = PlayerId.generate();
      const inningWithRunners = inningState.withRunnerOnBase('FIRST', playerId);

      const result = await GameStateDTOBuilder.buildGameStateDTO(
        game,
        inningStateRepository,
        teamLineupRepository,
        inningWithRunners
      );

      expect(result.bases.first).toEqual(playerId);
      expect(result.bases.second).toBeNull();
      expect(result.bases.third).toBeNull();
    });
  });
});
