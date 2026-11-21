# UI compacting and rules update

- Player and admin screens after login use more compact spacing, typography, cards, profile header, and navigation to reduce oversized layouts on phones. Login/register sizing is intentionally unchanged.
- Admin > Games & Modes > Edit Mode Card now includes default Rules & Regulations for that mode (for example BR Solo, BR Duo, BR Squad, Clash Squad, Survival, CS 4 VS 4, Lone Wolf, CS Headshot, Lose 2 Win, Free Match, and any other configured mode).
- Creating a match copies the selected mode's default rules when the match-specific rules field is blank. Admin > Matches > Edit Match can override rules for one tournament without changing the mode default.
- Existing matches with blank rules are backfilled from their mode's default rules at server startup. Existing non-empty match rules are preserved.
- Players see the rules attached to the specific match when opening VIEW MATCH.

Validation performed: backend JavaScript syntax, Expo JSX syntax, static asset references, and ZIP integrity. A live server run, APK build, and physical-device layout test have not yet been performed.
