// ===== Rules =====
const MAX_STAKE = 1_000_000;      // KES any one person can put into a single bet
const MAX_OPPONENTS = 40;         // most people one person can bet against
const FEE_RATE  = 0.01;           // company cut
// "winnings" = the full amount paid to each winner. Switch to 'profit' to charge 1% of the losing side's money only.
const FEE_BASIS = 'pot';

// Formats. Sides are always balanced: total money on A equals total money on B.
const FORMATS = {
  '1v1': { label:'1 v 1',        short:'Head to head' },
  '1vN': { label:'1 v Many',     short:'You alone vs a crowd' },
  'Nv1': { label:'Many v 1',     short:'A crowd vs one person' },
  'NvN': { label:'Team v Team',  short:'2v2, 3v3 … equal teams' },
};
function makeSides(format, n, s){
  if (format === '1v1') return [{ size:1, stake:s }, { size:1, stake:s }];
  if (format === '1vN') return [{ size:1, stake:n*s }, { size:n, stake:s }];
  if (format === 'Nv1') return [{ size:n, stake:s }, { size:1, stake:n*s }];
  return [{ size:n, stake:s }, { size:n, stake:s }];
}
// What one winner receives for a given personal stake (sides are balanced, so each winner doubles up before the fee)
const winFor = stake => FEE_BASIS === 'pot' ? stake*2*(1-FEE_RATE) : stake*2 - stake*FEE_RATE;
const maxSeat = (format, n) => (format === '1vN' || format === 'Nv1') ? Math.floor(MAX_STAKE / n) : MAX_STAKE;

