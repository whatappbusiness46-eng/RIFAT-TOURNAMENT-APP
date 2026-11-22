# Test status

## PostgreSQL migration

- Replaced `better-sqlite3` with the PostgreSQL `pg` driver.
- Added Supabase-compatible schema initialization, foreign keys, constraints, indexes,
  and default settings.
- Ported the existing API routes to asynchronous PostgreSQL queries.
- Wallet debits, withdrawals, match joins, cancellation refunds, referral credits,
  admin transaction decisions, and tournament payouts use PostgreSQL transactions.
- Updated Render configuration to require `DATABASE_URL` as a secret.
- Updated the smoke test to use an explicitly supplied disposable PostgreSQL database.

## Checks run for this source package

- `npm run check`: PASS (backend syntax and Expo syntax/static asset checks).
- `npm test`: PASS with the PostgreSQL integration smoke test SKIPPED because
  `TEST_DATABASE_URL` was not supplied in this environment.
- Live Supabase connection and end-to-end API tests: NOT RUN. They require access
  to the owner's database secret and should be run in the deployment environment.

Do not treat static checks as a substitute for live transaction and deployment tests.
