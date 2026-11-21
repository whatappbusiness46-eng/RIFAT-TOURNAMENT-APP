# Render Free deployment note

This project currently uses `better-sqlite3` and a local SQLite file. The included `render.yaml` deploys a free web service and stores that file at `/tmp/zyrox.sqlite` so the service can start without a paid persistent disk.

**Important: Render Free web services have an ephemeral filesystem.** The SQLite database can be lost when the service restarts, is redeployed, or is moved to another instance. This is acceptable only for a temporary/demo deployment with test data. Do not accept real deposits, withdrawals, paid tournament entries, or rely on wallet balances/results on this setup.

For durable production data, attach persistent storage (if available on the selected plan) or migrate the application database from SQLite to a managed PostgreSQL service. This codebase has synchronous better-sqlite3 queries throughout; changing to PostgreSQL requires a deliberate database-layer migration and end-to-end tests, not just changing `DATABASE_FILE`.

After deployment, verify `https://YOUR-SERVICE.onrender.com/api/health` returns `{ "ok": true, "app": "ZYROX ARENA" }`. Set a strong unique `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Render environment settings. Never use example credentials.
