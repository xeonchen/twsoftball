/**
 * Enumeration of all defensive field positions in slow-pitch softball.
 *
 * @remarks
 * FieldPosition defines the complete set of defensive positions available in
 * slow-pitch softball, including both traditional baseball positions and
 * softball-specific additions:
 *
 * **Infield Positions** (close to batter):
 * - PITCHER: Controls the pace of play, covers first base on bunts
 * - CATCHER: Receives pitches, covers home plate, calls defensive plays
 * - FIRST_BASE, SECOND_BASE, THIRD_BASE: Cover respective bases and areas
 * - SHORTSTOP: Covers area between second and third base
 *
 * **Outfield Positions** (deeper defensive coverage):
 * - LEFT_FIELD, CENTER_FIELD, RIGHT_FIELD: Cover respective outfield areas
 *
 * **Softball-Specific Positions**:
 * - SHORT_FIELDER: 10th fielder positioned in shallow outfield (slow-pitch only)
 * - EXTRA_PLAYER: Designated hitter role, bats but doesn't play defense
 *
 * **Common Lineup Configurations**:
 * - 10-player standard: Uses all positions including SHORT_FIELDER (most common)
 * - 11-player (1 EP): Standard defense + 1 EXTRA_PLAYER (very common)
 * - 12-player (2 EP): Standard defense + 2 EXTRA_PLAYERs (common)
 * - 9-player: Traditional without SHORT_FIELDER (valid but less frequent)
 * - 13+ players: Multiple EPs (valid but less common boundary cases)
 *
 * @example
 * ```typescript
 * // Assigning positions in a lineup
 * const pitcher = FieldPosition.PITCHER;
 * const shortFielder = FieldPosition.SHORT_FIELDER; // Standard 10th position
 * const extraPlayer = FieldPosition.EXTRA_PLAYER; // Common 11th+ positions
 *
 * // Checking if position is infield
 * const infield = [
 *   FieldPosition.PITCHER,
 *   FieldPosition.CATCHER,
 *   FieldPosition.FIRST_BASE,
 *   FieldPosition.SECOND_BASE,
 *   FieldPosition.THIRD_BASE,
 *   FieldPosition.SHORTSTOP
 * ];
 * ```
 */
export enum FieldPosition {
  /** Controls pitching and covers first base area */
  PITCHER = 'P',
  /** Receives pitches and covers home plate */
  CATCHER = 'C',
  /** Covers first base and right side of infield */
  FIRST_BASE = '1B',
  /** Covers second base and middle infield */
  SECOND_BASE = '2B',
  /** Covers third base and left side of infield */
  THIRD_BASE = '3B',
  /** Covers area between second and third base */
  SHORTSTOP = 'SS',

  /** Covers left side of outfield */
  LEFT_FIELD = 'LF',
  /** Covers center outfield (typically deepest position) */
  CENTER_FIELD = 'CF',
  /** Covers right side of outfield */
  RIGHT_FIELD = 'RF',

  /** 10th fielder positioned in shallow outfield (slow-pitch softball specific) */
  SHORT_FIELDER = 'SF',
  /** Designated hitter who bats but doesn't play defense */
  EXTRA_PLAYER = 'EP',
}
