import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeNext } from '../src/components/RequireAuth';
import { api, ApiError, OFFLINE_MESSAGE } from '../src/lib/api';
import { clearHash, readHashParam } from '../src/lib/hashParams';
import { mockApi } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('hash params', () => {
  it('reads a token from the fragment and clears it', () => {
    window.history.replaceState(null, '', '/reset?x=1#token=abc123');
    expect(readHashParam('token')).toBe('abc123');
    clearHash();
    expect(window.location.hash).toBe('');
    expect(window.location.pathname + window.location.search).toBe('/reset?x=1');
  });

  it('ignores missing or blank values', () => {
    expect(readHashParam('token', '#other=1')).toBeNull();
    expect(readHashParam('token', '#token=%20')).toBeNull();
  });
});

describe('safeNext', () => {
  it('only allows same-site paths', () => {
    expect(safeNext('/me')).toBe('/me');
    expect(safeNext('//evil.example')).toBe('/play');
    expect(safeNext('https://evil.example')).toBe('/play');
    expect(safeNext(null)).toBe('/play');
  });
});

describe('api client', () => {
  it('logs in with a form-encoded body', async () => {
    const fetch = mockApi([{ method: 'POST', path: '/auth/login', body: { access_token: 't0k' } }]);
    await expect(api.login('ada@example.test', 'pw')).resolves.toBe('t0k');
    const init = fetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(init.body).toBe('username=ada%40example.test&password=pw');
  });

  it('sends the bearer token', async () => {
    const fetch = mockApi([{ path: '/auth/me', body: { id: 1 } }]);
    await api.me('abc');
    const init = fetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('surfaces FastAPI detail strings and validation messages', async () => {
    mockApi([
      { method: 'POST', path: '/auth/register', status: 409, body: { detail: 'Username already taken' } },
      { method: 'POST', path: '/auth/invite/check', status: 422, body: { detail: [{ msg: 'Field required' }] } },
    ]);
    await expect(
      api.register({ invite_code: 'X', username: 'a', password: 'longenough', email: 'a@b.co' }),
    ).rejects.toMatchObject({ status: 409, message: 'Username already taken' });
    await expect(api.inviteCheck('')).rejects.toMatchObject({ status: 422, message: 'Field required' });
  });

  it('turns network failures into a friendly offline error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await api.games().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.message).toBe(OFFLINE_MESSAGE);
  });
});
