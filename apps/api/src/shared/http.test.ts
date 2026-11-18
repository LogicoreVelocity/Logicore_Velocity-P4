import { describe, it, expect } from 'vitest';
import { HttpError, asHttpError } from './http';

describe('HttpError', () => {
  it('creates an error with status and message', () => {
    const err = new HttpError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('asHttpError', () => {
  it('passes through HttpError instances', () => {
    const original = new HttpError(403, 'Forbidden');
    expect(asHttpError(original)).toBe(original);
  });

  it('wraps unknown errors as 500', () => {
    const wrapped = asHttpError(new Error('boom'));
    expect(wrapped).toBeInstanceOf(HttpError);
    expect(wrapped.status).toBe(500);
    expect(wrapped.message).toBe('boom');
  });

  it('wraps plain values as 500 with default message', () => {
    const wrapped = asHttpError('string error');
    expect(wrapped.status).toBe(500);
    expect(wrapped.message).toBe('Internal error');
  });
});
