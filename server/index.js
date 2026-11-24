require('dotenv').config();
const express=require('express'),cors=require('cors'),helmet=require('helmet'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken');
const db=require('./db');
const app=express();
app.use(helmet({contentSecurityPolicy:false}));
const allowedOrigins=String(process.env.CORS_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
app.use(cors({origin:(origin,cb)=>!origin||allowedOrigins.includes(origin)?cb(null,true):cb(new Error('Origin not allowed by CORS'))}));
app.use(express.json({limit:'1mb'}));
const SECRET=process.env.JWT_SECRET;
if(!SECRET||SECRET.length<32) throw new Error('JWT_SECRET must be at least 32 characters');
const tokenFor=u=>jwt.sign({id:u.id,role:u.role},SECRET,{expiresIn:'12h'});
const integer=(v,label,min=0)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<min)throw Object.assign(new Error(`${label} is invalid`),{status:400});return n;};
const wrap=fn=>(req,res)=>Promise.resolve().then(()=>fn(req,res)).catch(e=>{console.error(e);if(!res.headersSent)res.status(e.status||400).json({error:e.message||'Request failed'});});
async function auth(req,res,next){
  try{
    const h=req.headers.authorization||'',p=jwt.verify(h.replace(/^Bearer\s+/i,''),SECRET);
    const u=await db.one('SELECT id,name,email,phone,role,active FROM users WHERE id=?',[p.id]);
    if(!u||!u.active)return res.status(401).json({error:'Account unavailable'});
    req.user=u;next();
  }catch{return res.status(401).json({error:'Authentication required'});}
}
const admin=(req,res,next)=>req.user?.role==='admin'?next():res.status(403).json({error:'Admin access required'});
const setting=async key=>(await db.one('SELECT value FROM settings WHERE key=?',[key]))?.value||'';

