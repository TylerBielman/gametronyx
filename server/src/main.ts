// Entry point: node --disable-warning=ExperimentalWarning dist/main.js (see Dockerfile).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { accountsClient } from './accounts.js';
import { buildApp } from './app.js';
import { backupIfDue } from './backup.js';
import { loadConfig } from './config.js';
import { openDb } from './db.js';

const config = loadConfig();
mkdirSync(config.dataDir, { recursive: true });
const db = openDb(join(config.dataDir, 'scores.db'));
const app = buildApp({ db, accounts: accountsClient(config.accountsApi), corsOrigins: config.corsOrigins, logger: true });

const backup = () => {
  try {
    app.log.info({ file: backupIfDue(db, join(config.dataDir, 'backups')) }, 'daily backup present');
  } catch (error) {
    app.log.error(error, 'backup failed');
  }
};
backup();
setInterval(backup, 6 * 60 * 60 * 1000).unref();

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    void app.close().then(() => {
      db.close();
      process.exit(0);
    });
  });
}

await app.listen({ host: config.host, port: config.port });
app.log.info({ accountsApi: config.accountsApi, origins: config.corsOrigins }, 'leaderboard server ready');
