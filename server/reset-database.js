
require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('./db');

async function resetDatabase() {
  try {
    // Safety confirmation
    if (process.env.CONFIRM_ZYROX_FULL_RESET !== 'YES') {
      throw new Error(
        'RESET BLOCKED: CONFIRM_ZYROX_FULL_RESET must be YES.'
      );
    }

    const adminEmail = String(process.env.ADMIN_EMAIL || '')
      .trim()
      .toLowerCase();

    const adminPassword = String(process.env.ADMIN_PASSWORD || '');

    const adminName = String(
      process.env.ADMIN_NAME || 'ZYROX ARENA Administrator'
    ).trim();

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL secret is missing.');
    }

    if (!adminEmail || !/^\S+@\S+\.\S+$/.test(adminEmail)) {
      throw new Error('A valid ADMIN_EMAIL is required.');
    }

    if (adminPassword.length < 12) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
    }

    console.log('Connecting to PostgreSQL...');

    // Create tables and ensure the latest schema exists.
    await db.init();

    console.log('Database connected. Starting full reset...');

    // Delete old application data atomically.
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

    console.log('Old database records removed.');

    // Recreate default games, modes, rules and settings.
    await db.init();

    console.log('Default games, modes, rules and settings recreated.');

    // Create a fresh admin account.
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const publicId = String(
      100000 + Math.floor(Math.random() * 900000)
    );

    const referralCode =
      'ZADMIN' + Date.now().toString(36).toUpperCase();

    await db.transaction(async tx => {
      const existing = await tx.one(
        'SELECT id FROM users WHERE lower(email)=?',
        [adminEmail]
      );

      if (existing) {
        throw new Error(
          'Admin email already exists after reset. Check database state.'
        );
      }

      const admin = await tx.one(
        `INSERT INTO users
          (name, email, password_hash, role, active, referral_code, public_id)
         VALUES (?, ?, ?, 'admin', TRUE, ?, ?)
         RETURNING id`,
        [
          adminName,
          adminEmail,
          passwordHash,
          referralCode,
          publicId
        ]
      );

      await tx.exec(
        `INSERT INTO wallets
          (user_id, balance, winning_balance)
         VALUES (?, 0, 0)`,
        [admin.id]
      );
    });

    // Verify the reset and admin account.
    const adminCheck = await db.one(
      `SELECT id, email, role, active
       FROM users
       WHERE lower(email)=?`,
      [adminEmail]
    );

    const gameCount = await db.one(
      'SELECT COUNT(*)::int AS total FROM games'
    );

    const modeCount = await db.one(
      'SELECT COUNT(*)::int AS total FROM modes'
    );

    const walletCheck = adminCheck
      ? await db.one(
          'SELECT balance, winning_balance FROM wallets WHERE user_id=?',
          [adminCheck.id]
        )
      : null;

    if (
      !adminCheck ||
      adminCheck.role !== 'admin' ||
      !adminCheck.active ||
      !walletCheck
    ) {
      throw new Error('Reset verification failed.');
    }

    console.log('------------------------------------');
    console.log('ZYROX ARENA DATABASE RESET SUCCESS');
    console.log('------------------------------------');
    console.log('Admin account: CREATED');
    console.log('Admin role: VERIFIED');
    console.log('Admin wallet: CREATED');
    console.log('Games:', gameCount.total);
    console.log('Modes:', modeCount.total);
    console.log('Default rules: RESTORED');
    console.log('Default settings: RESTORED');
    console.log('------------------------------------');

  } catch (error) {
    console.error('------------------------------------');
    console.error('ZYROX ARENA DATABASE RESET FAILED');
    console.error(error.stack || error.message);
    console.error('------------------------------------');

    process.exitCode = 1;

  } finally {
    await db.pool.end();
  }
}

resetDatabase();
        
