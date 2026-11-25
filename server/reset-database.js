require('dotenv').config();

// DANGEROUS: permanently deletes all application data in DATABASE_URL.
// This script is NEVER run by the server at startup.
const db = require('./db');

(async () => {
  if (process.env.CONFIRM_ZYROX_FULL_RESET !== 'YES') {
    throw new Error('Blocked. Set CONFIRM_ZYROX_FULL_RESET=YES to confirm the FULL database wipe.');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  try {
    // Ensure the expected application schema exists before truncating known app tables.
    await db.init();

    await db.transaction(async tx => {
      await tx.exec(`TRUNCATE TABLE
        referral_earnings,
        results,
        notifications,
        transactions,
        match_players,
        matches,
        wallets,
        users,
        home_videos,
        rules,
        settings,
        modes,
        games
        RESTART IDENTITY CASCADE`);
    });

    // Recreate default games, modes, rules and settings after the wipe.
    await db.init();
    console.log('Full database reset completed and default app data recreated.');
    console.log('Next run: npm run seed:tournaments');
  } finally {
    await db.pool.end();
  }
})().catch(err => {
  console.error('FULL RESET FAILED:', err.message);
  process.exitCode = 1;
});
