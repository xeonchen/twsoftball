/**
 * @file GameHistoryDTO
 * DTOs representing the complete chronological history of a softball game.
 *
 * @remarks
 * These DTOs encapsulate the complete sequence of events and actions
 * that occurred during a softball game, providing a comprehensive
 * audit trail and timeline for game reconstruction, analysis, and review.
 *
 * Game history includes:
 * - Chronological sequence of all recorded events
 * - At-bat outcomes with detailed context
 * - Lineup changes and substitutions
 * - Administrative actions and corrections
 * - Score progression and inning transitions
 * - Undo/redo operations and state changes
 *
 * The structure supports both detailed play-by-play reconstruction
 * and high-level game flow analysis, enabling various use cases
 * from official scorekeeping to performance analysis.
 *
 * @example
 * ```typescript
 * const gameHistory: GameHistoryDTO = {
 *   gameId: GameId.create(),
 *   gameStartTime: new Date('2024-06-15T19:00:00Z'),
 *   gameEndTime: new Date('2024-06-15T21:30:00Z'),
 *   events: [
 *     {
 *       eventId: 'event-1',
 *       timestamp: new Date('2024-06-15T19:05:00Z'),
 *       eventType: 'at_bat_completed',
 *       inning: 1,
 *       half: 'top',
 *       description: 'John Smith singles to right field',
 *       details: {
 *         batter: { playerId: PlayerId.create(), name: 'John Smith' },
 *         result: 'SINGLE',
 *         outcome: { runs: 0, rbi: 0 }
 *       }
 *     }
 *   ],
 *   scoringPlays: [
 *     {
 *       inning: 3,
 *       half: 'bottom',
 *       description: 'Mike Johnson home run scores 2',
 *       runsScored: 2,
 *       timestamp: new Date('2024-06-15T19:45:00Z')
 *     }
 *   ],
 *   substitutions: [
 *     {
 *       inning: 5,
 *       playerOut: { playerId: PlayerId.create(), name: 'Tom Wilson' },
 *       playerIn: { playerId: PlayerId.create(), name: 'Dave Brown' },
 *       reason: 'injury',
 *       timestamp: new Date('2024-06-15T20:15:00Z')
 *     }
 *   ]
 * };
 * ```
 */

import { GameId, PlayerId, AtBatResultType, JerseyNumber, FieldPosition } from '@twsoftball/domain';

/**
 * Complete chronological history of a softball game.
 *
 * @remarks
 * This DTO provides a comprehensive timeline of all events that occurred
 * during a softball game, from first pitch to final out. It serves as
 * the definitive record for game reconstruction, official scorekeeping,
 * and detailed analysis.
 *
 * The history includes:
 * - Every at-bat result and outcome
 * - All scoring plays and RBI situations
 * - Lineup changes and substitutions
 * - Inning transitions and game flow events
 * - Administrative actions (undo/redo, corrections)
 * - Time stamps for event sequencing and analysis
 *
 * This comprehensive record enables various use cases including
 * official scorekeeping, game reconstruction, statistical analysis,
 * and dispute resolution.
 */
export interface GameHistoryDTO {
  /** Unique identifier for the game */
  readonly gameId: GameId;

  /** When the game officially started */
  readonly gameStartTime: Date;

  /** When the game was completed (null if still in progress) */
  readonly gameEndTime: Date | null;

  /** Complete chronological sequence of game events */
  readonly events: readonly GameEventDTO[];

  /** Summary of all scoring plays for quick reference */
  readonly scoringPlays: readonly ScoringPlayDTO[];

  /** All player substitutions made during the game */
  readonly substitutions: readonly SubstitutionEventDTO[];

  /** Inning-by-inning summary for navigation and analysis */
  readonly inningBreakdown: readonly InningHistoryDTO[];

  /** Administrative actions taken during the game */
  readonly administrativeActions: readonly AdministrativeActionDTO[];

  /** Final game statistics and outcome */
  readonly gameOutcome: GameOutcomeDTO;

  /** When this history was generated */
  readonly generatedAt: Date;
}

/**
 * Individual event in the game timeline.
 *
 * @remarks
 * Represents a single recorded event during the game, providing
 * detailed context about what happened, when it occurred, and
 * what the outcome was. Events are ordered chronologically and
 * include enough detail for complete game reconstruction.
 */
