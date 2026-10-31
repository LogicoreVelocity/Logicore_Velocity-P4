import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachUserFromJwt, requireAuth } from './auth';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

describe('attachUserFromJwt', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = vi.fn();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when no Authorization header', () => {
    attachUserFromJwt(req, res, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('populates req.user for a valid Bearer token', () => {
    const token = 'fake.valid.token';
    req.headers.authorization = `Bearer ${token}`;
    (jwt.verify as any).mockReturnValue({
      id: 'user-1',
      tenant_id: 'tenant-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    });

    attachUserFromJwt(req, res, next);
    expect(req.user).toMatchObject({
      id: 'user-1',
      tenant_id: 'tenant-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    });
  });

  it('ignores invalid tokens and calls next', () => {
    req.headers.authorization = 'Bearer invalid.token';
    (jwt.verify as any).mockImplementation(() => {
      throw new Error('invalid token');
    });

    attachUserFromJwt(req, res, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

describe('requireAuth', () => {
  it('calls next when user is present', () => {
    const req: any = { user: { id: '1' } };
    const next = vi.fn();
    requireAuth(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when user is missing', () => {
    const req: any = {};
    const next = vi.fn();
    requireAuth(req, {} as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });
});
