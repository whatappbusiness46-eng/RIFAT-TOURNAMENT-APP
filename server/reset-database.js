
require('dotenv').config();

// DESTRUCTIVE: This script permanently resets production database.
// Never import this file from the normal server startup.

const bcrypt = require('bcryptjs');
const db = require('./db');

(async () => {
  if (process.env.CONFIRM_ZYROX_FULL_RESET !== 'YES') {
    throw new Error('Reset blocked: confirmation is missing.');
  }

  const adminEmail = String(process.env.ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();

  const adminPassword = String(process.env.ADMIN_PASSWORD || '');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  if (!adminEmail || adminPassword.length < 12) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) are required.'
    );
  }

  try {
    await db.init();

    await db.transaction(async tx => {
      await tx.exec(`
        TRUNCATE TABLE
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
        RESTART IDENTITY CASCADE
      `);
    });

    // Recreate database defaults/schema.
    await db.init();

    const hash = await bcrypt.hash(adminPassword, 12);

    const publicId = String(
      100000 + Math.floor(Math.random() * 900000)
    );

    const referralCode =
      'ZADMIN' + Date.now().toString(36).toUpperCase();

    await db.transaction(async tx => {
      const user = await tx.one(
        `INSERT INTO users
          (name, email, password_hash, role, referral_code, public_id)
         VALUES (?, ?, ?, 'admin', ?, ?)
         RETURNING id`,
        [
          process.env.ADMIN_NAME || 'Administrator',
          adminEmail,
          hash,
          referralCode,
          publicId
        ]
      );

      await tx.exec(
        `INSERT INTO wallets
          (user_id, balance, winning_balance)
         VALUES (?, 0, 0)`,
        [user.id]
      );
    });

    console.log('Full database reset completed.');
    console.log('Default games, modes, rules and settings recreated.');
    console.log('Admin account recreated successfully.');
  } finally {
    await db.pool.end();
  }
})().catch(err => {
  console.error('FULL RESET FAILED:', err.message);
  process.exitCode = 1;
});
  
