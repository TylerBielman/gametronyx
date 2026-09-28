// What counts as a run, and when a run may be ranked. The score comes from the player's browser, so these checks
// keep honest mistakes (tuned settings, a client bug) and obvious nonsense off the board; they can't stop a
// determined cheat. Admin can hide any score.

export interface Run {
  run_id: string;
  score: number;
  settings: Record<string, unknown>;
  build: string | null;
  build_sha: string | null;
  /** Game-specific counters kept with the score for review (Jerboa: nodes, hops, seconds, …). */
  stats: Record<string, number>;
}

const RUN_ID = /^[A-Za-z0-9._-]{1,64}$/;
const MAX_SCORE = 10_000_000;
const STAT_KEYS = ['nodes', 'hops', 'seconds', 'ring_seconds', 'boosts', 'freezes', 'near_misses'];

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_SCORE;
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_SCORE;
const shortText = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Shape check for a posted run; the message says what's wrong. */
export function parseRun(body: unknown): { ok: true; run: Run } | { ok: false; detail: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, detail: 'Send the run as a JSON object.' };
  const b = body as Record<string, unknown>;
  if (typeof b.run_id !== 'string' || !RUN_ID.test(b.run_id)) return { ok: false, detail: 'run_id is missing or malformed.' };
  if (!isCount(b.score)) return { ok: false, detail: 'score must be a whole number from 0.' };
  if (!b.settings || typeof b.settings !== 'object' || Array.isArray(b.settings)) return { ok: false, detail: 'settings must be an object.' };
  const stats: Record<string, number> = {};
  for (const key of STAT_KEYS) {
    if (b[key] === undefined) continue;
    if (!isAmount(b[key])) return { ok: false, detail: `${key} must be a number from 0.` };
    stats[key] = b[key] as number;
  }
  return {
    ok: true,
    run: {
      run_id: b.run_id,
      score: b.score,
      settings: b.settings as Record<string, unknown>,
      build: shortText(b.build, 40),
      build_sha: shortText(b.build_sha, 64),
      stats,
    },
  };
}

/** Every setting must equal the ranked value, except the free ones (Jerboa: the seed). Extra settings don't rank. */
export function settingsMatch(settings: Record<string, unknown>, ranked: Record<string, unknown> | null, free: string[]): boolean {
  if (!ranked) return true;
  const keys = new Set([...Object.keys(settings), ...Object.keys(ranked)]);
  for (const key of keys) {
    if (free.includes(key)) continue;
    if (!(key in ranked) || !(key in settings) || settings[key] !== ranked[key]) return false;
  }
  return true;
}

type Check = (run: Run) => string | null;

/** Per-game sanity checks. A game without one only gets the generic shape check. */
const CHECKS: Record<string, Check> = {
  // Jerboa (3-minutes-to-midnight): a node is worth at most 10 (Playtest 7's moving 10), doubled by x2; each node is collected on a hop; the
  // Ring's clock stops while frozen, so play time is the Ring's time plus at most the freezes.
  jerboa: ({ score, stats, settings }) => {
    const { nodes, hops, seconds, ring_seconds, freezes = 0 } = stats;
    if (nodes === undefined || hops === undefined || seconds === undefined || ring_seconds === undefined)
      return 'Jerboa runs need nodes, hops, seconds and ring_seconds.';
    if (!Number.isInteger(nodes) || !Number.isInteger(hops)) return 'nodes and hops must be whole numbers.';
    if (score > nodes * 20) return 'The score is more than the nodes collected could give.';
    if (nodes > hops) return 'More nodes than hops.';
    const duration = typeof settings.duration === 'number' ? settings.duration : 180;
    const freezeSeconds = typeof settings.freezeMs === 'number' ? settings.freezeMs / 1000 : 6;
    if (ring_seconds > duration + 1) return 'The run outlasted the Ring.';
    if (seconds + 1 < ring_seconds || seconds > ring_seconds + freezes * freezeSeconds + 2) return 'The run’s times don’t add up.';
    return null;
  },
};

export function checkRun(game: string, run: Run): string | null {
  return CHECKS[game]?.(run) ?? null;
}
