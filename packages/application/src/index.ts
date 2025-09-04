// Application Layer - Use Cases and Ports
// This layer depends only on the Domain layer

// Use Cases
export * from './use-cases/RecordAtBat';
export * from './use-cases/StartNewGame';
// TODO: Implement remaining use cases in future phases
// export * from './use-cases/SubstitutePlayer';
// export * from './use-cases/EndInning';
// export * from './use-cases/UndoLastAction';
// export * from './use-cases/RedoLastAction';

// Ports - Input (Driving) Interfaces
export * from './ports/in/GameCommandService';
export * from './ports/in/GameQueryService';

// Ports - Output (Driven) Interfaces
export * from './ports/out/GameRepository';
export * from './ports/out/EventStore';
export * from './ports/out/Logger';

// Application Services (TODO: Implement in next phase)
// export * from './services/GameApplicationService';
// export * from './services/EventSourcingService';

// DTOs - Data Transfer Objects
export * from './dtos/AtBatResult';
export * from './dtos/AtBatResultDTO';
export * from './dtos/BasesStateDTO';
export * from './dtos/GameScoreDTO';
export * from './dtos/GameStartResult';
export * from './dtos/GameStateDTO';
export * from './dtos/PlayerInGameDTO';
export * from './dtos/PlayerStatisticsDTO';
export * from './dtos/RecordAtBatCommand';
export * from './dtos/RunnerAdvanceDTO';
export * from './dtos/StartNewGameCommand';
export * from './dtos/TeamLineupDTO';
