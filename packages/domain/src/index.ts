// Domain Layer - Core Business Logic
// This layer contains no dependencies on other layers

// Aggregates
export * from './aggregates/Game.js';
export * from './aggregates/TeamLineup.js';
export * from './aggregates/InningState.js';

// Value Objects
export * from './value-objects/DomainId.js';
export * from './value-objects/GameId.js';
export * from './value-objects/PlayerId.js';
export * from './value-objects/GameScore.js';
export * from './value-objects/JerseyNumber.js';
export * from './value-objects/Score.js';
export * from './value-objects/TeamLineupId.js';
export * from './value-objects/InningStateId.js';
export * from './value-objects/BattingSlot.js';
export * from './value-objects/BasesState.js';

// Constants
export * from './constants/AtBatResultType.js';
export * from './constants/FieldPosition.js';
export * from './constants/GameStatus.js';

// Domain Events
export * from './events/DomainEvent.js';
export * from './events/AtBatCompleted.js';
export * from './events/RunnerAdvanced.js';
export * from './events/RunScored.js';
export * from './events/FieldPositionChanged.js';
export * from './events/PlayerSubstitutedIntoGame.js';
export * from './events/GameCreated.js';
export * from './events/GameStarted.js';
export * from './events/GameCompleted.js';
export * from './events/ScoreUpdated.js';
export * from './events/InningAdvanced.js';
export * from './events/TeamLineupCreated.js';
export * from './events/PlayerAddedToLineup.js';
export * from './events/InningStateCreated.js';
export * from './events/HalfInningEnded.js';
export * from './events/CurrentBatterChanged.js';

// Business Rules
export * from './rules/SoftballRules.js';
export * from './rules/RuleVariants.js';

// Domain Services
export * from './services/GameCoordinator.js';
export * from './services/LineupValidator.js';
export * from './services/RBICalculator.js';
export * from './services/StatisticsCalculator.js';
export * from './services/SubstitutionValidator.js';

// Strategies
export * from './strategies/BaseTeamStrategy.js';
export * from './strategies/TeamStrategy.js';
export * from './strategies/DetailedTeamStrategy.js';
export * from './strategies/SimpleTeamStrategy.js';

// Validation Utilities
export * from './utils/NumericValidation.js';
export * from './utils/StringValidation.js';
export * from './utils/BattingSlotValidation.js';
export * from './utils/TeamValidation.js';

// Validation Utilities
export * from './validators/EventDataValidator.js';
export * from './validators/ScoreValidator.js';

// Domain Errors
export * from './errors/DomainError.js';