const fmt = n => 'KES ' + Math.round(n).toLocaleString('en-KE');
const short = n => n >= 1e6 ? (n/1e6).toFixed(n%1e6?1:0)+'M' : n >= 1e3 ? Math.round(n/1e3)+'K' : String(n);
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ===== Sample data =====
const C = {
  'Kenya':'🇰🇪','Nigeria':'🇳🇬','Ghana':'🇬🇭','South Africa':'🇿🇦','Uganda':'🇺🇬','Tanzania':'🇹🇿',
  'United Kingdom':'🇬🇧','Spain':'🇪🇸','Italy':'🇮🇹','Brazil':'🇧🇷','United States of America':'🇺🇸',
  'India':'🇮🇳','United Arab Emirates':'🇦🇪','Japan':'🇯🇵'
};
const CN = n => n === 'United States of America' ? 'United States' : n;
const people = [
 ['kevin','Kevin','Kenya','Nairobi',-1.29,36.82,250000],
 ['brian','Brian','Kenya','Mombasa',-4.04,39.67,1400000],
 ['amina','Amina','Kenya','Kisumu',-0.09,34.77,180000],
 ['wanjiru','Wanjiru','Kenya','Nakuru',-0.30,36.07,300000],
 ['tunde','Tunde','Nigeria','Lagos',6.52,3.38,900000],
 ['chidi','Chidi','Nigeria','Abuja',9.06,7.49,400000],
 ['kwame','Kwame','Ghana','Accra',5.60,-0.19,350000],
 ['thabo','Thabo','South Africa','Johannesburg',-26.20,28.04,600000],
 ['joseph','Joseph','Uganda','Kampala',0.35,32.58,200000],
 ['neema','Neema','Tanzania','Dar es Salaam',-6.79,39.21,250000],
 ['james','James','United Kingdom','London',51.50,-0.12,2000000],
 ['olivia','Olivia','United Kingdom','Manchester',53.48,-2.24,700000],
 ['carlos','Carlos','Spain','Madrid',40.40,-3.70,800000],
 ['sofia','Sofia','Italy','Milan',45.46,9.19,500000],
 ['lucas','Lucas','Brazil','São Paulo',-23.55,-46.63,450000],
 ['mike','Mike','United States of America','New York',40.71,-74.00,1500000],
 ['tyler','Tyler','United States of America','Los Angeles',34.05,-118.24,600000],
 ['arjun','Arjun','India','Mumbai',19.07,72.87,500000],
 ['omar','Omar','United Arab Emirates','Dubai',25.20,55.27,3000000],
 ['yuki','Yuki','Japan','Tokyo',35.68,139.69,400000],
];
const REGION = {
  'Kenya':'Africa','Nigeria':'Africa','Ghana':'Africa','South Africa':'Africa','Uganda':'Africa','Tanzania':'Africa',
  'United Kingdom':'Europe','Spain':'Europe','Italy':'Europe',
  'Brazil':'Americas','United States of America':'Americas',
  'India':'Asia & Middle East','United Arab Emirates':'Asia & Middle East','Japan':'Asia & Middle East'
};
const REGIONS = ['all','Africa','Europe','Americas','Asia & Middle East'];
// Budget = what you'd put in to take an open seat
const BUDGET_STEPS = [0,1000,5000,10000,25000,50000,100000,250000,500000,1000000];
const BUDGET_PRESETS = [['Any',0,1000000],['Under 10K',0,10000],['10K–50K',10000,50000],['50K–250K',50000,250000],['250K–1M',250000,1000000]];
// Bet categories, chosen when a bet is created
const CATEGORIES = {
  football:'Football', basketball:'Basketball', rugby:'Rugby', cricket:'Cricket', tennis:'Tennis',
  athletics:'Athletics', motorsport:'Motorsport', combat:'Boxing & MMA', nfl:'American football',
  racing:'Horse racing', esports:'Esports', personal:'Personal challenge', other:'Other'
};
// Suggests a category from the event text (the creator can always change it)
const CAT_HINTS = [
  ['esports',/\b(fifa|ea ?fc|efootball|fortnite|cs2|valorant|dota|league of legends|esports?|pubg|cod)\b/i],
  ['basketball',/\b(nba|lakers|celtics|basketball|warriors|euroleague)\b/i],
  ['rugby',/\b(rugby|springboks|all blacks|sevens|shujaa|six nations)\b/i],
  ['cricket',/\b(cricket|ipl|test match|1st test|odi|t20|ashes)\b/i],
  ['tennis',/\b(tennis|wimbledon|us open|roland|atp|wta|sinner|alcaraz|djokovic)\b/i],
  ['athletics',/\b(marathon|1500m|800m|100m|athletics|kip keino|diamond league|kipyegon|relay)\b/i],
  ['motorsport',/\b(grand prix|f1|formula|verstappen|motogp|safari rally|rally|nascar)\b/i],
  ['combat',/\b(ufc|mma|boxing|knockout|fight night|bellator)\b/i],
  ['nfl',/\b(nfl|super bowl|touchdown|patriots|cowboys|eagles vs)\b/i],
  ['racing',/\b(horse|derby stakes|dubai world cup|grand national|cheltenham)\b/i],
  ['personal',/\b(me vs|who finishes|who wins between|bet you|i can|you can't|5-a-side|pool table)\b/i],
  ['football',/\b(vs|fc|united|city|derby|league|champions|afcon|harambee|gor mahia|leopards|arsenal|chelsea|liverpool|madrid|barça|barcelona|cl[aá]sico|inter|milan|flamengo|goals?|wc qualifier|cup)\b/i],
];
const guessCat = t => (CAT_HINTS.find(([,r]) => r.test(t)) || ['other'])[0];
const DEFAULT_FILT = () => ({ cat:'all', fmt:'all', min:0, max:MAX_STAKE, region:'all', afford:false });
const S = { me:'kevin', tab:'discover', dview:'map', country:null, friendsOnly:false, filt:DEFAULT_FILT(), csearch:'', csort:'count', showFilters:true,
  target:'public', form:{ format:'1v1', n:4, st:5000, cat:'football', catTouched:false },
  users:{}, friends:{}, requests:{}, revenue:0, bets:[], ledger:[] };
people.forEach(([id,name,country,city,lat,lng,bal]) => S.users[id] = {id,name,country,city,lat,lng,balance:bal,escrow:0});
[['kevin','brian'],['kevin','amina'],['kevin','tunde'],['kevin','james'],['kevin','joseph'],['brian','amina'],['brian','omar'],['brian','wanjiru'],['tunde','chidi'],['james','olivia'],['mike','tyler']]
  .forEach(([a,b]) => addFriend(a,b));
S.requests = { kevin:['kwame','omar'] };

function addFriend(a,b){ (S.friends[a] ||= new Set()).add(b); (S.friends[b] ||= new Set()).add(a); }
function removeFriend(a,b){ S.friends[a]?.delete(b); S.friends[b]?.delete(a); }
const isFriend = (a,b) => !!S.friends[a]?.has(b);
const friendsOf = id => [...(S.friends[id] || [])].map(f => S.users[f]);
function log(user, type, amount, ref){ S.ledger.unshift({ t:new Date(), user, type, amount, ref }); }

// ===== Bet engine =====
const inBet = (b, u) => b.sides.some(s => s.members.includes(u));
const sideOf = (b, u) => b.sides.findIndex(s => s.members.includes(u));
const isFull = b => b.sides.every(s => s.members.length === s.size);
const potOf = b => b.sides.reduce((a,s) => a + s.size*s.stake, 0);
const lockedOf = b => b.sides.reduce((a,s) => a + s.members.length*s.stake, 0);
const peopleIn = b => b.sides.reduce((a,s) => a + s.members.length, 0);
const seatsOf = b => b.sides.reduce((a,s) => a + s.size, 0);
const fmtLabel = b => `${b.sides[0].size} v ${b.sides[1].size}`;

function lock(user, amount, ref){ const u = S.users[user]; u.balance -= amount; u.escrow += amount; log(user, 'Stake to escrow', -amount, ref); }
function unlock(user, amount, ref){ const u = S.users[user]; u.balance += amount; u.escrow -= amount; log(user, 'Refund', amount, ref); }

function createBet({ by, event, pickA, pickB, format='1v1', n=1, stake, vis='public', target=null, cat }){
  cat = CATEGORIES[cat] ? cat : guessCat(event);
  const [a, b] = makeSides(format, n, stake);
  const bet = { id:uid(), event, cat, format, maker:by, vis, target, status:'open', winner:null,
    sides:[{ ...a, pick:pickA, members:[] }, { ...b, pick:pickB, members:[] }] };
  S.bets.unshift(bet); joinBet(bet, by, 0, true); return bet;
}
function joinBet(b, user, side, silent){
  if (typeof b === 'string') b = S.bets.find(x => x.id === b);
  const s = b.sides[side]; s.members.push(user); lock(user, s.stake, b.id);
  if (isFull(b)) b.status = 'matched';
  return b;
}
function leaveBet(id, user){
  const b = S.bets.find(x => x.id === id), s = b.sides[sideOf(b, user)];
  s.members = s.members.filter(m => m !== user); unlock(user, s.stake, b.id);
}
function cancelBet(id){
  const b = S.bets.find(x => x.id === id);
  b.sides.forEach(s => s.members.forEach(m => unlock(m, s.stake, b.id)));
  b.status = 'cancelled';
}
function settleBet(id, winSide){
  const b = S.bets.find(x => x.id === id), W = b.sides[winSide], L = b.sides[1-winSide];
  const pot = potOf(b), base = FEE_BASIS === 'pot' ? pot : L.size*L.stake, fee = base*FEE_RATE, wTotal = W.size*W.stake;
  b.sides.forEach(s => s.members.forEach(m => S.users[m].escrow -= s.stake));
  W.members.forEach(m => { const net = (pot - fee) * W.stake / wTotal; S.users[m].balance += net; log(m, 'Winnings', net, b.id); });
  S.revenue += fee; log('house', 'Commission 1%', fee, b.id);
  Object.assign(b, { status:'settled', winner:winSide, fee });
}
function canSee(b, me){
  if (me === 'admin' || b.vis === 'public' || inBet(b, me)) return true;
  if (b.vis === 'friends') return isFriend(b.maker, me);
  if (b.vis === 'direct') return b.target === me;
  return false;
}
// Why `user` can't join `side` of `b` (or '' if they can)
function blockReason(b, user, side){
  const s = b.sides[side], u = S.users[user];
  if (b.status !== 'open' || inBet(b, user)) return 'x';
  if (s.members.length >= s.size) return 'Side full';
  if (b.vis === 'direct' && b.target !== user) return 'x';
  if (s.stake > MAX_STAKE) return 'Over KES 1M cap';
  if (b.sides[1-side].size > MAX_OPPONENTS) return `Over ${MAX_OPPONENTS} opponents`;
  if (u.balance < s.stake) return 'Not enough balance';
  return '';
}

// ===== Seed bets =====
[
 ['brian','Gor Mahia vs AFC Leopards · Sun 5 Oct','Gor Mahia win','Draw or Leopards win',20000],
 ['amina','Arsenal vs Man City · Sat 4 Oct','Over 2.5 goals','Under 2.5 goals',5000],
 ['wanjiru','Kip Keino Classic 1500m','Kipyegon wins','Anyone else wins',25000],
 ['tunde','Nigeria vs South Africa · WC qualifier','Super Eagles win','Bafana win or draw',80000],
 ['chidi','Enyimba vs Rivers United','Enyimba win','Draw or Rivers win',12000],
 ['kwame','Hearts of Oak vs Kotoko','Kotoko win','Draw or Hearts win',8000],
 ['thabo','Chiefs vs Pirates · Soweto derby','Pirates win','Draw or Chiefs win',40000],
 ['joseph','Uganda Cranes vs Kenya','Cranes win','Draw or Kenya win',10000],
 ['neema','Simba vs Yanga · Kariakoo derby','Simba win','Draw or Yanga win',18000],
 ['olivia','Man United vs Spurs','Man United win','Draw or Spurs win',60000],
 ['carlos','El Clásico · Sun 26 Oct','Real Madrid win','Draw or Barça win',200000],
 ['sofia','Inter vs Milan · Derby della Madonnina','Inter win','Draw or Milan win',75000],
 ['lucas','Flamengo vs Palmeiras','Flamengo win','Draw or Palmeiras win',35000],
 ['tyler','UFC 322 main event','Knockout finish','Decision or submission',45000],
 ['arjun','India vs Australia · 1st Test','India win','Australia win or draw',100000],
 ['yuki','Japan vs Korea · friendly','Japan win','Draw or Korea win',30000],
].forEach(([by,event,pickA,pickB,stake]) => createBet({ by, event, pickA, pickB, stake }));

// Multi-person examples
const seed = (o, joins=[]) => { const b = createBet(o); joins.forEach(([u, side]) => joinBet(b, u, side)); return b; };
seed({ by:'james', event:'Champions League winner 2027', pickA:'Any club except Real Madrid', pickB:'Real Madrid', format:'1vN', n:40, stake:25000 },
  ['olivia','carlos','sofia','mike','tyler','arjun','yuki','lucas','chidi','kwame','neema','thabo'].map(u => [u,1]));
seed({ by:'omar', event:'Abu Dhabi Grand Prix · Sun 7 Dec', pickA:'Verstappen does not win', pickB:'Verstappen wins', format:'1vN', n:10, stake:50000 },
  [['brian',1],['mike',1],['arjun',1],['carlos',1]]);
seed({ by:'thabo', event:'Springboks vs All Blacks · Sat 18 Oct', pickA:'Springboks win', pickB:'All Blacks win or draw', format:'Nv1', n:4, stake:100000 },
  [['lucas',0],['carlos',0]]);
seed({ by:'brian', event:'Harambee Stars vs Gabon · WC qualifier', pickA:'Harambee Stars win', pickB:'Gabon win or draw', format:'Nv1', n:5, stake:30000 },
  [['wanjiru',0],['amina',0]]);
seed({ by:'kevin', event:'Arsenal vs Spurs · North London derby', pickA:'Arsenal win', pickB:'Draw or Spurs win', format:'NvN', n:2, stake:20000, vis:'friends' },
  [['brian',1]]);
seed({ by:'tunde', event:'AFCON 2027 winner', pickA:'Nigeria', pickB:'Any other nation', format:'NvN', n:3, stake:30000 },
  [['chidi',0],['kwame',1],['thabo',1]]);
seed({ by:'mike', event:'NBA Finals 2027', pickA:'Celtics win', pickB:'Any other team', format:'NvN', n:5, stake:10000 },
  [['tyler',1],['james',0],['olivia',1]]);
createBet({ by:'kevin', event:'EA FC 26 · best of 3 online', pickA:'I win', pickB:'You win', stake:5000, cat:'esports' });
createBet({ by:'joseph', event:'Safari Rally 2027 overall', pickA:'Kalle Rovanperä wins', pickB:'Anyone else wins', stake:15000, cat:'motorsport' });
createBet({ by:'amina', event:'Who finishes the Nairobi marathon faster', pickA:'Me', pickB:'You', stake:2000, cat:'personal', vis:'direct', target:'kevin' });
createBet({ by:'brian', event:'Mombasa beach 5-a-side · Sat', pickA:'My team wins', pickB:'Your team wins', stake:3000, cat:'personal', vis:'friends' });
// history
const h1 = seed({ by:'amina', event:'Man United vs Chelsea · Sat 27 Sep', pickA:'Man United win', pickB:'Chelsea win or draw', stake:10000 }, [['kevin',1]]);
settleBet(h1.id, 1);
const h2 = seed({ by:'kevin', event:'Mashemeji derby · Sun 21 Sep', pickA:'Gor Mahia win', pickB:'Leopards win or draw', format:'1vN', n:4, stake:10000 },
  [['brian',1],['amina',1],['wanjiru',1],['joseph',1]]);
settleBet(h2.id, 0);
seed({ by:'kevin', event:'Tusker vs Shabana · Wed 1 Oct', pickA:'Tusker win', pickB:'Shabana win or draw', stake:30000 }, [['brian',1]]);

// ===== Render helpers =====
const $ = s => document.querySelector(s);
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2600); }
const who = id => S.users[id];
const flag = id => C[who(id).country] || '🏳️';