export interface GameEventDTO {
  /** Unique identifier for this event */
  readonly eventId: string;

  /** When this event occurred */
  readonly timestamp: Date;

  /** Type of event that occurred */
  readonly eventType:
    | 'at_bat_completed'
    | 'inning_ended'
    | 'substitution_made'
    | 'game_started'
    | 'game_ended'
    | 'administrative_action'
    | 'undo_performed'
    | 'redo_performed';

  /** Inning when the event occurred */
  readonly inning: number;

  /** Half of the inning (top/bottom) */
  readonly half: 'top' | 'bottom';

  /** Sequence number within the inning */
  readonly sequenceInInning: number;

  /** Brief description of the event */
  readonly description: string;

  /** Current score after this event */
  readonly scoreAfterEvent: {
    readonly home: number;
    readonly away: number;
  };

  /** Detailed event-specific information */
  readonly details:
    | AtBatEventDetailsDTO
    | InningEventDetailsDTO
    | SubstitutionEventDetailsDTO
    | AdministrativeEventDetailsDTO;
}

/**
 * Detailed information for at-bat events.
 *
 * @remarks
 * Comprehensive details about a plate appearance, including
 * the batter, result, base running outcomes, and scoring impact.
 */
export interface AtBatEventDetailsDTO {
  /** Batter information */
  readonly batter: {
    readonly playerId: PlayerId;
    readonly name: string;
    readonly jerseyNumber: JerseyNumber;
    readonly battingPosition: number;
  };

  /** Result of the at-bat */
  readonly result: AtBatResultType;

  /** Where the ball was hit (if applicable) */
  readonly location?: string;

  /** Outcome of the at-bat */
  readonly outcome: {
    readonly runs: number;
    readonly rbi: number;
    readonly batterAdvancedTo?: 'FIRST' | 'SECOND' | 'THIRD' | 'HOME' | null;
  };

  /** Base runner movements */
  readonly runnerMovements: readonly {
    readonly runnerId: PlayerId;
    readonly fromBase?: 'FIRST' | 'SECOND' | 'THIRD';
    readonly toBase?: 'FIRST' | 'SECOND' | 'THIRD' | 'HOME';
    readonly scored: boolean;
  }[];

  /** Outs recorded on this play */
  readonly outsRecorded: number;

  /** Current outs after this at-bat */
  readonly outsAfter: number;
}

/**
 * Detailed information for inning transition events.
 *
 * @remarks
 * Information about inning changes, including the reason for
 * the transition and the state change details.
 */
export interface InningEventDetailsDTO {
  /** Reason the inning ended */
  readonly reason: 'three_outs' | 'forced_end' | 'game_end';

  /** Inning that just ended */
  readonly endedInning: number;

  /** Half that just ended */
  readonly endedHalf: 'top' | 'bottom';

  /** Next inning starting (if applicable) */
  readonly nextInning?: number;

  /** Next half starting (if applicable) */
  readonly nextHalf?: 'top' | 'bottom';

  /** Runs scored in the completed half-inning */
  readonly runsInInning: number;

  /** Runners left on base */
  readonly runnersLeftOnBase: number;
}

/**
 * Detailed information for player substitution events.
 *
 * @remarks
 * Complete details about a player substitution including
 * the players involved, positions affected, and the reason
 * for the change.
 */
export interface SubstitutionEventDetailsDTO {
  /** Player being substituted out */
  readonly playerOut: {
    readonly playerId: PlayerId;
    readonly name: string;
    readonly jerseyNumber: JerseyNumber;
    readonly position: FieldPosition;
    readonly battingPosition: number;
  };

  /** Player being substituted in */
  readonly playerIn: {
    readonly playerId: PlayerId;
    readonly name: string;
    readonly jerseyNumber: JerseyNumber;
    readonly position: FieldPosition;
    readonly battingPosition: number;
  };

  /** Reason for the substitution */
  readonly reason: 'strategic' | 'injury' | 'ejection' | 'pinch_hit' | 'pinch_run' | 'defensive';

  /** Whether this affects batting order */
  readonly affectsBattingOrder: boolean;

  /** Whether the substituted player can re-enter */
  readonly canReenter: boolean;
}

/**
 * Detailed information for administrative actions.
 *
 * @remarks
 * Information about non-gameplay actions taken during the game,
 * such as corrections, undo/redo operations, or official decisions.
 */
