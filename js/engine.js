// Game rules. Pure logic with no DOM, so it runs in the browser and in Node tests.
// Functions mutate the state object they are given and write to state.log.

import {
  AREAS, TRANSPORT, JOBS, GOODS, MARKETS, HOUSES, MOVE_IN_MONTHS, ADVANCE_DAYS, ITEMS, SHOP_AREA,
  JAPA, GEN_FUEL, CARRY, TRAITS, DREAMS, BACKGROUNDS, STARTS, AVATAR, FURNITURE,
  PEOPLE, LEVELS, BUSINESSES, STAFF, BRAND, DEFAULT_START, PLACES, RAINY_MONTHS, T, GIST, FRIEND_TEXTS, RICH,
} from './data.js';

const START_DATE = Date.UTC(2026, 0, 5); // Day 1 is Monday, 5 January 2026
const DAY_END = 24;
const LOG_LIMIT = 120;
const GRACE_DAYS = 7;


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

// ---------- needs ----------
// Like The Sims: needs drain as time passes and are refilled by eating, sleeping, washing, the toilet and friends.
// `happiness` is the Fun need (shown as Vibes); `energy` is shared with actions.
export const NEEDS = [
  { id: 'hunger', label: 'Hunger', icon: '🍽️', drain: 4.5, low: "You're starving. Go and eat something!" },
  { id: 'energy', label: 'Energy', icon: '⚡', drain: 0, low: "You're exhausted. Rest or sleep soon." },
  { id: 'hygiene', label: 'Hygiene', icon: '🧼', drain: 2.5, low: 'You smell a bit. People are starting to notice. Have a wash!' },
  { id: 'bladder', label: 'Bladder', icon: '🚽', drain: 6, low: 'You really need the toilet!' },
  { id: 'happiness', label: 'Fun', icon: '🎉', drain: 0.6, low: "You're bored stiff. Do something fun." },
  { id: 'social', label: 'Social', icon: '💬', drain: 1.5, low: "You're lonely. Call someone or go out and chat." },
];

function feed(s, amount) {
  s.today.ate = true;
  addStat(s, 'hunger', amount);
}

// Mood is how well your needs are met, with the lowest need counting double.
export function moodScore(s) {
  const vals = NEEDS.map((nd) => s[nd.id]);
  return Math.round((vals.reduce((a, b) => a + b, 0) + Math.min(...vals)) / (vals.length + 1));
}

// Moves the clock on and drains needs. Every action that takes time goes through here.
function passTime(s, hours) {
  s.hour += hours;
  for (const nd of NEEDS) {
    if (!nd.drain) continue;
    const before = s[nd.id];
    let drain = nd.drain * hours;
    if (nd.id === 'happiness' && s.social < 25) drain *= 2.5;
    addStat(s, nd.id, -drain);
    if (before >= 20 && s[nd.id] < 20) log(s, nd.low, 'bad');
  }
  if (s.bladder <= 0) {
    s.bladder = 70;
    addStat(s, 'hygiene', -40);
    addStat(s, 'happiness', -20);
    addStat(s, 'clout', -3);
    log(s, "Wahala! You couldn't hold it any longer. Embarrassing...", 'bad');
  }
  if (s.hunger <= 0) addStat(s, 'health', -3 * hours);
}
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
  name: BRAND.defaultName,
  avatar: { skin: AVATAR.skins[2], outfit: AVATAR.outfits[0], pattern: 'stripes', hair: 'short' },
  traits: [],
  dream: 'villa',
  background: null,
  start: DEFAULT_START,
};

// Draws the birth lottery. Uses Math.random because it happens before the game's seeded RNG exists.
export function drawBackground(random = Math.random) {
  const list = Object.entries(BACKGROUNDS);
  let r = random() * list.reduce((n, [, b]) => n + b.weight, 0);
  return (list.find(([, b]) => (r -= b.weight) < 0) ?? list[0])[0];
}

const pickNeeds = (o) => Object.fromEntries(['hunger', 'hygiene', 'bladder', 'social'].filter((k) => k in o).map((k) => [k, o[k]]));
const noBusinesses = () => Object.fromEntries(Object.keys(BUSINESSES).map((id) => [id, 0]));

// Brings an older save up to date. Returns null if it can't be used.
export function migrate(saved) {
  if (!saved || typeof saved !== 'object') return null;
  if (saved.version === 2) {
    saved.people ??= {};
    saved.favours ??= {};
    saved.messages ??= [];
    saved.businesses ??= noBusinesses();
    saved.staff ??= { help: false, cook: false };
    saved.sleptHome ??= false;
    saved.today.talked ??= {};
    saved.today.homeDone ??= [];
    saved.version = 3;
  }
  if (saved.version === 3) {
    Object.assign(saved, { hunger: 60, hygiene: 70, bladder: 70, social: 60, ...pickNeeds(saved) });
    saved.version = 4;
  }
  return saved.version === 4 ? saved : null;
}

