import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { findGame, gameOut } from '../src/admin.js';
import { parseSeasons, run, USAGE } from '../src/cli.js';
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

describe('seasons.json, applied by every deploy', () => {
  const apply = (seasons: unknown) => cli('apply', typeof seasons === 'string' ? seasons : JSON.stringify(seasons));
  const jerboa = () => JSON.parse(JSON.stringify(gameOut(findGame(db, 'jerboa')!)));

  it('the committed file is valid and lists Jerboa', () => {
    const parsed = parseSeasons(readFileSync(new URL('../seasons.json', import.meta.url), 'utf8'));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.games.map(([slug]) => slug)).toContain('jerboa');
  });

  it('changes nothing when the file matches, whatever order the settings are in', () => {
    const before = jerboa();
    const reordered = Object.fromEntries(Object.entries(before.ranked_settings).reverse());
    expect(apply({ _about: 'notes are ignored', jerboa: { season: before.season, ranked_settings: reordered, free_settings: ['seed'], enabled: true } })).toBe(0);
    expect(out).toEqual(['jerboa: unchanged, season "Playtest 6"']);
    expect(jerboa()).toEqual(before);
  });

  it('starts a new season, with new ranked settings, and keeps the old one readable', () => {
    expect(apply({ jerboa: { season: 'Playtest 7', ranked_settings: { duration: 120, grid: 19 } } })).toBe(0);
    expect(out).toEqual(['jerboa: updated (season, ranked_settings), season "Playtest 7"']);
    expect(jerboa()).toMatchObject({ season: 'Playtest 7', ranked_settings: { duration: 120, grid: 19 }, free_settings: ['seed'], updated_at: '2026-09-28T09:00:00.000Z' });
    out = [];
    cli('games');
    expect(JSON.parse(out.join('\n'))[0].seasons.map((s: { season: string }) => s.season)).toEqual(['Playtest 6']);
  });

  it('notes a settings change within the same season', () => {
    expect(apply({ jerboa: { season: 'Playtest 6', ranked_settings: { duration: 60 } } })).toBe(0);
    expect(out[1]).toMatch(/ranked settings changed within season "Playtest 6"/);
  });

  it('adds a new game, switched on unless it says otherwise', () => {
    expect(apply({ 'red-ring': { season: 'Alpha' }, 'next-game': { season: 'Soon', enabled: false } })).toBe(0);
    expect(gameOut(findGame(db, 'red-ring')!)).toMatchObject({ enabled: true, season: 'Alpha' });
    expect(gameOut(findGame(db, 'next-game')!)).toMatchObject({ enabled: false, season: 'Soon' });
  });

  it('refuses a broken file without changing anything', () => {
    const before = jerboa();
    for (const bad of ['{nope', '[]', { jerboa: { ranked_settings: {} } }, { 'Bad Slug': { season: 'x' } }, { jerboa: { season: 'x', free_settings: 'seed' } },
      { jerboa: { season: 'x', enabled: 'yes' } }, { red: { season: 'ok' }, jerboa: { season: 'x', ranked_settings: [1] } }]) {
      out = [];
      expect(apply(bad)).toBe(1);
      expect(out[0]).toMatch(/^Not changed: seasons\.json: /);
    }
    expect(jerboa()).toEqual(before);
    expect(findGame(db, 'red')).toBeUndefined();
  });
});
