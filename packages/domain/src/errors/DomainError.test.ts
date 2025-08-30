import { describe, it, expect } from 'vitest';
import { DomainError } from './DomainError';

describe('DomainError', () => {
  it('should create domain error with message', () => {
    const error = new DomainError('Test error message');

    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('DomainError');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof DomainError).toBe(true);
  });

  it('should have proper stack trace', () => {
    const error = new DomainError('Test error');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('DomainError');
  });

  it('should be throwable', () => {
    expect(() => {
      throw new DomainError('Test error');
    }).toThrow(DomainError);

    expect(() => {
      throw new DomainError('Test error');
    }).toThrow('Test error');
  });

  it('should support empty message', () => {
    const error = new DomainError('');

    expect(error.message).toBe('');
    expect(error.name).toBe('DomainError');
  });

  it('should maintain prototype chain', () => {
    const error = new DomainError('Test');

    expect(Object.getPrototypeOf(error)).toBe(DomainError.prototype);
    expect(error.constructor).toBe(DomainError);
  });
});
