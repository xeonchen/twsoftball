import { DomainError } from '../errors/DomainError';

export class PlayerId {
  constructor(readonly value: string) {
    if (!value?.trim()) {
      throw new DomainError('PlayerId cannot be empty or whitespace');
    }
    if (value.length > 50) {
      throw new DomainError('PlayerId cannot exceed 50 characters');
    }
  }

  equals(other: PlayerId): boolean {
    if (!other || !(other instanceof PlayerId)) {
      return false;
    }
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  static generate(): PlayerId {
    return new PlayerId(crypto.randomUUID());
  }
}
