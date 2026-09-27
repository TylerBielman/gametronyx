// HTTP routes, all under /api/leaderboards (docs/DESIGN.md §15 has the reference).
// Games post runs; anyone can read a board; admins (role from the accounts API) run seasons and hide scores.
// Errors are {detail: "..."} like the accounts API, so game clients handle both the same way.
import cors from '@fastify/cors';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import type { Accounts, Player } from './accounts.js';
import { findGame as lookup, gameOut, recentScores, saveGame, seasonsOf as seasons, setHidden, type GameRow } from './admin.js';
import { boardFor, standings } from './board.js';
import type { Db } from './db.js';
import { SlidingWindow } from './ratelimit.js';
import { checkRun, parseRun, settingsMatch } from './rules.js';

export interface AppOptions {
  db: Db;
  accounts: Accounts;
  corsOrigins: string[];
  logger?: boolean;
  now?: () => Date;
  /** Posts per player per hour. A Jerboa run lasts minutes, so 30 leaves room for a queue of retries. */
  postsPerHour?: number;
}

const PREFIX = '/api/leaderboards';

export function buildApp({ db, accounts, corsOrigins, logger = false, now = () => new Date(), postsPerHour = 30 }: AppOptions) {
  const app = Fastify({ logger, bodyLimit: 16 * 1024 });
  const posts = new SlidingWindow(postsPerHour, 60 * 60 * 1000, () => now().getTime());

  void app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });

  app.setErrorHandler((error: { statusCode?: number; message: string }, request, reply) => {
    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    if (status >= 500) request.log.error(error);
    void reply.code(status).send({ detail: status >= 500 ? 'Something went wrong.' : error.message });
  });
  app.setNotFoundHandler((_request, reply) => void reply.code(404).send({ detail: 'Not found' }));

  const findGame = (slug: string) => lookup(db, slug);
  const seasonsOf = (slug: string) => seasons(db, slug);

  function bearer(request: FastifyRequest): string | null {
    const header = request.headers.authorization ?? '';
    return /^Bearer\s+\S+$/i.test(header) ? header.replace(/^Bearer\s+/i, '') : null;
  }

  /** The signed-in player, or null after sending the error. */
  async function player(request: FastifyRequest, reply: FastifyReply): Promise<Player | null> {
    const token = bearer(request);
    if (!token) {
      void reply.code(401).send({ detail: 'Launch the game from gametronyx.com to post scores.' });
      return null;
    }
    const who = await accounts.identify(token);
    if (who.ok) return who.player;
    const detail =
      who.status === 503 ? 'Can’t reach Gametronyx accounts right now. Try again soon.' : 'Your Gametronyx session has ended.';
    void reply.code(who.status).send({ detail });
    return null;
  }

  async function admin(request: FastifyRequest, reply: FastifyReply): Promise<Player | null> {
    const who = await player(request, reply);
    if (who && who.role !== 'admin') {
      void reply.code(403).send({ detail: 'Admins only' });
      return null;
    }
    return who;
  }

  /** The viewer, when a valid token came along; boards are public, the token only marks "me". */
  async function viewer(request: FastifyRequest): Promise<Player | null> {
    const token = bearer(request);
    if (!token) return null;
    const who = await accounts.identify(token);
    return who.ok ? who.player : null;
  }

  app.get(`${PREFIX}/health`, async () => ({ ok: true }));

  // A game's board. ?season= picks an earlier season; the default is the current one.
  app.get<{ Params: { game: string }; Querystring: { season?: string } }>(`${PREFIX}/:game`, async (request, reply) => {
    const game = findGame(request.params.game);
    if (!game || !game.enabled) return reply.code(404).send({ detail: 'No leaderboard for this game.' });
    const season = (request.query.season ?? '').trim() || game.season;
    const me = await viewer(request);
    return {
      game: game.slug,
      ...boardFor(season, standings(db, game.slug, season), me?.id ?? null),
      current_season: game.season,
      seasons: seasonsOf(game.slug).map(({ season: name, players }) => ({ season: name, players })),
    };
  });

  // Post one finished run. The reply is the board the game shows at the end of the run.
  app.post<{ Params: { game: string } }>(`${PREFIX}/:game/scores`, async (request, reply) => {
    const game = findGame(request.params.game);
    if (!game || !game.enabled) return reply.code(404).send({ detail: 'No leaderboard for this game.' });
    const who = await player(request, reply);
    if (!who) return reply;
    const wait = posts.take(`user:${who.id}`);
    if (wait) return reply.code(429).header('Retry-After', String(wait)).send({ detail: 'Too many scores at once. Try again later.' });
    const parsed = parseRun(request.body);
    if (!parsed.ok) return reply.code(400).send({ detail: parsed.detail });
    const run = parsed.run;
    const ranked = game.ranked_settings ? (JSON.parse(game.ranked_settings) as Record<string, unknown>) : null;
    if (!settingsMatch(run.settings, ranked, JSON.parse(game.free_settings) as string[]))
      return reply.code(422).send({ detail: 'Only runs with the default settings are ranked.' });
    const problem = checkRun(game.slug, run);
    if (problem) return reply.code(422).send({ detail: problem });

    const before = boardFor(game.season, standings(db, game.slug, game.season), who.id);
    const repeat = db
      .prepare('SELECT id FROM scores WHERE game = ? AND user_id = ? AND run_id = ?')
      .get(game.slug, who.id, run.run_id);
    if (repeat) {
      // A resend (the game retries runs that failed to post): nothing new to rank.
      return reply.code(200).send({ ...before, previous_rank: before.rank, previous_best: before.best, personal_best: false });
    }
    const at = now().toISOString();
    db.exec('BEGIN');
    try {
      db.prepare(
        `INSERT INTO scores (game, season, user_id, username, run_id, score, stats, settings, build, build_sha, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(game.slug, game.season, who.id, who.username, run.run_id, run.score, JSON.stringify(run.stats),
        JSON.stringify(run.settings), run.build, run.build_sha, at);
      // Boards show a player's current username.
      db.prepare('UPDATE scores SET username = ? WHERE user_id = ? AND username <> ?').run(who.username, who.id, who.username);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    const after = boardFor(game.season, standings(db, game.slug, game.season), who.id);
    return reply.code(201).send({
      ...after,
      previous_rank: before.rank,
      previous_best: before.best,
      personal_best: before.best === null || run.score > before.best,
    });
  });

  // Admin: every game's settings and seasons.
  app.get(`${PREFIX}/admin/games`, async (request, reply) => {
    if (!(await admin(request, reply))) return reply;
    const games = db.prepare('SELECT * FROM games ORDER BY slug').all() as unknown as GameRow[];
    return games.map((g) => ({ ...gameOut(g), seasons: seasonsOf(g.slug) }));
  });

  // Admin: create or change a game's board. A new season name starts a fresh board; old seasons stay readable.
  app.put<{ Params: { game: string } }>(`${PREFIX}/admin/games/:game`, async (request, reply) => {
    if (!(await admin(request, reply))) return reply;
    const saved = saveGame(db, request.params.game, request.body, now().toISOString());
    return saved.ok ? saved.game : reply.code(400).send({ detail: saved.detail });
  });

  // Admin: recent runs, hidden ones included, newest first. ?season= and ?before_id= page through.
  app.get<{ Params: { game: string }; Querystring: { season?: string; before_id?: string; limit?: string } }>(
    `${PREFIX}/admin/games/:game/scores`,
    async (request, reply) => {
      if (!(await admin(request, reply))) return reply;
      const { season, before_id, limit } = request.query;
      return recentScores(db, request.params.game, { season: season?.trim() || undefined, beforeId: Number(before_id) || undefined, limit: Number(limit) || 50 });
    },
  );

  // Admin: take a score off the board (or put it back). The row is kept.
  for (const action of ['hide', 'unhide'] as const) {
    app.post<{ Params: { id: string } }>(`${PREFIX}/admin/scores/:id/${action}`, async (request, reply) => {
      if (!(await admin(request, reply))) return reply;
      const reason = (request.body as { reason?: unknown } | undefined)?.reason;
      const done = setHidden(db, Number(request.params.id), action === 'hide', typeof reason === 'string' ? reason : null, now().toISOString());
      return done ? { ok: true } : reply.code(404).send({ detail: 'No such score.' });
    });
  }

  return app;
}
