require('dotenv').config();
// One-time, idempotent ZYROX ARENA tournament seeder.
// Run with DATABASE_URL set: node server/seed-tournaments.js
const db = require('./db');

const SERIES = [
  { mode: 'BR Solo', variants: [
    { fee: 5, pool: 200, slots: 48, kill: 3, split: [49,37,26,12,6] },
    { fee: 10, pool: 400, slots: 48, kill: 6, split: [70,60,50,30,20] }
  ]},
  { mode: 'BR Duo', variants: [
    { fee: 10, pool: 400, slots: 48, kill: 6, split: [120,85,55] },
    { fee: 20, pool: 800, slots: 48, kill: 12, split: [240,170,110] }
  ]},
  { mode: 'CS Headshot', variants: [
    { fee: 35, pool: 100, slots: 4, kill: 0, split: [] },
    { fee: 35, pool: 200, slots: 8, kill: 0, split: [] }
  ]},
  { mode: 'CS 4 VS 4', variants: [
    { fee: 35, pool: 100, slots: 8, kill: 0, split: [] },
    { fee: 35, pool: 100, slots: 8, kill: 0, split: [] }
  ]},
  { mode: 'Clash Squad', variants: [
    { fee: 35, pool: 100, slots: 4, kill: 0, split: [] },
    { fee: 35, pool: 200, slots: 8, kill: 0, split: [] }
  ]},
  { mode: 'Lone Wolf', variants: [
    { fee: 35, pool: 110, slots: 4, kill: 0, split: [] },
    { fee: 85, pool: 310, slots: 4, kill: 0, split: [] }
  ]},
  { mode: 'Lose 2 Win', variants: [
    { fee: 80, pool: 110, slots: 2, kill: 0, split: [] },
    { fee: 80, pool: 110, slots: 2, kill: 0, split: [] }
  ]},
  { mode: 'Free Match', variants: [
    { fee: 0, pool: 100, slots: 1000, kill: 0, split: [5,5,5,5,5,5,5,5,5,5] },
    { fee: 0, pool: 200, slots: 2000, kill: 0, split: [5,5,5,5,5,5,5,5,5,5] }
  ]},
  { mode: 'Survival', variants: [
    { fee: 8, pool: 300, slots: 48, kill: 0, split: [40,37,33,30,27,23,20,17,13] },
    { fee: 8, pool: 300, slots: 48, kill: 0, split: [40,37,33,30,27,23,20,17,13] }
  ]},
  { mode: 'Squad Scrim', variants: [
    { fee: 6, pool: 220, slots: 4, kill: 0, split: [79,62,23,12] },
    { fee: 6, pool: 220, slots: 4, kill: 0, split: [79,62,23,12] }
  ]}
];

const MATCH_RULES = [
  '1. Match room ID and password will be shared before the match starts.',
  '2. Join the room on time using the correct in-game name.',
  '3. Do not use hacks, cheats, teaming, or any unfair advantage.',
  '4. A player who joins the wrong room or misses the match may be disqualified.',
  '5. Submit valid result evidence if requested by the admins.',
  '6. Prize distribution follows the match prize settings after admin verification.',
  '7. Admin decisions are final for disputes and rule violations.'
].join('\n');

function assertBudget(v) {
  const net = v.pool - Math.floor(v.pool * 0.20);
  const rankTotal = v.split.reduce((a, n) => a + n, 0);
  const killReserve = v.kill * 10;
  if (rankTotal + killReserve > net) {
    throw new Error(`Prize budget invalid: pool ${v.pool}, net ${net}, rank ${rankTotal}, kill reserve ${killReserve}`);
  }
}

(async () => {
  try {
    await db.init();
    const game = await db.one("SELECT id FROM games WHERE name='Free Fire'");
    if (!game) throw new Error('Free Fire game not found after database initialization');

    const plan = [];
    for (const series of SERIES) {
      let mode = await db.one('SELECT id FROM modes WHERE game_id=? AND lower(name)=lower(?)', [game.id, series.mode]);
      if (!mode) mode = await db.one('INSERT INTO modes(game_id,name) VALUES(?,?) RETURNING id', [game.id, series.mode]);
      for (let i = 0; i < 20; i++) {
        const variant = series.variants[Math.floor(i / 10)];
        assertBudget(variant);
        plan.push({ series: series.mode, modeId: mode.id, variant, ordinal: i + 1 });
      }
    }

    // Keep original fees/prize settings; only sort matches so identical fees are adjacent.
    plan.sort((a, b) => Number(a.variant.fee) - Number(b.variant.fee));
    const feeCounts = new Map();
    for (const p of plan) feeCounts.set(p.variant.fee, (feeCounts.get(p.variant.fee) || 0) + 1);
    for (const [fee, count] of feeCounts) {
      if (count % 2 !== 0) throw new Error(`Entry fee ৳${fee} has ${count} matches; expected an even count for fee-pairs.`);
    }

    const existing = await db.one("SELECT COUNT(*)::int n FROM matches WHERE title LIKE 'ZYROX AUTO 2026-%'");
    if (Number(existing.n) > 0) {
      console.log(`Seeder skipped: ${existing.n} ZYROX AUTO matches already exist. No duplicates created.`);
      return;
    }

    const start = new Date('2026-11-26T08:00:00+06:00');
    await db.transaction(async tx => {
      for (let i = 0; i < plan.length; i++) {
        const p = plan[i];
        const at = new Date(start.getTime() + i * 30 * 60 * 1000);
        const v = p.variant;
        const title = `ZYROX AUTO 2026-${p.series} #${String(p.ordinal).padStart(2,'0')} · Entry ৳${v.fee}`;
        await tx.exec(`INSERT INTO matches(game_id,mode_id,title,entry_fee,prize_pool,starts_at,player_limit,prize_mode,platform_fee_percent,kill_reward,prize_split_json,refund_on_cancel,rules)
          VALUES(?,?,?,?,?,?::timestamptz,?,'fixed',20,?,?,TRUE,?)`,
          [game.id,p.modeId,title,v.fee,v.pool,at.toISOString(),v.slots,v.kill,JSON.stringify(v.split),MATCH_RULES]);
      }
    });
    console.log(`Successfully created ${plan.length} matches (20 per each of ${SERIES.length} modes).`);
    console.log('Matches are sorted into adjacent pairs by identical entry fee; original fees and prize settings are preserved.');
    console.log('Every match has Rules & Regulations.');
    console.log('Schedule: 26 Nov 2026, 08:00 Bangladesh time, then every 30 minutes.');
  } catch (err) {
    console.error('Tournament seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
})();
