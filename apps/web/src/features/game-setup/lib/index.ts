/**
 * Game Setup Domain Validation
 *
 * Barrel export for domain validation utilities used in game setup UI.
 * Provides real-time validation feedback by surfacing domain rules.
 */

export {
  validateJerseyNumber,
  validateFieldPosition,
  validateLineup,
  validateTeamNames,
  getJerseyNumberSuggestions,
  getFieldPositionSuggestions,
  validatePlayerName,
  isPlayerComplete,
  countIncompletePlayers,
  type JerseyValidationResult,
  type FieldPositionValidationResult,
  type LineupValidationResult,
  type TeamValidationResult,
  type PlayerNameValidationResult,
  type Player,
} from './domainValidation';
