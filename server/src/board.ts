// Standings: each player's best score in a season. Ties share a rank (1, 2, 2, 4) and whoever got there first is
// listed first. Hidden scores don't count. Everything is computed per request: at playtest scale that's a few
// hundred rows at most.
import type { Db } from './db.js';

export interface Standing {
  userId: number;
  username: string;
  score: number;
  at: string;
  rank: number;
}

export interface Entry {
  rank: number;
  username: string;
  score: number;
  me: boolean;
}

export interface Board {
  season: string;
  players: number;
  rank: number | null;
  best: number | null;
  entries: Entry[];
  me: { rank: number; username: string; score: number } | null;
}

/** The board shows the top 10 and the places around the player (5 above, 10 below), so a game can scroll the
 *  player's row into view with the players just ahead and just behind. */
export const TOP = 10;
export const ABOVE = 5;
export const BELOW = 10;

export function standings(db: Db, game: string, season: string): Standing[] {
  const rows = db
    .prepare(
      `WITH runs AS (
         SELECT id, user_id, username, score, created_at,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score DESC, created_at ASC, id ASC) AS n
         FROM scores WHERE game = ? AND season = ? AND hidden_at IS NULL
       )
       SELECT user_id, username, score, created_at, RANK() OVER (ORDER BY score DESC) AS rank
       FROM runs WHERE n = 1
       ORDER BY score DESC, created_at ASC, id ASC`,
    )
    .all(game, season) as { user_id: number; username: string; score: number; created_at: string; rank: number }[];
  return rows.map((r) => ({ userId: r.user_id, username: r.username, score: r.score, at: r.created_at, rank: r.rank }));
}

export function boardFor(season: string, all: Standing[], userId: number | null): Board {
  const at = userId === null ? -1 : all.findIndex((s) => s.userId === userId);
  const mine = at >= 0 ? all[at] : null;
  const entries = all
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => i < TOP || (at >= 0 && i >= at - ABOVE && i <= at + BELOW))
    .map(({ s }) => ({ rank: s.rank, username: s.username, score: s.score, me: s.userId === userId }));
  return {
    season,
    players: all.length,
    rank: mine?.rank ?? null,
    best: mine?.score ?? null,
    entries,
    me: mine ? { rank: mine.rank, username: mine.username, score: mine.score } : null,
  };
}