export interface AdministrativeEventDetailsDTO {
  /** Type of administrative action */
  readonly actionType: 'undo' | 'redo' | 'correction' | 'timeout' | 'weather_delay' | 'protest';

  /** Description of what was done */
  readonly actionDescription: string;

  /** Who initiated the action */
  readonly initiatedBy?: string;

  /** State before the action (for undo/redo) */
  readonly stateBefore?: Record<string, unknown>;

  /** State after the action (for undo/redo) */
  readonly stateAfter?: Record<string, unknown>;

  /** Reason for the action */
  readonly reason?: string;
}

/**
 * Summary of a scoring play for quick reference.
 *
 * @remarks
 * High-level information about plays that resulted in runs
 * being scored, used for generating scoring summaries and
 * highlighting key moments in the game.
 */
export interface ScoringPlayDTO {
  /** Inning when runs were scored */
  readonly inning: number;

  /** Half of the inning */
  readonly half: 'top' | 'bottom';

  /** Brief description of the scoring play */
  readonly description: string;

  /** Number of runs scored on this play */
  readonly runsScored: number;

  /** Players who scored runs */
  readonly runnersScored: readonly {
    readonly playerId: PlayerId;
    readonly name: string;
  }[];

  /** Player who drove in the runs */
  readonly rbiPlayer?: {
    readonly playerId: PlayerId;
    readonly name: string;
  };

  /** When the play occurred */
  readonly timestamp: Date;
}

/**
 * Substitution event summary.
 *
 * @remarks
 * Summary information about player substitutions for
 * quick reference and lineup tracking.
 */
export interface SubstitutionEventDTO {
  /** Inning when substitution occurred */
  readonly inning: number;

  /** Player leaving the game */
  readonly playerOut: {
    readonly playerId: PlayerId;
    readonly name: string;
  };

  /** Player entering the game */
  readonly playerIn: {
    readonly playerId: PlayerId;
    readonly name: string;
  };

  /** Position affected */
  readonly position: FieldPosition;

  /** Reason for substitution */
  readonly reason: string;

  /** When the substitution occurred */
  readonly timestamp: Date;
}

/**
 * Inning-by-inning historical breakdown.
 *
 * @remarks
 * Summary of events and outcomes for each inning, providing
 * a structured view of game progression and key moments.
 */
export interface InningHistoryDTO {
  /** Inning number */
  readonly inning: number;

  /** Top half summary */
  readonly top: {
    readonly runsScored: number;
    readonly hits: number;
    readonly keyEvents: readonly string[];
    readonly duration: number; // minutes
  };

  /** Bottom half summary (null if not played) */
  readonly bottom: {
    readonly runsScored: number;
    readonly hits: number;
    readonly keyEvents: readonly string[];
    readonly duration: number; // minutes
  } | null;

  /** Notable events in this inning */
  readonly highlights: readonly string[];
}

/**
 * Administrative action summary.
 *
 * @remarks
 * Record of non-gameplay actions taken during the game
 * for audit purposes and dispute resolution.
 */
export interface AdministrativeActionDTO {
  /** When the action was taken */
  readonly timestamp: Date;

  /** Type of action */
  readonly actionType: string;

  /** Description of the action */
  readonly description: string;

  /** Who performed the action */
  readonly performer?: string;

  /** Result of the action */
  readonly result: string;
}

/**
 * Final game outcome and summary.
 *
 * @remarks
 * Complete game result information including final score,
 * key statistics, and game-defining moments.
 */
export interface GameOutcomeDTO {
  /** Final score */
  readonly finalScore: {
    readonly home: number;
    readonly away: number;
  };

  /** Winning team */
  readonly winner: 'home' | 'away' | 'tie';

  /** How the game ended */
  readonly endReason:
    | 'regulation'
    | 'extra_innings'
    | 'mercy_rule'
    | 'forfeit'
    | 'weather'
    | 'time_limit';

  /** Total innings played */
  readonly totalInnings: number;

  /** Game duration in minutes */
  readonly durationMinutes: number;

  /** Key statistics */
  readonly keyStats: {
    readonly totalRuns: number;
    readonly totalHits: number;
    readonly totalErrors: number;
    readonly largestLead: number;
    readonly leadChanges: number;
  };

  /** Most valuable performer */
  readonly mvp?: {
    readonly playerId: PlayerId;
    readonly name: string;
    readonly achievement: string;
  };
}
