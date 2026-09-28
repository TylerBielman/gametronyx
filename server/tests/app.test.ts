import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Accounts, Identity, Player } from '../src/accounts.js';
import { buildApp } from '../src/app.js';
import { JERBOA_RANKED_SETTINGS, openDb, type Db } from '../src/db.js';

const basePlayers = (): Record<string, Player> => ({
  ada: { id: 1, username: 'ada', role: 'player' },
  bo: { id: 2, username: 'bo', role: 'player' },
  cy: { id: 3, username: 'cy', role: 'player' },
  tyler: { id: 9, username: 'Tyler', role: 'admin' },
});
let PLAYERS = basePlayers();
// A token is the player's key; "gone" is an ended session, "down" an unreachable accounts API.
const accounts: Accounts = {
  async identify(token): Promise<Identity> {
    if (token === 'down') return { ok: false, status: 503 };
    if (token === 'disabled') return { ok: false, status: 403 };
    const player = PLAYERS[token];
    return player ? { ok: true, player } : { ok: false, status: 401 };
  },
};

let db: Db;
let clock: number;
let app: ReturnType<typeof buildApp>;
let runs = 0;

const jerboaRun = (score: number, extra: Record<string, unknown> = {}) => ({
  run_id: `run-${++runs}`,
  score,
  nodes: Math.ceil(score / 3),
  hops: 200,
  seconds: 184.2,
  ring_seconds: 180,
  boosts: 1,
  freezes: 1,
  near_misses: 2,
  build: 'P1-playtest-6',
  build_sha: 'abc1234',
  settings: { ...JERBOA_RANKED_SETTINGS, seed: 4242 },
  ...extra,
});

async function post(token: string | null, body: unknown, game = 'jerboa') {
  clock += 1000;
  return app.inject({
    method: 'POST',
    url: `/api/leaderboards/${game}/scores`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload: body as object,
  });
}
const get = (url: string, token?: string) =>
  app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} });
const put = (url: string, token: string, payload: object) =>
  app.inject({ method: 'PUT', url, headers: { authorization: `Bearer ${token}` }, payload });

beforeEach(() => {
  PLAYERS = basePlayers();
  db = openDb(':memory:', () => '2026-09-27T00:00:00.000Z');
  clock = Date.parse('2026-09-27T12:00:00.000Z');
  app = buildApp({ db, accounts, corsOrigins: ['https://tylerbielman.github.io'], now: () => new Date(clock) });
});
afterEach(async () => {
  await app.close();
  db.close();
});

describe('posting a run', () => {
  it('ranks a first run and answers with the board the game shows', async () => {
    const res = await post('ada', jerboaRun(42));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      season: 'Playtest 6',
      players: 1,
      rank: 1,
      best: 42,
      entries: [{ rank: 1, username: 'ada', score: 42, me: true }],
      me: { rank: 1, username: 'ada', score: 42 },
      previous_rank: null,
      previous_best: null,
      personal_best: true,
    });
  });

  it('ranks players by their best run; ties share a rank and the earlier score stays ahead', async () => {
    await post('ada', jerboaRun(50));
    await post('bo', jerboaRun(80));
    await post('cy', jerboaRun(50));
    await post('ada', jerboaRun(20)); // not her best
    const board = (await post('cy', jerboaRun(10))).json();
    expect(board.entries).toEqual([
      { rank: 1, username: 'bo', score: 80, me: false },
      { rank: 2, username: 'ada', score: 50, me: false },
      { rank: 2, username: 'cy', score: 50, me: true },
    ]);
    expect(board).toMatchObject({ players: 3, rank: 2, best: 50, previous_best: 50, personal_best: false });
  });

  it('reports the climb and the old best when a player beats their score', async () => {
    await post('ada', jerboaRun(90));
    await post('bo', jerboaRun(60));
    await post('cy', jerboaRun(30));
    const board = (await post('cy', jerboaRun(99))).json();
    expect(board).toMatchObject({ rank: 1, previous_rank: 3, best: 99, previous_best: 30, personal_best: true });
  });

  it('ignores a resent run (same run_id) instead of counting it twice', async () => {
    const run = jerboaRun(70);
    expect((await post('ada', run)).statusCode).toBe(201);
    const again = await post('ada', run);
    expect(again.statusCode).toBe(200);
    expect(again.json()).toMatchObject({ players: 1, best: 70, personal_best: false, previous_best: 70 });
    expect((db.prepare('SELECT COUNT(*) AS n FROM scores').get() as { n: number }).n).toBe(1);
  });

  it('sends the top 10 and the places around the player: 5 above, 10 below', async () => {
    for (let i = 1; i <= 40; i++) PLAYERS[`p${i}`] = { id: 100 + i, username: `p${i}`, role: 'player' };
    for (let i = 1; i <= 40; i++) await post(`p${i}`, jerboaRun(400 - i * 3));
    PLAYERS.me = { id: 500, username: 'me', role: 'player' };
    const board = (await post('me', jerboaRun(400 - 25 * 3 - 1))).json(); // just below p25: 26th of 41
    expect(board.rank).toBe(26);
    expect(board.entries.map((e: { rank: number }) => e.rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
    ]);
    expect(board.entries.find((e: { me: boolean }) => e.me)).toEqual({ rank: 26, username: 'me', score: 324, me: true });
  });

  it('shows a player’s current username on all their scores', async () => {
    await post('ada', jerboaRun(40));
    PLAYERS.ada = { ...PLAYERS.ada, username: 'Ada_L' };
    await post('ada', jerboaRun(10));
    expect((await get('/api/leaderboards/jerboa')).json().entries[0].username).toBe('Ada_L');
  });
});

