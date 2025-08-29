import { DomainError } from '../errors/DomainError';

export class Score {
  constructor(readonly runs: number) {
    if (!Number.isInteger(runs) || runs < 0) {
      throw new DomainError('Score must be a non-negative integer');
    }
  }

  equals(other: Score): boolean {
    if (!other || !(other instanceof Score)) {
      return false;
    }
    return this.runs === other.runs;
  }

  addRuns(additionalRuns: number): Score {
    if (!Number.isInteger(additionalRuns) || additionalRuns < 0) {
      throw new DomainError('Additional runs must be a non-negative integer');
    }
    return new Score(this.runs + additionalRuns);
  }

  toString(): string {
    return this.runs.toString();
  }

  static zero(): Score {
    return new Score(0);
  }

  static fromRuns(runs: number): Score {
    return new Score(runs);
  }
}