// Prices of seats still open on a bet (what a newcomer would put in)
const seatPrices = b => b.sides.filter(s => s.members.length < s.size).map(s => s.stake);
function passes(b, skip = ''){
  const f = S.filt, prices = seatPrices(b), mine = S.me === 'admin' ? Infinity : who(S.me)?.balance ?? Infinity;
  if (b.status !== 'open' || !canSee(b, S.me)) return false;
  if (S.friendsOnly && !(isFriend(b.maker, S.me) || b.maker === S.me)) return false;
  if (skip !== 'cat' && f.cat !== 'all' && b.cat !== f.cat) return false;
  if (skip !== 'fmt' && f.fmt !== 'all' && b.format !== f.fmt) return false;
  if (skip !== 'region' && f.region !== 'all' && REGION[who(b.maker).country] !== f.region) return false;
  if (!prices.some(p => p >= f.min && p <= f.max && (!f.afford || p <= mine))) return false;
  return true;
}
function openVisible(skip){ return S.bets.filter(b => passes(b, skip)); }
function activeFilters(){ const f = S.filt; return (f.cat!=='all') + (f.fmt!=='all') + (f.region!=='all') + (f.min>0 || f.max<MAX_STAKE) + f.afford + S.friendsOnly; }
function byCountry(){
  const m = new Map();
  openVisible().forEach(b => { const c = who(b.maker).country; const r = m.get(c) || { country:c, count:0, pool:0, min:Infinity, max:0 }; r.count++; r.pool += potOf(b); (r.cats ||= {})[b.cat] = (r.cats[b.cat]||0) + 1;
    seatPrices(b).forEach(p => { r.min = Math.min(r.min, p); r.max = Math.max(r.max, p); }); m.set(c, r); });
  return [...m.values()].sort((a,b) => b.count - a.count || b.pool - a.pool);
}

