import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { accountsClient } from '../src/accounts.js';
import { backupIfDue } from '../src/backup.js';
import { loadConfig, parseOrigins, DEFAULT_ORIGINS } from '../src/config.js';
import { openDb, SCHEMA_VERSION } from '../src/db.js';

const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'scores-'));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('accounts lookup', () => {
  const me = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });

  it('asks /api/auth/me with the token and caches the answer for a minute', async () => {
    const calls: [string, RequestInit | undefined][] = [];
    let t = 0;
    const client = accountsClient(
      'http://accounts.test',
      async (url, init) => {
        calls.push([url, init]);
        return new Response(JSON.stringify({ id: 7, username: 'ada', email: 'never@kept.example', role: 'player' }));
      },
      { now: () => t },
    );
    expect(await client.identify('tok')).toEqual({ ok: true, player: { id: 7, username: 'ada', role: 'player' } });
    expect(calls[0][0]).toBe('http://accounts.test/api/auth/me');
    expect((calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    await client.identify('tok');
    expect(calls).toHaveLength(1);
    t = 61_000;
    await client.identify('tok');
    expect(calls).toHaveLength(2);
  });

  it('passes on ended sessions and disabled accounts, and treats anything else as unreachable', async () => {
    expect(await accountsClient('a', me(401, {})).identify('x')).toEqual({ ok: false, status: 401 });
    expect(await accountsClient('a', me(403, {})).identify('x')).toEqual({ ok: false, status: 403 });
    expect(await accountsClient('a', me(500, {})).identify('x')).toEqual({ ok: false, status: 503 });
    expect(await accountsClient('a', me(200, { hello: 1 })).identify('x')).toEqual({ ok: false, status: 503 });
    const offline = accountsClient('a', async () => {
      throw new TypeError('fetch failed');
    });
    expect(await offline.identify('x')).toEqual({ ok: false, status: 503 });
  });

  it('does not cache a failure', async () => {
    let status = 503;
    const client = accountsClient('a', async () =>
      status === 200 ? new Response(JSON.stringify({ id: 1, username: 'bo' })) : new Response('{}', { status }),
    );
    expect((await client.identify('x')).ok).toBe(false);
    status = 200;
    expect(await client.identify('x')).toEqual({ ok: true, player: { id: 1, username: 'bo', role: 'player' } });
  });
});

describe('storage', () => {
  it('creates the schema once and seeds Jerboa’s board', () => {
    const file = join(tempDir(), 'scores.db');
    const first = openDb(file);
    first.prepare(`INSERT INTO scores (game, season, user_id, username, run_id, score, stats, settings, created_at)
      VALUES ('jerboa', 'Playtest 6', 1, 'ada', 'r1', 5, '{}', '{}', 'now')`).run();
    first.close();
    const again = openDb(file);
    expect((again.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get() as { value: string }).value).toBe(String(SCHEMA_VERSION));
    expect(again.prepare('SELECT slug, enabled, season FROM games').all()).toEqual([{ slug: 'jerboa', enabled: 1, season: 'Playtest 6' }]);
    expect((again.prepare('SELECT COUNT(*) AS n FROM scores').get() as { n: number }).n).toBe(1);
    again.close();
  });

  it('keeps one backup a day for 14 days', () => {
    const dir = tempDir();
    const db = openDb(join(dir, 'scores.db'));
    const backups = join(dir, 'backups');
    const today = new Date('2026-09-27T10:00:00Z');
    backupIfDue(db, backups, today);
    writeFileSync(join(backups, 'scores-2026-09-01.db'), 'old');
    writeFileSync(join(backups, 'scores-2026-09-20.db'), 'recent');
    writeFileSync(join(backups, 'notes.txt'), 'not ours');
    expect(backupIfDue(db, backups, today)).toBe(join(backups, 'scores-2026-09-27.db'));
    expect(readdirSync(backups).sort()).toEqual(['notes.txt', 'scores-2026-09-20.db', 'scores-2026-09-27.db']);
    const copy = openDb(join(backups, 'scores-2026-09-27.db'));
    expect(copy.prepare('SELECT slug FROM games').all()).toEqual([{ slug: 'jerboa' }]);
    copy.close();
    db.close();
  });
});

describe('config', () => {
  it('has safe defaults for the box', () => {
    expect(loadConfig({})).toEqual({
      host: '127.0.0.1',
      port: 8004,
      dataDir: './data',
      accountsApi: 'http://127.0.0.1:8001',
      corsOrigins: DEFAULT_ORIGINS,
    });
    expect(() => loadConfig({ PORT: 'eighty' })).toThrow(/PORT/);
  });

  it('reads CORS origins as JSON or a comma list', () => {
    expect(parseOrigins('["https://a.example/", "https://b.example"]')).toEqual(['https://a.example', 'https://b.example']);
    expect(parseOrigins('https://a.example, http://localhost:4173')).toEqual(['https://a.example', 'http://localhost:4173']);
    expect(parseOrigins('  ')).toEqual(DEFAULT_ORIGINS);
  });
});
