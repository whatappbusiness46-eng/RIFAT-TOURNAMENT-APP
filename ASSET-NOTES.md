# ZYROX ARENA visual assets

Required launcher/game art:
- `expo-app/assets/zyrox-app-icon.png` — app launcher/adaptive icon and brand.
- `expo-app/assets/free-fire-icon.png` — Free Fire game art.
- `expo-app/assets/ludo-icon.png` — Ludo game art.
- `expo-app/assets/pubg-bgmi-icon.png` and `more-games-icon.png` — retained because the current app's fallback game-art mapping still references them.

Free Fire mode thumbnails (10 separate local PNG files):
- `solo-br-match.png`
- `duo-br-match.png`
- `pro-league.png`
- `survival.png`
- `cs-4-vs-4.png`
- `clash-squad.png`
- `lone-wolf.png`
- `cs-headshot.png`
- `lose-2-win.png`
- `free-match.png`

Mode thumbnails are selected by normalized mode name when the server mode has no custom `image_url`. A server-provided `image_url` continues to take precedence.
