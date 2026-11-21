const fs=require('fs'); const path=require('path'); const Database=require('better-sqlite3');
const file=process.env.DATABASE_FILE||'./data/zyrox.sqlite'; fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});
const db=new Database(file); db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'player', phone TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP, active INTEGER DEFAULT 1, referral_code TEXT UNIQUE, referred_by INTEGER REFERENCES users(id));
CREATE TABLE IF NOT EXISTS wallets(user_id INTEGER PRIMARY KEY REFERENCES users(id), balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0));
CREATE TABLE IF NOT EXISTS games(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS modes(id INTEGER PRIMARY KEY, game_id INTEGER REFERENCES games(id) ON DELETE CASCADE, name TEXT NOT NULL, image_url TEXT DEFAULT '', is_free INTEGER DEFAULT 0, active INTEGER DEFAULT 1, UNIQUE(game_id,name));
CREATE TABLE IF NOT EXISTS home_videos(id INTEGER PRIMARY KEY, title TEXT NOT NULL, youtube_url TEXT NOT NULL, active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS matches(id INTEGER PRIMARY KEY, game_id INTEGER REFERENCES games(id), mode_id INTEGER REFERENCES modes(id), title TEXT NOT NULL, entry_fee INTEGER NOT NULL DEFAULT 0 CHECK(entry_fee>=0), prize_pool INTEGER NOT NULL DEFAULT 0 CHECK(prize_pool>=0), starts_at TEXT NOT NULL, player_limit INTEGER NOT NULL CHECK(player_limit>0), status TEXT NOT NULL DEFAULT 'upcoming', room_id TEXT, room_password TEXT, room_released INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS match_players(id INTEGER PRIMARY KEY, match_id INTEGER REFERENCES matches(id), user_id INTEGER REFERENCES users(id), joined_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(match_id,user_id));
CREATE TABLE IF NOT EXISTS transactions(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), type TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0), status TEXT NOT NULL DEFAULT 'pending', reference TEXT, note TEXT DEFAULT '', admin_id INTEGER REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP, processed_at TEXT);
CREATE TABLE IF NOT EXISTS results(id INTEGER PRIMARY KEY, match_id INTEGER REFERENCES matches(id), user_id INTEGER REFERENCES users(id), rank INTEGER NOT NULL, prize INTEGER NOT NULL DEFAULT 0, UNIQUE(match_id,user_id), UNIQUE(match_id,rank));
CREATE TABLE IF NOT EXISTS rules(id INTEGER PRIMARY KEY CHECK(id=1), content TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),title TEXT NOT NULL,message TEXT NOT NULL,read INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS referral_earnings(id INTEGER PRIMARY KEY, referrer_id INTEGER NOT NULL REFERENCES users(id), referred_user_id INTEGER NOT NULL REFERENCES users(id), match_id INTEGER NOT NULL REFERENCES matches(id), base_amount INTEGER NOT NULL, commission_percent REAL NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'credited', created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(referred_user_id,match_id));
`);
try{db.exec("ALTER TABLE modes ADD COLUMN image_url TEXT DEFAULT ''")}catch{}
try{db.exec("ALTER TABLE modes ADD COLUMN is_free INTEGER DEFAULT 0")}catch{}
try{db.exec("ALTER TABLE modes ADD COLUMN active INTEGER DEFAULT 1")}catch{}
try{db.exec("ALTER TABLE modes ADD COLUMN rules TEXT NOT NULL DEFAULT ''")}catch{}
// Seed blank match rules from each mode's admin-managed defaults (existing matches only).
db.exec("UPDATE matches SET rules=COALESCE((SELECT rules FROM modes WHERE modes.id=matches.mode_id), '') WHERE COALESCE(rules,'')=''");
// Referral migrations (safe to run on every startup).
for (const sql of ["ALTER TABLE users ADD COLUMN referral_code TEXT", "ALTER TABLE users ADD COLUMN referred_by INTEGER REFERENCES users(id)"]) { try { db.exec(sql); } catch (e) { if (!String(e.message).includes('duplicate column')) throw e; } }
// Tournament economy migrations (safe to run on every startup).
for (const sql of [
  "ALTER TABLE matches ADD COLUMN prize_mode TEXT NOT NULL DEFAULT 'fixed'",
  "ALTER TABLE matches ADD COLUMN platform_fee_percent REAL NOT NULL DEFAULT 0",
  "ALTER TABLE matches ADD COLUMN kill_reward INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE matches ADD COLUMN prize_split_json TEXT NOT NULL DEFAULT '[50,30,20]'",
  "ALTER TABLE matches ADD COLUMN refund_on_cancel INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE matches ADD COLUMN payouts_published INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE matches ADD COLUMN rules TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE results ADD COLUMN kills INTEGER NOT NULL DEFAULT 0"
]) { try { db.exec(sql); } catch (e) { if (!String(e.message).includes('duplicate column')) throw e; } }

const games=[['Ludo',['Classic','Quick','Tournament']],['PUBG/BGMI',['BR Solo','BR Duo','BR Squad']],['Free Fire',['BR Solo','BR Duo','BR Squad','Clash Squad','Survival','CS 4 VS 4','Lone Wolf','CS Headshot','Lose 2 Win','Free Match']],['Other',['Custom']]];
for(const [name,modes] of games){let g=db.prepare('INSERT OR IGNORE INTO games(name) VALUES(?)').run(name);let id=db.prepare('SELECT id FROM games WHERE name=?').get(name).id; for(const m of modes)db.prepare('INSERT OR IGNORE INTO modes(game_id,name) VALUES(?,?)').run(id,m);}
db.prepare('INSERT OR IGNORE INTO rules(id,content) VALUES(1,?)').run('1. Be respectful to all players.\n2. Join before the match starts.\n3. Do not use cheats or exploits.\n4. Admin decisions are final.');
for(const [k,v] of [['app_name','ZYROX ARENA'],['support_contact','support@zyroxarena.local'],['deposit_instructions','Send payment manually and submit your transaction reference. Admin approval is required.'],['withdrawal_minimum','50'],['referral_enabled','true'],['referral_commission_percent','1'],['referral_bonus','0']]) db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').run(k,v);
module.exports=db;

db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)');
// Backfill stable referral codes for existing accounts.
for (const u of db.prepare('SELECT id FROM users WHERE referral_code IS NULL OR referral_code=\'\'').all()) { const code='Z'+String(u.id).padStart(7,'0'); db.prepare('UPDATE users SET referral_code=? WHERE id=?').run(code,u.id); }
