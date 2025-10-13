/**
 * @file Wizard to Command Mapper
 * Converts UI wizard state to properly structured Application layer commands.
 *
 * @remarks
 * This mapper transforms the UI setup wizard state into a domain-rich
 * StartNewGameCommand with proper value objects and validation. It bridges
 * the gap between the UI layer's simple data structures and the Application
 * layer's command requirements while maintaining hexagonal architecture.
 *
 * Key Responsibilities:
 * - Convert UI primitive data to domain value objects (GameId, PlayerId, etc.)
 * - Validate all domain constraints (jersey numbers, field positions, etc.)
 * - Generate unique identifiers for new games
 * - Ensure proper lineup structure and batting order
 * - Provide clear error messages for validation failures
 *
 * Design Principles:
 * - Pure function with no side effects
 * - Comprehensive validation following domain rules
 * - Clear error messages for debugging and user feedback
 * - Follows existing patterns from commandMapper.ts
 *
 * @example
 * ```typescript
 * const wizardState = {
 *   teams: { home: 'Eagles', away: 'Hawks', ourTeam: 'home' },
 *   lineup: [
 *     { id: 'p1', name: 'John', jerseyNumber: '1', position: 'P', battingOrder: 1 }
 *     // ... more players
 *   ]
 * };
 *
 * const command = wizardToCommand(wizardState);
 * // Returns StartNewGameCommand with proper domain value objects
 * ```
 */

