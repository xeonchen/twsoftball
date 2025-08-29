import { Score } from './Score';
import { DomainError } from '../errors/DomainError';

export class GameScore {
  constructor(
    readonly homeScore: Score,
    readonly awayScore: Score
  ) {
    if (!homeScore) {
      throw new DomainError('Home score cannot be null or undefined');
    }
    if (!awayScore) {
      throw new DomainError('Away score cannot be null or undefined');
    }
  }

  getHomeRuns(): number {
    return this.homeScore.runs;
  }

  getAwayRuns(): number {
    return this.awayScore.runs;
  }

  getTotalRuns(): number {
    return this.homeScore.runs + this.awayScore.runs;
  }

  isHomeWinning(): boolean {
    return this.homeScore.runs > this.awayScore.runs;
  }

  isAwayWinning(): boolean {
    return this.awayScore.runs > this.homeScore.runs;
  }

  isTied(): boolean {
    return this.homeScore.runs === this.awayScore.runs;
  }

  getRunDifferential(): number {
    return this.homeScore.runs - this.awayScore.runs;
  }

  addHomeRuns(runs: number): GameScore {
    const newHomeScore = this.homeScore.addRuns(runs);
    return new GameScore(newHomeScore, this.awayScore);
  }

  addAwayRuns(runs: number): GameScore {
    const newAwayScore = this.awayScore.addRuns(runs);
    return new GameScore(this.homeScore, newAwayScore);
  }

  equals(other: GameScore): boolean {
    if (!other || !(other instanceof GameScore)) {
      return false;
    }
    return this.homeScore.equals(other.homeScore) && this.awayScore.equals(other.awayScore);
  }

  toString(): string {
    return `${this.homeScore.runs}-${this.awayScore.runs}`;
  }

  static zero(): GameScore {
    return new GameScore(Score.zero(), Score.zero());
  }

  static fromRuns(homeRuns: number, awayRuns: number): GameScore {
    return new GameScore(new Score(homeRuns), new Score(awayRuns));
  }
}
