import { GameId } from '../value-objects/GameId';

export abstract class DomainEvent {
  readonly eventId: string = crypto.randomUUID();

  readonly timestamp: Date = new Date();

  readonly version: number = 1;

  abstract readonly type: string;

  abstract readonly gameId: GameId;
}