import type { StartNewGameCommand } from '@twsoftball/application';
import { GameId, PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/application';
import { v4 as uuidv4 } from 'uuid';

import type { SetupWizardState, Player } from '../../lib/types';

/**
 * Local LineupPlayerDTO interface to match what StartNewGameCommand expects.
 */
interface LineupPlayerDTO {
  readonly playerId: PlayerId;
  readonly name: string;
  readonly jerseyNumber: JerseyNumber;
  readonly battingOrderPosition: number;
  readonly fieldPosition: FieldPosition;
  readonly preferredPositions: FieldPosition[];
}

/**
 * Converts UI wizard state to StartNewGameCommand with full validation.
 *
 * @remarks
 * This function performs comprehensive validation of all input data and
 * transforms UI primitives into proper domain value objects. It ensures
 * all domain constraints are met before creating the command.
 *
 * Validation includes:
 * - Team name requirements and uniqueness
 * - Lineup size (minimum 9 players)
 * - Jersey number validation (0-99, unique)
 * - Field position validity
 * - Batting order sequence validation
 * - Player data completeness
 *
 * @param wizardState - UI wizard state containing teams and lineup data
 * @returns StartNewGameCommand with proper domain value objects
 * @throws Error for any validation failure with descriptive message
 *
 * @example
 * ```typescript
 * const command = wizardToCommand({
 *   teams: { home: 'Eagles', away: 'Hawks', ourTeam: 'home' },
 *   lineup: [
 *     { id: 'p1', name: 'John', jerseyNumber: '1', position: 'P', battingOrder: 1 },
 *     // ... 8 more players for minimum lineup
 *   ]
 * });
 * // Returns validated StartNewGameCommand
 * ```
 */
export function wizardToCommand(wizardState: SetupWizardState): StartNewGameCommand {
  // Validate input state structure
  validateWizardState(wizardState);

  // Validate and normalize team data
  const teamData = validateAndNormalizeTeams(wizardState.teams);

  // Validate and process lineup
  const processedLineup = validateAndProcessLineup(wizardState.lineup);

  // Generate unique game ID
  const gameId = new GameId(`game-${uuidv4()}`);

  // Set game date to near future (5 minutes from now) to avoid "date in past" validation errors
  // This is realistic for game scheduling - games typically start soon, not exactly at creation time
  const gameDate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  // Create command with validated data
  return {
    gameId,
    homeTeamName: teamData.homeTeamName,
    awayTeamName: teamData.awayTeamName,
    ourTeamSide: teamData.ourTeamSide,
    gameDate,
    initialLineup: processedLineup,
  };
}

/**
 * Validates the basic wizard state structure.
 */
function validateWizardState(wizardState: SetupWizardState): void {
  if (!wizardState) {
    throw new Error('Wizard state is required');
  }

  if (!wizardState.teams) {
    throw new Error('Team data is required');
  }

  if (!wizardState.lineup) {
    throw new Error('Lineup is required');
  }

  if (!Array.isArray(wizardState.lineup)) {
    throw new Error('Lineup must be an array');
  }
}

/**
 * Validates and normalizes team configuration data.
 */
function validateAndNormalizeTeams(teams: SetupWizardState['teams']): {
  homeTeamName: string;
  awayTeamName: string;
  ourTeamSide: 'HOME' | 'AWAY';
} {
  const homeTeamName = teams.home?.trim();
  const awayTeamName = teams.away?.trim();

  if (!homeTeamName) {
    throw new Error('Home team name is required');
  }

  if (!awayTeamName) {
    throw new Error('Away team name is required');
  }

  if (homeTeamName === awayTeamName) {
    throw new Error('Home and away team names must be different');
  }

  if (!teams.ourTeam) {
    throw new Error('Our team side must be specified (home or away)');
  }

  const ourTeamSide: 'HOME' | 'AWAY' = teams.ourTeam === 'home' ? 'HOME' : 'AWAY';

  return {
    homeTeamName,
    awayTeamName,
    ourTeamSide,
  };
}

/**
 * Validates and processes the lineup into LineupPlayerDTO format.
 */
function validateAndProcessLineup(lineup: Player[]): LineupPlayerDTO[] {
  // Basic lineup validation
  if (lineup.length < 9) {
    throw new Error('Lineup must contain at least 9 players');
  }

  // Sort lineup by batting order to ensure correct processing
  const sortedLineup = [...lineup].sort((a, b) => a.battingOrder - b.battingOrder);

  // Validate batting order sequence
  validateBattingOrderSequence(sortedLineup);

  // Track jersey numbers for uniqueness validation
  const usedJerseyNumbers = new Set<number>();

  // Process each player
  return sortedLineup.map((player, index) => {
    validatePlayerData(player);

    // Validate and convert jersey number
    const jerseyNumberValue = validateJerseyNumber(player.jerseyNumber, usedJerseyNumbers);

    // Validate field position
    const fieldPosition = validateFieldPosition(player.position);

    // Create domain objects
    return {
      playerId: new PlayerId(player.id),
      name: player.name.trim(),
      jerseyNumber: JerseyNumber.fromNumber(jerseyNumberValue),
      battingOrderPosition: index + 1, // Use array position for sequential order
      fieldPosition,
      preferredPositions: [fieldPosition], // Use current position as preferred
    };
  });
}

/**
 * Validates that batting order is sequential starting from 1.
 */
function validateBattingOrderSequence(sortedLineup: Player[]): void {
  for (let i = 0; i < sortedLineup.length; i++) {
    const player = sortedLineup[i];
    if (!player) {
      throw new Error('Invalid lineup: missing player at position ' + (i + 1));
    }
    const expectedOrder = i + 1;
    if (player.battingOrder !== expectedOrder) {
      throw new Error('Batting order must be sequential starting from 1');
    }
  }
}

/**
 * Validates individual player data completeness.
 */
function validatePlayerData(player: Player): void {
  if (!player.id?.trim()) {
    throw new Error('Player ID is required');
  }

  if (!player.name?.trim()) {
    throw new Error('Player name is required');
  }

  if (!player.jerseyNumber?.toString().trim()) {
    throw new Error('Jersey number is required');
  }

  if (!player.position?.trim()) {
    throw new Error('Position is required');
  }
}

/**
 * Validates jersey number format, range, and uniqueness.
 */
function validateJerseyNumber(jerseyNumber: string, usedNumbers: Set<number>): number {
  const numberValue = parseInt(jerseyNumber.trim(), 10);

  if (isNaN(numberValue)) {
    throw new Error('Jersey number must be a valid number');
  }

  if (numberValue < 1 || numberValue > 99) {
    throw new Error('Jersey number must be between 1 and 99');
  }

  if (usedNumbers.has(numberValue)) {
    throw new Error(`Duplicate jersey number: ${numberValue}`);
  }

  usedNumbers.add(numberValue);
  return numberValue;
}

/**
 * Validates field position against domain enum values.
 */
function validateFieldPosition(position: string): FieldPosition {
  const positionValue = position.trim();

  // Check if position exists in FieldPosition enum
  if (!Object.values(FieldPosition).includes(positionValue as FieldPosition)) {
    throw new Error(`Invalid field position: ${positionValue}`);
  }

  return positionValue as FieldPosition;
}
