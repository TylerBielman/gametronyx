// Leaderboard admin on the box, for when the /admin tab isn't at hand. deploy/scores-admin.sh runs it inside the
// container, e.g.  bash /opt/gametronyx-scores/deploy/scores-admin.sh season jerboa "Playtest 7" '{"duration":180,…}'
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findGame, gameOut, recentScores, saveGame, seasonsOf, setHidden } from './admin.js';
import { openDb, type Db } from './db.js';

export const USAGE = `Usage:
  games                                   every game's board settings and seasons
  season <game> "<name>" [settings-json]  start a new season, optionally with new ranked settings
  enable <game> | disable <game>          open or close a game's board
  scores <game> [how-many]                recent scores, newest first (hidden ones marked)
  hide <score-id> [reason] | unhide <score-id>`;

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