function renderWallet(){
  if (S.me === 'admin'){
    const escrow = Object.values(S.users).reduce((a,u) => a + u.escrow, 0);
    const volume = S.bets.filter(b => b.status === 'settled').reduce((a,b) => a + potOf(b), 0);
    const countries = new Set(S.bets.filter(b=>b.status==='open').map(b => who(b.maker).country)).size;
    $('#wallet').innerHTML = `
      <div class="stat"><span class="k">Company revenue</span><span class="v money">${fmt(S.revenue)}</span></div>
      <div class="stat escrow"><span class="k">Held in escrow</span><span class="v money">${fmt(escrow)}</span></div>
      <div class="stat"><span class="k">Settled volume</span><span class="v money">${fmt(volume)}</span></div>
      <div class="stat"><span class="k">Active countries</span><span class="v money">${countries}</span></div>`;
    return;
  }
  const u = who(S.me);
  $('#wallet').innerHTML = `
    <div class="stat"><span class="k">Available balance</span><span class="v money">${fmt(u.balance)}</span>
      <div class="row"><button class="btn sm" id="dep">Deposit via M-Pesa</button><button class="btn sm ghost" id="wd">Withdraw</button></div></div>
    <div class="stat escrow"><span class="k">Locked in escrow</span><span class="v money">${fmt(u.escrow)}</span><span class="hint">Released when a bet settles</span></div>
    <div class="stat"><span class="k">Limits per bet</span><span class="v money">${fmt(MAX_STAKE)}</span><span class="hint">Up to ${MAX_OPPONENTS} opponents · 1% commission on winnings</span></div>`;
  $('#dep').onclick = () => { u.balance += 10000; log(S.me,'M-Pesa deposit',10000,'STK'); toast('Deposited KES 10,000 (simulated STK push)'); render(); };
  $('#wd').onclick = () => { const a = Math.min(10000, u.balance); if (!a) return toast('No balance to withdraw'); u.balance -= a; log(S.me,'M-Pesa withdrawal',-a,'B2C'); toast(`Withdrew ${fmt(a)}`); render(); };
}

// ===== Post form =====
function renderLeft(){
  if (S.me === 'admin'){
    const pending = S.bets.filter(b => b.status === 'matched');
    $('#left').innerHTML = `<h2>Settle results</h2><p class="hint">Confirm the real-world outcome. Everyone on the winning side is paid double their stake, minus 1%.</p>
      ${pending.length ? pending.map(b => `<div class="bet"><div class="row between"><span class="ev">${esc(b.event)}</span><span class="fmtpill">${fmtLabel(b)}</span></div>
          <div class="calc"><div><span>Pot</span><span class="money">${fmt(potOf(b))}</span></div><div><span>Commission</span><span class="money">${fmt(potOf(b)*FEE_RATE)}</span></div></div>
          <div class="row"><button class="btn sm" data-settle="${b.id}" data-side="0">${esc(b.sides[0].pick)}</button>
          <button class="btn sm ghost" data-settle="${b.id}" data-side="1">${esc(b.sides[1].pick)}</button></div></div>`).join('')
        : '<div class="empty">No full bets waiting for a result.</div>'}`;
    document.querySelectorAll('[data-settle]').forEach(el => el.onclick = () => { settleBet(el.dataset.settle, +el.dataset.side); toast('Bet settled, winners paid'); render(); });
    return;
  }
  const f = S.form, fr = friendsOf(S.me);
  if (S.target.startsWith('@') && !isFriend(S.me, S.target.slice(1))) S.target = 'public';
  $('#left').innerHTML = `<h2>Post a challenge</h2>
    <form id="f" novalidate class="list">
      <label for="ev">Event<input id="ev" placeholder="e.g. Gor Mahia vs Tusker · Sat 11 Oct" value="${esc(f.ev||'')}"></label>
      <label for="cat">Category<select id="cat">${Object.entries(CATEGORIES).map(([k,l]) => `<option value="${k}">${l}</option>`).join('')}</select>
        <span class="hint" id="cathint" style="font-weight:400"></span></label>
      <label for="pk">Your prediction<input id="pk" placeholder="Gor Mahia win" value="${esc(f.pk||'')}"></label>
      <label for="ag">Other side takes<input id="ag" placeholder="Draw or Tusker win" value="${esc(f.ag||'')}"></label>
      <fieldset style="border:0;padding:0;margin:0;display:grid;gap:6px">
        <legend style="font-size:13px;font-weight:600;padding:0;margin-bottom:5px">Format</legend>
        <div class="fmt">${Object.entries(FORMATS).map(([k,v]) => `<label><input type="radio" name="format" id="fmt-${k}" value="${k}" ${f.format===k?'checked':''}><span><b>${v.label}</b><small>${v.short}</small></span></label>`).join('')}</div>
      </fieldset>
      <label for="n" id="nwrap"><span id="nlab"></span>
        <div class="nrow"><input id="nr" type="range" min="2" max="${MAX_OPPONENTS}" value="${f.n}" aria-label="Number of people"><input id="n" type="number" min="2" max="${MAX_OPPONENTS}" value="${f.n}"></div></label>
      <label for="st"><span id="stlab"></span><input id="st" type="number" inputmode="numeric" min="100" step="100" value="${f.st}"></label>
      <label for="vis">Who can join<select id="vis">
        <option value="public">Anyone, worldwide (shows on Discover)</option>
        <option value="friends">Friends only</option>
        ${fr.map(u => `<option value="@${u.id}" data-direct>Just ${esc(u.name)} ${C[u.country]} (1 v 1)</option>`).join('')}
      </select></label>
      <div class="calc" id="calc"></div>
      <div class="err" id="ferr"></div>
      <button class="btn" type="submit" id="go">Lock stake &amp; post</button>
    </form>`;
  $('#vis').value = S.target; $('#cat').value = f.cat;
  const upd = () => {
    if (!f.catTouched && $('#ev').value.trim()) { f.cat = guessCat($('#ev').value); $('#cat').value = f.cat; }
    $('#cathint').textContent = !f.catTouched && $('#ev').value.trim() ? 'Suggested from the event name. Change it if it\'s wrong.' : '';
    Object.assign(f, { ev:$('#ev').value, pk:$('#pk').value, ag:$('#ag').value, format:document.querySelector('input[name=format]:checked').value });
    f.n = Math.max(2, Math.min(MAX_OPPONENTS, Math.floor(+$('#n').value) || 2)); f.st = Math.floor(+$('#st').value) || 0;
    if (f.format !== '1v1' && S.target.startsWith('@')) { S.target = 'public'; $('#vis').value = 'public'; }
    $('#vis').querySelectorAll('[data-direct]').forEach(o => o.disabled = f.format !== '1v1');
    $('#nwrap').hidden = f.format === '1v1';
    $('#nlab').textContent = { '1vN':'Number of opponents', 'Nv1':'People on your side (incl. you)', 'NvN':'People per team' }[f.format] || '';
    $('#stlab').textContent = { '1v1':'Stake (KES)', '1vN':'Each opponent stakes (KES)', 'Nv1':'Each crowd member stakes (KES)', 'NvN':'Stake per person (KES)' }[f.format];
    const [A, B] = makeSides(f.format, f.n, f.st), mine = A.stake, cap = maxSeat(f.format, f.n);
    const other = f.format === 'Nv1' ? `1 person staking ${fmt(B.stake)}` : B.size === 1 ? `1 person staking ${fmt(B.stake)}` : `${B.size} people × ${fmt(B.stake)}`;
    const mates = A.size > 1 ? `<div><span>Your side</span><span>You + ${A.size-1} × ${fmt(A.stake)}</span></div>` : '';
    $('#calc').innerHTML = `<div><span>Format</span><b class="money">${A.size} v ${B.size}</b></div>
      <div><span>You lock</span><b class="money">${fmt(mine)}</b></div>${mates}
      <div><span>Other side</span><span>${other}</span></div>
      <div><span>Total pot</span><span class="money">${fmt(A.size*A.stake*2)}</span></div>
      <div><span>Commission (1%)</span><span class="money">−${fmt(mine*2*FEE_RATE)}</span></div>
      <div><b>You receive if your side wins</b><b class="money">${fmt(winFor(mine))}</b></div>
      ${cap < MAX_STAKE ? `<div class="hint"><span>Max ${fmt(cap)} each so the single player stays under ${fmt(MAX_STAKE)}</span></div>` : ''}`;
  };
  $('#nr').oninput = () => { $('#n').value = $('#nr').value; upd(); };
  $('#n').oninput = () => { $('#nr').value = $('#n').value; upd(); };
  ['ev','pk','ag','st'].forEach(id => $('#'+id).oninput = upd);
  document.querySelectorAll('input[name=format]').forEach(r => r.onchange = upd);
  $('#vis').onchange = e => S.target = e.target.value;
  $('#cat').onchange = e => { f.cat = e.target.value; f.catTouched = true; upd(); };
  upd();
  $('#f').onsubmit = e => {
    e.preventDefault(); upd();
    const err = $('#ferr'), ev = f.ev.trim(), pk = f.pk.trim(), ag = f.ag.trim(), u = who(S.me);
    const [A] = makeSides(f.format, f.n, f.st), cap = maxSeat(f.format, f.n);
    if (!ev || !pk || !ag) return err.textContent = 'Fill in the event and both sides.';
    if (!f.st || f.st < 100) return err.textContent = 'Minimum stake is KES 100.';
    if (f.st > cap) return err.textContent = `With ${f.n} people, each stake can be at most ${fmt(cap)} (the single player's total is capped at ${fmt(MAX_STAKE)}).`;
    if (A.stake > u.balance) return err.textContent = `You need ${fmt(A.stake)} but have ${fmt(u.balance)}. Deposit more or lower the stake.`;
    const t = S.target, vis = t.startsWith('@') ? 'direct' : t, target = t.startsWith('@') ? t.slice(1) : null;
    const n = f.format === '1v1' ? 1 : f.n;
    createBet({ by:S.me, event:ev, pickA:pk, pickB:ag, format:f.format, n, stake:f.st, vis, target, cat:f.cat });
    S.form = { format:f.format, n:f.n, st:f.st, cat:f.cat, catTouched:false }; S.target = 'public';
    toast(target ? `Challenge sent to ${who(target).name}` : `${A.size} v ${makeSides(f.format,n,f.st)[1].size} posted, ${fmt(A.stake)} locked in escrow`);
    S.tab = 'mine'; render();
  };
}

