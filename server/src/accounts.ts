// Who is this player? The leaderboard keeps no accounts of its own: it asks the shared accounts API
// (GET /api/auth/me) with the player's session token. That also honours disabled accounts and force-logouts.
// Answers are cached for a minute per token, so a busy board doesn't hammer the accounts API.
import { createHash } from 'node:crypto';

export interface Player {
  id: number;
  username: string;
  role: string;
}

/** 401: no such session. 403: account disabled. 503: the accounts API couldn't be reached. */
export type Identity = { ok: true; player: Player } | { ok: false; status: 401 | 403 | 503 };

export interface Accounts {
  identify(token: string): Promise<Identity>;
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export function accountsClient(
  base: string,
  fetchFn: Fetch = fetch,
  { ttlMs = 60_000, timeoutMs = 3_000, now = Date.now }: { ttlMs?: number; timeoutMs?: number; now?: () => number } = {},
): Accounts {
  const cache = new Map<string, { player: Player; until: number }>();
  return {
    async identify(token) {
      const key = createHash('sha256').update(token).digest('hex');
      const hit = cache.get(key);
      if (hit && hit.until > now()) return { ok: true, player: hit.player };
      cache.delete(key);
      let response: Response;
      try {
        response = await fetchFn(`${base}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        return { ok: false, status: 503 };
      }
      if (response.status === 401 || response.status === 403) return { ok: false, status: response.status };
      if (!response.ok) return { ok: false, status: 503 };
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || !Number.isInteger(body.id) || typeof body.username !== 'string') return { ok: false, status: 503 };
      const player = {
        id: body.id as number,
        username: body.username,
        role: typeof body.role === 'string' ? body.role : 'player',
      };
      if (cache.size >= 5_000) cache.clear();
      cache.set(key, { player, until: now() + ttlMs });
      return { ok: true, player };
    },
  };
}
