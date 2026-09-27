// Leaderboard admin: game settings, seasons and hiding scores. Shared by the admin API routes (app.ts) and the
// command line on the box (cli.ts), so both apply the same rules.
import type { Db } from './db.js';

export interface GameRow {
  slug: string;
  enabled: number;
  season: string;
  ranked_settings: string | null;
  free_settings: string;
  updated_at: string;
}

export const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;
const RESERVED = new Set(['admin', 'health']);

export const findGame = (db: Db, slug: string) =>
  db.prepare('SELECT * FROM games WHERE slug = ?').get(slug) as GameRow | undefined;

export const gameOut = (g: GameRow) => ({
  slug: g.slug,
  enabled: g.enabled === 1,
  season: g.season,
  ranked_settings: g.ranked_settings ? (JSON.parse(g.ranked_settings) as Record<string, unknown>) : null,
  free_settings: JSON.parse(g.free_settings) as string[],
  updated_at: g.updated_at,
});

export const seasonsOf = (db: Db, slug: string) =>
  db
    .prepare(
      `SELECT season, COUNT(DISTINCT user_id) AS players, COUNT(*) AS runs, MAX(created_at) AS last
       FROM scores WHERE game = ? AND hidden_at IS NULL GROUP BY season ORDER BY last DESC`,
    )
    .all(slug) as { season: string; players: number; runs: number; last: string }[];

/** Add a game or change it: {enabled?, season?, ranked_settings?, free_settings?}. A new season name starts a
 *  fresh board; old seasons stay readable. Returns the saved game, or what's wrong with the change. */
export function saveGame(
  db: Db,
  slug: string,
  patch: unknown,
  now: string,
): { ok: true; game: ReturnType<typeof gameOut> } | { ok: false; detail: string } {
  if (!SLUG.test(slug) || RESERVED.has(slug)) return { ok: false, detail: 'Game slugs are lowercase letters, digits and dashes.' };
  const body = (patch && typeof patch === 'object' ? patch : {}) as Record<string, unknown>;
  const current = findGame(db, slug);
  const season = body.season === undefined ? current?.season : typeof body.season === 'string' ? body.season.trim() : '';
  if (!season || season.length > 60) return { ok: false, detail: 'A season name (up to 60 characters) is required.' };
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') return { ok: false, detail: 'enabled must be true or false.' };
  const rankedIn = body.ranked_settings;
  if (rankedIn !== undefined && rankedIn !== null && (typeof rankedIn !== 'object' || Array.isArray(rankedIn)))
    return { ok: false, detail: 'ranked_settings must be an object or null.' };
  const freeIn = body.free_settings;
  if (freeIn !== undefined && !(Array.isArray(freeIn) && freeIn.every((k) => typeof k === 'string')))
    return { ok: false, detail: 'free_settings must be a list of setting names.' };
  const enabled = body.enabled === undefined ? (current?.enabled ?? 0) : body.enabled ? 1 : 0;
  const ranked = rankedIn === undefined ? (current?.ranked_settings ?? null) : rankedIn === null ? null : JSON.stringify(rankedIn);
  const free = freeIn === undefined ? (current?.free_settings ?? '[]') : JSON.stringify(freeIn);
  db.prepare(
    `INSERT INTO games (slug, enabled, season, ranked_settings, free_settings, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET enabled = excluded.enabled, season = excluded.season,
       ranked_settings = excluded.ranked_settings, free_settings = excluded.free_settings, updated_at = excluded.updated_at`,
  ).run(slug, enabled, season, ranked, free, now);
  return { ok: true, game: gameOut(findGame(db, slug)!) };
}

export interface ScoreRow {
  id: number;
  season: string;
  user_id: number;
  username: string;
  run_id: string;
  score: number;
  stats: Record<string, number>;
  build: string | null;
  build_sha: string | null;
  created_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
}

/** Recent runs, hidden ones included, newest first. */
export function recentScores(db: Db, game: string, { season, beforeId, limit = 50 }: { season?: string; beforeId?: number; limit?: number } = {}) {
  const rows = db
    .prepare(
      `SELECT id, season, user_id, username, run_id, score, stats, build, build_sha, created_at, hidden_at, hidden_reason
       FROM scores WHERE game = ? AND id < ? ${season ? 'AND season = ?' : ''} ORDER BY id DESC LIMIT ?`,
    )
    .all(...([game, beforeId || Number.MAX_SAFE_INTEGER, ...(season ? [season] : []), Math.min(200, Math.max(1, limit))] as (string | number)[])) as unknown as (Omit<ScoreRow, 'stats'> & { stats: string })[];
  return rows.map((r): ScoreRow => ({ ...r, stats: JSON.parse(r.stats) as Record<string, number> }));
}

/** Take a score off the board (the row is kept), or put it back. False when there's no such score. */
export function setHidden(db: Db, id: number, hidden: boolean, reason: string | null, now: string): boolean {
  const result = hidden
    ? db.prepare('UPDATE scores SET hidden_at = ?, hidden_reason = ? WHERE id = ?').run(now, reason?.trim().slice(0, 200) || null, id)
    : db.prepare('UPDATE scores SET hidden_at = NULL, hidden_reason = NULL WHERE id = ?').run(id);
  return result.changes > 0;
}
