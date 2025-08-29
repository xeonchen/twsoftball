// Domain Layer - Core Business Logic
// This layer contains no dependencies on other layers

// NOTE: Exports below are commented out for Phase 0 scaffolding
// These will be uncommented as modules are implemented in Phase 2

// Aggregates
export * from './aggregates/Game';
export * from './aggregates/TeamLineup';
export * from './aggregates/InningState';

// Value Objects
export * from './value-objects/GameId';
export * from './value-objects/PlayerId';
export * from './value-objects/GameScore';
export * from './value-objects/JerseyNumber';
export * from './value-objects/Score';
export * from './value-objects/TeamLineupId';
export * from './value-objects/InningStateId';
export * from './value-objects/BattingSlot';
export * from './value-objects/BasesState';
// export * from './value-objects/Position';
// export * from './value-objects/AtBatResult';
// export * from './value-objects/Inning';

// Constants
export * from './constants/AtBatResultType';
export * from './constants/FieldPosition';
export * from './constants/GameStatus';

// Domain Events
export * from './events/DomainEvent';
export * from './events/AtBatCompleted';
export * from './events/RunnerAdvanced';
export * from './events/RunScored';
export * from './events/FieldPositionChanged';
export * from './events/PlayerSubstitutedIntoGame';
export * from './events/GameCreated';
export * from './events/GameStarted';
export * from './events/GameCompleted';
export * from './events/ScoreUpdated';
export * from './events/InningAdvanced';
export * from './events/TeamLineupCreated';
export * from './events/PlayerAddedToLineup';
export * from './events/InningStateCreated';
export * from './events/HalfInningEnded';
export * from './events/CurrentBatterChanged';

// Business Rules
// export * from './rules/SoftballRules';
// export * from './rules/RuleVariants';

// Strategies
export * from './strategies/TeamStrategy';
export * from './strategies/DetailedTeamStrategy';
export * from './strategies/SimpleTeamStrategy';

// Domain Errors
export * from './errors/DomainError';
