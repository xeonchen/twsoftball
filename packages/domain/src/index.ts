// Domain Layer - Core Business Logic
// This layer contains no dependencies on other layers

// NOTE: Exports below are commented out for Phase 0 scaffolding
// These will be uncommented as modules are implemented in Phase 2

// Entities
// export * from './entities/Game';
// export * from './entities/Player';
// export * from './entities/Team';
// export * from './entities/AtBat';

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
// export * from './events/GameEvent';
// export * from './events/SubstitutionEvent';
// export * from './events/InningEndedEvent';

// Business Rules
// export * from './rules/SoftballRules';
// export * from './rules/RuleVariants';

// Domain Errors
export * from './errors/DomainError';