async function start(){
  await db.init();
  const adminEmail=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
  if(adminEmail){
    const existing=await db.one('SELECT id,role FROM users WHERE email=?',[adminEmail]);
    if(existing&&existing.role!=='admin')throw new Error('ADMIN_EMAIL belongs to a non-admin account. Use a dedicated unused admin email.');
    if(!existing){
      const password=process.env.ADMIN_PASSWORD||'';
      if(password.length<12)throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) before first startup');
      await db.transaction(async tx=>{
        const hash=await bcrypt.hash(password,12);
        const u=await tx.one("INSERT INTO users(name,email,password_hash,role,referral_code,public_id) VALUES(?,?,?,'admin',?,?) RETURNING id",
          [process.env.ADMIN_NAME||'Administrator',adminEmail,hash,'ZADMIN'+Date.now().toString(36).toUpperCase(),String(100000+Math.floor(Math.random()*900000))]);
        await tx.exec('INSERT INTO wallets(user_id,balance) VALUES(?,0)',[u.id]);
      });
    }
  } else if(!(await db.one("SELECT id FROM users WHERE role='admin' LIMIT 1"))){
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before first startup');
  }

  app.get('/api/health',(q,s)=>s.json({ok:true,app:'ZYROX ARENA'}));
  app.get('/join',wrap(async(q,s)=>{
    const code=String(q.query.ref||'').trim().toUpperCase();
    if(!/^[A-Z0-9]{4,12}$/.test(code))throw new Error('Invalid referral code');
    const deep='zyroxarena://register?ref='+encodeURIComponent(code);
    s.type('html').send(`<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1"><title>Join ZYROX ARENA</title><style>body{margin:0;background:#07111f;color:#f4f8ff;font:16px Arial;display:grid;place-items:center;min-height:100vh}.card{background:#101d30;padding:28px;border-radius:20px;text-align:center;max-width:340px}a{display:block;background:#00d5e9;color:#07111f;padding:15px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:18px}.code{font-size:28px;color:#00d5e9;letter-spacing:3px}</style></head><body><div class=card><h2>ZYROX ARENA</h2><p>Your referral code</p><div class=code>${code}</div><a href="${deep}">OPEN ZYROX ARENA</a><p>If the app does not open, enter this code during registration.</p></div><script>setTimeout(()=>{location.href=${JSON.stringify(deep)}},700)</script></body></html>`);
  }));

  app.post('/api/auth/register',wrap(async(q,s)=>{
    const {name,password}=q.body,rawEmail=String(q.body.email||'').trim().toLowerCase(),phone=String(q.body.phone||'').replace(/[\s()-]/g,'');
    if(!name||(!rawEmail&&!phone)||(rawEmail&&!/^\S+@\S+\.\S+$/.test(rawEmail))||(phone&&!/^\+?[0-9]{8,15}$/.test(phone))||!password||password.length<8)
      throw Object.assign(new Error('Name, valid email or phone number, and password (8+ characters) required'),{status:400});
    const email=rawEmail||`${phone.replace('+','')}@phone.zyrox.invalid`;
    const duplicate=await db.one(rawEmail&&phone?'SELECT id FROM users WHERE email=? OR phone=?':rawEmail?'SELECT id FROM users WHERE email=?':'SELECT id FROM users WHERE phone=?',rawEmail&&phone?[email,phone]:[rawEmail?email:phone]);
    if(duplicate)throw Object.assign(new Error('This email or phone number is already registered'),{status:409});
    const refCode=String(q.body.referral_code||'').trim().toUpperCase();
    const referrer=refCode?await db.one('SELECT id FROM users WHERE referral_code=? AND active=TRUE',[refCode]):null;
    if(refCode&&!referrer)throw new Error('Invalid referral code');
    const hash=await bcrypt.hash(password,12);
    const u=await db.transaction(async tx=>{
      const publicId=String(100000+Math.floor(Math.random()*900000));
      const code='Z'+Math.random().toString(36).slice(2,9).toUpperCase();
      const created=await tx.one('INSERT INTO users(name,email,password_hash,phone,referral_code,referred_by,public_id) VALUES(?,?,?,?,?,?,?) RETURNING id',
        [String(name).trim(),email,hash,phone,code,referrer?.id||null,publicId]);
      await tx.exec('INSERT INTO wallets(user_id,balance) VALUES(?,0)',[created.id]);
      return tx.one('SELECT id,public_id,name,email,phone,role,referral_code FROM users WHERE id=?',[created.id]);
    });
    if(!rawEmail)u.email=null;
    s.status(201).json({token:tokenFor(u),user:u});
  }));
  app.post('/api/auth/login',wrap(async(q,s)=>{
    const identifier=String(q.body.identifier||q.body.email||q.body.phone||'').trim().toLowerCase();
    const u=await db.one('SELECT * FROM users WHERE lower(email)=? OR phone=?',[identifier,identifier]);
    if(!u||!await bcrypt.compare(q.body.password||'',u.password_hash)||!u.active)throw Object.assign(new Error('Invalid email/phone or password'),{status:401});
    const safe={id:u.id,public_id:u.public_id,name:u.name,email:u.email&&u.email.endsWith('@phone.zyrox.invalid')?null:u.email,phone:u.phone,role:u.role};
    s.json({token:tokenFor(safe),user:safe});
  }));
  app.get('/api/me',auth,wrap(async(q,s)=>{
    const [u,w]=await Promise.all([db.one('SELECT public_id FROM users WHERE id=?',[q.user.id]),db.one('SELECT balance FROM wallets WHERE user_id=?',[q.user.id])]);
    s.json({...q.user,public_id:u?.public_id,email:q.user.email?.endsWith('@phone.zyrox.invalid')?null:q.user.email,
      payment_method:await setting('payment_method'),payment_account:await setting('payment_account'),
      deposit_instructions:await setting('deposit_instructions'),wallet:w?.balance||0,support_contact:await setting('support_contact')});
  }));
  app.patch('/api/profile',auth,wrap(async(q,s)=>{const name=String(q.body.name||'').trim();if(name.length<2||name.length>40)throw new Error('Name must be 2-40 characters');await db.exec('UPDATE users SET name=? WHERE id=?',[name,q.user.id]);s.json({ok:true,name});}));
  app.get('/api/profile/stats',auth,wrap(async(q,s)=>{
    const [matches,wins,total,referrals,leaderboard]=await Promise.all([
      db.one('SELECT COUNT(*)::int n FROM match_players WHERE user_id=?',[q.user.id]),
      db.one('SELECT COUNT(*)::int n FROM results WHERE user_id=? AND rank=1',[q.user.id]),
      db.one('SELECT COALESCE(SUM(prize),0)::bigint n FROM results WHERE user_id=?',[q.user.id]),
      db.one('SELECT COUNT(*)::int n FROM users WHERE referred_by=?',[q.user.id]),
      db.many('SELECT u.name,SUM(r.prize)::bigint prizes FROM results r JOIN users u ON u.id=r.user_id GROUP BY r.user_id,u.name ORDER BY prizes DESC LIMIT 20')
    ]);
    s.json({matches:matches.n,referrals:referrals.n,winnings:wins.n,winning_balance:total.n,leaderboard});
  }));
  app.get('/api/referrals/me',auth,wrap(async(q,s)=>{
    const [u,totals,monthly,recent]=await Promise.all([
      db.one('SELECT referral_code FROM users WHERE id=?',[q.user.id]),
      db.one("SELECT (SELECT COUNT(*)::int FROM users WHERE referred_by=?) referrals,COALESCE(SUM(amount),0)::bigint earned FROM referral_earnings WHERE referrer_id=? AND status='credited'",[q.user.id,q.user.id]),
      db.one("SELECT COALESCE(SUM(amount),0)::bigint earned FROM referral_earnings WHERE referrer_id=? AND status='credited' AND created_at>=date_trunc('month',NOW())",[q.user.id]),
      db.many('SELECT re.amount,re.created_at,re.match_id,u.name FROM referral_earnings re JOIN users u ON u.id=re.referred_user_id WHERE re.referrer_id=? ORDER BY re.id DESC LIMIT 30',[q.user.id])
    ]);
    s.json({code:u.referral_code,referrals:totals.referrals,earned:totals.earned,monthly_earned:monthly.earned,
      commission_percent:Number(await setting('referral_commission_percent')||1),enabled:(await setting('referral_enabled'))!=='false',recent});
  }));
  app.get('/api/referrals/leaderboard',auth,wrap(async(q,s)=>{
    const period=q.query.period==='monthly'?'monthly':'lifetime';
    const dateFilter=period==='monthly'?`AND re.created_at>=date_trunc('month',NOW())`:'';
    const rows=await db.many(`SELECT u.id,u.name,COUNT(DISTINCT re.referred_user_id)::int referrals,COALESCE(SUM(re.amount),0)::bigint earned
      FROM users u LEFT JOIN referral_earnings re ON re.referrer_id=u.id AND re.status='credited' ${dateFilter}
      GROUP BY u.id HAVING COUNT(DISTINCT re.referred_user_id)>0 ORDER BY referrals DESC,earned DESC LIMIT 100`);
    const mine=rows.findIndex(x=>String(x.id)===String(q.user.id));
    s.json({period,rows:rows.map((x,i)=>({...x,rank:i+1})),my_rank:mine<0?null:mine+1});
  }));
  app.get('/api/games',wrap(async(q,s)=>s.json(await db.many('SELECT g.id,g.name,g.active,m.id mode_id,m.name mode,m.image_url,m.is_free FROM games g LEFT JOIN modes m ON m.game_id=g.id AND m.active=TRUE WHERE g.active=TRUE ORDER BY g.id,m.id'))));
  app.get('/api/home-content',wrap(async(q,s)=>s.json({videos:await db.many('SELECT id,title,youtube_url,image_url,click_url FROM home_videos WHERE active=TRUE ORDER BY sort_order,id DESC'),modes:await db.many('SELECT m.id,m.name,m.image_url,m.is_free,g.name game FROM modes m JOIN games g ON g.id=m.game_id WHERE m.active=TRUE AND g.active=TRUE ORDER BY g.id,m.id')})));

  app.use('/api/admin',auth,admin);
  app.get('/api/admin/home-content',wrap(async(q,s)=>s.json(await db.many('SELECT * FROM home_videos ORDER BY sort_order,id DESC'))));
  const isValidYouTubeVideoUrl=value=>{try{const u=new URL(String(value||''));if(u.protocol!=='https:')return false;const host=u.hostname.toLowerCase();if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be'].includes(host))return false;const id=(host.endsWith('youtu.be')?u.pathname.split('/').filter(Boolean)[0]:(u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})(?:\/|$)/i)?.[1]));return /^[\w-]{11}$/.test(id||'')}catch{return false}};
  const isHttpsUrl=value=>{try{return new URL(String(value||'')).protocol==='https:'}catch{return false}};
  app.post('/api/admin/home-videos',wrap(async(q,s)=>{
    const title=String(q.body.title||'').trim(),imageUrl=String(q.body.image_url||'').trim(),clickUrl=String(q.body.click_url||q.body.youtube_url||'').trim();
    if(!title||!isHttpsUrl(imageUrl)||!isHttpsUrl(clickUrl))throw new Error('Title, HTTPS image URL and HTTPS click URL are required');
    const x=await db.one('INSERT INTO home_videos(title,youtube_url,image_url,click_url,sort_order) VALUES(?,?,?,?,?) RETURNING id',[title,clickUrl,imageUrl,clickUrl,Number(q.body.sort_order)||0]);
    s.status(201).json({id:x.id});
  }));
  app.patch('/api/admin/home-videos/:id',wrap(async(q,s)=>{
    const fields=['title','youtube_url','image_url','click_url','active','sort_order'].filter(k=>q.body[k]!==undefined);
    if(!fields.length)throw new Error('No fields');
    for(const k of ['image_url','click_url','youtube_url'])if(q.body[k]&&!isHttpsUrl(q.body[k]))throw new Error(`Invalid HTTPS URL: ${k}`);
    const values=fields.map(k=>k==='active'?!!q.body[k]:q.body[k]);values.push(integer(q.params.id,'ID',1));
    await db.exec(`UPDATE home_videos SET ${fields.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE id=$${values.length}`,values);
    s.json({ok:true});
  }));
  app.delete('/api/admin/home-videos/:id',wrap(async(q,s)=>{await db.exec('DELETE FROM home_videos WHERE id=?',[integer(q.params.id,'ID',1)]);s.json({ok:true});}));

  app.get('/api/matches',wrap(async(q,s)=>{
    const rows=await db.many(`SELECT m.*,CASE WHEN m.status='upcoming' AND m.starts_at<=NOW() THEN 'live' ELSE m.status END AS status,g.name game,mo.name mode,(SELECT COUNT(*)::int FROM match_players p WHERE p.match_id=m.id) joined
      FROM matches m JOIN games g ON g.id=m.game_id JOIN modes mo ON mo.id=m.mode_id
      WHERE m.status IN ('upcoming','live','completed') ORDER BY m.starts_at`);
    s.json(rows.map(m=>({...m,room_password:undefined,room_id:undefined})));
  }));
  app.get('/api/matches/:id',auth,wrap(async(q,s)=>{
    const m=await db.one(`SELECT m.*,CASE WHEN m.status='upcoming' AND m.starts_at<=NOW() THEN 'live' ELSE m.status END AS status,g.name game,mo.name mode,(SELECT COUNT(*)::int FROM match_players p WHERE p.match_id=m.id) joined
      FROM matches m JOIN games g ON g.id=m.game_id JOIN modes mo ON mo.id=m.mode_id WHERE m.id=?`,[q.params.id]);
    if(!m)return s.status(404).json({error:'Match not found'});
    const joined=!!await db.one('SELECT 1 FROM match_players WHERE match_id=? AND user_id=?',[m.id,q.user.id]);
    s.json({...m,room_id:joined&&m.room_released?m.room_id:null,room_password:joined&&m.room_released?m.room_password:null,joined});
  }));
  app.get('/api/matches/:id/results',auth,wrap(async(q,s)=>s.json(await db.many('SELECT r.rank,r.prize,u.name FROM results r JOIN users u ON u.id=r.user_id WHERE r.match_id=? ORDER BY r.rank',[q.params.id]))));
  app.post('/api/matches/:id/join',auth,wrap(async(q,s)=>{
    const id=integer(q.params.id,'Match ID',1);
    const name1=String(q.body.game_name_1||'').trim().slice(0,40);
    const name2=String(q.body.game_name_2||'').trim().slice(0,40);
    await db.transaction(async tx=>{
      const m=await tx.one('SELECT * FROM matches WHERE id=? FOR UPDATE',[id]);
      if(!m||m.status!=='upcoming'||new Date(m.starts_at).getTime()<=Date.now())throw new Error('Match is not open for joining');
      const isDuo=/duo/i.test(String((await tx.one('SELECT name FROM modes WHERE id=?',[m.mode_id]))?.name||''));
      if(!name1)throw new Error('Game Name is required');
      if(isDuo&&!name2)throw new Error('Duo requires both players Game Names');
      if(!isDuo&&name2)throw new Error('Solo match requires only one Game Name');
      const count=await tx.one('SELECT COUNT(*)::int n FROM match_players WHERE match_id=?',[id]);
      if(count.n>=m.player_limit)throw new Error('Match is full');
      if(await tx.one('SELECT 1 FROM match_players WHERE match_id=? AND user_id=?',[id,q.user.id]))throw new Error('Already joined');
      const w=await tx.one('SELECT balance FROM wallets WHERE user_id=? FOR UPDATE',[q.user.id]);
      if(!w||Number(w.balance)<Number(m.entry_fee))throw new Error('Insufficient wallet balance');
      if(Number(m.entry_fee)>0){
        const debit=await tx.exec('UPDATE wallets SET balance=balance-? WHERE user_id=? AND balance>=?',[m.entry_fee,q.user.id,m.entry_fee]);
        if(!debit.rowCount)throw new Error('Insufficient wallet balance');
        await tx.exec("INSERT INTO transactions(user_id,type,amount,status,note) VALUES(?,'entry',?,'approved',?)",[q.user.id,m.entry_fee,`Entry fee for match #${id}`]);
      }
      await tx.exec('INSERT INTO match_players(match_id,user_id,game_name_1,game_name_2) VALUES(?,?,?,?)',[id,q.user.id,name1,name2]);
    });
    s.json({ok:true,message:'Successfully joined match'});
  }));
  app.get('/api/my/matches',auth,wrap(async(q,s)=>{
    const rows=await db.many(`SELECT m.id,m.title,m.starts_at,m.status,m.room_id,m.room_password,m.room_released,g.name game,mo.name mode
      FROM match_players p JOIN matches m ON m.id=p.match_id JOIN games g ON g.id=m.game_id JOIN modes mo ON mo.id=m.mode_id
      WHERE p.user_id=? ORDER BY m.starts_at DESC`,[q.user.id]);
    s.json(rows.map(m=>m.room_released?m:{...m,room_id:null,room_password:null}));
  }));
  app.get('/api/wallet',auth,wrap(async(q,s)=>{
    const [w,transactions]=await Promise.all([db.one('SELECT balance FROM wallets WHERE user_id=?',[q.user.id]),db.many('SELECT * FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 100',[q.user.id])]);
    s.json({balance:w?.balance||0,transactions});
  }));
  app.post('/api/wallet/deposit',auth,wrap(async(q,s)=>{
    const amount=integer(q.body.amount,'Amount',1);if(amount>1000000)throw new Error('Amount exceeds limit');
    const ref=String(q.body.reference||'').trim();if(ref.length<4)throw new Error('Payment reference is required');
    const sender=String(q.body.sender_number||'').replace(/[\s-]/g,'').trim();if(!/^\+?\d{8,15}$/.test(sender))throw new Error('Valid sender mobile number is required');
    const x=await db.one("INSERT INTO transactions(user_id,type,amount,status,reference,note,sender_number) SELECT ?,'deposit',?,'pending',?,?,? WHERE NOT EXISTS(SELECT 1 FROM transactions WHERE user_id=? AND type='deposit' AND reference=?) RETURNING id",
      [q.user.id,amount,ref,String(q.body.note||'').slice(0,200),sender,q.user.id,ref]);
    if(!x)throw new Error('This payment reference was already submitted');
    s.status(201).json({ok:true,id:x.id,message:'Deposit request submitted for review'});
  }));
  app.post('/api/wallet/withdraw',auth,wrap(async(q,s)=>{
    const amount=integer(q.body.amount,'Amount',1),min=Number(await setting('withdrawal_minimum')||50);
    if(amount<min)throw new Error(`Minimum withdrawal is ${min}`);
    const details=String(q.body.payment_details||'').trim();if(details.length<5)throw new Error('Payment account details are required');
    await db.transaction(async tx=>{
      const w=await tx.one('SELECT balance FROM wallets WHERE user_id=? FOR UPDATE',[q.user.id]);
      if(!w||Number(w.balance)<amount)throw new Error('Insufficient balance');
      const debit=await tx.exec('UPDATE wallets SET balance=balance-? WHERE user_id=? AND balance>=?',[amount,q.user.id,amount]);
      if(!debit.rowCount)throw new Error('Insufficient balance');
      await tx.exec("INSERT INTO transactions(user_id,type,amount,status,note) VALUES(?,'withdrawal',?,'pending',?)",[q.user.id,amount,details.slice(0,200)]);
    });
    s.status(201).json({ok:true,message:'Withdrawal request submitted; amount reserved'});
  }));
  app.get('/api/rules',wrap(async(q,s)=>s.json(await db.one('SELECT content FROM rules WHERE id=1'))));
  app.get('/api/notifications',auth,wrap(async(q,s)=>s.json(await db.many('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50',[q.user.id]))));

  app.get('/api/admin/matches',wrap(async(q,s)=>s.json(await db.many(`SELECT m.*,CASE WHEN m.status='upcoming' AND m.starts_at<=NOW() THEN 'live' ELSE m.status END AS status,g.name game,mo.name mode,(SELECT COUNT(*)::int FROM match_players p WHERE p.match_id=m.id) joined
    FROM matches m JOIN games g ON g.id=m.game_id JOIN modes mo ON mo.id=m.mode_id ORDER BY m.starts_at`))));
  app.get('/api/admin/dashboard',wrap(async(q,s)=>{
    const [players,matches,pending,prizePaid,walletLiability]=await Promise.all([
      db.one("SELECT COUNT(*)::int n FROM users WHERE role='player'"),db.one('SELECT COUNT(*)::int n FROM matches'),
      db.one("SELECT COUNT(*)::int n FROM transactions WHERE status='pending'"),
      db.one("SELECT COALESCE(SUM(amount),0)::bigint n FROM transactions WHERE type='prize' AND status='approved'"),
      db.one('SELECT COALESCE(SUM(balance),0)::bigint n FROM wallets')]);
    s.json({players:players.n,matches:matches.n,pending:pending.n,prizePaid:prizePaid.n,walletLiability:walletLiability.n});
  }));
  app.get('/api/admin/players',wrap(async(q,s)=>s.json(await db.many("SELECT u.id,u.public_id,u.name,u.email,u.phone,u.active,u.created_at,w.balance FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.role='player' ORDER BY u.id DESC"))));
  app.patch('/api/admin/players/:id',wrap(async(q,s)=>{
    const id=integer(q.params.id,'Player',1);
    if(q.body.active!==undefined)await db.exec("UPDATE users SET active=? WHERE id=? AND role='player'",[!!q.body.active,id]);
    if(q.body.adjustment!==undefined){
      const a=integer(Math.abs(Number(q.body.adjustment)),'Adjustment',1),sign=Number(q.body.adjustment)>=0?1:-1;
      await db.transaction(async tx=>{
        const w=await tx.one('SELECT balance FROM wallets WHERE user_id=? FOR UPDATE',[id]);
        if(!w||Number(w.balance)+sign*a<0)throw new Error('Invalid balance adjustment');
        await tx.exec('UPDATE wallets SET balance=balance+? WHERE user_id=?',[sign*a,id]);
        await tx.exec("INSERT INTO transactions(user_id,type,amount,status,note,admin_id) VALUES(?,'adjustment',?,'approved',?,?)",[id,a,String(q.body.note||'Admin adjustment'),q.user.id]);
      });
    }
    s.json({ok:true});
  }));
  app.post('/api/admin/matches',wrap(async(q,s)=>{
    const b=q.body,fee=integer(b.entry_fee,'Entry fee'),prize=integer(b.prize_pool,'Prize'),limit=integer(b.player_limit,'Player limit',1);
    if(!b.title||!b.starts_at)throw new Error('Title and start date required');
    const game=await db.one('SELECT id FROM games WHERE id=?',[b.game_id]),mode=await db.one('SELECT id,rules FROM modes WHERE id=? AND game_id=?',[b.mode_id,b.game_id]);
    if(!game||!mode)throw new Error('Select a valid game and mode');
    const prizeMode=b.prize_mode==='entry_pool'?'entry_pool':'fixed',feePct=Number(b.platform_fee_percent===undefined||b.platform_fee_percent===null||b.platform_fee_percent===''?20:b.platform_fee_percent);
    if(!Number.isFinite(feePct)||feePct<0||feePct>30)throw new Error('Platform fee must be between 0 and 30 percent');
    const killReward=integer(b.kill_reward||0,'Per-kill reward'),split=Array.isArray(b.prize_split)?b.prize_split.map(x=>integer(x,'Rank prize amount')):[50,30,20];
    if(!split.length||split.some(x=>x<0))throw new Error('Rank prize amounts must be zero or greater');
    if(prizeMode==='fixed'&&split.reduce((a,x)=>a+x,0)>prize)throw new Error('Total rank prizes cannot exceed the fixed prize pool; per-kill rewards are calculated separately');
    const x=await db.one(`INSERT INTO matches(game_id,mode_id,title,entry_fee,prize_pool,starts_at,player_limit,prize_mode,platform_fee_percent,kill_reward,prize_split_json,refund_on_cancel,rules)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
      [b.game_id,b.mode_id,b.title,fee,prize,new Date(b.starts_at).toISOString(),limit,prizeMode,feePct,killReward,JSON.stringify(split),b.refund_on_cancel===false?false:true,String((b.rules||'').trim()?b.rules:(mode.rules||'')).slice(0,10000)]);
    s.status(201).json({id:x.id});
  }));
  app.patch('/api/admin/matches/:id',wrap(async(q,s)=>{
    const id=integer(q.params.id,'ID',1),allowed=['title','entry_fee','prize_pool','starts_at','player_limit','status','prize_mode','platform_fee_percent','kill_reward','refund_on_cancel','rules'];
    const fields=allowed.filter(k=>q.body[k]!==undefined);if(!fields.length)throw new Error('No editable fields');
    await db.transaction(async tx=>{
      const m=await tx.one('SELECT * FROM matches WHERE id=? FOR UPDATE',[id]);
      if(!m)throw new Error('Match not found');if(m.payouts_published)throw new Error('Cannot edit a match after payouts are published');
      if(q.body.platform_fee_percent!==undefined&&(!Number.isFinite(Number(q.body.platform_fee_percent))||Number(q.body.platform_fee_percent)<0||Number(q.body.platform_fee_percent)>30))throw new Error('Platform fee must be between 0 and 30 percent');
      if(q.body.prize_mode!==undefined&&!['fixed','entry_pool'].includes(q.body.prize_mode))throw new Error('Invalid prize mode');
      if(q.body.entry_fee!==undefined&&await tx.one('SELECT 1 FROM match_players WHERE match_id=? LIMIT 1',[id])&&integer(q.body.entry_fee,'entry_fee')!==Number(m.entry_fee))throw new Error('Cannot change entry fee after players have joined');
      if(q.body.status==='cancelled'&&m.status!=='cancelled'&&m.refund_on_cancel){
        const ps=await tx.many('SELECT user_id FROM match_players WHERE match_id=?',[id]);
        for(const p of ps)if(Number(m.entry_fee)>0){
          await tx.exec('UPDATE wallets SET balance=balance+? WHERE user_id=?',[m.entry_fee,p.user_id]);
          await tx.exec("INSERT INTO transactions(user_id,type,amount,status,reference,note,admin_id) VALUES(?,'refund',?,'approved',?,?,?)",[p.user_id,m.entry_fee,`cancel:${id}:${p.user_id}`,`Refund for cancelled match #${id}`,q.user.id]);
        }
      }
      const vals=fields.map(k=>k==='entry_fee'||k==='prize_pool'||k==='player_limit'?integer(q.body[k],k,k==='player_limit'?1:0):k==='refund_on_cancel'?!!q.body[k]:k==='rules'?String(q.body[k]||'').slice(0,10000):k==='starts_at'?new Date(q.body[k]).toISOString():q.body[k]);
      const set=fields.map((k,i)=>`${k}=$${i+1}`).join(',');
      await tx.exec(`UPDATE matches SET ${set} WHERE id=$${vals.length+1}`,[...vals,id]);
      if(q.body.status==='completed'&&m.status!=='completed'){
        const cfg=Object.fromEntries((await tx.many("SELECT key,value FROM settings WHERE key IN ('referral_enabled','referral_commission_percent')")).map(x=>[x.key,x.value]));
        const pct=Number(cfg.referral_commission_percent??1);
        if(cfg.referral_enabled!=='false'&&pct>0){
          const ps=await tx.many('SELECT mp.user_id,u.referred_by FROM match_players mp JOIN users u ON u.id=mp.user_id WHERE mp.match_id=?',[id]);
          for(const p of ps){
            if(!p.referred_by||Number(m.entry_fee)<=0)continue;
            const amount=Math.floor(Number(m.entry_fee)*pct/100);if(amount<=0)continue;
            const ins=await tx.exec(`INSERT INTO referral_earnings(referrer_id,referred_user_id,match_id,base_amount,commission_percent,amount)
              VALUES(?,?,?,?,?,?) ON CONFLICT(referred_user_id,match_id) DO NOTHING`,[p.referred_by,p.user_id,id,m.entry_fee,pct,amount]);
            if(ins.rowCount){
              await tx.exec('UPDATE wallets SET balance=balance+? WHERE user_id=?',[amount,p.referred_by]);
              await tx.exec("INSERT INTO transactions(user_id,type,amount,status,reference,note) VALUES(?,'referral',?,'approved',?,?)",[p.referred_by,amount,`referral:${id}:${p.user_id}`,`Referral commission for completed match #${id}`]);
            }
          }
        }
      }
    });
    s.json({ok:true});
  }));
  app.delete('/api/admin/matches/:id',wrap(async(q,s)=>{
    const id=integer(q.params.id,'ID',1);
    await db.transaction(async tx=>{
      const m=await tx.one('SELECT * FROM matches WHERE id=? FOR UPDATE',[id]);
      if(!m)throw new Error('Match not found');if(m.payouts_published)throw new Error('Cannot delete a match after payouts are published');
      const ps=await tx.many('SELECT user_id FROM match_players WHERE match_id=?',[id]);
      for(const p of ps)if(Number(m.entry_fee)>0&&m.status!=='cancelled'&&m.refund_on_cancel){
        await tx.exec('UPDATE wallets SET balance=balance+? WHERE user_id=?',[m.entry_fee,p.user_id]);
        await tx.exec("INSERT INTO transactions(user_id,type,amount,status,note,admin_id) VALUES(?,'refund',?,'approved',?,?)",[p.user_id,m.entry_fee,`Refund for deleted match #${id}`,q.user.id]);
      }
      await tx.exec('DELETE FROM results WHERE match_id=?',[id]);await tx.exec('DELETE FROM match_players WHERE match_id=?',[id]);await tx.exec('DELETE FROM matches WHERE id=?',[id]);
    });
    s.json({ok:true});
  }));
  app.get('/api/admin/matches/:id/players',wrap(async(q,s)=>s.json(await db.many('SELECT u.id,u.name,u.email,p.joined_at,p.game_name_1,p.game_name_2 FROM match_players p JOIN users u ON u.id=p.user_id WHERE p.match_id=?',[q.params.id]))));
  app.patch('/api/admin/matches/:id/room',wrap(async(q,s)=>{
    await db.exec('UPDATE matches SET room_id=?,room_password=?,room_released=? WHERE id=?',[String(q.body.room_id||''),String(q.body.room_password||''),!!q.body.released,integer(q.params.id,'ID',1)]);s.json({ok:true});
  }));
  app.get('/api/admin/matches/:id/calculator',wrap(async(q,s)=>{
    const id=integer(q.params.id,'Match ID',1),m=await db.one('SELECT * FROM matches WHERE id=?',[id]);if(!m)throw new Error('Match not found');
    const [joinedRow,killsRow]=await Promise.all([db.one('SELECT COUNT(*)::int n FROM match_players WHERE match_id=?',[id]),db.one('SELECT COALESCE(SUM(kills),0)::bigint n FROM results WHERE match_id=?',[id])]);
    const joined=joinedRow.n,gross=Number(m.prize_pool),platformFee=Math.floor(gross*Number(m.platform_fee_percent)/100),net=gross-platformFee,kills=Number(killsRow.n),killPayout=kills*Number(m.kill_reward),splits=JSON.parse(m.prize_split_json||'[50,30,20]'),rankTotal=splits.reduce((a,x)=>a+x,0);
    s.json({match_id:id,joined,entry_fee:m.entry_fee,gross_entry_fees:gross,platform_fee:platformFee,net_entry_pool:net,prize_mode:m.prize_mode,base_prize:rankTotal,kill_reward_per_kill:m.kill_reward,total_kills:kills,kill_payout:killPayout,estimated_total_payout:rankTotal+killPayout,rank_distribution:splits.map((amount,i)=>({rank:i+1,amount})),refund_on_cancel:!!m.refund_on_cancel,payouts_published:!!m.payouts_published,prize_split:splits});
  }));
  app.post('/api/admin/matches/:id/calculator/preview',wrap(async(q,s)=>{
    const id=integer(q.params.id,'Match ID',1),m=await db.one('SELECT * FROM matches WHERE id=?',[id]);if(!m)throw new Error('Match not found');if(m.payouts_published)throw new Error('Payouts already published');
    const winners=q.body.winners;if(!Array.isArray(winners)||!winners.length)throw new Error('Provide ranked players and kills');
    const joined=(await db.one('SELECT COUNT(*)::int n FROM match_players WHERE match_id=?',[id])).n,gross=Number(m.prize_pool),platformFee=Math.floor(gross*Number(m.platform_fee_percent)/100),net=gross-platformFee;
    const rows=winners.map(w=>({user_id:integer(w.user_id,'Player ID',1),rank:integer(w.rank,'Rank',1),kills:integer(w.kills||0,'Kills'),manual_prize:w.prize===undefined?null:integer(w.prize,'Prize')}));
    const ids=new Set();for(const w of rows){if(ids.has(String(w.user_id)))throw new Error('Duplicate player');ids.add(String(w.user_id));if(!await db.one('SELECT 1 FROM match_players WHERE match_id=? AND user_id=?',[id,w.user_id]))throw new Error('Player has not joined this match');}
    const totalKills=rows.reduce((a,w)=>a+w.kills,0),killPayout=totalKills*Number(m.kill_reward);
    if(m.prize_mode==='entry_pool'&&killPayout>net)throw new Error('Kill rewards exceed net entry pool');
    if(m.prize_mode==='fixed'&&killPayout>net)throw new Error('Kill rewards exceed fixed prize pool');
    const split=JSON.parse(m.prize_split_json||'[50,30,20]'),payouts=rows.map(w=>{const rankShare=w.manual_prize===null?(w.rank<=split.length?split[w.rank-1]:0):w.manual_prize;return {...w,rank_prize:rankShare,kill_prize:w.kills*Number(m.kill_reward),total_prize:rankShare+w.kills*Number(m.kill_reward)};});
    const total=payouts.reduce((a,w)=>a+w.total_prize,0),budget=net;if(total>budget)throw new Error('Payout exceeds available prize budget');
    s.json({joined,gross_entry_fees:gross,platform_fee:platformFee,net_entry_pool:net,total_kills:totalKills,kill_payout:killPayout,rank_budget:split.reduce((a,x)=>a+x,0),total_payout:total,payouts});
  }));
  app.post('/api/admin/matches/:id/results',wrap(async(q,s)=>{
    const id=integer(q.params.id,'Match ID',1),winners=q.body.winners;if(!Array.isArray(winners)||!winners.length)throw new Error('Add at least one ranked player');
    const result=await db.transaction(async tx=>{
      const m=await tx.one('SELECT * FROM matches WHERE id=? FOR UPDATE',[id]);
      if(!m)throw new Error('Match not found');if(m.payouts_published)throw new Error('Payouts have already been published for this match');if(m.status==='cancelled')throw new Error('Cancelled match cannot publish results');
      const joined=(await tx.one('SELECT COUNT(*)::int n FROM match_players WHERE match_id=?',[id])).n,gross=Number(m.prize_pool),platformFee=Math.floor(gross*Number(m.platform_fee_percent)/100),net=gross-platformFee;
      const parsed=winners.map(w=>({user_id:integer(w.user_id,'Player ID',1),rank:integer(w.rank,'Rank',1),kills:integer(w.kills||0,'Kills'),manual_prize:w.prize===undefined?null:integer(w.prize,'Prize')}));
      const seen=new Set();for(const w of parsed){if(seen.has(String(w.user_id)))throw new Error('Duplicate player in result');seen.add(String(w.user_id));if(!await tx.one('SELECT 1 FROM match_players WHERE match_id=? AND user_id=?',[id,w.user_id]))throw new Error('Every result player must have joined the match');}
      const killPayout=parsed.reduce((a,w)=>a+w.kills*Number(m.kill_reward),0);
      if(m.prize_mode==='entry_pool'&&killPayout>net)throw new Error('Per-kill rewards exceed the net entry pool');
      const split=JSON.parse(m.prize_split_json||'[50,30,20]');let totalPaid=0;
      for(const w of parsed){
        const rankShare=w.manual_prize!==null?w.manual_prize:(w.rank<=split.length?split[w.rank-1]:0),killAmount=w.kills*Number(m.kill_reward),payout=rankShare+killAmount;
        totalPaid+=payout;
        await tx.exec('INSERT INTO results(match_id,user_id,rank,prize,kills) VALUES(?,?,?,?,?)',[id,w.user_id,w.rank,payout,w.kills]);
        if(payout>0){
          await tx.exec('UPDATE wallets SET balance=balance+? WHERE user_id=?',[payout,w.user_id]);
          await tx.exec("INSERT INTO transactions(user_id,type,amount,status,reference,note,admin_id) VALUES(?,'prize',?,'approved',?,?,?)",[w.user_id,payout,`match:${id}:player:${w.user_id}`,`Automated match #${id}: rank ৳${rankShare} + ${w.kills} kills × ৳${m.kill_reward}`,q.user.id]);
        }
      }
      if(m.prize_mode==='entry_pool'&&totalPaid>net)throw new Error('Calculated payouts exceed net entry pool; reduce prize split or per-kill reward');
      if(m.prize_mode==='fixed'&&totalPaid>net)throw new Error('Calculated payout exceeds configured prize and kill reward budget');
      const upd=await tx.exec("UPDATE matches SET status='completed',payouts_published=TRUE WHERE id=? AND payouts_published=FALSE",[id]);
      if(!upd.rowCount)throw new Error('Payouts have already been published for this match');
      return {total_paid:totalPaid,platform_fee:platformFee,kill_payout:killPayout};
    });
    s.json({ok:true,...result,message:'Results and wallet prizes published exactly once'});
  }));
  app.get('/api/admin/transactions',wrap(async(q,s)=>s.json(await db.many('SELECT t.*,u.name,u.email FROM transactions t JOIN users u ON u.id=t.user_id ORDER BY t.id DESC'))));
  app.post('/api/admin/transactions/:id/decision',wrap(async(q,s)=>{
    const id=integer(q.params.id,'Transaction ID',1),status=q.body.status;if(!['approved','rejected'].includes(status))throw new Error('Invalid decision');
    await db.transaction(async tx=>{
      const t=await tx.one('SELECT * FROM transactions WHERE id=? FOR UPDATE',[id]);
      if(!t||t.status!=='pending')throw new Error('Request already processed or missing');
      if(t.type==='deposit'&&status==='approved')await tx.exec('UPDATE wallets SET balance=balance+? WHERE user_id=?',[t.amount,t.user_id]);
      if(t.type==='withdrawal'&&status==='rejected')await tx.exec('UPDATE wallets SET balance=balance+? WHERE user_id=?',[t.amount,t.user_id]);
      const updated=await tx.exec("UPDATE transactions SET status=?,admin_id=?,processed_at=NOW() WHERE id=? AND status='pending'",[status,q.user.id,id]);
      if(!updated.rowCount)throw new Error('Request already processed or missing');
    });
    s.json({ok:true});
  }));
  app.get('/api/admin/games',wrap(async(q,s)=>s.json(await db.many('SELECT g.*,m.id mode_id,m.name mode,m.image_url,m.is_free,m.active mode_active,m.rules mode_rules FROM games g LEFT JOIN modes m ON m.game_id=g.id ORDER BY g.id,m.id'))));
  app.post('/api/admin/games',wrap(async(q,s)=>{if(!q.body.name)throw new Error('Game name required');const x=await db.one('INSERT INTO games(name) VALUES(?) RETURNING id',[q.body.name.trim()]);s.status(201).json({id:x.id});}));
  app.post('/api/admin/games/:id/modes',wrap(async(q,s)=>{const x=await db.one('INSERT INTO modes(game_id,name,image_url,is_free) VALUES(?,?,?,?) RETURNING id',[integer(q.params.id,'Game ID',1),String(q.body.name||'').trim(),String(q.body.image_url||''),!!q.body.is_free]);s.status(201).json({id:x.id});}));
  app.patch('/api/admin/modes/:id',wrap(async(q,s)=>{
    const fields=['name','image_url','is_free','active','rules'].filter(k=>q.body[k]!==undefined);if(!fields.length)throw new Error('No fields');
    const vals=fields.map(k=>k==='is_free'||k==='active'?!!q.body[k]:k==='rules'?String(q.body[k]||'').slice(0,10000):q.body[k]);vals.push(integer(q.params.id,'Mode ID',1));
    await db.exec(`UPDATE modes SET ${fields.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE id=$${vals.length}`,vals);s.json({ok:true});
  }));
  app.patch('/api/admin/games/:id',wrap(async(q,s)=>{await db.exec('UPDATE games SET active=? WHERE id=?',[!!q.body.active,integer(q.params.id,'Game ID',1)]);s.json({ok:true});}));
  app.delete('/api/admin/games/:id',wrap(async(q,s)=>{
    const id=integer(q.params.id,'Game ID',1);if(await db.one('SELECT 1 FROM matches WHERE game_id=?',[id]))throw new Error('Cannot delete a game used by matches; deactivate it instead');
    await db.transaction(async tx=>{await tx.exec('DELETE FROM modes WHERE game_id=?',[id]);await tx.exec('DELETE FROM games WHERE id=?',[id]);});s.json({ok:true});
  }));
  app.delete('/api/admin/modes/:id',wrap(async(q,s)=>{
    const id=integer(q.params.id,'Mode ID',1);if(await db.one('SELECT 1 FROM matches WHERE mode_id=?',[id]))throw new Error('Cannot delete a mode used by matches');
    await db.exec('DELETE FROM modes WHERE id=?',[id]);s.json({ok:true});
  }));
  app.get('/api/admin/rules',wrap(async(q,s)=>s.json(await db.one('SELECT content FROM rules WHERE id=1'))));
  app.put('/api/admin/rules',wrap(async(q,s)=>{await db.exec('UPDATE rules SET content=? WHERE id=1',[String(q.body.content||'')]);s.json({ok:true});}));
  app.get('/api/admin/referrals',wrap(async(q,s)=>s.json(await db.many('SELECT re.*,a.name referrer_name,b.name referred_name FROM referral_earnings re JOIN users a ON a.id=re.referrer_id JOIN users b ON b.id=re.referred_user_id ORDER BY re.id DESC LIMIT 200'))));
  app.get('/api/admin/settings',wrap(async(q,s)=>s.json(Object.fromEntries((await db.many('SELECT key,value FROM settings')).map(x=>[x.key,x.value])))));
  app.put('/api/admin/settings',wrap(async(q,s)=>{
    const allowed=['app_name','support_contact','deposit_instructions','withdrawal_minimum','payment_method','payment_account','referral_enabled','referral_commission_percent','referral_bonus'];
    await db.transaction(async tx=>{for(const [k,v] of Object.entries(q.body))if(allowed.includes(k)){
      if(k==='referral_commission_percent'&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>50))throw new Error('Referral commission must be between 0 and 50 percent');
      await tx.exec('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[k,String(v)]);
    }});
    s.json({ok:true});
  }));
  app.get('/api/admin/notifications',wrap(async(q,s)=>s.json(await db.many('SELECT n.*,u.name,u.email FROM notifications n JOIN users u ON u.id=n.user_id ORDER BY n.id DESC LIMIT 300'))));
  app.post('/api/admin/notifications',wrap(async(q,s)=>{
    const users=q.body.user_id?[integer(q.body.user_id,'User',1)]: (await db.many("SELECT id FROM users WHERE role='player' AND active=TRUE")).map(x=>x.id);
    await db.transaction(async tx=>{for(const id of users)await tx.exec('INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)',[id,String(q.body.title||'Notice'),String(q.body.message||'')]);});
    s.json({ok:true,sent:users.length});
  }));
  app.post('/api/admin/change-password',wrap(async(q,s)=>{
    if(!q.body.current_password||!q.body.new_password||q.body.new_password.length<10)throw new Error('Current password and new password (10+ chars) required');
    const u=await db.one('SELECT password_hash FROM users WHERE id=?',[q.user.id]);
    if(!await bcrypt.compare(q.body.current_password,u.password_hash))throw Object.assign(new Error('Current password incorrect'),{status:401});
    await db.exec('UPDATE users SET password_hash=? WHERE id=?',[await bcrypt.hash(q.body.new_password,12),q.user.id]);s.json({ok:true});
  }));
  app.get('/api/admin/profile',wrap(async(q,s)=>s.json(await db.one('SELECT id,name,email FROM users WHERE id=?',[q.user.id]))));
  app.use((q,s)=>s.status(404).json({error:'API route not found'}));
  const server=app.listen(process.env.PORT||3000,()=>console.log(`ZYROX ARENA listening on ${process.env.PORT||3000}`));
  return server;
}
module.exports = { app, start, db };
if (require.main === module) {
  start().catch(err=>{console.error('ZYROX ARENA startup failed:',err);process.exit(1);});
}