// ===== Bet card =====
function teamBox(b, i){
  const s = b.sides[i], open = s.size - s.members.length, SHOW = 8;
  const mem = s.members.slice(0, SHOW).map(m => `<span class="mem${m===S.me?' me':''}">${flag(m)} ${m===S.me?'You':esc(who(m).name)}</span>`).join('')
    + (s.members.length > SHOW ? `<span class="mem">+${s.members.length-SHOW} more</span>` : '')
    + (open && b.status === 'open' ? (b.vis === 'direct' && i === 1 ? `<span class="mem seat">Waiting for ${esc(who(b.target).name)}</span>` : `<span class="mem seat">${open} open ${open===1?'seat':'seats'}</span>`) : '');
  const r = S.me === 'admin' ? 'x' : blockReason(b, S.me, i);
  const act = r === '' ? `<button class="btn sm" data-join="${b.id}" data-side="${i}">Join · ${fmt(s.stake)}</button>`
    : (r !== 'x' && r !== 'Side full' ? `<span class="hint">${r}</span>` : '');
  return `<div class="team${b.status==='settled' && b.winner===i ? ' win' : ''}">
    <div class="pk">${esc(s.pick)}</div>
    <div class="meta">${s.size === 1 ? 'Single player' : `${s.size} players`} · <span class="money">${fmt(s.stake)}</span> each</div>
    ${s.size > 1 ? `<div class="fill${open?'':' full'}"><i style="width:${s.members.length/s.size*100}%"></i></div>` : ''}
    <div class="members">${mem}</div>
    ${act ? `<div class="row">${act}</div>` : ''}
  </div>`;
}
function betCard(b){
  const mySide = S.me === 'admin' ? -1 : sideOf(b, S.me);
  let pill = `<span class="pill ${b.status}">${b.status === 'open' ? `${peopleIn(b)}/${seatsOf(b)} joined` : b.status}</span>`;
  if (b.status === 'settled' && mySide >= 0){
    const st = b.sides[mySide].stake;
    pill = b.winner === mySide ? `<span class="pill won">Won ${fmt(winFor(st))}</span>` : `<span class="pill lost">Lost ${fmt(st)}</span>`;
  }
  const vis = b.vis === 'friends' ? '<span class="pill priv">Friends</span>' : b.vis === 'direct' ? '<span class="pill priv">Direct</span>' : '';
  let own = '';
  if (b.status === 'open' && mySide >= 0)
    own = b.maker === S.me ? `<button class="btn sm ghost" data-cancel="${b.id}">Cancel &amp; refund everyone</button>`
                           : `<button class="btn sm ghost" data-leave="${b.id}">Leave &amp; refund</button>`;
  const m = who(b.maker);
  return `<article class="bet">
    <div class="top"><span class="row"><span class="fmtpill">${fmtLabel(b)}</span><span class="cat">${CATEGORIES[b.cat]}</span><span class="ev">${esc(b.event)}</span></span><span class="row">${vis}${pill}</span></div>
    <div class="teams">${teamBox(b,0)}<span class="vs">VS</span>${teamBox(b,1)}</div>
    <div class="row between">
      <span class="hint">Posted by ${flag(b.maker)} ${b.maker===S.me?'you':esc(m.name)}, ${esc(m.city)} · pot <span class="money">${fmt(potOf(b))}</span>${S.me!=='admin' && isFriend(S.me,b.maker)?' · <b>Friend</b>':''}</span>
      <div class="row">${own}</div>
    </div></article>`;
}
function wireCards(v){
  v.querySelectorAll('[data-join]').forEach(el => el.onclick = () => {
    const b = joinBet(el.dataset.join, S.me, +el.dataset.side);
    toast(b.status === 'matched' ? 'All seats filled. The bet is locked in' : `Joined. ${seatsOf(b)-peopleIn(b)} seats left`); render(); });
  v.querySelectorAll('[data-leave]').forEach(el => el.onclick = () => { leaveBet(el.dataset.leave, S.me); toast('Left the bet, stake refunded'); render(); });
  v.querySelectorAll('[data-cancel]').forEach(el => el.onclick = () => { cancelBet(el.dataset.cancel); toast('Bet cancelled, everyone refunded'); render(); });
}

