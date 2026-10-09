// Game rules. Pure logic with no DOM, so it runs in the browser and in Node tests.
// Functions mutate the state object they are given and write to state.log.

import {
  AREAS, TRANSPORT, JOBS, GOODS, MARKETS, HOUSES, MOVE_IN_MONTHS, ADVANCE_DAYS, ITEMS, SHOP_AREA,
  JAPA, GEN_FUEL, CARRY, TRAITS, DREAMS, BACKGROUNDS, STARTS, AVATAR, FURNITURE,
} from './data.js';

const START_DATE = Date.UTC(2026, 0, 5); // Day 1 is Monday, 5 January 2026
const DAY_END = 24;
const LOG_LIMIT = 120;
const GRACE_DAYS = 7;

// Where each kind of activity is available.
const PLACES = {
  bank: ['adjame', 'cocody', 'plateau', 'treichville', 'marcory', 'riviera', 'yopougon'],
  hawk: ['abobo', 'adjame', 'yopougon', 'plateau', 'treichville', 'cocody'],
  posh: ['plateau', 'marcory', 'riviera'],
  alloco: ['cocody', 'yopougon', 'treichville', 'abobo'],
  flood: ['cocody', 'abobo', 'yopougon'],
  maquis: 'yopougon',
  beach: 'portbouet',
  club: 'marcory',
  football: 'yopougon',
  gym: 'treichville',
  audition: 'treichville',
  bootcamp: 'cocody',
  haggle: 'adjame',
  mixer: ['plateau', 'marcory'],
  golf: 'riviera',
};
const RAINY_MONTHS = [4, 5, 6, 9, 10]; // May–July and October–November

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