describe('what the server refuses', () => {
  it('needs a live Gametronyx session', async () => {
    expect((await post(null, jerboaRun(5))).statusCode).toBe(401);
    expect((await post('gone', jerboaRun(5))).statusCode).toBe(401);
    expect((await post('disabled', jerboaRun(5))).statusCode).toBe(403);
    const down = await post('down', jerboaRun(5));
    expect(down.statusCode).toBe(503); // the game queues the run and retries
    expect(down.json().detail).toMatch(/Can’t reach/);
  });

  it('knows only enabled games', async () => {
    expect((await post('ada', jerboaRun(5), 'no-such-game')).statusCode).toBe(404);
    await put('/api/leaderboards/admin/games/jerboa', 'tyler', { enabled: false });
    expect((await post('ada', jerboaRun(5))).statusCode).toBe(404);
    expect((await get('/api/leaderboards/jerboa')).statusCode).toBe(404);
  });

  it('checks the run’s shape', async () => {
    for (const bad of [
      { ...jerboaRun(5), run_id: '' },
      { ...jerboaRun(5), run_id: 'has spaces' },
      { ...jerboaRun(5), score: -1 },
      { ...jerboaRun(5), score: 2.5 },
      { ...jerboaRun(5), settings: 'x' },
      { ...jerboaRun(5), hops: 'many' },
      [1, 2],
    ]) {
      const res = await post('ada', bad);
      expect(res.statusCode, JSON.stringify(bad)).toBe(400);
      expect(res.json().detail).toBeTruthy();
    }
    const huge = await post('ada', { ...jerboaRun(5), padding: 'x'.repeat(20_000) });
    expect(huge.statusCode).toBe(413);
  });

  it('ranks only default settings, whatever the seed', async () => {
    expect((await post('ada', jerboaRun(5, { settings: { ...JERBOA_RANKED_SETTINGS, seed: 1 } }))).statusCode).toBe(201);
    for (const change of [{ duration: 60 }, { slots: 3 }, { hitRadius: 0.24 }, { extra: true }]) {
      const res = await post('ada', jerboaRun(5, { settings: { ...JERBOA_RANKED_SETTINGS, seed: 1, ...change } }));
      expect(res.statusCode, JSON.stringify(change)).toBe(422);
    }
    const { grid: _grid, ...missing } = JERBOA_RANKED_SETTINGS;
    expect((await post('ada', jerboaRun(5, { settings: missing }))).statusCode).toBe(422);
  });

  it('refuses Jerboa runs that can’t have happened', async () => {
    const cases: Record<string, unknown>[] = [
      { score: 201, nodes: 10 }, // a node is worth at most 20 (a 10 doubled by x2)
      { nodes: 30, hops: 20 },
      { ring_seconds: 200, seconds: 200 }, // the Ring closes at 180 s
      { seconds: 100, ring_seconds: 150 }, // play time can't be shorter than the Ring's
      { seconds: 240, ring_seconds: 180, freezes: 1 }, // one 6 s freeze can't add a minute
      { nodes: undefined },
    ];
    for (const change of cases) {
      const res = await post('ada', { ...jerboaRun(30), ...change });
      expect(res.statusCode, JSON.stringify(change)).toBe(422);
    }
    expect((await post('ada', jerboaRun(30, { seconds: 192, ring_seconds: 180, freezes: 2 }))).statusCode).toBe(201);
    // A short run carried by a doubled 10 is possible since Jerboa Playtest 7.
    expect((await post('ada', jerboaRun(25, { nodes: 2 }))).statusCode).toBe(201);
  });

  it('slows down a flood of posts from one player', async () => {
    for (let i = 0; i < 30; i++) expect((await post('ada', jerboaRun(i))).statusCode).toBe(201);
    const flood = await post('ada', jerboaRun(5));
    expect(flood.statusCode).toBe(429);
    expect(Number(flood.headers['retry-after'])).toBeGreaterThan(0);
    expect((await post('bo', jerboaRun(5))).statusCode).toBe(201);
    clock += 60 * 60 * 1000;
    expect((await post('ada', jerboaRun(5))).statusCode).toBe(201);
  });
});

