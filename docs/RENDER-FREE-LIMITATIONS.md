# Render Free limitations — read before deployment

The current backend uses synchronous `better-sqlite3` and stores the database at `DATABASE_FILE`.

The included `render.yaml` sets `DATABASE_FILE=/tmp/zyrox.sqlite` so the free web service can start. **Render Free's filesystem is ephemeral.** SQLite data may be lost on restart, redeploy, or instance replacement. Therefore this configuration is suitable only for demos and test data.

Do not use the Render Free deployment for:
- real deposits or withdrawals;
- paid tournament entry fees;
- wallet balances, prize payouts, or referral commissions that must be preserved;
- any operation where loss or rollback of financial records would harm a player.

## Production persistence choices

1. **Single Render instance with durable disk:** use a Render plan that supports a persistent disk, attach it to the service, and set `DATABASE_FILE` to a path inside the mounted disk. Back up the database and test restore. SQLite is not suitable for multiple app instances sharing a local file.
2. **Managed PostgreSQL:** migrate the complete data-access layer from synchronous `better-sqlite3` to PostgreSQL, add schema migrations, transfer existing data, and run full integration/concurrency tests. Merely setting a `DATABASE_URL` or changing `DATABASE_FILE` does not perform this migration.

The requested combination “Render Free + durable production database” is not satisfied by this repository as supplied. Do not describe it as production-ready until a durable database implementation is deployed and verified.

After deployment, verify `https://YOUR-SERVICE.onrender.com/api/health` returns `{ "ok": true, "app": "ZYROX ARENA" }`. Set a unique `ADMIN_EMAIL`, a strong `ADMIN_PASSWORD` (12+ characters), and a random `JWT_SECRET` (32+ characters) in Render environment settings. Never commit secrets.