export function cfa(n) {
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${digits} FCFA`;
}

export function clock(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
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
const at = (place, area) => (Array.isArray(place) ? place.includes(area) : place === area);

export function log(s, text, tone = 'info') {
  s.log.unshift({ day: s.day, hour: s.hour, text, tone });
  if (s.log.length > LOG_LIMIT) s.log.length = LOG_LIMIT;
}

function addStat(s, key, delta) {
  s[key] = clamp(s[key] + delta);
}

function addSkill(s, key, delta) {
  // Talkers pick up charm faster, tech people pick up tech faster.
  if (delta > 0 && ((key === 'charm' && hasTrait(s, 'talker')) || (key === 'tech' && hasTrait(s, 'tech')))) delta += 1;
  s.skills[key] = clamp(s.skills[key] + delta);
}

export const hasTrait = (s, id) => s.traits.includes(id);
export const owns = (s, id) => Boolean(s.furniture[id]);

export const capacity = (s) => (s.items.car ? CARRY.car : CARRY.base);
export const carried = (s) => Object.values(s.inventory).reduce((n, g) => n + g.qty, 0);
export const house = (s) => (s.home ? HOUSES[s.home.id] : null);
export const cryptoValue = (s) => s.crypto * s.cryptoPrice;
export const netWorth = (s) => s.cash + s.bank + cryptoValue(s);

function fxPrice(item, s) {
  return Math.round(item.price * (item.fx ? s.fx : 1));
}

// ---------- new game and days ----------

export const DEFAULT_SETUP = {
  name: 'Kouassi',
  avatar: { skin: AVATAR.skins[2], outfit: AVATAR.outfits[0], pattern: 'stripes', hair: 'short' },
  traits: [],
  dream: 'villa',
  background: null,
  start: 'cour',
};

// Draws the birth lottery. Uses Math.random because it happens before the game's seeded RNG exists.
export function drawBackground(random = Math.random) {
  const list = Object.entries(BACKGROUNDS);
  let r = random() * list.reduce((n, [, b]) => n + b.weight, 0);
  return (list.find(([, b]) => (r -= b.weight) < 0) ?? list[0])[0];
}

export function newGame(seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0, setup = {}) {
  const cfg = { ...DEFAULT_SETUP, ...setup };
  const startHome = STARTS[cfg.start] ? cfg.start : 'cour';
  const home = HOUSES[startHome];
  const bg = BACKGROUNDS[cfg.background];
  const s = {
    version: 2,
    seed,
    rng: seed | 0,
    name: String(cfg.name).trim().slice(0, 24) || DEFAULT_SETUP.name,
    avatar: { ...DEFAULT_SETUP.avatar, ...cfg.avatar },
    traits: cfg.traits.filter((id) => TRAITS[id]).slice(0, 2),
    dream: DREAMS[cfg.dream] ? cfg.dream : 'villa',
    background: bg ? cfg.background : null,
    startHome,
    day: 1,
    hour: 6,
    cash: STARTS[startHome].cash + (bg?.cash ?? 0),
    bank: 0,
    crypto: 0,
    cryptoPrice: 25000,
    fx: 1,
    energy: 80,
    health: 85,
    happiness: 60,
    clout: 0,
    skills: { tech: 0, trade: 0, charm: 5 },
    area: home.area,
    home: { id: startHome, paidUntil: 30 },
    job: null,
    items: { smartphone: false, laptop: false, generator: false, car: false },
    furniture: {},
    inventory: {},
    powerBoostUntil: 0,
    today: null,
    pendingEvent: null,
    goals: {},
    stats: { shifts: 0, trades: 0, skits: 0, viral: 0, roles: 0, maxNetWorth: 0 },
    ending: null,
    log: [],
  };
  for (const [k, v] of Object.entries(bg?.skills ?? {})) s.skills[k] += v;
  if (bg?.health) addStat(s, 'health', bg.health);
  if (bg?.happiness) addStat(s, 'happiness', bg.happiness);
  if (hasTrait(s, 'gym')) addStat(s, 'health', 10);
  if (hasTrait(s, 'talker')) s.skills.charm += 10;
  if (hasTrait(s, 'tech')) s.skills.tech += 10;
  s.stats.maxNetWorth = s.cash;
  log(s, `Welcome to Babi, ${s.name}! You have ${cfa(s.cash)} and a ${home.name.toLowerCase()} in ${AREAS[home.area].name}. `
    + `Your dream: ${DREAMS[s.dream].name}.`
    + (home.monthly ? ` Rent of ${cfa(home.monthly)} is due on day 30.` : ' At least the rent is free.'), 'good');
  if (bg) log(s, `Birth lottery: ${bg.name}. ${bg.blurb}`);
  startDay(s);
  updateGoals(s);
  return s;
}

function startDay(s) {
  s.today = {
    goSlow: 1 + rand(s) * 0.6,
    strike: false,
    flood: false,
    ate: false,
    worked: false,
    tradedAt: [],
  };
  if (rand(s) < 0.06) {
    s.today.strike = true;
    log(s, 'Transport strike! Few gbakas are running and every fare has gone up.', 'bad');
  }
  if (RAINY_MONTHS.includes(month(s.day)) && rand(s) < 0.2) {
    s.today.flood = true;
    log(s, 'Heavy rain last night. Cocody, Abobo and Yopougon are flooded and traffic there is terrible.', 'bad');
  }
  checkRent(s);
  if (!s.ending && rand(s) < 0.38) rollEvent(s);
}

function checkRent(s) {
  if (!s.home || !house(s).monthly) return;
  const h = house(s);
  const left = s.home.paidUntil - s.day;
  if (left === 5 || left === 1) {
    log(s, `The landlord reminds you: rent for your ${h.name} is due in ${left} day${left === 1 ? '' : 's'} `
      + `(${cfa(h.monthly)} a month).`, 'bad');
  } else if (left === 0) {
    log(s, `Rent is due today. The landlord gives you ${GRACE_DAYS} days, not one more.`, 'bad');
  } else if (left < -GRACE_DAYS) {
    log(s, `Evicted! The landlord put your things outside your ${h.name}. You are sleeping rough until you find a place.`, 'bad');
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
      log(s, `CIE cut the power, but your generator saved the night (${cfa(GEN_FUEL)} of fuel).`);
    }
    if (powerOut) {
      gain = Math.round(gain * (owns(s, 'fan') ? 0.85 : 0.7));
      addStat(s, 'happiness', owns(s, 'fan') ? -2 : -5);
      log(s, owns(s, 'fan') ? 'Power cut! Your fan ran on batteries for a while, so it was bearable.'
        : 'Power cut! No fan, plenty of mosquitoes. You slept badly.', 'bad');
    }
    if (owns(s, 'mattress')) gain += 10;
    if (owns(s, 'ac') && !powerOut) gain += 10;
    if (hasTrait(s, 'lazy')) gain += 10;
    addStat(s, 'energy', gain);
    const comfort = (owns(s, 'speaker') ? 2 : 0) + (owns(s, 'dog') ? 4 : 0) + (owns(s, 'sofa') ? 3 : 0);
    addStat(s, 'happiness', h.mood + comfort);
  } else {
    addStat(s, 'energy', 25);
    addStat(s, 'health', hasTrait(s, 'clean') ? -3 : -6);
    addStat(s, 'happiness', -10);
    let text = s.home
      ? `You did not make it home, so you slept at the bus station in ${AREAS[s.area].name}.`
      : `With no home, you slept on a bench in ${AREAS[s.area].name}.`;
    if (s.cash > 0 && rand(s) < 0.2) {
      const lost = Math.min(s.cash, Math.round(s.cash * 0.3));
      s.cash -= lost;
      text += ` Someone went through your pockets in your sleep: ${cfa(lost)} gone.`;
    }
    log(s, text, 'bad');
  }
  endOfDay(s);
}

function endOfDay(s) {
  if (!s.today.ate) {
    addStat(s, 'health', -8);
    log(s, 'You went to bed without eating. Your health is suffering.', 'bad');
  } else {
    addStat(s, 'health', 2);
  }
  if (s.energy < 10) addStat(s, 'health', -5);
  if (s.happiness < 10) addStat(s, 'health', -3);
  addStat(s, 'happiness', -2);
  s.bank = Math.round(s.bank * 1.0005);
  const drift = 0.002 + (rand(s) + rand(s) + rand(s) - 1.5) * 0.09;
  s.cryptoPrice = Math.max(200, Math.round(s.cryptoPrice * Math.exp(drift)));
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
      title: 'Babi wore you out',
      text: 'You collapsed and woke up at the CHU in Treichville. The family has sent a bus ticket back to the village. '
        + 'Ça va aller. Rest well, and Babi will still be here.',
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
  const flood = s.today.flood && [from, to].some((a) => PLACES.flood.includes(a)) ? 1.6 : 1;
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
    if (t.stops && !(t.stops.includes(from) && t.stops.includes(to))) blocked = 'No water bus on this route';
    if (t.banned && (t.banned.includes(from) || t.banned.includes(to))) blocked = 'Moto-taxis are not allowed there';
    const strike = s.today.strike && id !== 'boat' && id !== 'car' ? 1.6 : 1;
    const cost = roundTo((t.base + t.perKm * km) * strike, 25);
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
    + (opt.cost ? `, ${cfa(opt.cost)}` : '') + '.';
  let tone = 'info';
  if (opt.hours >= 2) text += ' The traffic was terrible!';
  if (mode === 'gbaka' && s.cash > 0 && rand(s) < 0.06) {
    const lost = Math.min(s.cash, 20000, Math.round(s.cash * (0.1 + rand(s) * 0.15)));
    s.cash -= lost;
    text += ` A pickpocket in the gbaka took ${cfa(lost)}.`;
    tone = 'bad';
  }
  if (mode === 'moto' && rand(s) < 0.04) {
    addStat(s, 'health', -18);
    text += ' The moto skidded in the sand. You are bruised (-18 health).';
    tone = 'bad';
  }
  if (mode === 'car' && rand(s) < 0.15) {
    const bribe = Math.min(s.cash, between(s, 4, 10) * 250);
    s.cash -= bribe;
    text += ` Police check: "Chef, on dit quoi?" You left ${cfa(bribe)} "for coffee".`;
    tone = 'bad';
  }
  log(s, text, tone);
  return true;
}

// ---------- actions ----------

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
    if (!s.items[item]) return `Needs a ${ITEMS[item].name.toLowerCase()}`;
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

const jobEnergy = (s, job) => job.energy + (hasTrait(s, 'lazy') ? 5 : 0);
const nightEnergy = (s, n) => (hasTrait(s, 'nightowl') ? 0 : n);
const party = (s, n) => Math.round(n * (hasTrait(s, 'enjaillement') ? 1.5 : 1));
const sport = (s, n) => Math.round(n * (hasTrait(s, 'gym') ? 1.5 : 1));
const meal = (s, n) => n + (hasTrait(s, 'foodie') ? 5 : 0);

// Every action the player can take right now, with the reason it is blocked if it is.
export function actions(s) {
  const a = s.area;
  const list = [];
  const add = (id, label, desc, opts = {}) => {
    list.push({ id, label, desc, hours: opts.hours ?? 0, cost: opts.cost ?? 0, blocked: blockReason(s, opts), group: opts.group ?? 'do' });
  };
  const p = AREAS[a].price;

  // Work
  if (s.job) {
    const job = JOBS[s.job];
    if (jobArea(s, job) === a) {
      const item = {
        id: 'work', label: `Work a shift: ${job.title}`, desc: `8h · earn ${cfa(jobPay(s, s.job))} · -${jobEnergy(s, job)} energy`,
        hours: 8, cost: 0, group: 'work', blocked: blockReason(s, { hours: 8, energy: jobEnergy(s, job) }),
      };
      if (!item.blocked && s.today.worked) item.blocked = 'Already worked today';
      if (!item.blocked && s.hour > 16) item.blocked = 'Shift starts by 16h00';
      if (!item.blocked && job.closedSunday && isSunday(s.day)) item.blocked = 'Closed on Sunday';
      if (!item.blocked && jobBlock(s, s.job)) item.blocked = jobBlock(s, s.job);
      list.push(item);
    }
  }
  const openings = Object.values(JOBS).filter((j) => j.area === a || (j.area === null && canSleepAtHome(s)));
  if (openings.length) {
    add('jobs', 'Look for work here', `1h · ${openings.map((j) => j.title).join(', ')}`, { hours: 1, group: 'work' });
  }
  if (at(PLACES.hawk, a)) {
    add('hawk', 'Sell cold water sachets in traffic', `3h · earn about ${hasTrait(s, 'hustler') ? '1,250–2,500' : '1,000–2,000'} FCFA · -20 energy`, { hours: 3, energy: 20, from: 7, until: 21, group: 'work' });
  }
  if (s.items.smartphone) {
    add('skit', 'Shoot a comedy skit in Nouchi', '3h · +clout, small chance to go viral · -15 energy', { hours: 3, energy: 15, group: 'work' });
  }
  if (at(PLACES.audition, a)) {
    const b = blockReason(s, { hours: 4, energy: 15, from: 9, until: 18 });
    list.push({ id: 'audition', label: 'Audition for a coupé-décalé music video', desc: '4h · needs charm 20 · could pay well', hours: 4, cost: 0, group: 'work',
      blocked: b ?? (s.skills.charm < 20 ? 'Needs charm 20' : null) });
  }

  // Food and rest
  if (at(PLACES.posh, a)) {
    const cost = roundTo(12000 * p / 1.5, 500);
    add('eat_posh', 'Eat at a smart restaurant', `1.5h · ${cfa(cost)} · +25 energy, +10 vibes, +1 clout`, { hours: 1.5, cost, group: 'life' });
  } else {
    const cost = roundTo(600 * p, 50);
    add('eat', 'Eat garba (attiéké and fried tuna)', `1h · ${cfa(cost)} · +20 energy, +4 health`, { hours: 1, cost, group: 'life' });
  }
  if (at(PLACES.alloco, a)) {
    add('alloco', 'Alloco and brochettes at the roadside grill', `1h · ${cfa(1500)} · +15 energy, +6 vibes`, { hours: 1, cost: 1500, from: 17, group: 'life' });
  }
  if (canSleepAtHome(s)) {
    add('relax', owns(s, 'tv') ? 'Watch TV at home' : 'Watch an Ivorian series on your phone at home',
      `2h · +10 energy, +${owns(s, 'tv') ? 16 : 8} vibes`, { hours: 2, group: 'life' });
    if (owns(s, 'stove')) add('cook', 'Cook at home', `1h · ${cfa(300)} · +20 energy, +5 health`, { hours: 1, cost: 300, group: 'life' });
    add('furnish', 'Furnish your home', 'No time cost · mattress, fan, stove, TV and more', { group: 'life' });
  }
  if (at(PLACES.maquis, a)) add('maquis', 'Night out at a Yop maquis', `4h · ${cfa(2000)} · +${party(s, 25)} vibes, +${party(s, 2)} clout · -${nightEnergy(s, 10)} energy`, { hours: 4, cost: 2000, energy: nightEnergy(s, 10), from: 18, group: 'life' });
  if (at(PLACES.beach, a)) add('beach', 'Chill at Port-Bouët beach', `3h · ${cfa(2000)} · +20 vibes`, { hours: 3, cost: 2000, from: 9, until: 20, group: 'life' });
  if (at(PLACES.club, a)) add('club', 'Show off at a Zone 4 club', `3h · ${cfa(40000)} · +${party(s, 30)} vibes, +${party(s, 8)} clout · -${nightEnergy(s, 20)} energy`, { hours: 3, cost: 40000, energy: nightEnergy(s, 20), from: 20, group: 'life' });
  if (at(PLACES.football, a)) add('football', 'Play football with the boys', `2h · free · +${sport(s, 8)} health, +8 vibes · -15 energy`, { hours: 2, energy: 15, from: 7, until: 19, group: 'life' });
  if (at(PLACES.gym, a)) add('gym', 'Train at the Treichville sports park', `2h · ${cfa(1000)} · +${sport(s, 10)} health · -15 energy`, { hours: 2, cost: 1000, energy: 15, from: 6, until: 20, group: 'life' });

  // Learning
  if (at(PLACES.bootcamp, a)) add('bootcamp', 'Coding bootcamp session', `6h · ${cfa(20000)} · +6 tech · -20 energy`, { hours: 6, cost: 20000, energy: 20, from: 8, until: 20, group: 'learn' });
  if (canSleepAtHome(s) && owns(s, 'desk')) add('study', 'Study at your desk', '3h · free · +2 tech · -10 energy', { hours: 3, energy: 10, group: 'learn' });
  if (s.items.smartphone) add('youtube', 'Learn from YouTube tutorials', `3h · ${cfa(500)} of data · +2 tech · -10 energy`, { hours: 3, cost: 500, energy: 10, group: 'learn' });
  if (at(PLACES.haggle, a)) add('haggle', 'Learn to haggle from Tantie Awa', '4h · free · +3 trade · -15 energy', { hours: 4, energy: 15, from: 8, until: 18, group: 'learn' });
  if (at(PLACES.mixer, a)) add('mixer', 'After-work networking', `3h · ${cfa(8000)} · +5 charm, +2 clout`, { hours: 3, cost: 8000, from: 17, group: 'learn' });
  if (at(PLACES.golf, a)) add('golf', 'Brunch at the golf club', `4h · ${cfa(120000)} · +10 charm, +8 clout, +10 vibes`, { hours: 4, cost: 120000, from: 10, until: 18, group: 'learn' });

  // Money and places
  if (MARKETS[a]) add('market', `Trade at ${MARKETS[a]}`, '1h to open · buy cheap, sell dear', { hours: 1, from: 7, until: 20, group: 'money' });
  if (at(PLACES.bank, a)) add('bank', 'Go to the bank', 'No time cost · save, withdraw', { from: 8, until: 16, group: 'money' });
  if (s.items.smartphone) add('phone', 'Check crypto on your phone', 'No time cost · buy and sell coin', { group: 'money' });
  if (a === SHOP_AREA) add('shop', 'Shop at the Black Market and the car lot', '1h · phones, laptops, generators, cars', { hours: 1, from: 8, until: 19, group: 'money' });
  if (Object.values(HOUSES).some((h) => h.area === a)) add('agent', 'See a housing agent', '1h · rent a place here', { hours: 1, from: 8, until: 18, group: 'money' });
  if (canSleepAtHome(s) && house(s).monthly) add('rent', 'Pay a month of rent', `${cfa(house(s).monthly)} · covers 30 more days`, { cost: house(s).monthly, group: 'money' });
  if (a === JAPA.area) add('embassy', 'Apply for a visa abroad', `Fee ${cfa(JAPA.fee)} · needs ${cfa(JAPA.proofOfFunds)} proof of funds`, { cost: JAPA.fee, from: 8, until: 14, group: 'money' });

  return list;
}

// Perform an action. Returns the name of a panel to open, if any.
export function act(s, id) {
  if (s.ending || s.pendingEvent) return null;
  const action = actions(s).find((x) => x.id === id);
  if (!action || action.blocked) return null;
  s.cash -= action.cost;
  s.hour += action.hours;

  switch (id) {
    case 'work': {
      const job = JOBS[s.job];
      const pay = jobPay(s, s.job);
      s.cash += pay;
      addStat(s, 'energy', -jobEnergy(s, job));
      addStat(s, 'happiness', -3);
      addSkill(s, job.skill, 1);
      s.today.worked = true;
      s.stats.shifts += 1;
      log(s, `You worked a shift as ${job.title} and earned ${cfa(pay)}.${s.happiness < 15 ? ' (Your low vibes cost you some pay.)' : ''}`, 'good');
      break;
    }
    case 'hawk': {
      const earned = roundTo((1000 + rand(s) * 1000) * (hasTrait(s, 'hustler') ? 1.25 : 1), 25);
      s.cash += earned;
      addStat(s, 'energy', -20);
      addStat(s, 'health', -2);
      addSkill(s, 'trade', 1);
      log(s, `"Eau glacée! Eau glacée!" You made ${cfa(earned)} in the traffic jams.`, 'good');
      break;
    }
    case 'skit': {
      addStat(s, 'energy', -15);
      s.stats.skits += 1;
      const viral = rand(s) < 0.04 + s.clout / 400 + s.skills.charm / 1000;
      if (viral) {
        const deal = roundTo(20000 + s.clout * 1500, 500);
        s.cash += deal;
        addStat(s, 'clout', 10);
        addStat(s, 'happiness', 15);
        s.stats.viral += 1;
        log(s, `Your skit went viral! It's all over WhatsApp statuses. A brand paid you ${cfa(deal)} for a promo.`, 'good');
      } else {
        const views = roundTo(100 + s.clout * 60, 25);
        s.cash += views;
        addStat(s, 'clout', 2);
        addSkill(s, 'charm', 1);
        log(s, `You shot a skit. Not many views yet, but it's growing (+${cfa(views)}).`);
      }
      break;
    }
    case 'audition': {
      addStat(s, 'energy', -15);
      const chance = 0.2 + s.skills.charm / 250 + s.clout / 300 + (hasTrait(s, 'musical') ? 0.2 : 0);
      if (rand(s) < chance) {
        const fee = roundTo((25000 + s.skills.charm * 1000 + s.clout * 800) * (hasTrait(s, 'musical') ? 1.5 : 1), 500);
        s.cash += fee;
        addStat(s, 'clout', 6);
        s.stats.roles += 1;
        log(s, `You got the part! You're dancing in the new coupé-décalé hit and earned ${cfa(fee)}.`, 'good');
      } else {
        addStat(s, 'happiness', -4);
        addSkill(s, 'charm', 1);
        log(s, 'The producer said "we will call you". Nobody called.');
      }
      break;
    }
    case 'eat':
      addStat(s, 'energy', 20);
      addStat(s, 'health', 4);
      addStat(s, 'happiness', meal(s, 0));
      s.today.ate = true;
      log(s, `Attiéké, fried tuna, chilli and onions. That's a proper garba (${cfa(action.cost)}).`);
      break;
    case 'eat_posh':
      addStat(s, 'energy', 25);
      addStat(s, 'health', 5);
      addStat(s, 'happiness', meal(s, 10));
      addStat(s, 'clout', 1);
      s.today.ate = true;
      log(s, `Grilled fish, kedjenou and a fresh bissap. You posted it, of course (${cfa(action.cost)}).`);
      break;
    case 'alloco':
      addStat(s, 'energy', 15);
      addStat(s, 'happiness', meal(s, 6));
      s.today.ate = true;
      log(s, 'Hot alloco and brochettes with plenty of chilli. Delicious!');
      break;
    case 'relax':
      addStat(s, 'energy', 10);
      addStat(s, 'happiness', owns(s, 'tv') ? 16 : 8);
      log(s, owns(s, 'tv') ? 'You watched the Éléphants match on the big screen. What a goal!'
        : 'You binged an Ivorian comedy series on your phone and laughed until you cried.');
      break;
    case 'cook':
      addStat(s, 'energy', 20);
      addStat(s, 'health', 5);
      addStat(s, 'happiness', meal(s, 0));
      s.today.ate = true;
      log(s, 'You cooked attiéké with sauce graine at home. Cheap and tasty.');
      break;
    case 'study':
      addSkill(s, 'tech', 2);
      addStat(s, 'energy', -10);
      log(s, 'Three quiet hours at your desk with a programming book. +2 tech.');
      break;
    case 'maquis':
      addStat(s, 'happiness', party(s, 25));
      addStat(s, 'clout', party(s, 2));
      addStat(s, 'energy', -nightEnergy(s, 10));
      log(s, 'Braised chicken, cold drinks and coupé-décalé until the early hours. Total enjaillement!', 'good');
      break;
    case 'beach':
      addStat(s, 'happiness', 20);
      log(s, 'Sea breeze, waves and grilled fish at Port-Bouët.', 'good');
      break;
    case 'club':
      addStat(s, 'happiness', party(s, 30));
      addStat(s, 'clout', party(s, 8));
      addStat(s, 'energy', -nightEnergy(s, 20));
      log(s, 'Sparklers, bottles, and the DJ shouted your name. You did the "travaillement" in style.', 'good');
      break;
    case 'football':
      addStat(s, 'health', sport(s, 8));
      addStat(s, 'happiness', 8);
      addStat(s, 'energy', -15);
      log(s, 'You scored a beauty on the neighbourhood pitch. The boys are calling you Drogba.');
      break;
    case 'gym':
      addStat(s, 'health', sport(s, 10));
      addStat(s, 'energy', -15);
      log(s, 'Laps and push-ups at the Treichville sports park. Your body thanks you.');
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
      log(s, 'Tantie Awa: "Never take the first price, my child." +3 trade.', 'good');
      break;
    case 'mixer':
      addSkill(s, 'charm', 5);
      addStat(s, 'clout', 2);
      log(s, 'You swapped numbers with founders, bankers and a very chatty pastor. +5 charm.', 'good');
      break;
    case 'golf':
      addSkill(s, 'charm', 10);
      addStat(s, 'clout', 8);
      addStat(s, 'happiness', 10);
      log(s, 'Brunch with the Riviera crowd. You are learning how the big bosses talk.', 'good');
      break;
    case 'rent': {
      const h = house(s);
      s.home.paidUntil += 30;
      s.goals.rent = true;
      log(s, `You paid ${cfa(h.monthly)} of rent for your ${h.name}. Paid up to day ${s.home.paidUntil}.`, 'good');
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
    case 'furnish':
      return id;
    default:
      break;
  }
  updateGoals(s);
  return null;
}

