# Supabase PostgreSQL integration

The backend has been migrated from `better-sqlite3` to PostgreSQL using the `pg` driver.
The application reads `DATABASE_URL`; use the Supabase **Session Pooler** connection
string as a server-side secret (for example, Render Environment → `DATABASE_URL`).
Never commit the connection string, database password, or service-role key.

## First startup

`server/db.js` creates the PostgreSQL tables, constraints, indexes, and default settings.
The supplied Supabase project is expected to be empty, so no SQLite data import is needed.
The first server startup also provisions the admin account from `ADMIN_EMAIL` and
`ADMIN_PASSWORD`; the password must be at least 12 characters.

## Transaction safeguards in the migrated API

- Wallet debits use row locks and conditional balance updates; the database enforces
  `wallets.balance >= 0`.
- Match joining locks the match row, checks capacity and duplicate membership, then
  debits the wallet and creates the entry ledger row in one PostgreSQL transaction.
- Withdrawal requests reserve the balance in the same transaction that creates the
  pending transaction; a rejected withdrawal restores the reserved amount atomically.
- Deposit decisions lock the transaction row and only process `pending` requests.
  Deposit references have a unique index per user.
- Match cancellation refunds and referral credits are committed atomically with the
  match status update. Referral earnings are unique per referred player and match.
- Tournament result publication locks the match, inserts results, credits wallets,
  writes prize ledger rows, and marks `payouts_published` in one transaction.
  A unique prize reference and the published flag prevent repeat payouts.

## Required verification before accepting real funds

Run `npm run check` and `npm test`. The PostgreSQL smoke test is intentionally skipped
unless `TEST_DATABASE_URL` points to a disposable PostgreSQL database. Run it against
a disposable Supabase project/database, then exercise the complete app workflows.
Source-level checks alone do not prove deployed end-to-end behavior. Configure database
backups and test restore before production launch.
