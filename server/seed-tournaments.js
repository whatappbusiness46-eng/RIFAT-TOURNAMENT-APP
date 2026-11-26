
require('dotenv').config();
const db = require('./db');

const common = {
  slot: `⚠️ 1. Slot নেওয়ার নিয়ম
App থেকে Slot নেওয়ার সময় অবশ্যই যে Game Account দিয়ে ম্যাচ খেলবেন, সেই ID-এর সঠিক নাম ব্যবহার করে Slot নিতে হবে।
App-এ যে Game ID নাম দিয়ে Slot নেওয়া হবে, শুধুমাত্র সেই ID দিয়েই Custom Room-এ Join করা যাবে।
অন্য কোনো Game ID দিয়ে Room-এ Join করলে ম্যাচে অংশগ্রহণ করতে দেওয়া হবে না। সে ক্ষেত্রে Zyrox Arena 🎮 থেকে সেই টাকা Refund করা হবে।`,
  level: `⚠️ 2. Game ID Level
আপনি যে Game ID দিয়ে খেলবেন, সেই ID-এর Level কমপক্ষে ৪০ হতে হবে।
এর কম হলে আপনাকে ম্যাচ খেলতে দেওয়া হবে না।`,
  network: `⚠️ 3. Network / Game Glitch
Custom Match Start হওয়ার পর যদি কোনো User-এর Network সমস্যা বা Game Glitch-এর কারণে ম্যাচে প্রবেশ করতে না পারে, তাহলে এর জন্য Zyrox Arena 🎮 বা প্রতিপক্ষ Team দায়ী থাকবে না। এবং এই সমস্যার জন্য Zyrox Arena 🎮 কোনো প্রকার Refund করবে না।`,
  teaming: `⚠️ Teaming Rules
ম্যাচ চলাকালীন কোনো Player বা Team যদি Teaming করে অথবা ইচ্ছাকৃতভাবে প্রতিপক্ষ Team-কে জিতিয়ে দেওয়ার চেষ্টা করে, তাহলে সংশ্লিষ্ট Player/Team-এর Entry Fee সহ অতিরিক্ত ৫০ টাকা জরিমানা করা হবে।
এ ধরনের ঘটনা ম্যাচের শুরুতেই প্রমাণিত হলে Full Match Refund প্রদান করা হবে।
তবে ৪–৫ Round খেলার পর যদি Teaming-এর ঘটনা ঘটে, তাহলে Full Match Refund দেওয়া হবে না। সেক্ষেত্রে যে Team ম্যাচ জিতবে, তারাই Winning Reward পাবে।
তবে উপরের জরিমানার Rules তখনও প্রযোজ্য থাকবে।`,
  grenade: `⚠️ Grenade Rules
ম্যাচে কোনো প্রকার Flash Grenade বা Bomb জাতীয় আইটেম ব্যবহার করা যাবে না।
ভুলবশত ব্যবহার করলেও কোনো Reward বা Refund দেওয়া হবে না।`,
  entryProblem: `⚠️ Custome room Player Entry Problem Rules
Custom Match Start হওয়ার পর যদি কোনো Team-এর একজন বা একাধিক Player ম্যাচে প্রবেশ করতে না পারে, তাহলে Fair Play বজায় রাখার জন্য প্রতিপক্ষ Team থেকেও সমসংখ্যক Player Zone-এ গিয়ে Eliminate হবে। ম্যাচ শেষ হওয়া পর্যন্ত তারা ম্যাচ থেকে Back করতে পারবে না। যারা ম্যাচ থেকে Back করবে, তারা কোনো ধরনের Refund বা Reward পাবে না।
এক্ষেত্রে যে Team-এর Player Zone-এ গিয়ে Eliminate হবে—
★ Team হারলে Entry Refund পাবে।
★ Team জিতলে Winning Reward পাবে।
তবে যদি প্রতিপক্ষ Team থেকে কেউ Zone-এ গিয়ে Eliminate না হয়, তাহলে সেই Team-এর কোনো Player কোনো ধরনের Reward বা Refund পাবে না।
অন্যদিকে, যে Team-এর Player ম্যাচে প্রবেশ করতে পারেনি, সেই Team-এর যেসব Player Room-এ Join করেছে, তারা সবাই Refund পাবে।
এছাড়া যে Player শুরুতে ম্যাচে প্রবেশ করতে পারেনি, তাকে আলাদাভাবে কোনো Refund প্রদান করা হবে না।
⚠️ বিশেষ নির্দেশনা:
যেসব Player Room-এ প্রবেশ করতে পারেনি, ১–২ রাউন্ড পর ম্যাচের মধ্যে তারা পুনরায় Reconnect হলে, Fair Play অনুযায়ী Zone-এ যাওয়া Opponent Player-কেও সেই রাউন্ড থেকে আবার Match Play করতে হবে। এরপরের সব Round সাধারণ Rules অনুযায়ী চলবে।`
};

