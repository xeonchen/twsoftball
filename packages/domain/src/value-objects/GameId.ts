import { DomainError } from '../errors/DomainError';

export class GameId {
  constructor(readonly value: string) {
    if (!value?.trim()) {
      throw new DomainError('GameId cannot be empty or whitespace');
    }
    if (value.length > 50) {
      throw new DomainError('GameId cannot exceed 50 characters');
    }
  }

  equals(other: GameId): boolean {
    if (!other || !(other instanceof GameId)) {
      return false;
    }
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  static generate(): GameId {
    return new GameId(crypto.randomUUID());
  }
}
