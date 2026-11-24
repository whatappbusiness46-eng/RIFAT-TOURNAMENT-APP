ZYROX ARENA – WALLET, JOINED PLAYERS, TEAM PAYOUT & 200 MATCHES

FILES TO REPLACE
1. expo-app/App.js
2. server/index.js
3. server/db.js
4. package.json

NEW FILE
5. server/seed-tournaments.js
6. .github/workflows/seed-tournaments.yml

APPLY
- Back up your current project and Supabase database first.
- Copy the files above into the same paths in your project.
- Keep your existing README.md; this ZIP has its own README-APPLY.txt.
- Commit and push to GitHub. Deploy the backend on Render.
- Database migration adds wallets.winning_balance, transactions.balance_source,
  and match_players.team_number with ADD COLUMN IF NOT EXISTS.
- After deployment, run `npm run check`.
- To create the 200 tournament matches WITHOUT Render Shell:
  1. Push all files, including `.github/workflows/seed-tournaments.yml`, to GitHub.
  2. In GitHub open Settings -> Secrets and variables -> Actions -> New repository secret.
  3. Name the secret exactly `DATABASE_URL`; paste the Supabase PostgreSQL connection string as its value.
     Use the actual database password in the connection string; never put it in this file or commit it.
  4. Open the repository Actions tab -> `Seed ZYROX ARENA tournaments` -> Run workflow.
  5. Wait for the run to finish and check the green success mark/log.
  The workflow runs `npm run seed:tournaments` using GitHub Actions; it does not need Render Shell.
  The seeder checks for existing ZYROX AUTO 2026- matches before inserting and skips duplicates.
  Run it only once; do not repeatedly trigger it unless you have checked the database.
- Rebuild the APK after the frontend change.

FEATURES
- Wallet shows separate Deposit/Entry Balance and Winning Balance.
- Withdrawal API debits only Winning Balance. Pending withdrawals reserve it; rejection
  returns the reserved amount to Winning Balance.
- Match prizes are credited to Winning Balance.
- JOINED PLAYERS appears below Rules & Regulations in match details. Only participants
  can open the list. CS/LW list is available only after all slots are full.
- Admin has SET TEAMS / PAY WINNER for CS/LW. Enter every joined player's user ID in the
  team JSON and choose the winning team number. Net prize after commission is divided
  equally among winning-team players. Payout is locked to one publication per match.
- Individual PUBLISH WINNER is hidden for CS/LW, and the API rejects that route for CS/LW.
- Admin tab loads are serialized to reduce overlapping requests.

IMPORTANT
- Deploying does NOT insert the 200 matches automatically. Run the seeder command.
- Live Supabase/Render, production API, APK runtime, and real-device admin crash tests
  have not been performed here. Static syntax and Expo asset checks passed.
- Back up the database before deploying wallet/financial changes.
