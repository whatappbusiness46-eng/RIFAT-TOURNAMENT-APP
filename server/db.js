const { Pool, types } = require('pg');
// Preserve integer-valued API fields previously returned by SQLite.
types.setTypeParser(20, value => Number(value));
types.setTypeParser(1700, value => Number(value));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Set the Supabase Session Pooler connection string in the server environment.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  application_name: 'zyrox-arena-api'
});

pool.on('error', err => console.error('Unexpected PostgreSQL pool error:', err));

// Convert SQLite-style question marks to PostgreSQL $n placeholders.
function sql(text) {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}
async function one(text, params = []) {
  const r = await pool.query(sql(text), params);
  return r.rows[0] || null;
}
async function many(text, params = []) {
  const r = await pool.query(sql(text), params);
  return r.rows;
}
async function exec(text, params = []) {
  return pool.query(sql(text), params);
}
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      one: async (text, params = []) => (await client.query(sql(text), params)).rows[0] || null,
      many: async (text, params = []) => (await client.query(sql(text), params)).rows,
      exec: async (text, params = []) => client.query(sql(text), params)
    };
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { console.error('PostgreSQL rollback failed:', rollbackError); }
    throw err;
  } finally {
    client.release();
  }
}

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'player', phone TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), active BOOLEAN NOT NULL DEFAULT TRUE,
      referral_code TEXT UNIQUE, referred_by BIGINT REFERENCES users(id), public_id TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS wallets (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0)
    );
    CREATE TABLE IF NOT EXISTS games (
      id BIGSERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS modes (
      id BIGSERIAL PRIMARY KEY, game_id BIGINT REFERENCES games(id) ON DELETE CASCADE,
      name TEXT NOT NULL, image_url TEXT DEFAULT '', is_free BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE, rules TEXT NOT NULL DEFAULT '',
      UNIQUE(game_id, name)
    );
    CREATE TABLE IF NOT EXISTS home_videos (
      id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, youtube_url TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS matches (
      id BIGSERIAL PRIMARY KEY, game_id BIGINT REFERENCES games(id), mode_id BIGINT REFERENCES modes(id),
      title TEXT NOT NULL, entry_fee BIGINT NOT NULL DEFAULT 0 CHECK(entry_fee >= 0),
      prize_pool BIGINT NOT NULL DEFAULT 0 CHECK(prize_pool >= 0), starts_at TIMESTAMPTZ NOT NULL,
      player_limit INTEGER NOT NULL CHECK(player_limit > 0), status TEXT NOT NULL DEFAULT 'upcoming',
      room_id TEXT, room_password TEXT, room_released BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), rules TEXT NOT NULL DEFAULT '',
      prize_mode TEXT NOT NULL DEFAULT 'fixed', platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
      kill_reward BIGINT NOT NULL DEFAULT 0, prize_split_json TEXT NOT NULL DEFAULT '[50,30,20]',
      refund_on_cancel BOOLEAN NOT NULL DEFAULT TRUE, payouts_published BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS match_players (
      id BIGSERIAL PRIMARY KEY, match_id BIGINT REFERENCES matches(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id), joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), game_name_1 TEXT NOT NULL DEFAULT '', game_name_2 TEXT NOT NULL DEFAULT '',
      UNIQUE(match_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), type TEXT NOT NULL,
      amount BIGINT NOT NULL CHECK(amount > 0), status TEXT NOT NULL DEFAULT 'pending',
      reference TEXT, note TEXT DEFAULT '', admin_id BIGINT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ, sender_number TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS results (
      id BIGSERIAL PRIMARY KEY, match_id BIGINT REFERENCES matches(id), user_id BIGINT REFERENCES users(id),
      rank INTEGER NOT NULL, prize BIGINT NOT NULL DEFAULT 0, kills INTEGER NOT NULL DEFAULT 0,
      UNIQUE(match_id,user_id), UNIQUE(match_id,rank)
    );
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY CHECK(id=1), content TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), title TEXT NOT NULL,
      message TEXT NOT NULL, read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS referral_earnings (
      id BIGSERIAL PRIMARY KEY, referrer_id BIGINT NOT NULL REFERENCES users(id),
      referred_user_id BIGINT NOT NULL REFERENCES users(id), match_id BIGINT NOT NULL REFERENCES matches(id),
      base_amount BIGINT NOT NULL, commission_percent NUMERIC(5,2) NOT NULL,
      amount BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'credited',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(referred_user_id,match_id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_reference_once
      ON transactions(user_id, reference) WHERE type='deposit' AND reference IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prize_reference_once
      ON transactions(reference) WHERE type='prize' AND reference IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_matches_status_start ON matches(status, starts_at);
    CREATE INDEX IF NOT EXISTS idx_match_players_user ON match_players(user_id, match_id);
    CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings(referrer_id, created_at DESC);
  `);

  await pool.query(`ALTER TABLE match_players ADD COLUMN IF NOT EXISTS game_name_1 TEXT NOT NULL DEFAULT ''; ALTER TABLE match_players ADD COLUMN IF NOT EXISTS game_name_2 TEXT NOT NULL DEFAULT ''; ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sender_number TEXT NOT NULL DEFAULT '';`);

  const games = [
    ['Ludo', ['Classic','Quick','Tournament']],
    ['Free Fire', ['BR Solo','BR Duo','BR Squad','Clash Squad','Survival','CS 4 VS 4','Lone Wolf','CS Headshot','Lose 2 Win','Free Match']]
  ];
  for (const [name, modes] of games) {
    const g = await one('INSERT INTO games(name) VALUES(?) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING id', [name]);
    for (const mode of modes) {
      await exec('INSERT INTO modes(game_id,name) VALUES(?,?) ON CONFLICT(game_id,name) DO NOTHING', [g.id, mode]);
    }
  }
  await exec(`INSERT INTO rules(id,content) VALUES(1,?)
    ON CONFLICT(id) DO NOTHING`, ['1. Be respectful to all players.\n2. Join before the match starts.\n3. Do not use cheats or exploits.\n4. Admin decisions are final.']);
  const defaults = [
    ['app_name','ZYROX ARENA'],['support_contact','@bdsupportzyrox01'],
    ['payment_method','1. Nagad / 2. bKash'],['payment_account','1. 01730649062 / 2. 01742166737'],
    ['deposit_instructions','Send payment manually and submit your transaction reference. Admin approval is required.'],
    ['withdrawal_minimum','50'],['referral_enabled','true'],['referral_commission_percent','1'],['referral_bonus','0']
  ];
  for (const [key,value] of defaults) await exec('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING',[key,value]);

  const missing = await many("SELECT id FROM users WHERE public_id IS NULL OR public_id=''");
  for (const u of missing) {
    let publicId;
    for (let tries=0; tries<100; tries++) {
      const candidate = String(100000 + Math.floor(Math.random()*900000));
      if (!(await one('SELECT 1 FROM users WHERE public_id=?',[candidate]))) { publicId=candidate; break; }
    }
    if (!publicId) throw new Error('Unable to generate a unique public user ID');
    await exec('UPDATE users SET public_id=? WHERE id=?',[publicId,u.id]);
  }
  const noReferral = await many("SELECT id FROM users WHERE referral_code IS NULL OR referral_code=''");
  for (const u of noReferral) await exec('UPDATE users SET referral_code=? WHERE id=?',['Z'+String(u.id).padStart(7,'0'),u.id]);
}

module.exports = { pool, one, many, exec, transaction, init };
