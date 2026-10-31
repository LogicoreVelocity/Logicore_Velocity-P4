import { describe, it, expect } from 'vitest';
import { formatZodError } from './validation';
import { z } from 'zod';

describe('formatZodError', () => {
  it('maps zod issues to path/message pairs', () => {
    const Schema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    const result = Schema.safeParse({ email: 'not-an-email', age: 10 });
    if (result.success) throw new Error('expected validation to fail');

    const errors = formatZodError(result.error);
    expect(errors).toHaveLength(2);
    expect(errors).toContainEqual({ path: 'email', message: expect.any(String) });
    expect(errors).toContainEqual({ path: 'age', message: expect.any(String) });
  });

  it('returns empty array for no issues', () => {
    const Schema = z.object({ name: z.string() });
    const result = Schema.safeParse({ name: 'hello' });
    if (!result.success) throw new Error('expected validation to pass');

    const err = new Error('no real error') as any;
    err.issues = [];
    expect(formatZodError(err)).toEqual([]);
  });
});
