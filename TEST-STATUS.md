# Zyrox Arena – crash fix verification

## Source-level root cause found
After successful login, `setToken()` caused a render immediately. The authenticated home screen accessed `me.name` before the asynchronous `/api/me` request in `load()` had completed and set `me`. Since `me` was initially `null`, this could throw a JavaScript TypeError during the first authenticated render and terminate the app.

## Fixes applied
- Resolve `/api/me` first and set the authenticated user before loading dashboard data.
- Added an authenticated loading/error screen so the app never renders player/admin screens while `me` is null.
- Added Retry and Back to Login actions when the initial account request fails.
- Changed secondary dashboard requests to `Promise.allSettled`; a failed optional endpoint no longer blocks the entire authenticated screen.
- API base URL now reads `expo.extra.apiUrl`, with the previous Render URL as fallback.

## Checks
- `node --check expo-app/App.js`: to be run during packaging.
- `node --check server/index.js` and `server/db.js`: source syntax checks only.
- Android build, physical-device crash reproduction, backend runtime, and API integration remain unverified in this environment because dependencies/network and device access are unavailable.

The null-user render is a source-confirmed crash path matching the supplied recording's login-then-exit behavior. The fix addresses that path, but cannot guarantee no other crash exists until a new APK is installed and tested on the user's phone.
