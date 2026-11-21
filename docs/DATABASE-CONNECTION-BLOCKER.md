# External database connection — required before persistent production use

The current backend uses `better-sqlite3` and opens the local file selected by
`DATABASE_FILE`. It does not read `DATABASE_URL`, and it cannot connect directly
to a hosted PostgreSQL service (including Supabase or Neon) merely by adding an
environment variable.

The owner said their database is hosted separately, but the provider and connection
details were not included with the source ZIP. Do not paste database passwords into
GitHub, source code, chat, or an APK.

Before integrating, provide:
1. Database provider/site name (for example Supabase, Neon, Railway PostgreSQL, or
   another provider).
2. Database engine and version (PostgreSQL/MySQL/SQLite-compatible).
3. The provider's server-side connection method (for PostgreSQL, a pooled or direct
   connection string stored only as a Render secret; redact the password when sharing
   details here).
4. Whether the database is empty or contains existing user/wallet/tournament data.

Integration work still required after provider selection:
- Replace the synchronous SQLite query/transaction layer with the provider's driver.
- Port SQLite schema, constraints, indexes, seed data, and migrations.
- Preserve atomic wallet debits, deposits/withdrawals, match joins, refunds, referral
  commissions, and one-time payouts.
- Add migration and backup/restore checks, then run API integration tests against a
  disposable database before production.
- Configure Render environment secrets and verify persistence across a redeploy.

Until those steps pass, Render Free + this SQLite backend is demo-only. Do not accept
real deposits, withdrawals, paid entries, or prize balances.