function renderTabs(){
  const reqs = S.me === 'admin' ? 0 : (S.requests[S.me] || []).length;
  const direct = S.bets.filter(b => b.status==='open' && b.vis==='direct' && b.target===S.me).length;
  const tabs = [['discover','Discover'],['friends','Friends', reqs + direct],['mine', S.me==='admin'?'All bets':'My bets'],['ledger','Ledger']]
    .filter(t => !(S.me === 'admin' && t[0] === 'friends'));
  if (S.me === 'admin' && S.tab === 'friends') S.tab = 'discover';
  $('#tabs').innerHTML = tabs.map(([k,l,c]) => `<button role="tab" id="t-${k}" data-tab="${k}" aria-selected="${S.tab===k}">${l}${c?`<span class="badge">${c}</span>`:''}</button>`).join('');
  $('#tabs').querySelectorAll('button').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; renderTabs(); renderView(); });
}

// ===== Discover =====
const kfmt = n => n >= 1e6 ? '1M' : n >= 1e3 ? (n/1e3)+'K' : String(n);
function filterPanel(){
  const f = S.filt, n = activeFilters();
  const fmtCounts = { all: openVisible('fmt').length }; Object.keys(FORMATS).forEach(k => fmtCounts[k] = openVisible('fmt').filter(b => b.format === k).length);
  const cv = openVisible('cat'), catCounts = { all: cv.length }; cv.forEach(b => catCounts[b.cat] = (catCounts[b.cat]||0) + 1);
  const regCounts = { all: openVisible('region').length }; REGIONS.slice(1).forEach(r => regCounts[r] = openVisible('region').filter(b => REGION[who(b.maker).country] === r).length);
  const opt = (v, sel) => BUDGET_STEPS.map(s => `<option value="${s}" ${s===sel?'selected':''}>${s===0?'KES 0':'KES '+kfmt(s)}</option>`).join('');
  return `<div class="filters" id="filters">
    <div class="row between">
      <button class="chip" id="ftog" aria-expanded="${S.showFilters}">Filters${n?` <span class="badge">${n}</span>`:''}</button>
      <div class="row">
        ${S.me !== 'admin' ? `<button class="chip" id="fo" aria-pressed="${S.friendsOnly}">Friends only</button>` : ''}
        ${n ? '<button class="chip" id="freset">Reset</button>' : ''}
      </div>
    </div>
    <div class="fbody" ${S.showFilters?'':'hidden'}>
      <div class="fgroup"><span class="flab">Budget (your stake to join)</span>
        <div class="row">${BUDGET_PRESETS.map(([l,a,b]) => `<button class="chip" data-bp="${a},${b}" aria-pressed="${f.min===a && f.max===b}">${l}</button>`).join('')}</div>
        <div class="brow">
          <label for="bmin">From<select id="bmin">${opt(0, f.min)}</select></label>
          <span class="dash">–</span>
          <label for="bmax">To<select id="bmax">${opt(0, f.max)}</select></label>
          ${S.me !== 'admin' ? `<button class="chip" id="afford" aria-pressed="${f.afford}">Only what I can afford</button>` : ''}
        </div>
      </div>
      <div class="fgroup"><span class="flab">Category</span>
        <div class="row">${[['all','All'], ...Object.entries(CATEGORIES)].filter(([k]) => k==='all' || catCounts[k] || f.cat===k).map(([k,l]) => `<button class="chip" data-cf="${k}" aria-pressed="${f.cat===k}">${l} <span class="money cnt">${catCounts[k]||0}</span></button>`).join('')}</div>
      </div>
      <div class="fgroup"><span class="flab">Format</span>
        <div class="row">${[['all','All'], ...Object.entries(FORMATS).map(([k,v]) => [k, v.label])].map(([k,l]) => `<button class="chip" data-ff="${k}" aria-pressed="${f.fmt===k}">${l} <span class="money cnt">${fmtCounts[k]}</span></button>`).join('')}</div>
      </div>
      <div class="fgroup"><span class="flab">Region</span>
        <div class="row">${REGIONS.map(r => `<button class="chip" data-rg="${r}" aria-pressed="${f.region===r}">${r==='all'?'Worldwide':r} <span class="money cnt">${regCounts[r]}</span></button>`).join('')}</div>
      </div>
    </div>
  </div>`;
}
function wireFilters(){
  const f = S.filt, re = () => renderView();
  $('#ftog').onclick = () => { S.showFilters = !S.showFilters; re(); };
  const fo = $('#fo'); if (fo) fo.onclick = () => { S.friendsOnly = !S.friendsOnly; re(); };
  const rs = $('#freset'); if (rs) rs.onclick = () => { S.filt = DEFAULT_FILT(); S.friendsOnly = false; S.country = null; re(); };
  document.querySelectorAll('[data-bp]').forEach(b => b.onclick = () => { [f.min, f.max] = b.dataset.bp.split(',').map(Number); re(); });
  $('#bmin').onchange = e => { f.min = +e.target.value; if (f.min > f.max) f.max = f.min; re(); };
  $('#bmax').onchange = e => { f.max = +e.target.value; if (f.max < f.min) f.min = f.max; re(); };
  const af = $('#afford'); if (af) af.onclick = () => { f.afford = !f.afford; re(); };
  document.querySelectorAll('[data-cf]').forEach(b => b.onclick = () => { f.cat = b.dataset.cf; re(); });
  document.querySelectorAll('[data-ff]').forEach(b => b.onclick = () => { f.fmt = b.dataset.ff; re(); });
  document.querySelectorAll('[data-rg]').forEach(b => b.onclick = () => { f.region = b.dataset.rg; if (S.country && REGION[S.country] !== f.region && f.region !== 'all') S.country = null; re(); });
}
function summary(rows){
  const total = rows.reduce((a,r) => a + r.count, 0), f = S.filt;
  const bits = [];
  if (f.min > 0 || f.max < MAX_STAKE) bits.push(`stakes KES ${kfmt(f.min)}–${kfmt(f.max)}`);
  if (f.cat !== 'all') bits.push(CATEGORIES[f.cat]);
  if (f.fmt !== 'all') bits.push(FORMATS[f.fmt].label);
  if (f.region !== 'all') bits.push(f.region);
  if (f.afford) bits.push('within your balance');
  if (S.friendsOnly) bits.push('friends only');
  return `<p class="hint" style="margin:0"><b class="money" style="color:var(--ink)">${total}</b> open ${total===1?'bet':'bets'} in <b class="money" style="color:var(--ink)">${rows.length}</b> ${rows.length===1?'country':'countries'}${bits.length?' · '+bits.join(' · '):''}</p>`;
}
function renderDiscover(v){
  const rows = byCountry();
  v.innerHTML = `<div class="seg" role="group" aria-label="Discover view" style="justify-self:start">
        ${[['map','World map'],['countries','Countries'],['feed','All bets']].map(([k,l]) => `<button data-dv="${k}" aria-pressed="${S.dview===k}">${l}</button>`).join('')}
    </div>
    ${filterPanel()}
    ${summary(rows)}
    <div id="dv"></div>`;
  v.querySelectorAll('[data-dv]').forEach(b => b.onclick = () => { S.dview = b.dataset.dv; if (b.dataset.dv !== 'feed') S.country = null; renderView(); });
  wireFilters();
  const dv = $('#dv');
  if (S.dview === 'map') renderMap(dv, rows);
  else if (S.dview === 'countries') renderCountries(dv, rows);
  else renderFeed(dv);
}
function openCountry(c){ S.country = c; S.dview = 'feed'; renderView(); }

