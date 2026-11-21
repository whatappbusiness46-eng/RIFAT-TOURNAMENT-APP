# ZYROX ARENA — Expo Android + API backend

This project is an Android-first Expo React Native tournament app with one shared REST API and SQLite database. The Expo app includes player and admin flows. There is no public-facing website UI in this delivery; the backend exposes JSON API routes only.

## What is included

- `expo-app/` — Expo React Native Android app (player + admin in the same app; admin controls are role-gated by server API).
- `server/` — Express REST API, SQLite schema, hashed-password authentication, wallet ledger, tournament operations, referral attribution and commission ledger.
- `.env.example` — server configuration template.

## Authentication

Registration accepts a Gmail/email address, a mobile number, or both. At least one is required. Passwords must be at least 8 characters. Login accepts the same Gmail/email or mobile number plus the original password. The API stores password hashes (bcrypt), never plaintext passwords. Admin accounts are provisioned only from server environment variables and cannot be created through public registration.

For phone-only accounts, the database uses an internal non-deliverable placeholder email to retain compatibility with the existing schema; the UI and login use the actual phone number. Do not use that placeholder as a contact address.

## Backend setup

Requirements: Node.js 20+ and a host with durable storage for SQLite. Render Free uses an ephemeral filesystem and is not safe for durable wallets, deposits, withdrawals, paid entries, or prize balances. A persistent database/volume is mandatory before production use. The current source is SQLite-only; it does not support a hosted PostgreSQL `DATABASE_URL` until the data layer is migrated. See `docs/DATABASE-CONNECTION-BLOCKER.md`.

```bash
cp .env.example .env
# Set a unique JWT_SECRET (32+ random characters), ADMIN_EMAIL, ADMIN_PASSWORD,
# ADMIN_NAME, DATABASE_FILE, and PORT. Never commit .env.
npm install
npm run check
npm test
npm start
```

The server is API-only. Health check: `GET /api/health`. SQLite is initialized automatically on first run. The initial admin is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` on first startup. `ADMIN_PASSWORD` must be at least 12 characters; the server refuses first-time admin creation when these credentials are missing rather than using a public default password. Keep these secrets on the server only. Change the admin password from the app's Developer Profile → Security screen after first login.

## Referral & Earn

- Registration accepts an optional referral code.
- Each account receives a unique referral code; existing accounts are backfilled on startup.
- A referral commission is credited to the referrer wallet only when the referred player’s match is marked `completed` by an admin. A unique `(referred_user_id, match_id)` constraint prevents duplicate commission credit.
- Player screens expose referral code copy/share, earned commission, referral count, and monthly/lifetime referral leaderboards.
- Admin → Developer Profile → Referrals shows the commission ledger. Admin → Settings controls `referral_enabled` (`true`/`false`), `referral_commission_percent` (0–50), and `referral_bonus` (reserved configuration; no signup bonus is currently credited).
- Default referral commission is 1%. Commission is calculated on the completed match entry fee, not on kills or prize winnings.

## Expo Android setup

Requirements: Node.js 20+, Expo account, EAS CLI, and a public HTTPS backend URL.

1. Deploy the API backend and verify `https://YOUR_API_DOMAIN/api/health`.
2. Set `EXPO_PUBLIC_API_URL` to the exact HTTPS API origin (no trailing slash). Copy `expo-app/.env.example` to `expo-app/.env` for local builds, or set the same variable in the EAS project environment for cloud builds. `expo-app/app.config.js` injects it into `expo.extra.apiUrl`; the app reads it through `expo-constants`.
3. From `expo-app/` run:

```bash
npm install
npx expo-doctor
npx eas login
npx eas build:configure
npx eas build --platform android --profile preview
```

The preview profile produces an installable APK. Production profile produces an Android App Bundle for Google Play. Build signing is handled by EAS after you configure your Expo account. This repository does not include a signed APK because the build requires your Expo/EAS account, production API URL, and signing configuration.

## Distributing the APK

You can share the APK directly using a public HTTPS download link, or publish it on Google Play. If you want people to search for `ZYROX ARENA APK` in Chrome/Google and find it, you need a public indexed download page or a Play Store listing. A bare APK file is not automatically indexed by Google Search. The APK can be hosted on a file host, but a small public download page is the reliable searchable option. This does not require building the tournament platform as a website; it is only a download listing.

## Player features

- Email/Gmail or phone registration and login.
- Player profile, wallet, deposit/withdrawal requests, transaction history.
- Game and match listing, match joining, joined matches, room credential release, rules, notifications.
- Match entry fees are deducted in a database transaction. Duplicate joins are rejected.
- Room ID/password are optional at match creation and are hidden until admin releases them to joined players.

## Admin features

- Dashboard statistics, player list, block/unblock, balance adjustment.
- Create/edit/delete matches; start, cancel, complete; view joined players; edit/release room credentials; publish winners and prize payouts.
- Deposit/withdrawal approval/rejection; payment settings; rules editor; notification broadcast or player-specific message; games/modes management API; admin profile and password change.
- Cancelled matches refund entry fees; changing entry fee after players have joined is rejected. Prize transactions use an idempotency reference to prevent repeat payouts.

## Payments and legal notes

No payment success is faked. Deposits require a payment reference and admin approval. Withdrawals reserve funds and refund them if rejected. Automated payments require a licensed gateway, server-side webhook signature verification, reconciliation, and provider credentials. Configure your real bKash/Nagad/Rocket or other provider instructions in Admin Settings. Review local laws and platform rules for paid-entry tournaments and prize distribution before public launch.

## Security / production checklist