function japa(s) {
  if (netWorth(s) < JAPA.proofOfFunds) {
    log(s, `Visa refused before the interview: you need ${cfa(JAPA.proofOfFunds)} proof of funds. The fee is gone.`, 'bad');
    return null;
  }
  if (rand(s) < JAPA.chance) {
    s.goals.dream = s.dream === 'abroad';
    s.ending = {
      kind: s.dream === 'abroad' ? 'win' : 'japa',
      title: 'You made it abroad!',
      text: 'Visa approved! You packed attiéké, a few wax pagnes and a lot of memories, and flew out from Port-Bouët. '
        + 'Babi made you. Wherever you land, you will hustle like a true Abidjanais.',
    };
    log(s, 'Visa approved. You moved abroad!', 'good');
  } else {
    addStat(s, 'happiness', -15);
    log(s, 'Visa refused: "insufficient ties to your home country". You can try again.', 'bad');
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
  log(s, `${old ? `You resigned as ${JOBS[old].title}. ` : ''}You got the job: ${j.title}! It pays ${cfa(j.pay)} a shift.`, 'good');
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
  return roundTo(g.base * (g.mods[area] ?? 1) * noise * (g.fx ? s.fx : 1), 25);
}

const tradeEdge = (s) => Math.min(0.15, s.skills.trade * 0.002);
export const buyPrice = (s, good) => roundTo(price(s, good) * (1 - tradeEdge(s)), 25);
export const sellPrice = (s, good) => roundTo(price(s, good) * (1 + tradeEdge(s)) * 0.95, 25);

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
  log(s, `Bought ${qty} × ${GOODS[good].name} at ${cfa(each)} each.`);
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
  log(s, `Sold ${qty} × ${GOODS[good].name} at ${cfa(each)} each (${profit >= 0 ? 'profit' : 'loss'} ${cfa(Math.abs(profit))}).`,
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
  log(s, `Deposited ${cfa(amount)}. Safe from pickpockets.`);
  return true;
}

export function withdraw(s, amount) {
  amount = Math.min(Math.floor(amount), s.bank);
  if (amount <= 0) return false;
  s.bank -= amount;
  s.cash += amount;
  log(s, `Withdrew ${cfa(amount)}.`);
  return true;
}

export function buyCrypto(s, amount) {
  amount = Math.min(Math.floor(amount), s.cash);
  if (amount <= 0 || !s.items.smartphone) return false;
  s.cash -= amount;
  s.crypto += amount / s.cryptoPrice;
  log(s, `Bought ${cfa(amount)} of BabiCoin at ${cfa(s.cryptoPrice)}.`);
  return true;
}

export function sellCrypto(s, fraction = 1) {
  if (s.crypto <= 0 || !s.items.smartphone) return false;
  const coins = s.crypto * fraction;
  const value = Math.round(coins * s.cryptoPrice);
  s.crypto -= coins;
  if (s.crypto < 1e-9) s.crypto = 0;
  s.cash += value;
  log(s, `Sold BabiCoin for ${cfa(value)}.`);
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
  if (s.area !== SHOP_AREA) return false;
  const it = shopItems(s).find((x) => x.id === id);
  if (!it || it.blocked) return false;
  s.cash -= it.cost;
  s.items[id] = true;
  if (it.clout) addStat(s, 'clout', it.clout);
  log(s, `You bought a ${it.name} for ${cfa(it.cost)}.`, 'good');
  updateGoals(s);
  return true;
}

export function housesHere(s) {
  return Object.entries(HOUSES)
    .filter(([, h]) => h.area === s.area && !h.startOnly)
    .map(([id, h]) => {
      const cost = h.monthly * MOVE_IN_MONTHS;
      const blocked = s.home?.id === id ? 'You live here' : cost > s.cash ? 'Not enough cash' : null;
      return { id, ...h, cost, blocked };
    });
}

export function moveHouse(s, id) {
  const h = housesHere(s).find((x) => x.id === id);
  if (!h || h.blocked) return false;
  s.cash -= h.cost;
  s.home = { id, paidUntil: s.day + ADVANCE_DAYS };
  addStat(s, 'clout', h.clout);
  addStat(s, 'happiness', 15);
  log(s, `You moved into a ${h.name}! Advance, deposit and agency fee: ${cfa(h.cost)}.`, 'good');
  if (id !== s.startHome) s.goals.moved = true;
  updateGoals(s);
  return true;
}

export function furnitureList(s) {
  return Object.entries(FURNITURE).map(([id, f]) => ({
    id, ...f, owned: owns(s, id), blocked: owns(s, id) ? 'You have one' : f.price > s.cash ? 'Not enough cash' : null,
  }));
}

export function buyFurniture(s, id) {
  const f = furnitureList(s).find((x) => x.id === id);
  if (!f || f.blocked || !canSleepAtHome(s)) return false;
  s.cash -= f.price;
  s.furniture[id] = true;
  s.goals.furniture = true;
  if (f.clout) addStat(s, 'clout', f.clout);
  log(s, `Delivered to your door: ${f.name} (${cfa(f.price)}). ${f.blurb}`, 'good');
  updateGoals(s);
  return true;
}

// ---------- random events ----------

const EVENTS = [
  {
    id: 'wedding', weight: 3,
    setup: () => ({ cost: 25000 }),
    text: (d) => `Your cousin's wedding is on Saturday and the family pagne costs ${cfa(d.cost)}.`,
    options: [
      { label: 'Buy the pagne and go dance', ok: (s, d) => s.cash >= d.cost,
        apply: (s, d) => { s.cash -= d.cost; addStat(s, 'happiness', 15); addStat(s, 'clout', 6); addStat(s, 'energy', -10);
          return ['You danced the whole night. Everyone noticed your outfit.', 'good']; } },
      { label: 'Say you are travelling', apply: (s) => { addStat(s, 'happiness', -4);
        return ['Your tantie is not happy with you.', 'bad']; } },
    ],
  },
  {
    id: 'family', weight: 3,
    setup: (s) => ({ amount: Math.max(5000, roundTo(s.cash * 0.1, 500)) }),
    text: (d) => `Your tonton in the village near Daloa needs ${cfa(d.amount)} for "urgent" roof repairs.`,
    options: [
      { label: 'Send it by Mobile Money', ok: (s, d) => s.cash >= d.amount,
        apply: (s, d) => { s.cash -= d.amount; addStat(s, 'happiness', 5); addStat(s, 'clout', 2);
          return ['Tonton blessed you for ten minutes on the phone.', 'good']; } },
      { label: '"The network is bad, I can\'t hear you"', apply: (s) => { addStat(s, 'happiness', -6);
        return ['The guilt follows you all day.', 'bad']; } },
    ],
  },
  {
    id: 'scam', weight: 2,
    setup: () => ({ fee: 15000 }),
    text: (d) => `A message on WhatsApp: you've "won" a new car! Just send ${cfa(d.fee)} in "fees" to claim it.`,
    options: [
      { label: 'Pay the fees', ok: (s, d) => s.cash >= d.fee,
        apply: (s, d) => { s.cash -= d.fee; addStat(s, 'happiness', -8);
          return ['The number has blocked you. That was a scam. Lesson learnt the hard way.', 'bad']; } },
      { label: 'Block and report', apply: (s) => { addSkill(s, 'charm', 1);
        return ['Sharp! Nobody can trick you.', 'good']; } },
    ],
  },
  {
    id: 'lotto', weight: 2,
    setup: () => ({}),
    text: () => 'The LONACI kiosk is calling your name. A lottery ticket costs 500 FCFA.',
    options: [
      { label: 'Play', ok: (s) => s.cash >= 500,
        apply: (s) => { s.cash -= 500;
          if (rand(s) < 0.05) { s.cash += 100000; addStat(s, 'happiness', 20); return ['Jackpot! You won 100,000 FCFA!', 'good']; }
          return ['No luck today.', 'info']; } },
      { label: 'Walk past', apply: () => ['You kept your 500 FCFA.', 'info'] },
    ],
  },
  {
    id: 'loubards', weight: 2,
    setup: () => ({ levy: 2000 }),
    text: (d) => `The neighbourhood toughs want "a little something for the boys": ${cfa(d.levy)}.`,
    options: [
      { label: 'Pay them', ok: (s, d) => s.cash >= d.levy,
        apply: (s, d) => { s.cash -= d.levy; return ['"Boss, you\'re a good man!"', 'info']; } },
      { label: 'Refuse', apply: (s) => {
        if (rand(s) < (owns(s, 'dog') ? 0.1 : 0.4)) { const lost = Math.round(s.cash * 0.1); s.cash -= lost; addStat(s, 'health', -12);
          return [`They roughed you up and took ${cfa(lost)}.`, 'bad']; }
        addStat(s, 'clout', 3); return ['You stood your ground and they backed off. Respect.', 'good']; } },
    ],
  },
  {
    id: 'transformer', weight: 2, when: (s) => Boolean(s.home) && house(s).power > 0,
    setup: () => ({ levy: 5000 }),
    text: (d) => `The landlord says every tenant must pay ${cfa(d.levy)} for a new cable for the neighbourhood transformer.`,
    options: [
      { label: 'Contribute', ok: (s, d) => s.cash >= d.levy,
        apply: (s, d) => { s.cash -= d.levy; s.powerBoostUntil = s.day + 21;
          return ['New cable! The power is much steadier for three weeks.', 'good']; } },
      { label: 'Refuse', apply: (s) => { addStat(s, 'happiness', -4); return ['Your neighbours are giving you dirty looks.', 'bad']; } },
    ],
  },
  {
    id: 'dollar', weight: 1,
    setup: () => ({}),
    text: () => 'The dollar has risen against the euro, and the CFA franc with it. Imported goods cost more, but dollar pay is worth more.',
    options: [{ label: 'OK', apply: (s) => { s.fx = Math.round(s.fx * 1.08 * 100) / 100; s.cryptoPrice = Math.round(s.cryptoPrice * 1.05);
      return [`Imports now cost ${s.fx.toFixed(2)}× what they did when you arrived.`, 'info']; } }],
  },
  {
    id: 'bapteme', weight: 2,
    setup: () => ({}),
    text: () => 'Your neighbour is celebrating a baptism, and the smell of kedjenou and foutou is coming into your room.',
    options: [
      { label: 'Go and say congratulations', apply: (s) => { addStat(s, 'energy', 10); addStat(s, 'happiness', 6); s.today.ate = true;
        return ['A full plate of kedjenou, foutou and attiéké. Free!', 'good']; } },
      { label: 'Stay in', apply: () => ['You suffered in silence.', 'info'] },
    ],
  },
  {
    id: 'palu', weight: 1, when: (s) => !owns(s, 'net') && !hasTrait(s, 'clean'),
    setup: () => ({ cost: 4000 }),
    text: (d) => `You woke up with malaria. Treatment costs ${cfa(d.cost)} at the pharmacy.`,
    options: [
      { label: 'Buy the medicine', ok: (s, d) => s.cash >= d.cost,
        apply: (s, d) => { s.cash -= d.cost; addStat(s, 'health', -5); return ['You will feel better soon.', 'info']; } },
      { label: 'Try a herbal tea and hope', apply: (s) => { addStat(s, 'health', -20); addStat(s, 'energy', -20);
        return ['The tea was bitter and the fever got worse.', 'bad']; } },
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
  { id: 'rent', label: 'Pay your rent' },
  { id: 'job', label: 'Get a job' },
  { id: 'smartphone', label: 'Buy a smartphone' },
  { id: 'furniture', label: 'Buy furniture for your home' },
  { id: 'moved', label: 'Move into a better place' },
  { id: 'generator', label: 'Buy a generator' },
  { id: 'half', label: 'Net worth of 500,000 FCFA' },
  { id: 'car', label: 'Own a car' },
  { id: 'fiveMillion', label: 'Net worth of 5 million FCFA' },
];

export function goalList(s) {
  return [...GOALS, { id: 'dream', label: `Your dream: ${DREAMS[s.dream].blurb}`, dream: true }];
}

function dreamReached(s) {
  switch (s.dream) {
    case 'villa': return s.home?.id === 'villa';
    case 'landlord': return netWorth(s) >= 10_000_000;
    case 'star': return s.stats.roles >= 5 && s.clout >= 100;
    case 'unicorn': return s.skills.tech >= 100 && s.job === 'remote';
    default: return false; // 'abroad' is reached at the embassy
  }
}

function updateGoals(s) {
  const g = s.goals;
  if (s.items.smartphone) g.smartphone = true;
  if (s.items.generator) g.generator = true;
  if (s.items.car) g.car = true;
  if (netWorth(s) >= 5e5) g.half = true;
  if (netWorth(s) >= 5e6) g.fiveMillion = true;
  if (!s.ending && dreamReached(s)) {
    g.dream = true;
    const d = DREAMS[s.dream];
    s.ending = {
      kind: 'win',
      title: `Dream achieved: ${d.name}!`,
      text: `Day ${s.day}: ${s.name} arrived in Babi with almost nothing. Now: ${d.blurb.replace(/\.$/, '').toLowerCase()}. `
        + 'The whole village is planning a party in your honour. C\'est dja!',
    };
    log(s, `You reached your dream: ${d.name}!`, 'good');
  }
}