function renderCountries(dv, rows){
  const q = S.csearch.trim().toLowerCase();
  let list = rows.filter(r => !q || CN(r.country).toLowerCase().includes(q));
  const sorts = { count:(a,b) => b.count - a.count || b.pool - a.pool, pool:(a,b) => b.pool - a.pool, cheap:(a,b) => a.min - b.min, az:(a,b) => CN(a.country).localeCompare(CN(b.country)) };
  list = [...list].sort(sorts[S.csort]);
  const max = Math.max(1, ...rows.map(r => r.count));
  dv.innerHTML = `<div class="row" style="margin-bottom:6px">
      <input id="cq" type="search" placeholder="Search countries" value="${esc(S.csearch)}" style="flex:1;min-width:150px">
      <select id="cs" aria-label="Sort countries" style="width:auto">
        <option value="count">Most bets</option><option value="pool">Biggest pool</option><option value="cheap">Cheapest seat</option><option value="az">A–Z</option>
      </select>
    </div>
    <div id="clist">${list.length ? list.map(r => `<div class="crow" tabindex="0" role="button" data-c="${esc(r.country)}">
      <span class="fl">${C[r.country]||'🏳️'}</span>
      <div><div class="nm">${CN(r.country)} <span class="sub">· ${REGION[r.country]||''}</span></div><div class="bar"><i style="width:${r.count/max*100}%"></i></div>
        <div class="sub">Mostly ${CATEGORIES[Object.entries(r.cats).sort((a,b)=>b[1]-a[1])[0][0]]} · seats <span class="money">KES ${kfmt(r.min)}${r.max!==r.min?'–'+kfmt(r.max):''}</span> · pool <span class="money">${fmt(r.pool)}</span></div></div>
      <div class="ct"><b>${r.count}</b><span class="sub">${r.count===1?'bet':'bets'}</span></div>
    </div>`).join('') : `<div class="empty">${rows.length ? 'No country matches that search.' : 'No open bets match these filters. Widen the budget or reset filters.'}</div>`}</div>`;
  $('#cs').value = S.csort;
  $('#cs').onchange = e => { S.csort = e.target.value; renderCountries(dv, rows); };
  $('#cq').oninput = e => { S.csearch = e.target.value; const pos = e.target.selectionStart; renderCountries(dv, rows); const n = $('#cq'); n.focus(); n.setSelectionRange(pos, pos); };
  dv.querySelectorAll('.crow').forEach(el => { el.onclick = () => openCountry(el.dataset.c); el.onkeydown = e => { if (e.key==='Enter'||e.key===' '){ e.preventDefault(); openCountry(el.dataset.c);} }; });
}

function renderFeed(dv){
  let list = openVisible();
  if (S.country) list = list.filter(b => who(b.maker).country === S.country);
  dv.innerHTML = `${S.country ? `<div class="row"><button class="chip" id="clr" aria-pressed="true">${C[S.country]} ${CN(S.country)} ✕</button></div>` : ''}
    <div class="list" style="margin-top:${S.country?'10px':'0'}">${list.length ? list.map(betCard).join('') : '<div class="empty">No open bets match. Widen the budget, pick another format or reset filters.</div>'}</div>`;
  const c = $('#clr'); if (c) c.onclick = () => { S.country = null; renderView(); };
  wireCards(dv);
}

function renderMap(dv, rows){
  if (!window.d3 || !window.topojson){
    dv.innerHTML = '<div class="empty">The map could not load. Showing countries instead.</div>';
    const d = document.createElement('div'); dv.appendChild(d); return renderCountries(d, rows);
  }
  const W = 960, H = 500, counts = new Map(rows.map(r => [r.country, r])), max = Math.max(1, ...rows.map(r => r.count));
  const geo = topojson.feature(WORLD, WORLD.objects.countries);
  geo.features = geo.features.filter(f => f.properties.name !== 'Antarctica');
  // Zoom to the chosen region (bounded by the countries we have players in)
  const reg = S.filt.region;
  const focus = reg === 'all' ? geo : { type:'FeatureCollection', features: geo.features.filter(f => REGION[f.properties.name] === reg) };
  const proj = d3.geoNaturalEarth1();
  if (reg === 'all') proj.fitExtent([[8,8],[W-8,H-8]], geo);
  else { proj.fitExtent([[60,40],[W-60,H-40]], focus); }
  const path = d3.geoPath(proj);
  const cities = new Map();
  openVisible().forEach(b => { const u = who(b.maker); const c = cities.get(u.city) || { u, count:0, friend:false }; c.count++; if (S.me!=='admin' && isFriend(S.me,u.id)) c.friend = true; cities.set(u.city,c); });
  const k = reg === 'all' ? 1 : 1.6;
  dv.innerHTML = `<div class="mapbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of open bets by country${reg!=='all'?' in '+reg:''}">
    ${geo.features.map(f => { const r = counts.get(f.properties.name);
      return `<path class="c${r?' has':''}" d="${path(f)}" ${r?`data-c="${esc(f.properties.name)}" style="fill-opacity:${.28 + .72*r.count/max}"`:''}></path>`; }).join('')}
    ${[...cities.values()].map(c => { const [x,y] = proj([c.u.lng, c.u.lat]), r = (3 + Math.sqrt(c.count)*2.4)*k;
      return (c.friend ? `<circle class="fr" cx="${x}" cy="${y}" r="${r+4}"></circle>` : '') + `<circle class="city" cx="${x}" cy="${y}" r="${r}"></circle>`
        + (reg !== 'all' ? `<text class="clab" x="${x}" y="${y - r - 5}">${esc(c.u.city)} · ${c.count}</text>` : ''); }).join('')}
  </svg><div class="tip" hidden></div>
  ${reg !== 'all' ? `<button class="chip mapback" id="mback">← Worldwide</button>` : ''}</div>
  <div class="legend" style="margin-top:10px">
    <span><span class="sw" style="background:var(--accent);opacity:.35"></span>Few bets</span>
    <span><span class="sw" style="background:var(--accent)"></span>Many bets</span>
    <span><span class="sw" style="background:var(--dot);border-radius:50%"></span>City (size = bets)</span>
    ${S.me!=='admin'?'<span><span class="ring"></span>Friend posting</span>':''}
    <span>Tap a country to see its bets</span>
  </div>`;
  const mb = $('#mback'); if (mb) mb.onclick = () => { S.filt.region = 'all'; renderView(); };
  const box = dv.querySelector('.mapbox'), tip = dv.querySelector('.tip');
  box.querySelectorAll('path.has').forEach(p => {
    const r = counts.get(p.dataset.c);
    p.onmousemove = e => { const bb = box.getBoundingClientRect(); tip.hidden = false;
      tip.style.left = (e.clientX - bb.left) + 'px'; tip.style.top = (e.clientY - bb.top) + 'px';
      tip.textContent = `${C[r.country]||''} ${CN(r.country)} · ${r.count} ${r.count===1?'bet':'bets'} · seats KES ${kfmt(r.min)}${r.max!==r.min?'–'+kfmt(r.max):''}`; };
    p.onmouseleave = () => tip.hidden = true;
    p.onclick = () => openCountry(p.dataset.c);
  });
}