- Use HTTPS, strong random JWT secret, strong unique admin password, CORS origin allowlisting (`CORS_ORIGINS`), rate limiting, account verification, password reset, audit logging, backups, monitoring, and privacy/terms pages.
- Keep `.env`, database backups, and signing credentials out of the ZIP and source control.
- Render Free filesystem is ephemeral: the included free Blueprint is demo-only. For production, attach a paid persistent disk or migrate the data layer to a managed PostgreSQL database and verify backups/restore. Merely changing `DATABASE_FILE` does not migrate SQLite to PostgreSQL.
- Confirm admin access, payment settlement, winner eligibility, payout policy, dispute handling, and anti-cheat procedures before real-money operation.

## Test status

See `TEST-STATUS.md`. Source-level syntax checks are not the same as a deployed end-to-end test. A public HTTPS API deployment and EAS account are still required to verify real Android network flows and produce a signed distributable APK.

## Branding assets
- Expo launcher icon: `expo-app/assets/zyrox-app-icon.png`
- ZYROX brand artwork: `expo-app/assets/zyrox-brand.png`
- Game tiles: `ludo-icon.png`, `pubg-bgmi-icon.png`, `free-fire-icon.png`, `more-games-icon.png`
- These are original AI-generated illustrative assets for this project, not official game logos or endorsements. Ludo is represented separately from PUBG/BGMI.
- The Expo app now references the launcher icon and uses the game artwork in the game selection cards.
- Home screen supports admin-managed YouTube links (regular videos and Shorts URLs), a Games / Others switch, selectable mode cards, custom mode artwork URLs, and Free Match badges. These are managed inside the in-app **Developer Profile** admin area → Home Videos and Games & Modes.
- Game mode cards can use custom HTTPS image URLs; leave blank to use the built-in original game art. Ludo remains a separate game.
- Home video cards open the configured YouTube URL using the device's external link handler; no embedded WebView dependency is required.

## Automatic tournament economy (added)
Each match can now be configured by the Developer Profile admin panel with:
- `prize_mode`: `fixed` (admin-funded fixed pool) or `entry_pool` (joined entry fees after platform fee).
- `platform_fee_percent`: 0–30% of collected entry fees, calculated on the server.
- `kill_reward`: BDT paid per kill entered in the final result.
- `prize_split`: rank percentages; must total exactly 100 (default 50/30/20).
- `refund_on_cancel`: when enabled, cancellation refunds every joined player's entry fee exactly once.

The admin's **LIVE PRIZE CALCULATOR** reads the current joined-player count and calculates gross entry fees, platform fee, net pool, per-kill reward, rank shares and estimated total payout. It is a live server calculation when the admin opens/refreshes it; it is not a continuous push ticker.

When publishing results, enter all ranked players in the JSON editor in one operation, for example:
```json
[
  {"user_id": 12, "rank": 1, "kills": 5},
  {"user_id": 19, "rank": 2, "kills": 2},
  {"user_id": 25, "rank": 3, "kills": 1}
]
```
Omit `prize` to apply automatic rank percentages. Add a `prize` field only for a manual rank override. Kill rewards are calculated as `kills × kill_reward`. For `entry_pool`, kill rewards are deducted from the net pool before rank shares; for `fixed`, they are deducted from the configured fixed prize pool. The server rejects payouts exceeding the available configured pool. Publishing is one-time per match, inside a database transaction, to prevent duplicate payouts.

Admin API routes are protected centrally by admin authentication and role checks. Match cancellation refunds are controlled by `refund_on_cancel`; match deletion also avoids refunding a previously cancelled match twice.


## Player profile screen update (reference screenshots)
- Profile page now follows the supplied Games Club screenshots: navy profile header, circular avatar treatment, player name/contact/UID, editable display name, available wallet balance with Add action, match/referral/win summary, Account rows, Game Center leaderboard, More rows, version label, and logout.
- My Wallet and All Statements open the wallet/transaction history screen. Terms and Conditions opens the admin-managed Rules page. Developer Profile shows platform support information. Share App uses the Android share sheet.
- Profile API: `GET /api/profile/stats` and `PATCH /api/profile`. The stats endpoint calculates matches, published wins, prize total, and leaderboard from stored match/result data. Referral attribution and commission are handled by the referral endpoints and referral earnings ledger described in the Refer & Earn section above.


## Free Fire mode artwork

The Expo app includes ten bundled PNG thumbnails for Solo BR, Duo BR, Pro League, Survival, CS 4 vs 4, Clash Squad, Lone Wolf, CS Headshot, Lose 2 Win, and Free Match. They are used as local fallback artwork when an admin-managed mode does not supply its own image URL.


### Login and Home stability update

- Login/Register is sized for smaller Android screens and remains scrollable when the keyboard is open.
- Home data loading now handles optional API failures without rendering incomplete account data.
- Home YouTube cards open the configured HTTPS video link in the device browser/YouTube app, avoiding an embedded WebView on the initial Home screen.
- The unused `react-native-webview` dependency was removed from the Expo app.


## External database integration status

The owner intends to use a separately hosted database. The provider has not yet
been identified in the supplied project materials. This backend currently uses
synchronous `better-sqlite3`; setting a `DATABASE_URL` will have no effect. Do not
deploy financial production traffic until the provider-specific database migration
and transaction tests are completed. See `docs/DATABASE-CONNECTION-BLOCKER.md`.

## Environment files

- Backend: copy root `.env.example` to `.env` for local API development.
- Expo: copy `expo-app/.env.example` to `expo-app/.env`, or configure
  `EXPO_PUBLIC_API_URL` in EAS for remote builds.
- Never commit `.env`, database backups, service-role keys, database passwords,
  JWT secrets, or EAS signing credentials.
