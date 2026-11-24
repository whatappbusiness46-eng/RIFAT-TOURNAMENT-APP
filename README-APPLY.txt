ZYROX ARENA — EDITED FILES ONLY

Replace these files in your existing project, keeping the same folder paths:
- expo-app/App.js
- server/index.js
- server/db.js

Then commit/push to GitHub and redeploy the Render backend. The database migration adds image_url and click_url to home_videos automatically at server startup.

Admin > Home Videos: add one item per banner using:
1) Image HTTPS URL
2) Click HTTPS URL (any HTTPS destination, including YouTube)
3) Title and display order

Add 2–3 entries (or more). Home displays them as an auto-scrolling image carousel; tapping an image opens its configured URL.

The local match reminder text is Bengali and includes password 11, plus instruction to open the app to see Room ID. Local notifications still require permission and a future match start time.

Checks: npm run check PASS. npm test integration test SKIPPED because TEST_DATABASE_URL was not supplied. Live Render/database/APK tests have not been run.
