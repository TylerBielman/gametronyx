// Leaderboard admin on the box, for when the /admin tab isn't at hand. deploy/scores-admin.sh runs it inside the
// container, e.g.  bash /opt/gametronyx-scores/deploy/scores-admin.sh season jerboa "Playtest 7" '{"duration":180,…}'
// Every deploy runs `apply` with server/seasons.json, so seasons normally change by editing that file (DECISIONS A57).
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SLUG, findGame, gameOut, recentScores, saveGame, seasonsOf, setHidden } from './admin.js';
import { openDb, type Db } from './db.js';

export const USAGE = `Usage:
  games                                   every game's board settings and seasons
  season <game> "<name>" [settings-json]  start a new season, optionally with new ranked settings
  enable <game> | disable <game>          open or close a game's board
  scores <game> [how-many]                recent scores, newest first (hidden ones marked)
  hide <score-id> [reason] | unhide <score-id>
  apply <seasons-json>                    make each listed game match server/seasons.json (every deploy runs this)`;

/** One game's entry in server/seasons.json. Fields left out keep their current values. */
export interface SeasonSpec {
  season: string;
  ranked_settings?: Record<string, unknown> | null;
  free_settings?: string[];
  enabled?: boolean;
}

/** Read server/seasons.json: game slug → its current season. Keys starting with "_" are notes. */
export function parseSeasons(text: string): { ok: true; games: [string, SeasonSpec][] } | { ok: false; detail: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, detail: 'it is not valid JSON' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, detail: 'expected an object of games' };
  const games: [string, SeasonSpec][] = [];
  for (const [slug, raw] of Object.entries(data)) {
    if (slug.startsWith('_')) continue;
    if (!SLUG.test(slug)) return { ok: false, detail: `"${slug}" isn't a game slug` };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, detail: `${slug}: expected an object` };
    const s = raw as Record<string, unknown>;
    if (typeof s.season !== 'string' || !s.season.trim() || s.season.trim().length > 60)
      return { ok: false, detail: `${slug}: a season name (up to 60 characters) is required` };
    const ranked = s.ranked_settings;
    if (ranked !== undefined && ranked !== null && (typeof ranked !== 'object' || Array.isArray(ranked)))
      return { ok: false, detail: `${slug}: ranked_settings must be an object or null` };
    const free = s.free_settings;
    if (free !== undefined && !(Array.isArray(free) && free.every((k) => typeof k === 'string')))
      return { ok: false, detail: `${slug}: free_settings must be a list of setting names` };
    if (s.enabled !== undefined && typeof s.enabled !== 'boolean') return { ok: false, detail: `${slug}: enabled must be true or false` };
    const spec: SeasonSpec = { season: s.season.trim() };
    if (ranked !== undefined) spec.ranked_settings = ranked as SeasonSpec['ranked_settings'];
    if (free !== undefined) spec.free_settings = free as string[];
    if (s.enabled !== undefined) spec.enabled = s.enabled as boolean;
    games.push([slug, spec]);
  }
  return { ok: true, games };
}

/** JSON with object keys sorted, so settings compare equal whatever order they were written in. */
const canonical = (value: unknown) =>
  JSON.stringify(value ?? null, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v,
  );

/** Runs one command; returns the process exit code. */
export function run(args: string[], db: Db, print: (line: string) => void, now = () => new Date().toISOString()): number {
  const [command, first, second, third] = args;
  const change = (slug: string, patch: Record<string, unknown>) => {
    const saved = saveGame(db, slug, patch, now());
    if (!saved.ok) {
      print(`Not changed: ${saved.detail}`);
      return 1;
    }
    print(JSON.stringify(saved.game, null, 2));
    return 0;
  };
  switch (command) {
    case 'games': {
      const slugs = (db.prepare('SELECT slug FROM games ORDER BY slug').all() as { slug: string }[]).map((g) => g.slug);
      print(JSON.stringify(slugs.map((slug) => ({ ...gameOut(findGame(db, slug)!), seasons: seasonsOf(db, slug) })), null, 2));
      return 0;
    }
    case 'season': {
      if (!first || !second) break;
      const patch: Record<string, unknown> = { season: second };
      if (third !== undefined) {
        try {
          patch.ranked_settings = JSON.parse(third) as unknown;
        } catch {
          print('Not changed: the settings are not valid JSON.');
          return 1;
        }
      }
      if (!findGame(db, first)) patch.enabled = true;
      return change(first, patch);
    }
    case 'enable':
    case 'disable': {
      if (!first) break;
      if (!findGame(db, first)) {
        print(`No game "${first}". Start it with: season ${first} "<name>" [settings-json]`);
        return 1;
      }
      return change(first, { enabled: command === 'enable' });
    }
    case 'scores': {
      if (!first) break;
      for (const r of recentScores(db, first, { limit: Number(second) || 20 }))
        print(`#${r.id}  ${r.created_at}  ${r.season}  ${r.username}  ${r.score}${r.hidden_at ? `  [hidden: ${r.hidden_reason ?? 'no reason'}]` : ''}`);
      return 0;
    }
    case 'apply': {
      if (first === undefined) break;
      const parsed = parseSeasons(first);
      if (!parsed.ok) {
        print(`Not changed: seasons.json: ${parsed.detail}.`);
        return 1;
      }
      let code = 0;
      for (const [slug, want] of parsed.games) {
        const current = findGame(db, slug);
        const have = current ? (gameOut(current) as Record<string, unknown>) : null;
        const patch: Record<string, unknown> = { ...want };
        if (!current && want.enabled === undefined) patch.enabled = true;
        const changed = Object.keys(patch).filter((k) => !have || canonical(have[k]) !== canonical(patch[k]));
        if (!changed.length) {
          print(`${slug}: unchanged, season "${want.season}"`);
          continue;
        }
        const saved = saveGame(db, slug, patch, now());
        if (!saved.ok) {
          print(`${slug}: not changed: ${saved.detail}`);
          code = 1;
          continue;
        }
        print(`${slug}: ${current ? 'updated' : 'added'} (${changed.join(', ')}), season "${saved.game.season}"`);
        if (current && changed.includes('ranked_settings') && !changed.includes('season'))
          print(`${slug}: note: the ranked settings changed within season "${want.season}"; its earlier runs stay on the board`);
      }
      return code;
    }
    case 'hide':
    case 'unhide': {
      const id = Number(first);
      if (!Number.isInteger(id)) break;
      if (!setHidden(db, id, command === 'hide', second ?? null, now())) {
        print(`No score #${id}.`);
        return 1;
      }
      print(command === 'hide' ? `Score #${id} is hidden.` : `Score #${id} is back on the board.`);
      return 0;
    }
  }
  print(USAGE);
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const db = openDb(join(process.env.DATA_DIR || './data', 'scores.db'));
  const code = run(process.argv.slice(2), db, (line) => console.log(line));
  db.close();
  process.exitCode = code;
}
