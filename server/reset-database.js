require('dotenv').config();

// DESTRUCTIVE, one-time production reset. Never import this from the server startup.
const bcrypt = require('bcryptjs');
const db = require('./db');

(async () => {
  if (process.env.CONFIRM_ZYROX_FULL_RESET !== 'YES') {
    throw new Error('Blocked: set CONFIRM_ZYROX_FULL_RESET=YES to authorize the full database wipe.');
  }

  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (!adminEmail || adminPassword.length < 12) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) are required to recreate the admin after reset.');
  }

  try {
    await db.init();

    await db.transaction(async tx => {
      await tx.exec(`TRUNCATE TABLE
        referral_earnings, results, notifications, transactions,
        match_players, matches, wallets, users, home_videos,
        rules, settings, modes, games
        RESTART IDENTITY CASCADE`);
    });

    // Recreate schema defaults and then restore the admin account from GitHub Actions secrets.
    await db.init();
    const hash = await bcrypt.hash(adminPassword, 12);
    const publicId = String(100000 + Math.floor(Math.random() * 900000));
    const referralCode = 'ZADMIN' + Date.now().toString(36).toUpperCase();

    await db.transaction(async tx => {
      const user = await tx.one(
        `INSERT INTO users(name,email,password_hash,role,referral_code,public_id)
         VALUES(?,?,?,'admin',?,?) RETURNING id`,
        [process.env.ADMIN_NAME || 'Administrator', adminEmail, hash, referralCode, publicId]
      );
      await tx.exec('INSERT INTO wallets(user_id,balance,winning_balance) VALUES(?,0,0)', [user.id]);
    });

    console.log('Full database reset completed.');
    console.log('Default games, modes, rules and settings recreated.');
    console.log('Admin account recreated from GitHub Actions secrets.');
    console.log('Next step: seed-tournaments workflow step will create the 200 matches.');
  } finally {
    await db.pool.end();
  }
})().catch(err => {
  console.error('FULL RESET FAILED:', err.message);
  process.exitCode = 1;
});
