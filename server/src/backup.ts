// A daily copy of scores.db in DATA_DIR/backups (VACUUM INTO gives a consistent snapshot while serving), kept for
// 14 days. The box's own nightly job only dumps the accounts database, so the leaderboard looks after itself.
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './db.js';

const NAME = /^scores-(\d{4}-\d{2}-\d{2})\.db$/;

export function backupIfDue(db: Db, dir: string, now = new Date(), keepDays = 14): string {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `scores-${now.toISOString().slice(0, 10)}.db`);
  if (!existsSync(file)) db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const oldest = new Date(now.getTime() - keepDays * 86_400_000).toISOString().slice(0, 10);
  for (const name of readdirSync(dir)) {
    const day = NAME.exec(name)?.[1];
    if (day && day < oldest) unlinkSync(join(dir, name));
  }
  return file;
}