describe('reading a board', () => {
  it('is public; a token marks the viewer’s row', async () => {
    await post('ada', jerboaRun(40));
    await post('bo', jerboaRun(20));
    const anonymous = (await get('/api/leaderboards/jerboa')).json();
    expect(anonymous).toMatchObject({ game: 'jerboa', season: 'Playtest 6', current_season: 'Playtest 6', players: 2, rank: null, me: null });
    expect(anonymous.seasons).toEqual([{ season: 'Playtest 6', players: 2 }]);
    const mine = (await get('/api/leaderboards/jerboa', 'bo')).json();
    expect(mine).toMatchObject({ rank: 2, me: { rank: 2, username: 'bo', score: 20 } });
    expect((await get('/api/leaderboards/jerboa', 'gone')).json().me).toBeNull();
  });

  it('answers the health check', async () => {
    expect((await get('/api/leaderboards/health')).json()).toEqual({ ok: true });
  });

  it('lets the game builds and the site call it from the browser', async () => {
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/api/leaderboards/jerboa/scores',
      headers: { origin: 'https://tylerbielman.github.io', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' },
    });
    expect(preflight.headers['access-control-allow-origin']).toBe('https://tylerbielman.github.io');
    expect(String(preflight.headers['access-control-allow-headers'])).toMatch(/Authorization/);
    const stranger = await app.inject({ method: 'GET', url: '/api/leaderboards/health', headers: { origin: 'https://evil.example' } });
    expect(stranger.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('admin', () => {
  it('is for admins only', async () => {
    expect((await get('/api/leaderboards/admin/games', 'ada')).statusCode).toBe(403);
    expect((await get('/api/leaderboards/admin/games')).statusCode).toBe(401);
    expect((await put('/api/leaderboards/admin/games/jerboa', 'ada', { season: 'x' })).statusCode).toBe(403);
  });

  it('starts a new season; the old one stays readable', async () => {
    await post('ada', jerboaRun(40));
    const changed = await put('/api/leaderboards/admin/games/jerboa', 'tyler', { season: 'Playtest 7' });
    expect(changed.json()).toMatchObject({ slug: 'jerboa', enabled: true, season: 'Playtest 7', free_settings: ['seed'] });
    await post('bo', jerboaRun(10));
    expect((await get('/api/leaderboards/jerboa')).json()).toMatchObject({ season: 'Playtest 7', players: 1 });
    const old = (await get('/api/leaderboards/jerboa?season=Playtest%206')).json();
    expect(old).toMatchObject({ season: 'Playtest 6', current_season: 'Playtest 7', players: 1 });
    expect(old.entries[0].username).toBe('ada');
    const games = (await get('/api/leaderboards/admin/games', 'tyler')).json();
    expect(games[0].seasons.map((s: { season: string }) => s.season)).toEqual(['Playtest 7', 'Playtest 6']);
  });

  it('adds another game with its own ranked settings', async () => {
    const res = await put('/api/leaderboards/admin/games/no-easy-way-up', 'tyler', {
      enabled: true,
      season: 'Alpha',
      ranked_settings: { mode: 'standard' },
      free_settings: [],
    });
    expect(res.statusCode).toBe(200);
    expect((await post('ada', { run_id: 'n1', score: 12345, settings: { mode: 'standard' } }, 'no-easy-way-up')).statusCode).toBe(201);
    expect((await post('ada', { run_id: 'n2', score: 5, settings: { mode: 'easy' } }, 'no-easy-way-up')).statusCode).toBe(422);
    for (const bad of [{ season: '' }, { season: 'x'.repeat(61) }, { season: 'ok', enabled: 'yes' }, { season: 'ok', ranked_settings: [1] }, { season: 'ok', free_settings: 'seed' }])
      expect((await put('/api/leaderboards/admin/games/other', 'tyler', bad)).statusCode, JSON.stringify(bad)).toBe(400);
    expect((await put('/api/leaderboards/admin/games/Admin', 'tyler', { season: 'x' })).statusCode).toBe(400);
    expect((await put('/api/leaderboards/admin/games/admin', 'tyler', { season: 'x' })).statusCode).toBe(400);
  });

  it('hides a score from the board and can put it back', async () => {
    await post('ada', jerboaRun(90));
    await post('bo', jerboaRun(40));
    const [latest, first] = (await get('/api/leaderboards/admin/games/jerboa/scores', 'tyler')).json();
    expect(latest).toMatchObject({ username: 'bo', score: 40, hidden_at: null, stats: { nodes: 14, hops: 200 } });
    const hide = await app.inject({
      method: 'POST',
      url: `/api/leaderboards/admin/scores/${first.id}/hide`,
      headers: { authorization: 'Bearer tyler' },
      payload: { reason: 'test run' },
    });
    expect(hide.json()).toEqual({ ok: true });
    expect((await get('/api/leaderboards/jerboa')).json().entries).toEqual([{ rank: 1, username: 'bo', score: 40, me: false }]);
    const listed = (await get('/api/leaderboards/admin/games/jerboa/scores', 'tyler')).json();
    expect(listed[1]).toMatchObject({ hidden_reason: 'test run' });
    await app.inject({ method: 'POST', url: `/api/leaderboards/admin/scores/${first.id}/unhide`, headers: { authorization: 'Bearer tyler' } });
    expect((await get('/api/leaderboards/jerboa')).json().players).toBe(2);
    const missing = await app.inject({ method: 'POST', url: '/api/leaderboards/admin/scores/999/hide', headers: { authorization: 'Bearer tyler' } });
    expect(missing.statusCode).toBe(404);
  });
});