export function newGame(seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0, setup = {}) {
  const cfg = { ...DEFAULT_SETUP, ...setup };
  const startHome = STARTS[cfg.start] ? cfg.start : DEFAULT_START;
  const home = HOUSES[startHome];
  const bg = BACKGROUNDS[cfg.background];
  const s = {
    version: 4,
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
    hunger: 70,
    hygiene: 80,
    bladder: 75,
    social: 60,
    clout: 0,
    skills: { tech: 0, trade: 0, charm: 5 },
    area: home.area,
    home: { id: startHome, paidUntil: 30 },
    job: null,
    items: { smartphone: false, laptop: false, generator: false, car: false },
    furniture: {},
    people: {},
    favours: {},
    messages: [],
    businesses: noBusinesses(),
    staff: { help: false, cook: false },
    sleptHome: false,
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
  log(s, `${T.welcome(s.name)} You have ${cfa(s.cash)} and a ${home.name.toLowerCase()} in ${AREAS[home.area].name}. `
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
    talked: {},
    homeDone: [],
  };
  if (s.staff.cook && s.sleptHome) {
    feed(s, 35);
    addStat(s, 'energy', 10);
    log(s, 'Your cook made breakfast: hot bread, omelette and Nescafé. +10 energy.', 'good');
  }
  friendMessages(s);
  if (rand(s) < 0.06) {
    s.today.strike = true;
    log(s, T.strike, 'bad');
  }
  if (RAINY_MONTHS.includes(month(s.day)) && rand(s) < 0.2) {
    s.today.flood = true;
    log(s, T.flood, 'bad');
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
  s.sleptHome = canSleepAtHome(s);
  if (canSleepAtHome(s)) {
    const h = house(s);
    let gain = h.sleep;
    let powerOut = rand(s) < (s.day < s.powerBoostUntil ? h.power / 2 : h.power);
    if (powerOut && s.items.generator && s.cash >= GEN_FUEL) {
      s.cash -= GEN_FUEL;
      powerOut = false;
      log(s, T.genSaved(cfa(GEN_FUEL)));
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
    const comfort = (owns(s, 'speaker') ? 2 : 0) + (owns(s, 'dog') ? 4 : 0) + (owns(s, 'sofa') ? 3 : 0) + (s.staff.help ? 3 : 0);
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
  if (!s.today.ate || s.hunger < 15) {
    addStat(s, 'health', -8);
    log(s, 'You went to bed without eating. Your health is suffering.', 'bad');
  } else {
    addStat(s, 'health', 2);
  }
  if (s.energy < 10) addStat(s, 'health', -5);
  if (moodScore(s) < 15) addStat(s, 'health', -3);
  addStat(s, 'happiness', -2);
  // Overnight you get hungry, need the toilet and wake up a little grubby.
  addStat(s, 'hunger', -18);
  addStat(s, 'bladder', -35);
  addStat(s, 'hygiene', -10);
  addStat(s, 'social', -5);
  s.bank = Math.round(s.bank * 1.0005);
  businessIncome(s);
  if (dateOf(s.day).getUTCDay() === 6) payStaff(s);
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
      title: T.hospital.title,
      text: T.hospital.text,
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
    if (t.stops && !(t.stops.includes(from) && t.stops.includes(to))) blocked = t.offRoute ?? `The ${t.name} doesn't go there`;
    if (t.banned && (t.banned.includes(from) || t.banned.includes(to))) blocked = 'Moto-taxis are not allowed there';
    const strike = s.today.strike && !t.noStrike ? 1.6 : 1;
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
  passTime(s, opt.hours);
  addStat(s, 'energy', -opt.energy);
  const from = AREAS[s.area].name;
  s.area = to;
  let text = `${TRANSPORT[mode].name} from ${from} to ${AREAS[to].name}: ${opt.hours}h`
    + (opt.cost ? `, ${cfa(opt.cost)}` : '') + '.';
  let tone = 'info';
  if (opt.hours >= 2) text += ' The traffic was terrible!';
  if (TRANSPORT[mode].pickpockets && s.cash > 0 && rand(s) < 0.06) {
    const lost = Math.min(s.cash, 20000, Math.round(s.cash * (0.1 + rand(s) * 0.15)));
    s.cash -= lost;
    text += T.pickpocket(cfa(lost));
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
    text += T.police(cfa(bribe));
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
  const referred = friendsWithPerk(s, 'job').some((id) => PEOPLE[id].job === jobId);
  for (const [k, v] of referred ? [] : Object.entries(job.req)) {
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
  if (moodScore(s) < 25) pay *= 0.7;
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
    add('hawk', T.act.hawk, `3h · earn about ${hasTrait(s, 'hustler') ? '1,250–2,500' : '1,000–2,000'} FCFA · -20 energy`, { hours: 3, energy: 20, from: 7, until: 21, group: 'work' });
  }
  if (s.items.smartphone) {
    add('skit', T.act.skit, '3h · +clout, small chance to go viral · -15 energy', { hours: 3, energy: 15, group: 'work' });
  }
  if (at(PLACES.audition, a)) {
    const b = blockReason(s, { hours: 4, energy: 15, from: 9, until: 18 });
    list.push({ id: 'audition', label: T.act.audition, desc: '4h · needs charm 20 · could pay well', hours: 4, cost: 0, group: 'work',
      blocked: b ?? (s.skills.charm < 20 ? 'Needs charm 20' : null) });
  }

  // Food and rest
  if (at(PLACES.posh, a)) {
    const cost = roundTo(12000 * p / 1.5, 500);
    add('eat_posh', 'Eat at a smart restaurant', `1.5h · ${cfa(cost)} · +25 energy, +10 vibes, +1 clout`, { hours: 1.5, cost, group: 'life' });
  } else {
    const cost = roundTo(600 * p, 50);
    add('eat', T.act.eat, `1h · ${cfa(cost)} · +20 energy, +4 health`, { hours: 1, cost, group: 'life' });
  }
  if (at(PLACES.alloco, a)) {
    add('alloco', T.act.alloco, `1h · ${cfa(1500)} · +15 energy, +6 vibes`, { hours: 1, cost: 1500, from: 17, group: 'life' });
  }
  if (canSleepAtHome(s)) {
    add('relax', owns(s, 'tv') ? 'Watch TV at home' : T.act.relaxPhone,
      `2h · +10 energy, +${owns(s, 'tv') ? 16 : 8} vibes`, { hours: 2, group: 'life' });
    if (owns(s, 'stove')) add('cook', 'Cook at home', `1h · ${cfa(300)} · +20 energy, +5 health`, { hours: 1, cost: 300, group: 'life' });
    const once = (id) => (s.today.homeDone.includes(id) ? 'Already done today' : null);
    const home = (id, label, desc, opts) => { add(id, label, desc, { ...opts, group: 'home' }); const a = list[list.length - 1]; a.blocked ??= once(id); };
    add('toilet', 'Use the toilet', '15 min · bladder full relief', { hours: 0.25, group: 'home' });
    if (owns(s, 'fridge')) add('snack', 'Grab something from the fridge', `15 min · ${cfa(300)} · +25 hunger`, { hours: 0.25, cost: 300, group: 'home' });
    home('nap', 'Take a nap', '1h · +15 energy', { hours: 1 });
    home('liein', 'Stay in bed scrolling', '2h · +5 energy, +6 vibes', { hours: 2 });
    add('wash', owns(s, 'shower') ? 'Take a shower' : 'Have a bucket bath',
      `30 min · +${owns(s, 'shower') ? 90 : 60} hygiene, +3 vibes`, { hours: 0.5, group: 'home' });
    if (owns(s, 'dog')) home('playdog', T.act.playdog, '30 min · +5 vibes', { hours: 0.5 });
    home('callmaman', T.act.callmaman, '30 min · +8 vibes · she might send something', { hours: 0.5 });
    home('dance', T.act.dance, '1h · +6 vibes, +2 health · -5 energy', { hours: 1, energy: 5 });
    home('daydream', 'Daydream about going abroad', '30 min · +3 vibes', { hours: 0.5 });
    if (s.items.smartphone) home('whatsapp', 'Sell things on your WhatsApp status', `2h · earn about ${cfa(500 + s.skills.trade * 100)}`, { hours: 2, from: 8 });
    add('furnish', 'Furnish your home', 'No time cost · mattress, fan, stove, TV and more', { group: 'life' });
  }
  if (!canSleepAtHome(s)) add('publictoilet', 'Pay for a public toilet', `15 min · ${cfa(100)} · bladder relief`, { hours: 0.25, cost: 100, group: 'life' });
  if (at(PLACES.maquis, a)) {
    add('maquisdrink', T.act.maquisdrink ?? 'Order food and a cold drink', `1h · ${cfa(3000)} · +40 hunger, +8 fun, +8 social`, { hours: 1, cost: 3000, from: 11, group: 'life' });
    add('chat', T.act.chat ?? 'Chat with the regulars', '1h · free · +25 social, +5 fun', { hours: 1, from: 11, group: 'life' });
  }
  if (at(PLACES.beach, a)) add('swim', T.act.swim ?? 'Swim in the sea', '1.5h · free · +25 hygiene, +15 fun · -10 energy', { hours: 1.5, energy: 10, from: 8, until: 19, group: 'life' });
  if (at(PLACES.maquis, a)) add('maquis', T.act.maquis, `4h · ${cfa(2000)} · +${party(s, 25)} vibes, +${party(s, 2)} clout · -${nightEnergy(s, 10)} energy`, { hours: 4, cost: 2000, energy: nightEnergy(s, 10), from: 18, group: 'life' });
  if (at(PLACES.beach, a)) add('beach', T.act.beach, `3h · ${cfa(2000)} · +20 vibes`, { hours: 3, cost: 2000, from: 9, until: 20, group: 'life' });
  if (at(PLACES.club, a)) add('club', T.act.club, `3h · ${cfa(40000)} · +${party(s, 30)} vibes, +${party(s, 8)} clout · -${nightEnergy(s, 20)} energy`, { hours: 3, cost: 40000, energy: nightEnergy(s, 20), from: 20, group: 'life' });
  if (at(PLACES.football, a)) add('football', T.act.football, `2h · free · +${sport(s, 8)} health, +8 vibes · -15 energy`, { hours: 2, energy: 15, from: 7, until: 19, group: 'life' });
  if (at(PLACES.gym, a)) add('gym', T.act.gym, `2h · ${cfa(1000)} · +${sport(s, 10)} health · -15 energy`, { hours: 2, cost: 1000, energy: 15, from: 6, until: 20, group: 'life' });

  // Learning
  if (at(PLACES.bootcamp, a)) add('bootcamp', 'Coding bootcamp session', `6h · ${cfa(20000)} · +6 tech · -20 energy`, { hours: 6, cost: 20000, energy: 20, from: 8, until: 20, group: 'learn' });
  if (canSleepAtHome(s) && owns(s, 'desk')) add('study', 'Study at your desk', '3h · free · +2 tech · -10 energy', { hours: 3, energy: 10, group: 'learn' });
  if (s.items.smartphone) add('youtube', 'Learn from YouTube tutorials', `3h · ${cfa(500)} of data · +2 tech · -10 energy`, { hours: 3, cost: 500, energy: 10, group: 'learn' });
  if (at(PLACES.haggle, a)) add('haggle', T.act.haggle, '4h · free · +3 trade · -15 energy', { hours: 4, energy: 15, from: 8, until: 18, group: 'learn' });
  if (at(PLACES.mixer, a)) add('mixer', 'After-work networking', `3h · ${cfa(8000)} · +5 charm, +2 clout`, { hours: 3, cost: 8000, from: 17, group: 'learn' });
  if (at(PLACES.golf, a)) add('golf', T.act.golf, `4h · ${cfa(120000)} · +10 charm, +8 clout, +10 vibes`, { hours: 4, cost: 120000, from: 10, until: 18, group: 'learn' });

  // Money and places
  if (MARKETS[a]) add('market', `Trade at ${MARKETS[a]}`, '1h to open · buy cheap, sell dear', { hours: 1, from: 7, until: 20, group: 'money' });
  if (at(PLACES.bank, a)) add('bank', 'Go to the bank', 'No time cost · save, withdraw', { from: 8, until: 16, group: 'money' });
  if (a === SHOP_AREA) add('shop', T.act.shop, '1h · phones, laptops, generators, cars', { hours: 1, from: 8, until: 19, group: 'money' });
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
  passTime(s, action.hours);

  switch (id) {
    case 'work': {
      addStat(s, 'social', 5);
      const job = JOBS[s.job];
      const pay = jobPay(s, s.job);
      s.cash += pay;
      addStat(s, 'energy', -jobEnergy(s, job));
      addStat(s, 'happiness', -3);
      addSkill(s, job.skill, 1);
      s.today.worked = true;
      s.stats.shifts += 1;
      log(s, `You worked a shift as ${job.title} and earned ${cfa(pay)}.${moodScore(s) < 25 ? ' (Your bad mood cost you some pay.)' : ''}`, 'good');
      break;
    }
    case 'hawk': {
      const earned = roundTo((1000 + rand(s) * 1000) * (hasTrait(s, 'hustler') ? 1.25 : 1), 25);
      s.cash += earned;
      addStat(s, 'energy', -20);
      addStat(s, 'health', -2);
      addSkill(s, 'trade', 1);
      log(s, T.log.hawk(cfa(earned)), 'good');
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
      const chance = 0.2 + s.skills.charm / 250 + s.clout / 300 + (hasTrait(s, 'musical') ? 0.2 : 0) + (friendsWithPerk(s, 'audition').length ? 0.15 : 0);
      if (rand(s) < chance) {
        const fee = roundTo((25000 + s.skills.charm * 1000 + s.clout * 800) * (hasTrait(s, 'musical') ? 1.5 : 1), 500);
        s.cash += fee;
        addStat(s, 'clout', 6);
        s.stats.roles += 1;
        log(s, T.log.auditionWin(cfa(fee)), 'good');
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
      feed(s, 45);
      log(s, T.log.eat(cfa(action.cost)));
      break;
    case 'eat_posh':
      addStat(s, 'energy', 25);
      addStat(s, 'health', 5);
      addStat(s, 'happiness', meal(s, 10));
      addStat(s, 'clout', 1);
      feed(s, 60);
      log(s, T.log.eatPosh(cfa(action.cost)));
      break;
    case 'alloco':
      addStat(s, 'energy', 15);
      addStat(s, 'happiness', meal(s, 6));
      feed(s, 30);
      log(s, T.log.alloco);
      break;
    case 'relax':
      addStat(s, 'energy', 10);
      addStat(s, 'happiness', owns(s, 'tv') ? 16 : 8);
      log(s, owns(s, 'tv') ? T.log.relaxTv : T.log.relaxPhone);
      break;
    case 'cook':
      addStat(s, 'energy', 20);
      addStat(s, 'health', 5);
      addStat(s, 'happiness', meal(s, 0));
      feed(s, 50);
      log(s, T.log.cook);
      break;
    case 'toilet':
      s.bladder = 100;
      log(s, 'Ahh, much better.');
      break;
    case 'publictoilet':
      s.bladder = 100;
      addStat(s, 'hygiene', -3);
      log(s, 'You paid 100 FCFA for the public toilet. It was not the cleanest, but it did the job.');
      break;
    case 'snack':
      feed(s, 25);
      log(s, 'A cold drink and leftovers from the fridge. Just what you needed.');
      break;
    case 'maquisdrink':
      feed(s, 40);
      addStat(s, 'happiness', 8);
      addStat(s, 'social', 8);
      log(s, T.log.maquisdrink ?? 'Food, a cold drink and good company.', 'good');
      break;
    case 'chat':
      addStat(s, 'social', 25);
      addStat(s, 'happiness', 5);
      log(s, T.log.chat ?? 'You chatted with the regulars about football, politics and everybody\'s business.');
      break;
    case 'swim':
      addStat(s, 'hygiene', 25);
      addStat(s, 'happiness', 15);
      addStat(s, 'energy', -10);
      log(s, T.log.swim ?? 'You swam in the waves and dried off in the sun.', 'good');
      break;
    case 'nap':
      s.today.homeDone.push(id);
      addStat(s, 'energy', 15);
      log(s, 'You took a short nap. +15 energy.');
      break;
    case 'liein':
      s.today.homeDone.push(id);
      addStat(s, 'energy', 5);
      addStat(s, 'happiness', 6);
      log(s, 'You stayed in bed scrolling through TikTok and WhatsApp statuses. Bliss.');
      break;
    case 'wash':
      addStat(s, 'hygiene', owns(s, 'shower') ? 90 : 60);
      addStat(s, 'health', 2);
      addStat(s, 'happiness', 3);
      log(s, owns(s, 'shower') ? 'A long hot shower. You feel brand new.' : 'A cool bucket bath. You feel brand new.');
      break;
    case 'playdog':
      s.today.homeDone.push(id);
      addStat(s, 'happiness', 5);
      log(s, T.log.playdog);
      break;
    case 'callmaman': {
      addStat(s, 'social', 20);
      s.today.homeDone.push(id);
      addStat(s, 'happiness', 8);
      if (rand(s) < (s.cash < 5000 ? 0.5 : 0.2)) {
        s.cash += 5000;
        log(s, T.log.mamanSends, 'good');
      } else {
        log(s, T.log.mamanNews);
      }
      break;
    }
    case 'dance':
      s.today.homeDone.push(id);
      addStat(s, 'happiness', 6);
      addStat(s, 'health', 2);
      addStat(s, 'energy', -5);
      log(s, T.log.dance);
      break;
    case 'daydream':
      s.today.homeDone.push(id);
      addStat(s, 'happiness', 3);
      log(s, 'You scrolled through photos of Paris and Montréal and planned your future. One day...');
      break;
    case 'whatsapp': {
      s.today.homeDone.push(id);
      const earned = roundTo((500 + s.skills.trade * 100) * (0.6 + rand(s) * 0.8), 25);
      s.cash += earned;
      addSkill(s, 'trade', 1);
      log(s, T.log.whatsapp(cfa(earned)), 'good');
      break;
    }
    case 'study':
      addSkill(s, 'tech', 2);
      addStat(s, 'energy', -10);
      log(s, 'Three quiet hours at your desk with a programming book. +2 tech.');
      break;
    case 'maquis':
      addStat(s, 'social', 25);
      addStat(s, 'happiness', party(s, 25));
      addStat(s, 'clout', party(s, 2));
      addStat(s, 'energy', -nightEnergy(s, 10));
      log(s, T.log.maquis, 'good');
      break;
    case 'beach':
      addStat(s, 'social', 5);
      addStat(s, 'happiness', 20);
      log(s, T.log.beach, 'good');
      break;
    case 'club':
      addStat(s, 'social', 20);
      addStat(s, 'happiness', party(s, 30));
      addStat(s, 'clout', party(s, 8));
      addStat(s, 'energy', -nightEnergy(s, 20));
      log(s, T.log.club, 'good');
      break;
    case 'football':
      addStat(s, 'social', 15);
      addStat(s, 'health', sport(s, 8));
      addStat(s, 'happiness', 8);
      addStat(s, 'energy', -15);
      log(s, T.log.football);
      break;
    case 'gym':
      addStat(s, 'health', sport(s, 10));
      addStat(s, 'energy', -15);
      log(s, T.log.gym);
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
      log(s, T.log.haggle, 'good');
      break;
    case 'mixer':
      addStat(s, 'social', 20);
      addSkill(s, 'charm', 5);
      addStat(s, 'clout', 2);
      log(s, 'You swapped numbers with founders, bankers and a very chatty pastor. +5 charm.', 'good');
      break;
    case 'golf':
      addStat(s, 'social', 15);
      addSkill(s, 'charm', 10);
      addStat(s, 'clout', 8);
      addStat(s, 'happiness', 10);
      log(s, T.log.golf, 'good');
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
      text: T.abroad,
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

const tradeEdge = (s) => Math.min(0.15, s.skills.trade * 0.002) + (friendsWithPerk(s, 'discount').length ? 0.05 : 0);
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
  log(s, `Bought ${cfa(amount)} of ${T.coin} at ${cfa(s.cryptoPrice)}.`);
  return true;
}

export function sellCrypto(s, fraction = 1) {
  if (s.crypto <= 0 || !s.items.smartphone) return false;
  const coins = s.crypto * fraction;
  const value = Math.round(coins * s.cryptoPrice);
  s.crypto -= coins;
  if (s.crypto < 1e-9) s.crypto = 0;
  s.cash += value;
  log(s, `Sold ${T.coin} for ${cfa(value)}.`);
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
    text: (d) => T.ev.wedding(cfa(d.cost)),
    options: [
      { label: T.ev.weddingYes, ok: (s, d) => s.cash >= d.cost,
        apply: (s, d) => { s.cash -= d.cost; addStat(s, 'happiness', 15); addStat(s, 'clout', 6); addStat(s, 'energy', -10);
          return ['You danced the whole night. Everyone noticed your outfit.', 'good']; } },
      { label: 'Say you are travelling', apply: (s) => { addStat(s, 'happiness', -4);
        return ['Your tantie is not happy with you.', 'bad']; } },
    ],
  },
  {
    id: 'family', weight: 3,
    setup: (s) => ({ amount: Math.max(5000, roundTo(s.cash * 0.1, 500)) }),
    text: (d) => T.ev.family(cfa(d.amount)),
    options: [
      { label: 'Send it by Mobile Money', ok: (s, d) => s.cash >= d.amount,
        apply: (s, d) => { s.cash -= d.amount; addStat(s, 'happiness', 5); addStat(s, 'clout', 2);
          return [T.ev.familyThanks, 'good']; } },
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
    text: () => T.ev.lotto,
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
    text: () => T.ev.feast,
    options: [
      { label: 'Go and say congratulations', apply: (s) => { addStat(s, 'energy', 10); addStat(s, 'happiness', 6); feed(s, 40);
        return [T.ev.feastYes, 'good']; } },
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
  { id: 'friend', label: T.goalFriend },
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
    case 'padi': return Object.values(s.people).filter((p) => p.rel >= 80).length >= 4;
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
  if (Object.values(s.people).some((p) => p.rel >= 45)) g.friend = true;
  if (!s.ending && dreamReached(s)) {
    g.dream = true;
    const d = DREAMS[s.dream];
    s.ending = {
      kind: 'win',
      title: `Dream achieved: ${d.name}!`,
      text: `Day ${s.day}: ${s.name} arrived in ${BRAND.city} with almost nothing. Now: ${d.blurb.replace(/\.$/, '').toLowerCase()}. `
        + 'The whole village is planning a party in your honour. C\'est dja!',
    };
    log(s, `You reached your dream: ${d.name}!`, 'good');
  }
}

// ---------- people ----------

export function levelName(rel) {
  return LEVELS.filter(([min]) => rel >= min).pop()[1];
}

export const relation = (s, id) => s.people[id]?.rel ?? 0;

export function friendsWithPerk(s, perk) {
  return Object.keys(PEOPLE).filter((id) => PEOPLE[id].perk === perk && relation(s, id) >= 45);
}

export function peopleHere(s) {
  return Object.entries(PEOPLE)
    .filter(([, p]) => p.area === s.area && s.hour >= p.hours[0] && s.hour < p.hours[1])
    .map(([id, p]) => ({ id, ...p, rel: relation(s, id), level: levelName(relation(s, id)) }));
}

const SOCIAL = {
  hello: { label: 'Say hello', hours: 0.25, min: 0 },
  gist: { label: 'Gist (chat)', hours: 1, min: 15 },
  joke: { label: 'Crack a joke', hours: 0.25, min: 10 },
  compliment: { label: 'Give a compliment', hours: 0.25, min: 0 },
  gift: { label: 'Offer a gift', hours: 0.25, min: 20, cost: 2000 },
  favour: { label: 'Ask a favour', hours: 0.5, min: 45 },
};

const FAVOUR_COOLDOWN = { loan: 7, tech: 7, clout: 7, food: 1 };

export function socialOptions(s, id) {
  const p = PEOPLE[id];
  const here = peopleHere(s).some((x) => x.id === id);
  const done = s.today.talked[id] ?? [];
  return Object.entries(SOCIAL)
    .filter(([k]) => k !== 'favour' || FAVOUR_COOLDOWN[p.perk])
    .map(([k, a]) => {
      let blocked = null;
      if (!here) blocked = `${p.name} isn't here right now`;
      else if (relation(s, id) < a.min) blocked = `Needs a bond of ${a.min}`;
      else if (done.includes(k)) blocked = 'Already done today';
      else if (k === 'favour' && (s.favours[id] ?? -99) + FAVOUR_COOLDOWN[p.perk] > s.day) blocked = 'Ask again later';
      else if (a.cost && a.cost > s.cash) blocked = 'Not enough cash';
      else if (s.hour + a.hours > DAY_END) blocked = 'Too late in the day';
      return { id: k, label: k === 'gift' ? `${a.label} (${cfa(a.cost)})` : a.label, blocked };
    });
}

function addRel(s, id, delta) {
  // Nobody warms up to someone who smells.
  if (delta > 0 && s.hygiene < 20) {
    delta = Math.ceil(delta / 2);
    log(s, `${PEOPLE[id].name} wrinkles their nose. You could do with a wash.`, 'bad');
  }
  const p = (s.people[id] ??= { rel: 0 });
  const before = levelName(p.rel);
  p.rel = clamp(p.rel + delta);
  const after = levelName(p.rel);
  if (after !== before && delta > 0) log(s, `You and ${PEOPLE[id].name} are now: ${after}.`, 'good');
}


export function socialize(s, id, act) {
  if (s.ending || s.pendingEvent) return false;
  const opt = socialOptions(s, id).find((o) => o.id === act);
  if (!opt || opt.blocked) return false;
  const p = PEOPLE[id];
  const a = SOCIAL[act];
  passTime(s, a.hours);
  (s.today.talked[id] ??= []).push(act);
  const first = !s.people[id];
  switch (act) {
    case 'hello':
      addStat(s, 'social', 5);
      addRel(s, id, first ? 10 : 4);
      log(s, first ? `You introduced yourself to ${p.name}, ${p.role.toLowerCase()}.` : `You greeted ${p.name}. "On dit quoi?"`);
      break;
    case 'gist':
      addStat(s, 'social', 15);
      addRel(s, id, 8);
      addStat(s, 'happiness', 4);
      log(s, `You and ${p.name} ${GIST[Math.floor(rand(s) * GIST.length)]}. +4 vibes.`);
      break;
    case 'joke':
      addStat(s, 'social', 8);
      if (rand(s) < 0.4 + s.skills.charm / 150) {
        addRel(s, id, 10);
        addStat(s, 'happiness', 3);
        log(s, `${p.name} laughed so hard they had to sit down.`, 'good');
      } else {
        addRel(s, id, -3);
        log(s, `Your joke fell flat. ${p.name} gave you a polite smile.`, 'bad');
      }
      break;
    case 'compliment':
      addStat(s, 'social', 6);
      addRel(s, id, hasTrait(s, 'talker') ? 9 : 5);
      log(s, `You complimented ${p.name}. They looked pleased.`);
      break;
    case 'gift':
      addStat(s, 'social', 6);
      s.cash -= a.cost;
      addRel(s, id, 12);
      log(s, `You gave ${p.name} a small gift. "Ah, you shouldn't have!"`, 'good');
      break;
    case 'favour':
      s.favours[id] = s.day;
      doFavour(s, id);
      break;
    default:
      break;
  }
  updateGoals(s);
  return true;
}

function doFavour(s, id) {
  const p = PEOPLE[id];
  if (p.perk === 'loan') {
    s.cash += 20000;
    log(s, `${p.name} slipped you 20,000 FCFA. "Pay me back when things are better."`, 'good');
  } else if (p.perk === 'tech') {
    addSkill(s, 'tech', 4);
    log(s, `You studied algorithms with ${p.name} at the university library. +4 tech.`, 'good');
  } else if (p.perk === 'clout') {
    addStat(s, 'clout', 8);
    log(s, `${p.name} featured you in a video. Your phone won't stop buzzing. +8 clout.`, 'good');
  } else if (p.perk === 'food') {
    feed(s, 40);
    addStat(s, 'energy', 15);
    log(s, `${p.name} shared a meal with you. +15 energy.`, 'good');
  }
}


function friendMessages(s) {
  for (const [id, p] of Object.entries(s.people)) {
    if (p.rel >= 45 && rand(s) < 0.12) {
      s.messages.unshift({ from: id, day: s.day, text: FRIEND_TEXTS[Math.floor(rand(s) * FRIEND_TEXTS.length)], read: false });
    }
  }
  s.messages.length = Math.min(s.messages.length, 40);
}

export const unreadCount = (s) => s.messages.filter((m) => !m.read).length;

export function readMessages(s) {
  for (const m of s.messages) m.read = true;
}

// ---------- businesses and staff ----------

export function businessList(s) {
  return Object.entries(BUSINESSES).map(([id, b]) => {
    const owned = s.businesses[id] ?? 0;
    const blocked = owned >= b.max ? `You own the maximum (${b.max})` : b.price > s.cash ? 'Not enough cash' : null;
    return { id, ...b, owned, blocked };
  });
}

export function buyBusiness(s, id) {
  const b = businessList(s).find((x) => x.id === id);
  if (!b || b.blocked || !s.items.smartphone) return false;
  s.cash -= b.price;
  s.businesses[id] = b.owned + 1;
  addStat(s, 'clout', 5);
  log(s, `You bought a ${b.name.toLowerCase()} for ${cfa(b.price)}. Money will come in every night.`, 'good');
  updateGoals(s);
  return true;
}

function businessIncome(s) {
  let total = 0;
  const notes = [];
  const weekend = [5, 6].includes(dateOf(s.day).getUTCDay());
  for (const [id, b] of Object.entries(BUSINESSES)) {
    for (let i = 0; i < (s.businesses[id] ?? 0); i++) {
      if (b.breakdown && rand(s) < b.breakdown) {
        total -= b.repair;
        notes.push(`a ${b.short ?? id} broke down (repairs ${cfa(b.repair)})`);
        continue;
      }
      total += Math.round((b.income[0] + rand(s) * (b.income[1] - b.income[0])) * (weekend && b.weekend ? b.weekend : 1));
    }
  }
  if (!notes.length && !total) return;
  s.cash = Math.max(0, s.cash + total);
  log(s, `Business takings today: ${cfa(total)}${notes.length ? `; ${notes.join(', ')}` : ''}.`, total >= 0 ? 'good' : 'bad');
}

export function staffList(s) {
  return Object.entries(STAFF).map(([id, st]) => ({ id, ...st, hired: s.staff[id],
    blocked: !s.home ? 'You need a home first' : null }));
}

export function setStaff(s, id, hire) {
  const st = staffList(s).find((x) => x.id === id);
  if (!st || (hire && st.blocked)) return false;
  s.staff[id] = hire;
  log(s, hire ? `You hired a ${st.name.toLowerCase()} for ${cfa(st.wage)} a week, paid on Saturdays.` : `You let your ${st.name.toLowerCase()} go.`);
  return true;
}

function payStaff(s) {
  for (const [id, st] of Object.entries(STAFF)) {
    if (!s.staff[id]) continue;
    if (!s.home || s.cash < st.wage) {
      s.staff[id] = false;
      log(s, `You couldn't pay your ${st.name.toLowerCase()}, so they left.`, 'bad');
    } else {
      s.cash -= st.wage;
      log(s, `Paid your ${st.name.toLowerCase()} ${cfa(st.wage)} for the week.`);
    }
  }
}


export function richList(s) {
  return [...RICH.map(([name, source, worth]) => ({ name, source, worth })), { name: `${s.name} (you)`, source: 'The hustle', worth: netWorth(s), you: true }]
    .sort((a, b) => b.worth - a.worth);
}
