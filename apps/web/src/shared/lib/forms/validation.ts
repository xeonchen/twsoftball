import { z } from 'zod';

/**
 * Validation schema for team names
 *
 * Rules:
 * - Must be between 2 and 30 characters
 * - Can contain letters, numbers, spaces, and basic punctuation
 * - Cannot be empty or contain only whitespace
 */
const teamNameSchema = z
  .string()
  .min(2, 'Team name must be at least 2 characters long')
  .max(30, 'Team name must be no more than 30 characters long')
  .regex(
    /^[a-zA-Z0-9\s\-'.]+$/,
    'Team name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods'
  )
  .trim()
  .refine(name => name.length > 0, 'Team name cannot be empty');

/**
 * Validation schema for team setup form
 *
 * Validates home and away team names and ensures they are different.
 * This is used for the initial game setup where users enter team information.
 */
export const teamSetupSchema = z
  .object({
    homeTeam: teamNameSchema,
    awayTeam: teamNameSchema,
  })
  .refine(data => data.homeTeam !== data.awayTeam, {
    message:
      'Teams must have different names - cannot use the same team name for both home and away',
    path: ['awayTeam'], // Show error on away team field
  });

/**
 * Validation schema for game configuration
 *
 * Validates complete game setup including teams, game type, and innings.
 * This extends the basic team setup with additional game parameters.
 */
export const gameConfigSchema = z.object({
  homeTeam: teamNameSchema,
  awayTeam: teamNameSchema,
  gameType: z.enum(['slow-pitch', 'fast-pitch'], {
    message: 'Game type must be either slow-pitch or fast-pitch',
  }),
  inningsCount: z
    .number()
    .int('Innings count must be a whole number')
    .min(3, 'Game must have at least 3 innings')
    .max(12, 'Game cannot have more than 12 innings'),
});

/**
 * Validation schema for player names
 *
 * Rules:
 * - Must be between 2 and 50 characters
 * - Can contain letters, spaces, hyphens, apostrophes, and periods
 * - Cannot contain numbers or special characters
 * - Supports international characters for names like José, O'Connor, etc.
 */
export const playerNameSchema = z
  .string()
  .min(2, 'Player name must be at least 2 characters long')
  .max(50, 'Player name must be no more than 50 characters long')
  .regex(
    /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\s\-'.]+$/,
    'Player name can only contain letters, spaces, hyphens, apostrophes, and periods'
  )
  .trim()
  .refine(name => name.length > 0, 'Player name cannot be empty');

/**
 * Type definitions for form data
 */
export type TeamSetupFormData = z.infer<typeof teamSetupSchema>;
export type GameConfigFormData = z.infer<typeof gameConfigSchema>;
export type PlayerNameFormData = z.infer<typeof playerNameSchema>;

/**
 * Utility function to validate a team name
 *
 * This is a standalone utility that can be used for real-time validation
 * or in contexts where you need a simple boolean result.
 *
 * @example
 * ```typescript
 * const isValid = validateTeamName('Warriors');
 * if (isValid) {
 *   // Proceed with valid team name
 * }
 * ```
 *
 * @param teamName - The team name to validate
 * @returns True if the team name is valid, false otherwise
 */
export const validateTeamName = (teamName: string): boolean => {
  try {
    // Handle null/undefined/non-string inputs
    if (typeof teamName !== 'string') {
      return false;
    }

    teamNameSchema.parse(teamName);
    return true;
  } catch {
    return false;
  }
};

/**
 * Common validation messages for consistent UX
 */
export const ValidationMessages = {
  TEAM_NAME_REQUIRED: 'Team name is required',
  TEAM_NAME_TOO_SHORT: 'Team name must be at least 2 characters long',
  TEAM_NAME_TOO_LONG: 'Team name must be no more than 30 characters long',
  TEAM_NAME_INVALID_CHARS: 'Team name contains invalid characters',
  TEAMS_MUST_BE_DIFFERENT: 'Home and away teams must have different names',
  PLAYER_NAME_REQUIRED: 'Player name is required',
  PLAYER_NAME_INVALID: 'Player name contains invalid characters',
  INNINGS_REQUIRED: 'Number of innings is required',
  INNINGS_OUT_OF_RANGE: 'Innings must be between 3 and 12',
} as const;
