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


## Latest update – Free Fire thumbnails and persistent login

- Added ten distinct Free Fire mode thumbnail PNGs under `expo-app/assets/` and mapped them by mode name as local fallbacks. Server-provided mode `image_url` remains the preferred image.
- Added AsyncStorage 2.2.0 and token persistence: login/register saves the server token; app startup restores it; logout clears it.
- Passed: backend JavaScript syntax checks, Expo source-presence check, JSX parse, JSON manifest parsing, and ZIP integrity.
- Not run: dependency installation, backend runtime/database integration, Expo Doctor, EAS APK build, and physical Android tests. These require dependency installation/network and/or configured backend/device access.
