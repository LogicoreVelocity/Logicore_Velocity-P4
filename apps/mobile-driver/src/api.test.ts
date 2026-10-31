import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from './api';

describe('apiRequest', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Authorization header and returns parsed JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1 } }),
    });

    const result = await apiRequest('my-token', '/drivers/me');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/drivers/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toEqual({ data: { id: 1 } });
  });

  it('throws on non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    await expect(apiRequest('bad-token', '/drivers/me')).rejects.toThrow('Unauthorized');
  });

  it('merges custom headers', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await apiRequest('token', '/drivers/me', {
      headers: { 'X-Custom': 'value' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/drivers/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom': 'value',
        }),
      })
    );
  });
});
