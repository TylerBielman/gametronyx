// Everything the server reads from its environment (deploy/docker-compose.prod.yml sets these on the box).
// There are no secrets: players are identified by asking the accounts API who a session token belongs to.

export interface Config {
  host: string;
  port: number;
  /** Holds scores.db and backups/. */
  dataDir: string;
  /** The shared accounts API (EFdungeon backend), reached on the box's loopback. */
  accountsApi: string;
  /** Sites and game builds allowed to call this server from a browser. */
  corsOrigins: string[];
}

export const DEFAULT_ORIGINS = [
  'https://gametronyx.com',
  'https://www.gametronyx.com',
  'https://tylerbielman.github.io',
  'https://noeasywayup.com',
  'https://www.noeasywayup.com',
];

/** A JSON array or a comma-separated list. */
export function parseOrigins(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) return DEFAULT_ORIGINS;
  const text = raw.trim();
  const list: unknown = text.startsWith('[') ? JSON.parse(text) : text.split(',');
  if (!Array.isArray(list)) throw new Error('CORS_ORIGINS must be a JSON array or a comma-separated list');
  return list.map((origin) => String(origin).trim().replace(/\/$/, '')).filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 8004);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`PORT is not a port: ${env.PORT}`);
  return {
    host: env.HOST || '127.0.0.1',
    port,
    dataDir: env.DATA_DIR || './data',
    accountsApi: (env.ACCOUNTS_API || 'http://127.0.0.1:8001').replace(/\/$/, ''),
    corsOrigins: parseOrigins(env.CORS_ORIGINS),
  };
}
