# UI compacting and rules update

- Player and admin screens after login use more compact spacing, typography, cards, profile header, and navigation to reduce oversized layouts on phones. Login/register sizing is intentionally unchanged.
- Admin > Games & Modes > Edit Mode Card now includes default Rules & Regulations for that mode (for example BR Solo, BR Duo, BR Squad, Clash Squad, Survival, CS 4 VS 4, Lone Wolf, CS Headshot, Lose 2 Win, Free Match, and any other configured mode).
- Creating a match copies the selected mode's default rules when the match-specific rules field is blank. Admin > Matches > Edit Match can override rules for one tournament without changing the mode default.
- Existing matches with blank rules are backfilled from their mode's default rules at server startup. Existing non-empty match rules are preserved.
- Players see the rules attached to the specific match when opening VIEW MATCH.

Validation performed: backend JavaScript syntax, Expo JSX syntax, static asset references, and ZIP integrity. A live server run, APK build, and physical-device layout test have not yet been performed.


## Follow-up repair (2026-11-22)

- Fixed SQLite startup migration order: `matches.rules` is added before the backfill query references it. This prevents `SqliteError: no such column: rules` on fresh and existing databases.
- Added Admin mode-card editing for default per-mode rules; those rules are stored on the mode and used as the default for newly created matches. Per-match rules remain separately editable.
- Compactened logged-in content cards and profile layout, reduced profile hero/avatar/rows, and removed horizontal profile bleed. Login/register sizing is intentionally unchanged.
- These are source-level/static checks; device-specific visual verification still requires running the APK on actual phone sizes.

## Home screen compact layout update — 2026-11-22

- Reworked the Home screen game-mode cards into a compact two-column grid for narrow phone screens.
- Reduced Home mode image height, card padding, labels, section spacing, and Home support/filter controls.
- Kept the login/register screen sizing unchanged; the compact sizing applies to the signed-in Home screen.
- Expo syntax and static asset-reference checks pass. Actual Android device visual testing is still required to confirm the layout on the user's handset.


## 2026-11-22 — Compact all post-login screens

- Reduced typography, spacing, card padding, button dimensions, and common layout sizes across the authenticated app stylesheet, including player tabs and admin screens.
- Preserved Login/Register sizing so the signed-out screens do not become too small.
- Kept the compact Home mode grid and the existing backend/rules changes.
- Static syntax and asset validation is required before release; real-device visual verification remains outstanding.
