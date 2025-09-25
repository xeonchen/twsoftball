import { FieldPosition } from '@twsoftball/application';

/**
 * Domain Validation Utilities for Game Setup UI
 *
 * Provides real-time validation feedback by surfacing domain rules
 * in user-friendly format. These utilities validate UI input against
 * domain constraints without performing business operations.
 *
 * @remarks
 * - Uses domain types for validation only (not business logic)
 * - Provides UI-friendly error messages and suggestions
 * - Maintains separation from domain business logic
 * - Optimized for real-time validation during user input
 */

/**
 * Result of jersey number validation
 */
export interface JerseyValidationResult {
  /** Whether the jersey number is valid */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Optional warning for valid but uncommon values */
  warning?: string;
}

/**
 * Result of field position validation
 */
export interface FieldPositionValidationResult {
  /** Whether the position is valid */
  isValid: boolean;
  /** The validated position enum value if valid */
  position?: FieldPosition;
  /** Error message if validation failed */
  error?: string;
  /** Suggested valid positions if input was invalid */
  suggestions?: FieldPosition[];
}

/**
 * Result of lineup validation
 */
export interface LineupValidationResult {
  /** Whether the lineup is valid */
  isValid: boolean;
  /** Number of valid players in lineup */
  playerCount: number;
  /** Error message if validation failed */
  error?: string;
  /** Optional warning for valid but unusual lineups */
  warning?: string;
  /** Position coverage information */
  positionCoverage?: {
    covered: FieldPosition[];
    missing: FieldPosition[];
  };
}

/**
 * Result of team names validation
 */
export interface TeamValidationResult {
  /** Whether the team names are valid */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Optional suggestions for team names */
  suggestions?: string[];
}

/**
 * Player interface for validation (UI representation)
 */
export interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  position: string;
  battingOrder: number;
}

/**
 * Validates a jersey number according to domain rules
 *
 * @param value - Jersey number as string (user input)
 * @param existingJerseys - Already taken jersey numbers on this team
 * @returns Validation result with error/warning messages
 */
export function validateJerseyNumber(
  value: string | null | undefined,
  existingJerseys: string[]
): JerseyValidationResult {
  // Handle null/undefined input
  if (value == null) {
    return {
      isValid: false,
      error: 'Jersey number is required',
    };
  }

  // Check for empty or whitespace
  if (!value.trim()) {
    return {
      isValid: false,
      error: 'Jersey number is required',
    };
  }

  const trimmedValue = value.trim();

  // Check if numeric
  if (!/^\d+$/.test(trimmedValue)) {
    return {
      isValid: false,
      error: 'Jersey number must be numeric',
    };
  }

  const numericValue = parseInt(trimmedValue, 10);

  // Check range (domain rule: 1-99)
  if (numericValue < 1 || numericValue > 99) {
    return {
      isValid: false,
      error: 'Jersey number must be between 1 and 99',
    };
  }

  // Check for duplicates on same team
  if (existingJerseys.includes(trimmedValue)) {
    return {
      isValid: false,
      error: `Jersey number ${trimmedValue} is already taken`,
    };
  }

  // Optional warning for uncommon numbers
  const result: JerseyValidationResult = {
    isValid: true,
  };

  if (numericValue > 50) {
    result.warning = 'High jersey numbers are less common';
  }

  return result;
}

/**
 * Validates a field position according to domain rules
 *
 * @param value - Position as string (user input)
 * @returns Validation result with position enum and suggestions
 */
export function validateFieldPosition(
  value: string | null | undefined
): FieldPositionValidationResult {
  // Handle null/undefined input
  if (value == null) {
    return {
      isValid: false,
      error: 'Field position is required',
    };
  }

  // Check for empty input
  if (!value.trim()) {
    return {
      isValid: false,
      error: 'Field position is required',
    };
  }

  const normalizedValue = value.trim().toUpperCase();

  // Check if valid position enum value
  const position = Object.values(FieldPosition).find((pos: string) => pos === normalizedValue);

  if (position) {
    return {
      isValid: true,
      position,
    };
  }

  // Invalid position - provide suggestions
  return {
    isValid: false,
    error: `Invalid field position: ${value}`,
    suggestions: getFieldPositionSuggestions(),
  };
}

/**
 * Validates a complete lineup according to domain rules
 *
 * @param lineup - Array of players in batting order
 * @returns Validation result with player count and coverage info
 */
