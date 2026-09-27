import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run, USAGE } from '../src/cli.js';
import { openDb, type Db } from '../src/db.js';

let db: Db;
let out: string[];
const cli = (...args: string[]) => run(args, db, (line) => out.push(line), () => '2026-09-28T09:00:00.000Z');

beforeEach(() => {
  db = openDb(':memory:');
  out = [];
  db.prepare(`INSERT INTO scores (game, season, user_id, username, run_id, score, stats, settings, created_at)
    VALUES ('jerboa', 'Playtest 6', 1, 'ada', 'r1', 50, '{"nodes":9}', '{}', '2026-09-27T10:00:00.000Z')`).run();
});
afterEach(() => db.close());

describe('admin on the box', () => {
  it('lists games with their seasons', () => {
    expect(cli('games')).toBe(0);
    const [jerboa] = JSON.parse(out.join('\n'));
    expect(jerboa).toMatchObject({ slug: 'jerboa', enabled: true, season: 'Playtest 6', free_settings: ['seed'] });
    expect(jerboa.seasons).toEqual([{ season: 'Playtest 6', players: 1, runs: 1, last: '2026-09-27T10:00:00.000Z' }]);
  });

  it('starts a new season with new ranked settings', () => {
    expect(cli('season', 'jerboa', 'Playtest 7', '{"duration":120,"grid":19}')).toBe(0);
    expect(JSON.parse(out.join('\n'))).toMatchObject({ season: 'Playtest 7', ranked_settings: { duration: 120, grid: 19 }, updated_at: '2026-09-28T09:00:00.000Z' });
    out = [];
    expect(cli('season', 'jerboa', 'Playtest 8', '{not json')).toBe(1);
    expect(out[0]).toMatch(/not valid JSON/);
  });

  it('adds a new game switched on, and opens and closes boards', () => {
    expect(cli('season', 'red-ring', 'Alpha')).toBe(0);
    expect(JSON.parse(out.join('\n'))).toMatchObject({ slug: 'red-ring', enabled: true, season: 'Alpha' });
    expect(cli('disable', 'red-ring')).toBe(0);
    expect(cli('enable', 'nope')).toBe(1);
  });

  it('shows, hides and restores scores', () => {
    expect(cli('scores', 'jerboa')).toBe(0);
    expect(out[0]).toBe('#1  2026-09-27T10:00:00.000Z  Playtest 6  ada  50');
    expect(cli('hide', '1', 'test run')).toBe(0);
    out = [];
    cli('scores', 'jerboa');
    expect(out[0]).toMatch(/\[hidden: test run\]$/);
    expect(cli('unhide', '1')).toBe(0);
    expect(cli('hide', '99')).toBe(1);
  });

  it('prints the usage for anything else', () => {
    for (const args of [[], ['season', 'jerboa'], ['hide', 'x'], ['explode']]) {
      out = [];
      expect(run(args, db, (line) => out.push(line))).toBe(2);
      expect(out).toEqual([USAGE]);
    }
  });
});
