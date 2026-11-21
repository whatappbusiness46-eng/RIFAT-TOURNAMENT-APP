# Test status – ZYROX ARENA deployment preparation

Last checked: 2026-11-21 in the provided execution environment.

## Passed

- `node --check server/index.js`: PASS.
- `node --check server/db.js`: PASS.
- `node --check expo-app/App.js`: PASS.
- `node expo-app/scripts/syntax-check.js`: PASS (source-presence check only).
- JSON parsing for root `package.json`, `expo-app/package.json`, `expo-app/app.json`, and `expo-app/eas.json`: PASS.
- ZIP archive integrity: PASS after packaging.
- App API base URL now reads `expo.extra.apiUrl` from Expo config, with the previous service URL as fallback.
- Added Render Blueprint (`render.yaml`) and GitHub → Render → EAS instructions.

## Failed / blocked / not run

- Root `npm test`: FAIL in this environment because dependencies are not installed (`Cannot find module 'dotenv'`). This is an environment/dependency failure; it does not prove all server behavior works.
- Dependency installation: NOT COMPLETED. npm registry access timed out; npm cache is empty.
- `package-lock.json`: NOT GENERATED. No complete lockfile was fabricated.
- Backend runtime, SQLite migrations, API endpoint integration: NOT VERIFIED because `dotenv`, `better-sqlite3`, and other packages are not installed.
- Expo dependency install and `npx expo-doctor`: NOT RUN.
- Android export / EAS APK build: NOT RUN; requires dependency installation, network access, and the owner's Expo account.
- Real Android device / crash test: NOT RUN.
- GitHub push and Render deployment: NOT RUN; requires the owner's accounts and authorization.

## Important Render Free limitation

The backend currently uses a local SQLite file. The included free Render blueprint stores it under `/tmp`, which is ephemeral. Data can be lost after restarts or redeploys. This is demo-only; do not use for real-money transactions or important player balances/results. Durable production operation needs persistent storage or a tested migration to managed PostgreSQL.

See `docs/RENDER-FREE-LIMITATIONS.md` and `docs/DEPLOYMENT-GITHUB-RENDER-EXPO.md` before deploying.