const RULES = {
  'BR Solo': `🎮 Zyrox Arena 🎮 || BR MATCH RULES

1. ম্যাচে জয়েন করার সময় অবশ্যই আপনার গেম আইডি ভালোভাবে মিলিয়ে নিবেন।
গেম আইডি ব্যতীত অন্য কিছু লিখে জয়েন করলে ম্যাচ খেলতে দেওয়া হবে না।

2. আপনি যে আইডি দিয়ে খেলবেন, সেই আইডির লেভেল কমপক্ষে ৪০ হতে হবে।
এর কম লেভেলের হলে আপনাকে ম্যাচ খেলতে দেওয়া হবে না।

3. ম্যাচ বা অ্যাপ সংক্রান্ত কোনো সমস্যার ক্ষেত্রে অবশ্যই ভিডিও বা স্পষ্ট প্রমাণ সংরক্ষণ করে রাখবেন। কারণ প্রমাণ ছাড়া আমরা সমস্যাটি যাচাই করতে পারি না, তাই প্রমাণ না থাকলে কোনো অভিযোগ গ্রহণ বা সমাধান করা হবে না।

4. যদি আপনি নির্ধারিত সময়ের মধ্যে ম্যাচে ঢুকে দেখেন ৪৮ স্লট Full বা ম্যাচ ইতিমধ্যেই playing হয়ে গেছে, তখন আপনার ফোনের বর্তমান সময়সহ একটি ছোট ভিডিও রেকর্ড করবেন। এই ভিডিও আপনার ম্যাচ জয়েন করার সময় যাচাইয়ের জন্য আমাদের প্রয়োজন হবে। অন্যথায় সময় পার হলে রিফান্ড দেওয়া হবে না, আর এক্ষেত্রে আমাদের ভিডিও দিয়েও কোনো লাভ নেই।

5. Custom Roome জয়েন করার পর ম্যাচ Start হওয়ার সময় কোনো কারণে আপনি যদি ম্যাচে প্রবেশ করতে না পারেন, তাহলে তার জন্য Zyrox Arena 🎮 দায়ী থাকবে না, কারণ এটি সাধারণত আপনার নেটওয়ার্ক সমস্যার কারণে হতে পারে।

6. আপনি যদি নিজের জয়েন করা ম্যাচে বাহিরের প্লেয়ার ঢুকিয়ে নিজেই কিল করেন, তাহলে আপনার একাউন্টের সকল বেলেন্স কেটে নেওয়া হবে।

7. ম্যাচের মধ্যে কোনো ধরনের Sniper বন্দুক ব্যবহার করা যাবে না।

8. ম্যাচের মধ্যে কোনো ধরনের Victor বন্দুক ব্যবহার করা যাবে না।

9. BR ম্যাচে কোনো প্লেয়ার যদি ৭টির বেশি কিল করে, তাহলে তাকে শুধু ৭ কিলের টাকা দেওয়া হবে।

10. ম্যাচের মধ্যে কোনো ধরনের গাড়ি ব্যবহার করা যাবে না। তবে আপনি যদি এমন কোনো কঠিন জোনে আটকে যান, যেখান থেকে দৌড়ে বের হওয়া অসম্ভব, তাহলে সেখানে গাড়ি ব্যবহার করা যাবে — কিন্তু জোনে ঢোকার আগেই গাড়ি থেকে নেমে যেতে হবে।

11. ম্যাচ চলাকালে কেউ যদি আমাদের উল্লেখিত রুলস ভঙ্গ করে আপনাকে কিল করে, তাহলে আপনি ইন-গেম থেকে বা রেকর্ডার চালু থাকলে সেই ভিডিওটি সাপোর্টে-Helpline পাঠাবেন। আপনার সমস্যার সমাধান করা হবে।

12. ম্যাচের মধ্যে কেউ কারো সাথে টিম আপ করলে, তাদের সবার একাউন্টের বেলেন্স ০ করে দেওয়া হবে।

13. ম্যাচের মধ্যে কেউ যদি হ্যাক বা অস্বাভাবিক কিছু ব্যবহার করে ধরা পড়ে, তাহলে তার অ্যাকাউন্টের সব ব্যালেন্সসহ অ্যাকাউন্টটি ব্যান করা হবে।

14. ম্যাচ চলাকালীন কোনো প্লেয়ার রুলস ভেঙে অন্য প্লেয়ারকে ড্যামেজ বা কিল করলে, ক্ষতিগ্রস্ত প্লেয়ারকে ইন-গেম থেকে ভিডিও প্রুফ নিয়ে জমা দিতে হবে; প্রুফ ছাড়া অভিযোগ গ্রহণযোগ্য হবে না।

15. একটি ম্যাচ শেষ হওয়ার ১০-২০ মিনিটের মধ্যে আপনার রিওয়ার্ড আপনার অ্যাকাউন্টে অ্যাড হয়ে যাবে।`,

  'BR Duo': null,

  'CS 4 VS 4': `🎮 Zyrox Arena 🎮 — CS 4 vs 4 Match Rules

${common.slot}

${common.level}

${common.network}

⚠️ 4. Room Join ও Refund Rules
আপনি যদি Custom Room-এ Join করতে না পারেন, তাহলে আপনার Join Fee থেকে অর্ধেক টাকা Refund দেওয়া হবে।
তবে আপনি যদি একবার Room-এ Join করার পর বের হয়ে যান বা Network সমস্যা হয়, তাহলে কোনো প্রকার Refund দেওয়া হবে না।

${common.entryProblem}

⚠️ 6. Match Back/Exit & Network Rules
Match শুরু হওয়ার পর ম্যাচের মধ্যে কোনো Player-এর স্থায়ীভাবে Network চলে গেলে বা ইচ্ছাকৃতভাবে Match থেকে Back/Exit দিলে, Opponent Team-এর একজন Player-কে Zone-এ গিয়ে নিজে থেকে Eliminated হতে হবে।
তবে যদি Network চলে যাওয়া Player পুনরায় Network ঠিক করে match-এ ফিরে আসতে সক্ষম হয়, তাহলে সে আবার স্বাভাবিকভাবে ম্যাচে অংশগ্রহণ করতে পারবে। একইভাবে, Zone-এ গিয়ে Eliminated হওয়া Opponent Player-ও পুনরায় ম্যাচে যোগ দিয়ে স্বাভাবিকভাবে খেলতে পারবে।
উভয় Player পুনরায় ম্যাচে অংশগ্রহণ করতে পারলে, ম্যাচটি স্বাভাবিকভাবে চলবে এবং ম্যাচের ফলাফল অনুযায়ী Winning/Refund প্রদান করা হবে।
যদি network চলে যাওয়া প্লেয়ার রুমে আসতে না পারে সে ক্ষেত্রে যে Team-এর Player Zone-এ গিয়ে Eliminate হবে—
★ Team হারলে Entry Refund পাবে।
★ Team জিতলে Winning Reward পাবে।

${common.teaming}

${common.grenade}

⚠️ 9. CS 4 VS 4 Player Balance Rules
সকল User-দের ভালো Gaming Experience দেওয়ার জন্য Player-দের মতামত বিবেচনা করে Admin Team Balance অনুযায়ী Player সাজিয়ে দিবে।
তবে চূড়ান্ত Team Setup সম্পূর্ণভাবে Admin ও User-এর সিদ্ধান্ত অনুযায়ী নির্ধারিত হবে।`,

  'Clash Squad': `🎮 Zyrox Arena 🎮 — CLASH SQUAD Match Rules

${common.slot}

${common.level}

${common.network}

⚠️ 4. Join & Refund Rules
কেও যদি ইচ্ছাকৃত Room-এ Join না করেন, তাহলে কোনো প্রকার Refund দেওয়া হবে না।

${common.entryProblem}

${common.teaming}

${common.grenade}

⚠️ 8. Clash Squad player balance Rules
Clash Squad Match-এ Title-এ যে Player Setup System দেওয়া থাকবে, সেই অনুযায়ীই Player সাজানো হবে।
Room Host কোনো Player-এর Skill দেখে আলাদাভাবে Team Setup করবে না।
অবশ্যই সবাই নিজের নির্ধারিত Slot মিলিয়ে Room-এ Join করবেন।`,

  'Lone Wolf': `🎮 Zyrox Arena 🎮 — LONE WOLF Match Rules

${common.slot}

${common.level}

${common.network}

⚠️ 4. Room Join ও Refund Rules
আপনি যদি Custom Room-এ Join করতে না পারেন, তাহলে আপনার Join Fee থেকে অর্ধেক টাকা Refund দেওয়া হবে।
তবে আপনি যদি একবার Room-এ Join করার পর বের হয়ে যান বা Network সমস্যা হয়, তাহলে কোনো প্রকার Refund দেওয়া হবে না।

⚠️ 5. Custome room Player Entry Problem Rules
Custom Match Start হওয়ার পর যদি কোনো Team-এর একজন Player ম্যাচে প্রবেশ করতে না পারে, তাহলে Fair Play বজায় রাখার জন্য প্রতিপক্ষ Team থেকেও সমসংখ্যক Player Zone-এ গিয়ে Eliminate হবে অথবা ইচ্ছাকৃতভাবে Opponent Player-এর কাছে হারবে। সে অবস্থায় Opponent Team-এর কাউকে ১টিও Damage দেওয়া যাবে না।
ম্যাচ শেষ হওয়া পর্যন্ত সে ম্যাচ থেকে Back করতে পারবে না। যদি ম্যাচ থেকে Back করে, তাহলে কোনো ধরনের Refund বা Reward পাবে না।
এক্ষেত্রে যে Player Zone-এ গিয়ে Eliminate হবে বা ইচ্ছাকৃতভাবে হারবে—
★ Team হারলে Entry Refund পাবে।
★ Team জিতলে Winning Reward পাবে।
তবে যদি প্রতিপক্ষ Team থেকে কেউ Zone-এ গিয়ে Eliminate বা ইচ্ছাকৃতভাবে Kill না হয়, তাহলে সেই Team-এর কোনো Player কোনো ধরনের Reward বা Refund পাবে না।
অন্যদিকে, যে Team-এর ১ জন Player ম্যাচে প্রবেশ করতে পারেনি, সেই Team-এর বাকি যে Player Room-এ Join করেছে, সে Player Refund পাবে।
এছাড়া যে Player শুরুতে ম্যাচে প্রবেশ করতে পারেনি, তাকে আলাদাভাবে কোনো Refund প্রদান করা হবে না।

⚠️ বিশেষ নির্দেশনা:
যে Player Room-এ প্রবেশ করতে পারেনি, ১–২ রাউন্ড পর ম্যাচের মধ্যে সে পুনরায় Reconnect হলে, Fair Play অনুযায়ী Zone-এ যাওয়া Opponent Player-কেও সেই রাউন্ড থেকে আবার Match Play করতে হবে। এরপরের সব Round সাধারণ Rules অনুযায়ী চলবে।

⚠️ 6. Match Back/Exit & Network Rules
Match শুরু হওয়ার পর ম্যাচের মধ্যে কোনো Player-এর স্থায়ীভাবে Network চলে গেলে বা ইচ্ছাকৃতভাবে Match থেকে Back/Exit দিলে, Opponent Team-এর একজন Player-কে Zone-এ গিয়ে নিজে থেকে Eliminated হতে হবে অথবা Opponent-এর কাছে গিয়ে Kill হতে হবে।
তবে যদি Network চলে যাওয়া Player পুনরায় Network ঠিক করে match-এ ফিরে আসতে সক্ষম হয়, তাহলে সে আবার স্বাভাবিকভাবে ম্যাচে অংশগ্রহণ করতে পারবে। একইভাবে, Zone-এ গিয়ে Eliminated বা free kill হওয়া Opponent Player-ও পুনরায় ম্যাচে যোগ দিয়ে স্বাভাবিকভাবে খেলতে পারবে।
যদি network চলে যাওয়া প্লেয়ার রুমে আসতে না পারে সে ক্ষেত্রে যে Team-এর Player Zone-এ গিয়ে Eliminate বা free kill হবে—
★ Team হারলে Entry Refund পাবে।
★ Team জিতলে Winning Reward পাবে।

${common.teaming}

⚠️ 8. Grenade Rules
ম্যাচে সকল প্রকার Flash Grenade ও Bomb জাতীয় Utility Item ব্যবহার করা Allowed।

⚠️ 9. সকল User-দের ভালো Gaming Experience দেওয়ার জন্য Player-দের মতামত বিবেচনা করে Admin Team Balance অনুযায়ী Player সাজিয়ে দিবে।
তবে চূড়ান্ত Team Setup সম্পূর্ণভাবে Admin ও User-এর সিদ্ধান্ত অনুযায়ী নির্ধারিত হবে।`,

  'CS Headshot': `🎮 Zyrox Arena 🎮 — HEADSHOT Match Rules

${common.slot}

${common.level}

${common.network}

⚠️ 4. Join & Refund Rules
আপনি যদি Custom Room-এ Join না করেন, তাহলে কোনো প্রকার Refund বা Reward দেওয়া হবে না।
তবে একবার Room-এ Join করার পর বের হয়ে গেলে বা Network সমস্যার কারণে Disconnect হলে, সেক্ষেত্রেও কোনো Refund বা Reward প্রদান করা হবে না।

${common.entryProblem}

${common.teaming}

⚠️ 7. Zone Pack Rules
ম্যাচের শেষে Zone Pack করে যদি কোনো Player Round বের করে এবং তার Team ম্যাচ Win করে, তাহলে সেই Player ছাড়া ম্যাচের বাকি সকল Player-কে Refund দেওয়া হবে।

⚠️ 8. CS : Headshot Match Player Balance Rules
★ 2 Vs 2 ম্যাচ হলে Team Setup হবে:
1,3 VS 2,4
★ 4 Vs 4 ম্যাচ হলে Team Setup হবে:
1,3,5,7 VS 2,4,6,8
উপরের System অনুযায়ী Player সাজানো হবে।
Room Host কোনো Player-এর Skill দেখে আলাদাভাবে Team Setup করতে পারবে না।
অবশ্যই সবাই নিজের নির্ধারিত Slot মিলিয়ে Room-এ Join করবেন।`,

  'Squad Scrim': `🎮 Zyrox Arena 🎮 || SQUAD SCRIM MATCH RULES

1. ম্যাচে জয়েন করার সময় অবশ্যই আপনার গেম আইডি ভালোভাবে মিলিয়ে নিবেন। গেম আইডি ব্যতীত অন্য কিছু লিখে জয়েন করলে ম্যাচ খেলতে দেওয়া হবে না।
2. আপনাদের স্কোয়াডের সব সদস্যের গেম আইডির লেভেল কমপক্ষে ৪০ হতে হবে। ৪০-এর নিচে লেভেল হলে ম্যাচে খেলতে দেওয়া হবে না।
3. Custom Room-এ Join করার ক্ষেত্রে স্কোয়াডের সবাইকে একসাথে গ্রুপে নিয়ে ম্যাচে জয়েন করতে হবে। আলাদা হয়ে জয়েন করার কারণে যদি আপনার টিমে অন্য টিমের কোনো প্লেয়ার আপনার টিমে ঢুকে যায়, তাহলে এর জন্য Zyrox Arena 🎮 বা প্রতিপক্ষ দায়ী থাকবে না। এবং পুরো ম্যাচটি সেই অন্য Squad-এর প্লেয়ার নিয়েই খেলতে হবে।
এবং এই ম্যাচের মধ্যে যদি আপনাদের Squad চ্যাম্পিয়ন হয় বা কোনো পজিশনের মধ্যে থাকে, তাহলে শুধুমাত্র ৩ স্লটের রিওয়ার্ড দেওয়া হবে। বাইরের Squad-এর প্লেয়ারের জন্য কোনো রিওয়ার্ড প্রদান করা হবে না।
4. ম্যাচে ঢোকার পর যদি দেখেন রুমে ৪৮ স্লট পূর্ণ বা ৪৫ জনের বেশি প্লেয়ার আগে থেকেই আছে, তাহলে আপনার পুরো টিম নিয়ে অবজার্ভারে জয়েন করবেন। আর যদি অবজার্ভারে স্লট ফাঁকা না থাকে, তাহলে আপনার ফোনের বর্তমান সময়সহ একটি ছোট ভিডিও রেকর্ড করতে হবে। এই ভিডিওটি ম্যাচে জয়েন করার সময় যাচাইয়ের জন্য প্রয়োজন হবে। সময় পার হলে রিফান্ড দেওয়া হবে না, এবং এ বিষয়ে পরবর্তীতে ভিডিও দিয়েও কোনো সমাধান দেওয়া সম্ভব হবে না।
5. ম্যাচ শুরু হওয়ার পর যদি নেটওয়ার্ক ইস্যু বা কোনো গ্লিচের কারণে স্কোয়াডের ১-২ জন সদস্য ম্যাচে প্রবেশ করতে না পারে, তাহলে ম্যাচে থাকা বাকি প্লেয়ার নিয়েই খেলতে হবে। এই সমস্যার জন্য Zyrox Arena 🎮 দায়ী থাকবে না।
6. সব ধরনের বন্দুক (Gun) ব্যবহার করা যাবে।
7. সব ধরনের ক্যারেক্টার ব্যবহার করা যাবে, তবে Misha ক্যারেক্টার ব্যবহার করা যাবে না।
8. সব ধরনের গাড়ি ব্যবহার করা যাবে, কিন্তু কাউকে গাড়ি দিয়ে ড্যামেজ দেওয়া যাবে না।
9. ম্যাচের মধ্যে আপনি নিজের টিমমেটকে রিভাইভ করতে পারবেন।
10. ম্যাচের Prize নির্ধারণ করা হবে পয়েন্ট আকারে:
TOP 1 — 12 POINT
TOP 2 — 9 POINT
TOP 3 — 8 POINT
TOP 4 — 7 POINT
TOP 5 — 6 POINT
TOP 6 — 5 POINT
TOP 7 — 4 POINT
TOP 8 — 3 POINT
TOP 9 — 2 POINT
TOP 10 — 1 POINT
Per Kill — 1 POINT
11. কোনো প্লেয়ার যদি অস্বাভাবিক কিছু (হ্যাক বা গ্লিচ ইত্যাদি) ব্যবহার করে, তাহলে তার পুরো টিম Disqualify হবে এবং সেই প্লেয়ারকে আমাদের অ্যাপ থেকে স্থায়ীভাবে (Permanent) Ban করা হবে।
12. ম্যাচের মধ্যে কোনো ধরনের টিমআপ (Team-up) অনুমোদিত নয়। যদি কেউ টিমআপ করে, তাহলে পুরো টিমকে Disqualify করা হবে।
13. যদি কোনো প্লেয়ার Misha ক্যারেক্টার ব্যবহার করে অথবা গাড়ি দিয়ে অন্য প্লেয়ারকে ড্যামেজ দেয়, তাহলে তাদের স্কোয়াড থেকে ১৫ পয়েন্ট কেটে নেওয়া হবে।
14. Zyrox Arena 🎮 থেকে স্লট কেনার পর আপনাকে একটি গ্রুপে জয়েন করতে বলা হবে। আপনাকে অবশ্যই সেই গ্রুপে জয়েন থাকতে হবে, কারণ সেই গ্রুপেই সব ম্যাচের রেজাল্ট দেওয়া হবে।
15. একটি ম্যাচ শেষ হওয়ার ২০-৩০ মিনিটের মধ্যে Prize অ্যাকাউন্টে অ্যাড করা হবে।`,

  'Free Match': `🎮 Zyrox Arena 🎮 || FREE MATCH RULES

1. Match-এর Room ID & Password আমাদের Facebook Group-এ দেওয়া হবে। Match Join করার পর “Join Group” Button পাবেন—অবশ্যই Group-এ Join করবেন, Room ID & Password সেখানেই দেওয়া হবে।
2. আপনি যে আইডি দিয়ে খেলবেন, সেই আইডির লেভেল কমপক্ষে 40 হতে হবে। এর কম হলে আপনাকে ম্যাচ খেলতে দেওয়া হবে না।
3. Match-এ সর্বমোট ৪৮টি Slot থাকবে। যারা সবার আগে Join করবে, সেই প্রথম ৪৮ জনকে নিয়েই Match Start করা হবে।
4. ম্যাচ শুরু হওয়ার পর কোনো কারণে যদি আপনাকে ম্যাচে প্রবেশ করানো না হয়, তাহলে এর জন্য Zyrox Arena 🎮 বা প্রতিপক্ষ দায়ী থাকবে না, কারণ এই সমস্যা সাধারণত আপনার নেটওয়ার্ক সমস্যার কারণে হতে পারে।
5.
🔰 গাড়ি ব্যবহার করা যাবে।
🔰 সব ধরনের বন্দুক (Gun) ব্যবহার করা যাবে।
🔰 Oto Aim Off থাকবে।
🔰 500 Hp থাকবে।
🔰 Headshot mode on থাকবে।
🔰 revive on থাকবে। একবার মরে গেলেও আবার রিভাইভ হতে পারবেন।
6. Match Winning নেওয়ার জন্য Group-এর Admin-এর Inbox-এ Win Screenshot পাঠাতে হবে। পাশাপাশি Zyrox Arena 🎮 App থেকে Match Join করার Screenshot-ও অবশ্যই পাঠাতে হবে।`,

  'Survival': `🎮 Zyrox Arena 🎮 || SURVIVAL MATCH RULES

1. ম্যাচে জয়েন করার সময় অবশ্যই আপনার গেম আইডি ভালোভাবে মিলিয়ে নিবেন। গেম আইডি ব্যতীত অন্য কিছু লিখে জয়েন করলে ম্যাচ খেলতে দেওয়া হবে না।
2. আপনি যে আইডি দিয়ে খেলবেন, সেই আইডির লেভেল কমপক্ষে ৪০ হতে হবে। এর কম লেভেলের হলে আপনাকে ম্যাচ খেলতে দেওয়া হবে না।
3. ম্যাচ বা অ্যাপ সংক্রান্ত কোনো সমস্যার ক্ষেত্রে অবশ্যই ভিডিও বা স্পষ্ট প্রমাণ সংরক্ষণ করে রাখবেন। কারণ প্রমাণ ছাড়া আমরা সমস্যাটি যাচাই করতে পারি না, তাই প্রমাণ না থাকলে কোনো অভিযোগ গ্রহণ বা সমাধান করা হবে না।
4. যদি আপনি নির্ধারিত সময়ের মধ্যে ম্যাচে ঢুকে দেখেন ৪৮ স্লট Full বা ম্যাচ ইতিমধ্যেই playing হয়ে গেছে, তখন আপনার ফোনের বর্তমান সময়সহ একটি ছোট ভিডিও রেকর্ড করবেন। এই ভিডিও আপনার ম্যাচ জয়েন করার সময় যাচাইয়ের জন্য আমাদের প্রয়োজন হবে। অন্যথায় সময় পার হলে রিফান্ড দেওয়া হবে না, আর এক্ষেত্রে আমাদের ভিডিও দিয়েও কোনো লাভ নেই।
6. Custom Roome জয়েন করার পর ম্যাচ Start হওয়ার সময় কোনো কারণে আপনি যদি ম্যাচে প্রবেশ করতে না পারেন, তাহলে তার জন্য Zyrox Arena 🎮 দায়ী থাকবে না, কারণ এটি সাধারণত আপনার নেটওয়ার্ক সমস্যার কারণে হতে পারে।
7. আপনি যদি নিজের জয়েন করা ম্যাচে বাহিরের প্লেয়ার Invite করেন, তাহলে আপনার একাউন্টের সকল বেলেন্স কেটে নেওয়া হবে।
8. ম্যাচের মধ্যে কেউ কারো সাথে টিম আপ করলে, তাদের সবার একাউন্টের বেলেন্স ০ করে দেওয়া হবে।
9.
🔰🔰 গাড়ি ব্যবহার করা যাবে।
🔰 সব ধরনের বন্দুক (Gun) ব্যবহার করা যাবে।
🔰 Oto Aim Off থাকবে।
🔰 500 Hp থাকবে।
🔰 Headshot mode on থাকবে।
🔰 revive on থাকবে। একবার মরে গেলেও আবার রিভাইভ হতে পারবেন।
10. একটি ম্যাচ শেষ হওয়ার ১০-২০ মিনিটের মধ্যে আপনার রিওয়ার্ড আপনার অ্যাকাউন্টে অ্যাড হয়ে যাবে।`,

  'Lose 2 Win': `🎮 Zyrox Arena 🎮 || Lose to Win / Reverse Mode Rules

${common.slot}

${common.level}

${common.network}

⚠️ 4. Join & Refund Rules
আপনি যদি Custom Room-এ Join না করেন, তাহলে কোনো প্রকার Refund বা Reward দেওয়া হবে না।
তবে একবার Room-এ Join করার পর বের হয়ে গেলে বা Network সমস্যার কারণে Disconnect হলে, সেক্ষেত্রেও কোনো Refund বা Reward প্রদান করা হবে না।

⚠️ 5. Match Leave Rules
ম্যাচ চলাকালীন সকল Player-কে শেষ পর্যন্ত Game-এ থাকতে হবে।
ইচ্ছাকৃতভাবে Match Leave বা Back করা অবৈধ আচরণ হিসেবে গণ্য হবে। ম্যাচ থেকে Back করলে কোনো ধরনের Prize Money বা Refund দেওয়া হবে না।

⚠️ 6. Reward Rules
এই Mode-এ যে Player ম্যাচে হারবে, সেই Player-ই Reward পাবে।
যে Player জিতবে, সে কোনো Reward পাবে না। ✔️`
};

