import { DomainError } from '../errors/DomainError';

export class JerseyNumber {
  constructor(readonly value: string) {
    if (!value?.trim()) {
      throw new DomainError('Jersey number cannot be empty or whitespace');
    }

    // Check if string is numeric
    if (!/^\d+$/.test(value)) {
      throw new DomainError('Jersey number must be numeric');
    }

    const numericValue = parseInt(value, 10);
    if (numericValue < 1 || numericValue > 99) {
      throw new DomainError('Jersey number must be between 1 and 99');
    }
  }

  equals(other: JerseyNumber): boolean {
    if (!other || !(other instanceof JerseyNumber)) {
      return false;
    }
    return this.value === other.value;
  }

  toNumber(): number {
    return parseInt(this.value, 10);
  }

  toString(): string {
    return this.value;
  }

  static fromNumber(num: number): JerseyNumber {
    if (!Number.isInteger(num)) {
      throw new DomainError('Jersey number must be an integer');
    }
    return new JerseyNumber(num.toString());
  }
}
