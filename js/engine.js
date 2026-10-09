// Game rules. Pure logic with no DOM, so it runs in the browser and in Node tests.
// Functions mutate the state object they are given and write to state.log.

import {
  AREAS, TRANSPORT, JOBS, GOODS, MARKETS, HOUSES, MOVE_IN_FEE, ITEMS, JAPA, GEN_FUEL, CARRY,
} from './data.js';

const START_DATE = Date.UTC(2026, 0, 5); // Day 1 is Monday, 5 January 2026
const DAY_END = 24;
const LOG_LIMIT = 120;
const BANK_AREAS = ['ikeja', 'yaba', 'surulere', 'island', 'vi', 'lekki', 'banana'];
const HAWK_AREAS = ['oshodi', 'ikeja', 'yaba', 'surulere', 'island', 'lekki'];
const RAINY_MONTHS = [3, 4, 5, 6, 7, 8, 9]; // April to October

// ---------- helpers ----------

export function rand(s) {
  // mulberry32, with its state kept in the save so games replay exactly
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function between(s, lo, hi) {
  return lo + Math.floor(rand(s) * (hi - lo + 1));
}

function hash01(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const roundTo = (v, step) => Math.round(v / step) * step;

export function naira(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}₦${Math.round(Math.abs(n)).toLocaleString('en-NG')}`;
}

export function clock(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour - Math.floor(hour)) * 60);
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

export function dateOf(day) {
  return new Date(START_DATE + (day - 1) * 86400000);
}

export function dateLabel(day) {
  return dateOf(day).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

const isSunday = (day) => dateOf(day).getUTCDay() === 0;
const month = (day) => dateOf(day).getUTCMonth();

export function log(s, text, tone = 'info') {
  s.log.unshift({ day: s.day, hour: s.hour, text, tone });
  if (s.log.length > LOG_LIMIT) s.log.length = LOG_LIMIT;
}

function addStat(s, key, delta) {
  s[key] = clamp(s[key] + delta);
}

function addSkill(s, key, delta) {
  s.skills[key] = clamp(s.skills[key] + delta);
}

function spend(s, amount) {
  if (amount > s.cash) return false;
  s.cash -= amount;
  return true;
}

export const capacity = (s) => (s.items.car ? CARRY.car : CARRY.base);
export const carried = (s) => Object.values(s.inventory).reduce((n, g) => n + g.qty, 0);
export const house = (s) => (s.home ? HOUSES[s.home.id] : null);
export const cryptoValue = (s) => s.crypto * s.cryptoPrice;
export const netWorth = (s) => s.cash + s.bank + cryptoValue(s);

function fxPrice(item, s) {
  return Math.round(item.price * (item.fx ? s.fx : 1));
}

// ---------- new game and days ----------

export function newGame(seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0) {
  const s = {
    version: 1,
    seed,
    rng: seed | 0,
    day: 1,
    hour: 6,
    cash: 50000,
    bank: 0,
    crypto: 0,
    cryptoPrice: 60000,
    fx: 1,
    energy: 80,
    health: 85,
    happiness: 60,
    clout: 0,
    skills: { tech: 0, trade: 0, charm: 5 },
    area: 'ajegunle',
    home: { id: 'facemi', paidUntil: 30 },
    job: null,
    items: { smartphone: false, laptop: false, generator: false, car: false },
    inventory: {},
    powerBoostUntil: 0,
    today: null,
    pendingEvent: null,
    goals: {},
    stats: { shifts: 0, trades: 0, skits: 0, viral: 0, maxNetWorth: 50000 },
    ending: null,
    log: [],
  };
  log(s, 'Welcome to Lagos! You have ₦50,000, a face-me-I-face-you room in Ajegunle and big dreams. '
    + 'Your rent runs out on day 30.', 'good');
  startDay(s);
  return s;
}

function startDay(s) {
  s.today = {
    goSlow: 1 + rand(s) * 0.6,
    fuelScarcity: false,
    flood: false,
    ate: false,
    worked: false,
    tradedAt: [],
  };
  if (rand(s) < 0.08) {
    s.today.fuelScarcity = true;
    log(s, 'Fuel scarcity! Queues everywhere and transport fares have jumped.', 'bad');
  }
  if (RAINY_MONTHS.includes(month(s.day)) && rand(s) < 0.2) {
    s.today.flood = true;
    log(s, 'Heavy rain last night. Lekki, VI and Ajegunle are flooded. Traffic is terrible there.', 'bad');
  }
  checkRent(s);
  if (!s.ending && rand(s) < 0.38) rollEvent(s);
}

function checkRent(s) {
  if (!s.home) return;
  const h = house(s);
  const left = s.home.paidUntil - s.day;
  if (left === 5 || left === 1) {
    log(s, `Landlord reminder: your rent for the ${h.name} expires in ${left} day${left === 1 ? '' : 's'}. `
      + `Renewal is ${naira(h.yearly)}.`, 'bad');
  } else if (left === 0) {
    log(s, 'Your rent expires today. The landlord gives you 7 days of grace, no more.', 'bad');
  } else if (left < -7) {
    log(s, `Evicted! The landlord changed the locks on your ${h.name}. You are sleeping rough until you find a place.`, 'bad');
    s.home = null;
    addStat(s, 'happiness', -20);
    addStat(s, 'clout', -5);
  }
}

export function canSleepAtHome(s) {
  return Boolean(s.home) && house(s).area === s.area;
}

export function sleep(s) {
  if (s.ending || s.pendingEvent) return;
  if (canSleepAtHome(s)) {
    const h = house(s);
    let gain = h.sleep;
    let powerOut = rand(s) < (s.day < s.powerBoostUntil ? h.power / 2 : h.power);
    if (powerOut && s.items.generator && s.cash >= GEN_FUEL) {
      s.cash -= GEN_FUEL;
      powerOut = false;
      log(s, `NEPA took light, but your generator saved the night (${naira(GEN_FUEL)} fuel).`);
    }
    if (powerOut) {
      gain = Math.round(gain * 0.7);
      addStat(s, 'happiness', -5);
      log(s, 'NEPA took light. Heat and mosquitoes did not let you sleep well.', 'bad');
    }
    addStat(s, 'energy', gain);
    addStat(s, 'happiness', h.mood);
  } else {
    addStat(s, 'energy', 25);
    addStat(s, 'health', -6);
    addStat(s, 'happiness', -10);
    let text = s.home
      ? `You did not make it home, so you slept at a bus stop in ${AREAS[s.area].name}.`
      : `With no home, you slept under the bridge in ${AREAS[s.area].name}.`;
    if (s.cash > 0 && rand(s) < 0.2) {
      const lost = Math.min(s.cash, Math.round(s.cash * 0.3));
      s.cash -= lost;
      text += ` Someone picked your pocket in your sleep: ${naira(lost)} gone.`;
    }
    log(s, text, 'bad');
  }
  endOfDay(s);
}

function endOfDay(s) {
  if (!s.today.ate) {
    addStat(s, 'health', -8);
    log(s, 'You went to bed on an empty belly. Your health is suffering.', 'bad');
  } else {
    addStat(s, 'health', 2);
  }
  if (s.energy < 10) addStat(s, 'health', -5);
  if (s.happiness < 10) addStat(s, 'health', -3);
  addStat(s, 'happiness', -2);
  s.bank = Math.round(s.bank * 1.0005);
  const drift = 0.002 + (rand(s) + rand(s) + rand(s) - 1.5) * 0.09;
  s.cryptoPrice = Math.max(500, Math.round(s.cryptoPrice * Math.exp(drift)));
  s.day += 1;
  s.hour = 6;
  s.stats.maxNetWorth = Math.max(s.stats.maxNetWorth, netWorth(s));
  if (checkGameOver(s)) return;
  startDay(s);
  updateGoals(s);
}

function checkGameOver(s) {
  if (s.health <= 0) {
    s.ending = {
      kind: 'hospital',
      title: 'Lagos wore you out',
      text: 'You collapsed and woke up in General Hospital. Your people have sent a bus ticket back to the village. '
        + 'Rest well, and Lagos will still be here.',
    };
    log(s, 'Game over: your health ran out.', 'bad');
    return true;
  }
  return false;
}

// ---------- travel ----------

export function distanceKm(a, b) {
  const A = AREAS[a];
  const B = AREAS[b];
  return Math.hypot(A.x - B.x, A.y - B.y) / 10;
}

function trafficFactor(s, from, to) {
  const h = s.hour;
  const rush = (h >= 7 && h < 10) || (h >= 16 && h < 20) ? 1.7 : 1;
  const flood = s.today.flood && [from, to].some((a) => ['lekki', 'vi', 'ajegunle'].includes(a)) ? 1.6 : 1;
  return s.today.goSlow * rush * flood;
}

export function travelOptions(s, to) {
  const from = s.area;
  if (from === to) return [];
  const km = distanceKm(from, to);
  const traffic = trafficFactor(s, from, to);
  return Object.entries(TRANSPORT).map(([id, t]) => {
    let blocked = null;
    if (t.needs && !s.items[t.needs]) blocked = 'You do not own a car';
    if (t.stops && !(t.stops.includes(from) && t.stops.includes(to))) blocked = 'Not on the BRT route';
    if (t.banned && (t.banned.includes(from) || t.banned.includes(to))) blocked = 'Okada is banned there';
    const fuel = s.today.fuelScarcity && id !== 'brt' ? 1.6 : 1;
    const cost = roundTo((t.base + t.perKm * km) * fuel, 50);
    const hours = Math.max(0.25, roundTo((km / t.speed) * (1 + (traffic - 1) * t.trafficHit), 0.25));
    const energy = Math.round(t.energyPerKm * km);
    if (!blocked && cost > s.cash) blocked = 'Not enough cash';
    if (!blocked && s.hour + hours > DAY_END) blocked = 'You would not arrive before midnight';
    if (!blocked && energy > s.energy) blocked = 'Too tired';
    return { id, name: t.name, note: t.note, cost, hours, energy, blocked };
  });
}

export function travel(s, to, mode) {
  if (s.ending || s.pendingEvent) return false;
  const opt = travelOptions(s, to).find((o) => o.id === mode);
  if (!opt || opt.blocked) return false;
  s.cash -= opt.cost;
  s.hour += opt.hours;
  addStat(s, 'energy', -opt.energy);
  const from = AREAS[s.area].name;
  s.area = to;
  let text = `${TRANSPORT[mode].name} from ${from} to ${AREAS[to].name}: ${opt.hours}h`
    + (opt.cost ? `, ${naira(opt.cost)}` : '') + '.';
  let tone = 'info';
  if (opt.hours >= 2) text += ' Lagos go-slow, wahala!';
  if (mode === 'danfo' && s.cash > 0 && rand(s) < 0.06) {
    const lost = Math.min(s.cash, 50000, Math.round(s.cash * (0.1 + rand(s) * 0.15)));
    s.cash -= lost;
    text += ` A pickpocket in the bus took ${naira(lost)}.`;
    tone = 'bad';
  }
  if (mode === 'okada' && rand(s) < 0.04) {
    addStat(s, 'health', -18);
    text += ' The okada crashed into a gutter. You are bruised (-18 health).';
    tone = 'bad';
  }
  if (mode === 'car' && rand(s) < 0.15) {
    const bribe = Math.min(s.cash, between(s, 2, 5) * 1000);
    s.cash -= bribe;
    text += ` Police checkpoint: "Oga, anything for the boys?" You settled ${naira(bribe)}.`;
    tone = 'bad';
  }
  log(s, text, tone);
  return true;
}

// ---------- actions ----------

function fits(s, hours) {
  return s.hour + hours <= DAY_END;
}

function blockReason(s, { hours = 0, cost = 0, energy = 0, from = 0, until = DAY_END }) {
  if (s.hour < from) return `Opens at ${clock(from)}`;
  if (s.hour + hours > until) return until < DAY_END ? `Closes at ${clock(until)}` : 'Too late in the day';
  if (cost > s.cash) return 'Not enough cash';
  if (energy > s.energy) return 'Too tired';
  return null;
}

export function jobBlock(s, jobId) {
  const job = JOBS[jobId];
  for (const [k, v] of Object.entries(job.req)) {
    const have = k === 'clout' ? s.clout : s.skills[k];
    if (have < v) return `Needs ${k} ${v}`;
  }
  for (const item of job.items || []) {
    if (!s.items[item]) return `Needs a ${ITEMS[item].name.replace(/"[^"]*" /, '').toLowerCase()}`;
  }
  return null;
}

export function jobPay(s, jobId) {
  const job = JOBS[jobId];
  let pay = job.pay * (job.usd ? s.fx : 1);
  if (s.happiness < 15) pay *= 0.7;
  return Math.round(pay);
}

function jobArea(s, job) {
  return job.area ?? (s.home ? house(s).area : null);
}

// Every action the player can take right now, with the reason it is blocked if it is.
export function actions(s) {
  const a = s.area;
  const list = [];
  const add = (id, label, desc, opts = {}) => {
    list.push({ id, label, desc, hours: opts.hours ?? 0, cost: opts.cost ?? 0, blocked: blockReason(s, opts), group: opts.group ?? 'do' });
  };
  const posh = ['vi', 'lekki', 'banana'].includes(a);
  const p = AREAS[a].price;

  // Work
  if (s.job) {
    const job = JOBS[s.job];
    if (jobArea(s, job) === a) {
      const opts = { hours: 8, energy: job.energy, until: DAY_END, group: 'work' };
      const item = {
        id: 'work', label: `Work a shift: ${job.title}`, desc: `8h · earn ${naira(jobPay(s, s.job))} · -${job.energy} energy`,
        hours: 8, cost: 0, group: 'work', blocked: blockReason(s, opts),
      };
      if (!item.blocked && s.today.worked) item.blocked = 'Already worked today';
      if (!item.blocked && s.hour > 16) item.blocked = 'Shift starts by 4:00pm';
      if (!item.blocked && job.closedSunday && isSunday(s.day)) item.blocked = 'Closed on Sunday';
      if (!item.blocked && jobBlock(s, s.job)) item.blocked = jobBlock(s, s.job);
      list.push(item);
    }
  }
  const openings = Object.entries(JOBS).filter(([id, j]) => j.area === a || (j.area === null && canSleepAtHome(s)));
  if (openings.length) {
    add('jobs', 'Look for work here', `1h · ${openings.map(([, j]) => j.title).join(', ')}`, { hours: 1, group: 'work' });
  }
  if (HAWK_AREAS.includes(a)) {
    add('hawk', 'Hawk pure water in traffic', '3h · earn about ₦2,500–5,000 · -20 energy', { hours: 3, energy: 20, from: 7, until: 21, group: 'work' });
  }
  if (s.items.smartphone) {
    add('skit', 'Shoot a comedy skit', '3h · +clout, small chance to go viral · -15 energy', { hours: 3, energy: 15, group: 'work' });
  }
  if (a === 'surulere') {
    const b = blockReason(s, { hours: 4, energy: 15, from: 9, until: 18 });
    list.push({ id: 'audition', label: 'Nollywood audition', desc: '4h · needs charm 20 · could pay well', hours: 4, cost: 0, group: 'work',
      blocked: b ?? (s.skills.charm < 20 ? 'Needs charm 20' : null) });
  }

  // Food and rest
  if (posh) {
    const cost = roundTo(25000 * p / 1.8, 500);
    add('eat_posh', 'Eat at a fancy restaurant', `1.5h · ${naira(cost)} · +25 energy, +10 vibes, +1 clout`, { hours: 1.5, cost, group: 'life' });
  } else {
    const cost = roundTo(1500 * p, 100);
    add('eat', 'Chop amala and ewedu at a buka', `1h · ${naira(cost)} · +20 energy, +4 health`, { hours: 1, cost, group: 'life' });
  }
  if (['yaba', 'surulere', 'ikeja', 'lekki'].includes(a)) {
    add('suya', 'Buy suya from the mallam', `1h · ${naira(3000)} · +15 energy, +6 vibes`, { hours: 1, cost: 3000, from: 17, group: 'life' });
  }
  if (canSleepAtHome(s)) {
    add('relax', 'Watch Nollywood at home', '2h · +10 energy, +8 vibes', { hours: 2, group: 'life' });
  }
  if (a === 'ikeja') add('shrine', 'Party at the New Afrika Shrine', `4h · ${naira(5000)} · +25 vibes, +2 clout · -10 energy`, { hours: 4, cost: 5000, energy: 10, from: 18, group: 'life' });
  if (a === 'lekki') add('beach', 'Chill at Elegushi Beach', `3h · ${naira(5000)} · +20 vibes`, { hours: 3, cost: 5000, from: 9, until: 20, group: 'life' });
  if (a === 'vi') add('club', 'Pop bottles at a VI club', `3h · ${naira(100000)} · +30 vibes, +8 clout · -20 energy`, { hours: 3, cost: 100000, energy: 20, from: 20, group: 'life' });
  if (a === 'ajegunle') add('football', 'Play football with the boys', '2h · free · +8 health, +8 vibes · -15 energy', { hours: 2, energy: 15, from: 7, until: 19, group: 'life' });
  if (a === 'surulere') add('gym', 'Train at the National Stadium', `2h · ${naira(2000)} · +10 health · -15 energy`, { hours: 2, cost: 2000, energy: 15, from: 6, until: 20, group: 'life' });

  // Learning
  if (a === 'yaba') add('bootcamp', 'Coding bootcamp session', `6h · ${naira(50000)} · +6 tech · -20 energy`, { hours: 6, cost: 50000, energy: 20, from: 8, until: 20, group: 'learn' });
  if (s.items.smartphone) add('youtube', 'Learn from YouTube tutorials', `3h · ${naira(1000)} data · +2 tech · -10 energy`, { hours: 3, cost: 1000, energy: 10, group: 'learn' });
  if (a === 'island') add('haggle', 'Learn haggling from Iya Basira', '4h · free · +3 trade · -15 energy', { hours: 4, energy: 15, from: 8, until: 18, group: 'learn' });
  if (a === 'vi' || a === 'lekki') add('mixer', 'Networking mixer', `3h · ${naira(20000)} · +5 charm, +2 clout`, { hours: 3, cost: 20000, from: 17, group: 'learn' });
  if (a === 'banana') add('country_club', 'Country club brunch', `4h · ${naira(300000)} · +10 charm, +8 clout, +10 vibes`, { hours: 4, cost: 300000, from: 10, until: 18, group: 'learn' });

  // Money and places
  if (MARKETS[a]) add('market', `Trade at ${MARKETS[a]}`, '1h to open · buy cheap, sell dear', { hours: 1, from: 7, until: 20, group: 'money' });
  if (BANK_AREAS.includes(a)) add('bank', 'Go to the bank', 'No time cost · save, withdraw', { from: 8, until: 16, group: 'money' });
  if (s.items.smartphone) add('phone', 'Check crypto on your phone', 'No time cost · buy and sell coin', { group: 'money' });
  if (a === 'ikeja') add('shop', 'Shop at Computer Village & car lot', '1h · phones, laptops, generators, cars', { hours: 1, from: 8, until: 19, group: 'money' });
  if (Object.values(HOUSES).some((h) => h.area === a)) add('agent', 'See a house agent', '1h · rent a place here', { hours: 1, from: 8, until: 18, group: 'money' });
  if (canSleepAtHome(s)) add('rent', 'Pay rent', `Renew a year: ${naira(house(s).yearly)}`, { cost: house(s).yearly, group: 'money' });
  if (a === JAPA.area) add('embassy', 'Apply for a visa (Japa)', `Fee ${naira(JAPA.fee)} · needs ${naira(JAPA.proofOfFunds)} proof of funds`, { cost: JAPA.fee, from: 8, until: 14, group: 'money' });

  return list;
}

// Perform an action. Returns the name of a panel to open, if any.
export function act(s, id) {
  if (s.ending || s.pendingEvent) return null;
  const action = actions(s).find((x) => x.id === id);
  if (!action || action.blocked) return null;
  s.cash -= action.cost;
  s.hour += action.hours;
  const p = AREAS[s.area].price;

  switch (id) {
    case 'work': {
      const job = JOBS[s.job];
      const pay = jobPay(s, s.job);
      s.cash += pay;
      addStat(s, 'energy', -job.energy);
      addStat(s, 'happiness', -3);
      addSkill(s, job.skill, 1);
      s.today.worked = true;
      s.stats.shifts += 1;
      log(s, `You worked a shift as ${job.title} and earned ${naira(pay)}.${s.happiness < 15 ? ' (Your low vibes cost you some pay.)' : ''}`, 'good');
      break;
    }
    case 'hawk': {
      const earned = roundTo(2500 + rand(s) * 2500, 50);
      s.cash += earned;
      addStat(s, 'energy', -20);
      addStat(s, 'health', -2);
      addSkill(s, 'trade', 1);
      log(s, `"Pure water! Cold pure water!" You made ${naira(earned)} in the go-slow.`, 'good');
      break;
    }
    case 'skit': {
      addStat(s, 'energy', -15);
      s.stats.skits += 1;
      const viral = rand(s) < 0.04 + s.clout / 400 + s.skills.charm / 1000;
      if (viral) {
        const deal = roundTo(50000 + s.clout * 4000, 1000);
        s.cash += deal;
        addStat(s, 'clout', 10);
        addStat(s, 'happiness', 15);
        s.stats.viral += 1;
        log(s, `Your skit went viral! Brands are in your DMs. You got a ${naira(deal)} promo deal.`, 'good');
      } else {
        const views = roundTo(200 + s.clout * 150, 50);
        s.cash += views;
        addStat(s, 'clout', 2);
        addSkill(s, 'charm', 1);
        log(s, `You shot a skit. Small views, but it is growing (+${naira(views)}).`);
      }
      break;
    }
    case 'audition': {
      addStat(s, 'energy', -15);
      const chance = 0.2 + s.skills.charm / 250 + s.clout / 300;
      if (rand(s) < chance) {
        const fee = roundTo(60000 + s.skills.charm * 2500 + s.clout * 2000, 1000);
        s.cash += fee;
        addStat(s, 'clout', 6);
        log(s, `You got the role! "Village Girl in Lagos 3" pays you ${naira(fee)}.`, 'good');
      } else {
        addStat(s, 'happiness', -4);
        addSkill(s, 'charm', 1);
        log(s, 'The director said "we go call you". They did not call.');
      }
      break;
    }
    case 'eat':
      addStat(s, 'energy', 20);
      addStat(s, 'health', 4);
      s.today.ate = true;
      log(s, `Amala, ewedu and gbegiri hit the spot (${naira(action.cost)}).`);
      break;
    case 'eat_posh':
      addStat(s, 'energy', 25);
      addStat(s, 'health', 5);
      addStat(s, 'happiness', 10);
      addStat(s, 'clout', 1);
      s.today.ate = true;
      log(s, `Small chops, seafood okra and a mocktail. You posted it, of course (${naira(action.cost)}).`);
      break;
    case 'suya':
      addStat(s, 'energy', 15);
      addStat(s, 'happiness', 6);
      s.today.ate = true;
      log(s, 'Hot suya with plenty yaji and onions. Sweet!');
      break;
    case 'relax':
      addStat(s, 'energy', 10);
      addStat(s, 'happiness', 8);
      log(s, 'You watched an old Nollywood classic at home and laughed well.');
      break;
    case 'shrine':
      addStat(s, 'happiness', 25);
      addStat(s, 'clout', 2);
      addStat(s, 'energy', -10);
      log(s, 'Afrobeat till you drop at the Shrine. Fela spirit dey!', 'good');
      break;
    case 'beach':
      addStat(s, 'happiness', 20);
      log(s, 'Sea breeze, horse rides and grilled fish at Elegushi.', 'good');
      break;
    case 'club':
      addStat(s, 'happiness', 30);
      addStat(s, 'clout', 8);
      addStat(s, 'energy', -20);
      log(s, 'Sparklers, bottles, and the DJ shouted your name. Big boy things.', 'good');
      break;
    case 'football':
      addStat(s, 'health', 8);
      addStat(s, 'happiness', 8);
      addStat(s, 'energy', -15);
      log(s, 'You scored a screamer on the AJ City pitch. The boys hailed you.');
      break;
    case 'gym':
      addStat(s, 'health', 10);
      addStat(s, 'energy', -15);
      log(s, 'Laps around the National Stadium. Your body thanks you.');
      break;
    case 'bootcamp':
      addSkill(s, 'tech', 6);
      addStat(s, 'energy', -20);
      log(s, 'You learnt JavaScript, APIs and how to look busy on Slack. +6 tech.', 'good');
      break;
    case 'youtube':
      addSkill(s, 'tech', 2);
      addStat(s, 'energy', -10);
      log(s, 'Three hours of tutorials at 1.5x speed. +2 tech.');
      break;
    case 'haggle':
      addSkill(s, 'trade', 3);
      addStat(s, 'energy', -15);
      log(s, 'Iya Basira: "Never accept the first price, my pikin." +3 trade.', 'good');
      break;
    case 'mixer':
      addSkill(s, 'charm', 5);
      addStat(s, 'clout', 2);
      log(s, 'You swapped LinkedIns with founders, bankers and one very loud pastor. +5 charm.', 'good');
      break;
    case 'country_club':
      addSkill(s, 'charm', 10);
      addStat(s, 'clout', 8);
      addStat(s, 'happiness', 10);
      log(s, 'Brunch with the Ikoyi crowd. You are learning how old money talks.', 'good');
      break;
    case 'rent': {
      const h = house(s);
      s.home.paidUntil = Math.max(s.home.paidUntil, s.day) + 360;
      s.goals.rent = true;
      log(s, `You paid ${naira(h.yearly)} for another year in your ${h.name}. Landlord is smiling.`, 'good');
      break;
    }
    case 'embassy':
      return japa(s);
    case 'market':
    case 'jobs':
    case 'shop':
    case 'agent':
    case 'bank':
    case 'phone':
      return id;
    default:
      break;
  }
  updateGoals(s);
  return null;
}

function japa(s) {
  if (netWorth(s) < JAPA.proofOfFunds) {
    log(s, `Visa refused before the interview: you need ${naira(JAPA.proofOfFunds)} proof of funds. The fee is gone.`, 'bad');
    return null;
  }
  if (rand(s) < JAPA.chance) {
    s.ending = {
      kind: 'japa',
      title: 'You japa-ed!',
      text: 'Visa approved! You packed jollof spices, a few Ankara outfits and a lot of memories. '
        + 'Lagos made you. Wherever you land, you will hustle like a Lagosian.',
    };
    log(s, 'Visa approved. Japa ending!', 'good');
  } else {
    addStat(s, 'happiness', -15);
    log(s, 'Visa denied: "insufficient ties to your home country". You can try again.', 'bad');
  }
  return null;
}

// ---------- jobs ----------

export function jobsHere(s) {
  return Object.entries(JOBS)
    .filter(([, j]) => j.area === s.area || (j.area === null && canSleepAtHome(s)))
    .map(([id, j]) => ({ id, ...j, pay: jobPay(s, id), blocked: s.job === id ? 'Your current job' : jobBlock(s, id) }));
}

export function takeJob(s, id) {
  const j = jobsHere(s).find((x) => x.id === id);
  if (!j || j.blocked) return false;
  const old = s.job;
  s.job = id;
  s.goals.job = true;
  log(s, `${old ? `You resigned as ${JOBS[old].title}. ` : ''}You got the job: ${j.title}! Pay is ${naira(j.pay)} a shift.`, 'good');
  updateGoals(s);
  return true;
}

export function quitJob(s) {
  if (!s.job) return;
  log(s, `You resigned as ${JOBS[s.job].title}.`);
  s.job = null;
}

// ---------- market ----------

export function price(s, good, area = s.area) {
  const g = GOODS[good];
  const noise = 0.8 + hash01(s.seed, s.day, good, area) * 0.4;
  return roundTo(g.base * (g.mods[area] ?? 1) * noise * (g.fx ? s.fx : 1), 50);
}

const tradeEdge = (s) => Math.min(0.15, s.skills.trade * 0.002);
export const buyPrice = (s, good) => roundTo(price(s, good) * (1 - tradeEdge(s)), 50);
export const sellPrice = (s, good) => roundTo(price(s, good) * (1 + tradeEdge(s)) * 0.95, 50);

export function buy(s, good, qty = 1) {
  if (!MARKETS[s.area]) return false;
  const each = buyPrice(s, good);
  qty = Math.min(qty, capacity(s) - carried(s), Math.floor(s.cash / each));
  if (qty <= 0) return false;
  const inv = s.inventory[good] ?? { qty: 0, avgCost: 0 };
  inv.avgCost = Math.round((inv.avgCost * inv.qty + each * qty) / (inv.qty + qty));
  inv.qty += qty;
  s.inventory[good] = inv;
  s.cash -= each * qty;
  log(s, `Bought ${qty} × ${GOODS[good].name} at ${naira(each)} each.`);
  return true;
}

export function sell(s, good, qty = 1) {
  if (!MARKETS[s.area]) return false;
  const inv = s.inventory[good];
  if (!inv || inv.qty <= 0) return false;
  qty = Math.min(qty, inv.qty);
  const each = sellPrice(s, good);
  const profit = (each - inv.avgCost) * qty;
  s.cash += each * qty;
  inv.qty -= qty;
  if (inv.qty === 0) delete s.inventory[good];
  s.stats.trades += 1;
  if (!s.today.tradedAt.includes(s.area)) {
    s.today.tradedAt.push(s.area);
    addSkill(s, 'trade', 1);
  }
  log(s, `Sold ${qty} × ${GOODS[good].name} at ${naira(each)} each (${profit >= 0 ? 'profit' : 'loss'} ${naira(Math.abs(profit))}).`,
    profit >= 0 ? 'good' : 'bad');
  updateGoals(s);
  return true;
}

// ---------- bank and crypto ----------

export function deposit(s, amount) {
  amount = Math.min(Math.floor(amount), s.cash);
  if (amount <= 0) return false;
  s.cash -= amount;
  s.bank += amount;
  log(s, `Deposited ${naira(amount)}. Safe from pickpockets.`);
  return true;
}

export function withdraw(s, amount) {
  amount = Math.min(Math.floor(amount), s.bank);
  if (amount <= 0) return false;
  s.bank -= amount;
  s.cash += amount;
  log(s, `Withdrew ${naira(amount)}.`);
  return true;
}

export function buyCrypto(s, amount) {
  amount = Math.min(Math.floor(amount), s.cash);
  if (amount <= 0 || !s.items.smartphone) return false;
  s.cash -= amount;
  s.crypto += amount / s.cryptoPrice;
  log(s, `Bought ${naira(amount)} of LagosCoin at ${naira(s.cryptoPrice)}.`);
  return true;
}

export function sellCrypto(s, fraction = 1) {
  if (s.crypto <= 0 || !s.items.smartphone) return false;
  const coins = s.crypto * fraction;
  const value = Math.round(coins * s.cryptoPrice);
  s.crypto -= coins;
  if (s.crypto < 1e-9) s.crypto = 0;
  s.cash += value;
  log(s, `Sold LagosCoin for ${naira(value)}.`);
  updateGoals(s);
  return true;
}

// ---------- shopping and housing ----------

export function shopItems(s) {
  return Object.entries(ITEMS).map(([id, it]) => {
    const cost = fxPrice(it, s);
    const blocked = s.items[id] ? 'You own one' : cost > s.cash ? 'Not enough cash' : null;
    return { id, ...it, cost, blocked };
  });
}

export function buyItem(s, id) {
  if (s.area !== 'ikeja') return false;
  const it = shopItems(s).find((x) => x.id === id);
  if (!it || it.blocked) return false;
  s.cash -= it.cost;
  s.items[id] = true;
  if (it.clout) addStat(s, 'clout', it.clout);
  log(s, `You bought a ${it.name} for ${naira(it.cost)}.`, 'good');
  updateGoals(s);
  return true;
}

export function housesHere(s) {
  return Object.entries(HOUSES)
    .filter(([, h]) => h.area === s.area)
    .map(([id, h]) => {
      const cost = Math.round(h.yearly * (1 + MOVE_IN_FEE));
      const blocked = s.home?.id === id ? 'You live here' : cost > s.cash ? 'Not enough cash' : null;
      return { id, ...h, cost, blocked };
    });
}

export function moveHouse(s, id) {
  const h = housesHere(s).find((x) => x.id === id);
  if (!h || h.blocked) return false;
  s.cash -= h.cost;
  s.home = { id, paidUntil: s.day + 360 };
  addStat(s, 'clout', h.clout);
  addStat(s, 'happiness', 15);
  log(s, `You moved into a ${h.name}! One year's rent plus agent and legal fees: ${naira(h.cost)}.`, 'good');
  if (id !== 'facemi') s.goals.moved = true;
  updateGoals(s);
  if (h.win) {
    s.ending = {
      kind: 'win',
      title: 'Lagos Big Boy/Big Girl!',
      text: `Day ${s.day}: you started in a face-me-I-face-you in Ajegunle and now you hold keys to a duplex on Banana Island. `
        + 'The village is planning a thanksgiving for you. Owambe loading!',
    };
  }
  return true;
}

// ---------- random events ----------

const EVENTS = [
  {
    id: 'owambe', weight: 3,
    setup: () => ({ cost: 60000 }),
    text: (d) => `Your cousin's wedding is on Saturday and the family aso-ebi costs ${naira(d.cost)}.`,
    options: [
      { label: 'Buy the aso-ebi and dance', ok: (s, d) => s.cash >= d.cost,
        apply: (s, d) => { s.cash -= d.cost; addStat(s, 'happiness', 15); addStat(s, 'clout', 6); addStat(s, 'energy', -10);
          return ['You sprayed money and danced till dawn. Everybody saw your gele game.', 'good']; } },
      { label: 'Say you are travelling', apply: (s) => { addStat(s, 'happiness', -4);
        return ['Auntie is not happy with you.', 'bad']; } },
    ],
  },
  {
    id: 'blackTax', weight: 3,
    setup: (s) => ({ amount: Math.max(10000, roundTo(s.cash * 0.1, 1000)) }),
    text: (d) => `Your uncle in the village needs ${naira(d.amount)} for "urgent" roof repairs.`,
    options: [
      { label: 'Send the money', ok: (s, d) => s.cash >= d.amount,
        apply: (s, d) => { s.cash -= d.amount; addStat(s, 'happiness', 5); addStat(s, 'clout', 2);
          return ['Uncle prayed for you for ten minutes on the phone.', 'good']; } },
      { label: '"Network is bad, I can\'t hear you"', apply: (s) => { addStat(s, 'happiness', -6);
        return ['The guilt follows you all day.', 'bad']; } },
    ],
  },
  {
    id: 'scam', weight: 2,
    setup: () => ({ fee: 30000 }),
    text: (d) => `An email from a "prince": he wants to send you $2 million. Just pay a ${naira(d.fee)} processing fee.`,
    options: [
      { label: 'Pay the fee', ok: (s, d) => s.cash >= d.fee,
        apply: (s, d) => { s.cash -= d.fee; addStat(s, 'happiness', -8);
          return ['The prince has blocked you. Lesson learnt the hard way.', 'bad']; } },
      { label: 'Block and report', apply: (s) => { addSkill(s, 'charm', 1);
        return ['Sharp guy! Nobody fit run you street.', 'good']; } },
    ],
  },
  {
    id: 'lotto', weight: 2,
    setup: () => ({}),
    text: () => 'The Baba Ijebu lotto kiosk is calling your name. A ticket is ₦1,000.',
    options: [
      { label: 'Play', ok: (s) => s.cash >= 1000,
        apply: (s) => { s.cash -= 1000;
          if (rand(s) < 0.05) { s.cash += 250000; addStat(s, 'happiness', 20); return ['Jackpot! You won ₦250,000!', 'good']; }
          return ['No luck today.', 'info']; } },
      { label: 'Walk past', apply: () => ['You kept your ₦1,000.', 'info'] },
    ],
  },
  {
    id: 'areaBoys', weight: 2,
    setup: () => ({ levy: 5000 }),
    text: (d) => `Area boys on your street want "owo ile", a ${naira(d.levy)} development levy.`,
    options: [
      { label: 'Pay them', ok: (s, d) => s.cash >= d.levy,
        apply: (s, d) => { s.cash -= d.levy; return ['"Boss, you be correct person!"', 'info']; } },
      { label: 'Refuse', apply: (s) => {
        if (rand(s) < 0.4) { const lost = Math.round(s.cash * 0.1); s.cash -= lost; addStat(s, 'health', -12);
          return [`They roughed you up and took ${naira(lost)}.`, 'bad']; }
        addStat(s, 'clout', 3); return ['You stood your ground and they backed off. Respect.', 'good']; } },
    ],
  },
  {
    id: 'transformer', weight: 2, when: (s) => Boolean(s.home) && house(s).power > 0,
    setup: () => ({ levy: 10000 }),
    text: (d) => `The landlord says every tenant must pay ${naira(d.levy)} to fix the street transformer.`,
    options: [
      { label: 'Contribute', ok: (s, d) => s.cash >= d.levy,
        apply: (s, d) => { s.cash -= d.levy; s.powerBoostUntil = s.day + 21;
          return ['New transformer! Light is much more steady for three weeks.', 'good']; } },
      { label: 'Refuse', apply: (s) => { addStat(s, 'happiness', -4); return ['Your neighbours are side-eyeing you.', 'bad']; } },
    ],
  },
  {
    id: 'devaluation', weight: 1,
    setup: () => ({}),
    text: () => 'The naira fell again! Imported things cost more, but dollar income is worth more.',
    options: [{ label: 'Ehn, okay', apply: (s) => { s.fx = Math.round(s.fx * 1.15 * 100) / 100; s.cryptoPrice = Math.round(s.cryptoPrice * 1.1);
      return [`Exchange rate is now ${s.fx.toFixed(2)}× what it was when you arrived.`, 'info']; } }],
  },
  {
    id: 'jollof', weight: 2,
    setup: () => ({}),
    text: () => 'Your neighbour is having a party and the smell of party jollof has entered your room.',
    options: [
      { label: 'Go and greet them', apply: (s) => { addStat(s, 'energy', 10); addStat(s, 'happiness', 6); s.today.ate = true;
        return ['A full plate of jollof, chicken and moi-moi. Free!', 'good']; } },
      { label: 'Stay in', apply: () => ['You suffered in silence.', 'info'] },
    ],
  },
  {
    id: 'malaria', weight: 1,
    setup: () => ({ cost: 8000 }),
    text: (d) => `You woke up with malaria. Treatment costs ${naira(d.cost)} at the chemist.`,
    options: [
      { label: 'Buy the drugs', ok: (s, d) => s.cash >= d.cost,
        apply: (s, d) => { s.cash -= d.cost; addStat(s, 'health', -5); return ['You will feel better soon.', 'info']; } },
      { label: 'Drink agbo and hope', apply: (s) => { addStat(s, 'health', -20); addStat(s, 'energy', -20);
        return ['The agbo was bitter and the fever got worse.', 'bad']; } },
    ],
  },
];

function rollEvent(s) {
  const pool = EVENTS.filter((e) => !e.when || e.when(s));
  const total = pool.reduce((n, e) => n + e.weight, 0);
  let r = rand(s) * total;
  const ev = pool.find((e) => (r -= e.weight) < 0) ?? pool[0];
  const data = ev.setup(s);
  s.pendingEvent = { id: ev.id, data, text: ev.text(data) };
}

export function eventOptions(s) {
  if (!s.pendingEvent) return [];
  const ev = EVENTS.find((e) => e.id === s.pendingEvent.id);
  return ev.options.map((o) => ({ label: o.label, blocked: o.ok && !o.ok(s, s.pendingEvent.data) ? 'Not enough cash' : null }));
}

export function resolveEvent(s, index) {
  if (!s.pendingEvent) return false;
  const ev = EVENTS.find((e) => e.id === s.pendingEvent.id);
  const opt = ev.options[index];
  if (!opt || (opt.ok && !opt.ok(s, s.pendingEvent.data))) return false;
  const [text, tone] = opt.apply(s, s.pendingEvent.data);
  log(s, text, tone);
  s.pendingEvent = null;
  checkGameOver(s);
  updateGoals(s);
  return true;
}

// ---------- goals ----------

export const GOALS = [
  { id: 'rent', label: 'Renew your rent' },
  { id: 'job', label: 'Get a job' },
  { id: 'smartphone', label: 'Buy a smartphone' },
  { id: 'moved', label: 'Move out of face-me-I-face-you' },
  { id: 'generator', label: 'Buy a generator' },
  { id: 'million', label: 'Net worth of ₦1 million' },
  { id: 'car', label: 'Own a car' },
  { id: 'lekki', label: 'Live in Lekki' },
  { id: 'tenMillion', label: 'Net worth of ₦10 million' },
  { id: 'banana', label: 'Duplex on Banana Island (win)' },
];

function updateGoals(s) {
  const g = s.goals;
  if (s.items.smartphone) g.smartphone = true;
  if (s.items.generator) g.generator = true;
  if (s.items.car) g.car = true;
  if (s.home?.id === 'lekki') g.lekki = true;
  if (s.home?.id === 'banana') g.banana = true;
  if (netWorth(s) >= 1e6) g.million = true;
  if (netWorth(s) >= 1e7) g.tenMillion = true;
}