RULES['BR Duo'] = RULES['BR Solo'];

const SERIES = [
  { mode: 'BR Solo', variants: [
    { fee: 5, pool: 200, slots: 48, kill: 3, split: [49,37,26,12,6] },
    { fee: 10, pool: 400, slots: 48, kill: 6, split: [100,60,50,30,20] }
  ]},
  { mode: 'BR Duo', variants: [
    { fee: 10, pool: 400, slots: 48, kill: 6, split: [120,85,55] },
    { fee: 20, pool: 800, slots: 48, kill: 12, split: [240,170,110] }
  ]},
  { mode: 'CS Headshot', variants: [
    { fee: 35, pool: 100, slots: 4, kill: 0, split: [80] },
    { fee: 35, pool: 200, slots: 8, kill: 0, split: [160] }
  ]},
  { mode: 'CS 4 VS 4', variants: [
    { fee: 35, pool: 100, slots: 8, kill: 0, split: [80] },
    { fee: 35, pool: 100, slots: 8, kill: 0, split: [80] }
  ]},
  { mode: 'Clash Squad', variants: [
    { fee: 35, pool: 100, slots: 4, kill: 0, split: [80] },
    { fee: 35, pool: 200, slots: 8, kill: 0, split: [160] }
  ]},
  { mode: 'Lone Wolf', variants: [
    { fee: 35, pool: 110, slots: 4, kill: 0, split: [88] },
    { fee: 85, pool: 310, slots: 4, kill: 0, split: [248] }
  ]},
  { mode: 'Lose 2 Win', variants: [
    { fee: 80, pool: 110, slots: 2, kill: 0, split: [88] },
    { fee: 80, pool: 110, slots: 2, kill: 0, split: [88] }
  ]},
  { mode: 'Free Match', variants: [
    { fee: 0, pool: 100, slots: 48, kill: 0, split: [8,8,8,8,8,8,8,8,8,8] },
    { fee: 0, pool: 200, slots: 48, kill: 0, split: [16,16,16,16,16,16,16,16,16,16] }
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

function validateVariant(v, mode) {
  const net = v.pool - Math.floor(v.pool * 0.20);
  const rankTotal = v.split.reduce((sum, amount) => sum + amount, 0);
  const killReserve = v.kill * 10;
  if (!Array.isArray(v.split) || v.split.length === 0) {
    throw new Error(`${mode}: prize split cannot be empty`);
  }
  if (rankTotal + killReserve !== net) {
    throw new Error(`${mode}: Prize budget mismatch. Net=${net}, rank=${rankTotal}, kill reserve=${killReserve}`);
  }
}

(async () => {
  try {
    await db.init();
    const game = await db.one("SELECT id FROM games WHERE name='Free Fire'");
    if (!game) throw new Error('Free Fire game not found');

    const plan = [];
    for (const series of SERIES) {
      const rules = RULES[series.mode];
      if (!rules) throw new Error(`Rules missing for ${series.mode}`);

      let mode = await db.one(
        'SELECT id FROM modes WHERE game_id=? AND lower(name)=lower(?)',
        [game.id, series.mode]
      );
      if (!mode) {
        mode = await db.one(
          'INSERT INTO modes(game_id,name) VALUES(?,?) RETURNING id',
          [game.id, series.mode]
        );
      }

      for (let i = 0; i < 20; i++) {
        const variant = series.variants[Math.floor(i / 10)];
        validateVariant(variant, series.mode);
        plan.push({
          series: series.mode,
          modeId: mode.id,
          variant,
          rules,
          ordinal: i + 1
        });
      }
    }

    if (plan.length !== 200) throw new Error(`Expected 200 matches, got ${plan.length}`);

    // Same entry fee matches are paired together without changing their fee.
    plan.sort((a, b) => a.variant.fee - b.variant.fee);

    const feeCounts = new Map();
    for (const p of plan) {
      feeCounts.set(p.variant.fee, (feeCounts.get(p.variant.fee) || 0) + 1);
    }
    for (const [fee, count] of feeCounts) {
      if (count % 2 !== 0) {
        throw new Error(`Entry fee ৳${fee} has an odd number of matches (${count})`);
      }
    }

    const existing = await db.one(
      "SELECT COUNT(*)::int n FROM matches WHERE title LIKE 'ZYROX AUTO 2026-%'"
    );
    if (Number(existing.n) > 0) {
      console.log(`Seeder skipped: ${existing.n} ZYROX AUTO matches already exist.`);
      return;
    }

    const start = new Date('2026-11-30T08:00:00+06:00');

    await db.transaction(async tx => {
      for (let i = 0; i < plan.length; i++) {
        const p = plan[i];
        const v = p.variant;
        const startsAt = new Date(start.getTime() + i * 30 * 60 * 1000);
        const title = `ZYROX AUTO 2026-${p.series} #${String(p.ordinal).padStart(2, '0')} · Entry ৳${v.fee}`;

        await tx.exec(
          `INSERT INTO matches
          (game_id,mode_id,title,entry_fee,prize_pool,starts_at,player_limit,
           prize_mode,platform_fee_percent,kill_reward,prize_split_json,
           refund_on_cancel,rules)
          VALUES(?,?,?,?,?,?::timestamptz,?,'fixed',20,?,?,TRUE,?)`,
          [
            game.id,
            p.modeId,
            title,
            v.fee,
            v.pool,
            startsAt.toISOString(),
            v.slots,
            v.kill,
            JSON.stringify(v.split),
            p.rules
          ]
        );
      }
    });

    console.log('SUCCESS: Created 200 matches.');
    console.log('10 modes × 20 matches each.');
    console.log('Start: 30 November 2026, 08:00 Bangladesh time.');
    console.log('Interval: 30 minutes.');
    console.log('Platform fee: 20%; configured prize budget: remaining 80%.');
  } catch (error) {
    console.error('Tournament seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
})();
                                                                          
