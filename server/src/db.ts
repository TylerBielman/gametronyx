// SQLite storage (Node's built-in node:sqlite). One file, scores.db, in DATA_DIR. Migrations are forward-only and
// never delete rows; each runs once, in order, recorded in meta.schema_version.
import { DatabaseSync } from 'node:sqlite';

export type Db = DatabaseSync;

/** Jerboa's default settings as of Playtest 6 (3-minutes-to-midnight src/game.ts DEFAULTS). The seed may vary. */
export const JERBOA_RANKED_SETTINGS = {
  duration: 180,
  grid: 19,
  hopMs: 450,
  nodeCount: 10,
  spawn: 'random',
  roadLimit: 25,
  hitRadius: 0.1,
  boostSpeed: 1.4,
  boostMs: 7000,
  freezeMs: 6000,
  slots: 2,
};

const MIGRATIONS: ((db: Db, now: string) => void)[] = [
  (db, now) => {
    db.exec(`
      CREATE TABLE games (
        slug TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 0,
        season TEXT NOT NULL,
        ranked_settings TEXT,
        free_settings TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL
      );
      CREATE TABLE scores (
        id INTEGER PRIMARY KEY,
        game TEXT NOT NULL REFERENCES games (slug),
        season TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        run_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        stats TEXT NOT NULL,
        settings TEXT NOT NULL,
        build TEXT,
        build_sha TEXT,
        created_at TEXT NOT NULL,
        hidden_at TEXT,
        hidden_reason TEXT
      );
      CREATE UNIQUE INDEX scores_run ON scores (game, user_id, run_id);
      CREATE INDEX scores_board ON scores (game, season, score DESC);
      CREATE INDEX scores_user ON scores (user_id);
    `);
    db.prepare(
      `INSERT INTO games (slug, enabled, season, ranked_settings, free_settings, updated_at) VALUES (?, 1, ?, ?, ?, ?)`,
    ).run('jerboa', 'Playtest 6', JSON.stringify(JERBOA_RANKED_SETTINGS), JSON.stringify(['seed']), now);
  },
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export function openDb(path: string, now = () => new Date().toISOString()): Db {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  migrate(db, now());
  return db;
}

function migrate(db: Db, now: string) {
  db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get() as { value: string } | undefined;
  for (let version = row ? Number(row.value) : 0; version < MIGRATIONS.length; version++) {
    db.exec('BEGIN');
    try {
      MIGRATIONS[version](db, now);
      db.prepare(
        `INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      ).run(String(version + 1));
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