// ===== Friends =====
function renderFriends(v){
  const me = S.me, fr = friendsOf(me), reqs = (S.requests[me] || []).map(who);
  const direct = S.bets.filter(b => b.status==='open' && b.vis==='direct' && b.target===me);
  const friendBets = S.bets.filter(b => b.status==='open' && isFriend(me, b.maker) && canSee(b, me) && b.vis !== 'direct');
  const record = f => { const s = S.bets.filter(b => b.status==='settled' && inBet(b,me) && inBet(b,f) && sideOf(b,me) !== sideOf(b,f));
    const w = s.filter(b => b.winner === sideOf(b,me)).length; return s.length ? `You ${w}–${s.length-w}` : 'No bets yet'; };
  const avatar = u => `<div class="av">${esc(u.name[0])}<span class="f">${C[u.country]}</span></div>`;
  v.innerHTML = `
    <form id="addf" class="row" novalidate>
      <input id="fq" list="people" placeholder="Add a friend by name" style="flex:1;min-width:160px">
      <datalist id="people">${Object.values(S.users).filter(u => u.id!==me && !isFriend(me,u.id)).map(u => `<option value="${esc(u.name)}">${CN(u.country)}</option>`).join('')}</datalist>
      <button class="btn sm" type="submit">Send request</button>
    </form>
    <div class="err" id="fqerr" style="min-height:0"></div>
    ${direct.length ? `<h3>Challenges sent to you</h3>${direct.map(betCard).join('')}` : ''}
    ${reqs.length ? `<h3>Friend requests</h3><div>${reqs.map(u => `<div class="frow">${avatar(u)}
        <div><b>${esc(u.name)}</b><div class="sub">${esc(u.city)}, ${CN(u.country)}</div></div>
        <div class="row"><button class="btn sm" data-acc="${u.id}">Accept</button><button class="btn sm ghost" data-dec="${u.id}">Decline</button></div></div>`).join('')}</div>` : ''}
    <h3>Friends (${fr.length})</h3>
    ${fr.length ? `<div>${fr.map(u => { const open = S.bets.filter(b => b.status==='open' && b.maker===u.id && canSee(b,me)).length;
      return `<div class="frow">${avatar(u)}
        <div><b>${esc(u.name)}</b><div class="sub">${esc(u.city)}, ${CN(u.country)} · ${record(u.id)} · ${open} open</div></div>
        <div class="row"><button class="btn sm" data-ch="${u.id}">Challenge</button><button class="btn sm ghost" data-un="${u.id}" aria-label="Remove ${esc(u.name)}">Remove</button></div></div>`; }).join('')}</div>`
      : '<div class="empty">No friends yet. Add someone above.</div>'}
    <h3>Friends' open bets</h3>
    ${friendBets.length ? friendBets.map(betCard).join('') : '<div class="empty">Your friends have no open bets right now.</div>'}`;
  $('#addf').onsubmit = e => { e.preventDefault();
    const q = $('#fq').value.trim().toLowerCase(), u = Object.values(S.users).find(x => x.name.toLowerCase() === q && x.id !== me);
    if (!u) return $('#fqerr').textContent = 'No player with that name. Pick one from the suggestions.';
    if (isFriend(me,u.id)) return $('#fqerr').textContent = `${u.name} is already your friend.`;
    (S.requests[u.id] ||= []).includes(me) || S.requests[u.id].push(me);
    toast(`Friend request sent to ${u.name}`); $('#fq').value = ''; $('#fqerr').textContent = '';
  };
  v.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { addFriend(me, b.dataset.acc); S.requests[me] = S.requests[me].filter(x => x !== b.dataset.acc); toast(`You and ${who(b.dataset.acc).name} are now friends`); render(); });
  v.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { S.requests[me] = S.requests[me].filter(x => x !== b.dataset.dec); renderTabs(); renderView(); });
  v.querySelectorAll('[data-un]').forEach(b => b.onclick = () => { removeFriend(me, b.dataset.un); toast(`Removed ${who(b.dataset.un).name}`); render(); });
  v.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { S.target = '@' + b.dataset.ch; S.form.format = '1v1'; renderLeft(); $('#left').scrollIntoView({ behavior:'smooth', block:'start' }); $('#ev').focus({ preventScroll:true }); toast(`Challenge ${who(b.dataset.ch).name}: fill in the form`); });
  wireCards(v);
}

function renderView(){
  const v = $('#view');
  if (S.tab === 'discover') return renderDiscover(v);
  if (S.tab === 'friends') return renderFriends(v);
  if (S.tab === 'ledger'){
    const rows = S.me === 'admin' ? S.ledger : S.ledger.filter(r => r.user === S.me);
    v.innerHTML = rows.length ? `<div class="tbl"><table><thead><tr><th>Time</th>${S.me==='admin'?'<th>Account</th>':''}<th>Entry</th><th>Ref</th><th class="n">Amount</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${r.t.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}</td>${S.me==='admin'?`<td>${r.user==='house'?'Company':`${flag(r.user)} ${esc(who(r.user).name)}`}</td>`:''}<td>${r.type}</td><td class="money">${r.ref}</td><td class="n" style="color:${r.amount<0?'var(--lose)':'var(--win)'}">${r.amount<0?'−':'+'}${Math.abs(Math.round(r.amount)).toLocaleString('en-KE')}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">No transactions yet.</div>';
    return;
  }
  const list = S.me === 'admin' ? S.bets : S.bets.filter(b => inBet(b, S.me));
  v.innerHTML = list.length ? list.map(betCard).join('') : '<div class="empty">You have no bets yet.</div>';
  wireCards(v);
}

function render(){ renderWallet(); renderLeft(); renderTabs(); renderView(); }
document.querySelectorAll('header .seg button').forEach(b => b.onclick = () => {
  S.me = b.dataset.user; S.target = 'public'; S.friendsOnly = false; S.form = { format:'1v1', n:4, st:5000, cat:'football', catTouched:false };
  document.querySelectorAll('header .seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); render();
});
render();
