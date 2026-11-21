# Test status – Refer & Earn update

- `npm run check`: PASS (Node syntax checks for server and app source)
- Referral API/schema implementation: added; runtime verification requires installed dependencies and configured database.
- `npm test`: BLOCKED because project dependencies are not installed in this environment (`dotenv` missing).
- Expo dependency installation / Expo Doctor: NOT RUN.
- Android APK build and on-device visual verification: NOT RUN.

Referral behavior implemented in source:
- Registration accepts an optional referral code and each account receives a unique referral code.
- Referral commission defaults to 1% and is credited to the referrer wallet when an admin marks a referred player's match completed.
- Unique referral earning constraint prevents duplicate commissions for the same referred player and match.
- Monthly/lifetime referral leaderboard and admin referral ledger are included.
- Admin settings control referral enable/disable and commission percentage. `referral_bonus` is reserved and does not currently issue a signup bonus.

Do not treat this build as production-tested until dependencies are installed and backend/API tests pass.