export function validateLineup(lineup: (Player | null | undefined)[]): LineupValidationResult {
  // Filter out null/undefined entries
  const nonNullPlayers = lineup.filter((player): player is Player => player != null);

  // Count players with names
  const validPlayers = nonNullPlayers.filter(player => player.name.trim() !== '');
  const playerCount = validPlayers.length;

  // Check if all non-null players have names (priority over minimum count)
  if (nonNullPlayers.some(player => player.name.trim() === '')) {
    return {
      isValid: false,
      error: 'All players must have names',
      playerCount,
    };
  }

  // Check for duplicate jersey numbers (priority over minimum count)
  const jerseyNumbers = validPlayers.map(p => p.jerseyNumber);
  const duplicateJersey = findDuplicate(jerseyNumbers);
  if (duplicateJersey) {
    return {
      isValid: false,
      error: `Duplicate jersey number: ${duplicateJersey}`,
      playerCount,
    };
  }

  // Check for duplicate batting orders (priority over minimum count)
  const battingOrders = validPlayers.map(p => p.battingOrder);
  const duplicateBattingOrder = findDuplicate(battingOrders.map(String));
  if (duplicateBattingOrder) {
    return {
      isValid: false,
      error: `Duplicate batting order: ${duplicateBattingOrder}`,
      playerCount,
    };
  }

  // Check minimum players after other validations
  if (playerCount < 9) {
    return {
      isValid: false,
      error: 'Lineup must have at least 9 players',
      playerCount,
    };
  }

  // Calculate position coverage
  const positionCoverage = calculatePositionCoverage(validPlayers);

  // Build result with optional warning
  const result: LineupValidationResult = {
    isValid: true,
    playerCount,
    positionCoverage,
  };

  if (playerCount > 15) {
    result.warning = 'Unusually large lineup';
  }

  return result;
}

/**
 * Validates team names according to domain rules
 *
 * @param homeTeam - Home team name
 * @param awayTeam - Away team name
 * @returns Validation result with error messages
 */
export function validateTeamNames(
  homeTeam: string | null | undefined,
  awayTeam: string | null | undefined
): TeamValidationResult {
  const homeNormalized = homeTeam?.trim() || '';
  const awayNormalized = awayTeam?.trim() || '';

  // Check if both are empty
  if (!homeNormalized && !awayNormalized) {
    return {
      isValid: false,
      error: 'Team names are required',
    };
  }

  // Check if home team is empty
  if (!homeNormalized) {
    return {
      isValid: false,
      error: 'Home team name is required',
    };
  }

  // Check if away team is empty
  if (!awayNormalized) {
    return {
      isValid: false,
      error: 'Away team name is required',
    };
  }

  // Check if names are the same (case-insensitive)
  if (homeNormalized.toLowerCase() === awayNormalized.toLowerCase()) {
    return {
      isValid: false,
      error: 'Team names must be different',
    };
  }

  // Optional: Check for reasonable length limits
  const maxLength = 50; // Reasonable UI limit
  if (homeNormalized.length > maxLength) {
    return {
      isValid: false,
      error: `Home team name too long (max ${maxLength} characters)`,
    };
  }

  if (awayNormalized.length > maxLength) {
    return {
      isValid: false,
      error: `Away team name too long (max ${maxLength} characters)`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Get suggested jersey numbers that are commonly used and not taken
 *
 * @param existingJerseys - Already taken jersey numbers
 * @returns Array of suggested jersey numbers
 */
export function getJerseyNumberSuggestions(existingJerseys: string[]): string[] {
  // Common jersey numbers in softball
  const commonNumbers = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
  ];

  // Filter out already taken numbers
  const available = commonNumbers.filter(num => !existingJerseys.includes(num));

  // Add some higher numbers if needed
  if (available.length < 10) {
    for (let i = 26; i <= 99 && available.length < 15; i++) {
      const num = i.toString();
      if (!existingJerseys.includes(num)) {
        available.push(num);
      }
    }
  }

  return available.slice(0, 12); // Reasonable number of suggestions
}

/**
 * Get all valid field positions for dropdown/suggestions
 *
 * @returns Array of all valid FieldPosition enum values
 */
export function getFieldPositionSuggestions(): FieldPosition[] {
  return Object.values(FieldPosition);
}

/**
 * Helper function to find duplicate values in array
 *
 * @param array - Array to check for duplicates
 * @returns First duplicate found or null
 */
function findDuplicate(array: string[]): string | null {
  const seen = new Set<string>();
  for (const item of array) {
    if (seen.has(item)) {
      return item;
    }
    seen.add(item);
  }
  return null;
}

/**
 * Calculate position coverage for a lineup
 *
 * @param players - Array of valid players
 * @returns Position coverage information
 */
function calculatePositionCoverage(players: Player[]): {
  covered: FieldPosition[];
  missing: FieldPosition[];
} {
  const allPositions = getFieldPositionSuggestions();
  const coveredPositions = players
    .map(p => p.position.toUpperCase())
    .filter(pos => Object.values(FieldPosition).includes(pos as FieldPosition))
    .map(pos => pos as FieldPosition);

  const uniqueCoveredPositions = [...new Set(coveredPositions)];
  const missingPositions = allPositions.filter(pos => !uniqueCoveredPositions.includes(pos));

  return {
    covered: uniqueCoveredPositions,
    missing: missingPositions,
  };
}
