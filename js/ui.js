// DOM rendering and input. All game rules live in engine.js.

import {
  AREAS, ROADS, GOODS, MARKETS, JOBS, HOUSES, MOVE_IN_MONTHS, JAPA,
  TRAITS, DREAMS, BACKGROUNDS, STARTS, AVATAR, FURNITURE, PEOPLE, STREET_LINES, TRANSPORT, BRAND, MAP, SCENE, T, HELP, SHOP_AREA, CITY_ID,
  PLACES,
} from './data.js';
import * as G from './engine.js';
import { has3D, createStage } from './scene3d.js';

const SAVE_KEY = BRAND.saveKey;
const $ = (sel) => document.querySelector(sel);
// Lets the stylesheet give each city its own colours.
document.documentElement.dataset.city = CITY_ID;
const modal = $('#modal');
const hotState = window.claude?.hot?.data?.state;
const saved = G.migrate(hotState) ?? load();
// A placeholder life sits behind the setup screen until the player creates their own.
let s = saved ?? G.newGame();
let inSetup = !saved;
// Keeps the game going when an embedded viewer reloads the page.
window.claude?.hot?.snapshot?.(() => ({ state: s }));

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const saved = raw && JSON.parse(raw);
    return G.migrate(saved);
  } catch {
    return null;
  }
}

function save() {
  if (inSetup) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const n = G.cfa;

// ---------- main render ----------

// Which part of the game fills the screen: 'home', 'street' or 'map'.
let view = G.canSleepAtHome(s) ? 'home' : 'street';
let stage = null;
let lastToast = null;

function render() {
  renderTop();
  renderMap();
  renderStage();
  renderTabs();
  showNewToasts();
  save();
  if (inSetup) return;
  if (s.ending) openEnding();
  else if (s.pendingEvent) openEvent();
}

// ---------- avatar ----------

let patternCount = 0;
const HAIR_INK = '#1d1b16';

function avatarSvg(av, { width = 60, label = 'Your character' } = {}) {
  const id = `wax${++patternCount}`;
  const o = av.outfit;
  const patterns = {
    stripes: `<rect width="8" height="8" fill="${o}"/><rect y="5" width="8" height="3" fill="#ffffff" opacity=".55"/>`,
    dots: `<rect width="9" height="9" fill="${o}"/><circle cx="4.5" cy="4.5" r="2.2" fill="#ffffff" opacity=".6"/>`,
    kente: `<rect width="12" height="12" fill="${o}"/><rect width="6" height="6" fill="${HAIR_INK}" opacity=".5"/><rect x="6" y="6" width="6" height="6" fill="#ffd23f" opacity=".85"/>`,
  };
  const size = { stripes: 8, dots: 9, kente: 12 }[av.pattern];
  const defs = patterns[av.pattern]
    ? `<defs><pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${patterns[av.pattern]}</pattern></defs>` : '';
  const cloth = patterns[av.pattern] ? `url(#${id})` : o;
  const back = av.hair === 'afro' ? `<circle cx="30" cy="21" r="16" fill="${HAIR_INK}"/>` : '';
  const front = {
    short: `<path d="M18 23 Q19 10 30 10 Q41 10 42 23 Q38 15 30 15 Q22 15 18 23Z" fill="${HAIR_INK}"/>`,
    afro: '',
    locks: `<path d="M18 24 Q19 10 30 10 Q41 10 42 24 Q38 15 30 15 Q22 15 18 24Z" fill="${HAIR_INK}"/>`
      + [16, 20, 38, 42].map((x) => `<rect x="${x}" y="19" width="3" height="17" rx="1.5" fill="${HAIR_INK}"/>`).join(''),
    foulard: `<path d="M16 24 Q16 6 30 6 Q44 6 44 24 Q38 14 30 14 Q22 14 16 24Z" fill="${cloth}"/><circle cx="43" cy="11" r="4.5" fill="${cloth}"/>`,
  }[av.hair] ?? '';
  return `<svg class="avatar" viewBox="0 0 60 80" width="${width}" height="${Math.round(width * 4 / 3)}" role="img" aria-label="${esc(label)}">
    ${defs}${back}
    <path d="M10 80 Q10 46 30 44 Q50 46 50 80Z" fill="${cloth}"/>
    <rect x="26" y="34" width="8" height="10" rx="3" fill="${av.skin}"/>
    <circle cx="30" cy="25" r="12" fill="${av.skin}"/>
    <circle cx="25.5" cy="25" r="1.4" fill="${HAIR_INK}"/><circle cx="34.5" cy="25" r="1.4" fill="${HAIR_INK}"/>
    <path d="M26 30 Q30 33.5 34 30" stroke="${HAIR_INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    ${front}
  </svg>`;
}

function mood(v) {
  if (v >= 70) return '😄 Happy';
  if (v >= 45) return '🙂 Fine';
  if (v >= 25) return '😟 Stressed';
  return '😞 Down';
}

function bar(label, value, cls = '') {
  const low = cls === '' && value < 25 ? ' low' : '';
  return `<div class="bar"><span>${label}</span><div class="bar-track"><div class="bar-fill ${cls}${low}" style="width:${value}%"></div></div><span>${Math.round(value)}</span></div>`;
}

// ---------- shared pieces ----------

const ACT_ICON = {
  work: '💼', jobs: '📋', hawk: '💧', skit: '🎬', audition: '🎤', eat: '🍛', eat_posh: '🍽️', alloco: '🍢',
  relax: '📺', cook: '🍳', furnish: '🛋️', nap: '😴', liein: '🛏️', wash: '🚿', playdog: '🐕', callmaman: '📞',
  dance: '💃🏾', daydream: '✈️', whatsapp: '📲', maquis: '🍻', beach: '🏖️', club: '🪩', football: '⚽', gym: '🏃🏾',
  bootcamp: '💻', study: '📚', youtube: '▶️', haggle: '🤝', mixer: '🥂', golf: '⛳', market: '🧺', bank: '🏦',
  shop: '📱', agent: '🔑', rent: '🏠', embassy: '🛂', sleep: '🌙',
  toilet: '🚽', publictoilet: '🚽', snack: '🥤', maquisdrink: '🍗', chat: '💬', swim: '🏊🏾',
  hello: '👋', gist: '💬', joke: '😂', compliment: '🌟', gift: '🎁', favour: '🙏',
};

// Turns "1h · 600 FCFA · +20 energy, +4 health" into small chips.
function chipsFor(desc = '') {
  return desc.split(' · ')
    .flatMap((seg) => (seg.split(', ').every((x) => /^[+-]\d/.test(x)) ? seg.split(', ') : [seg]))
    .filter(Boolean).map((seg) => {
    let cls = '';
    let txt = seg;
    if (/^(\d+(\.\d+)?h|\d+ min)$/.test(seg)) { cls = 'time'; txt = `⏱ ${seg}`; }
    else if (/^free$/i.test(seg) || /^No time cost$/.test(seg)) cls = 'free';
    else if (/^\+|^earn|^could pay|^Earn/.test(seg)) cls = 'gain';
    else if (/^-/.test(seg)) cls = 'drain';
    else if (/FCFA/.test(seg) && !/earn/.test(seg)) { cls = 'cost'; txt = `💰 ${seg}`; }
    return `<span class="chip-s ${cls}">${esc(txt)}</span>`;
  }).join('');
}

// One tappable action card. `a` has id, label, desc and blocked.
function actCard(a, attr = 'data-act', icon = ACT_ICON[a.id]) {
  return `<button class="card-act" type="button" ${attr}="${a.id}" ${a.blocked ? 'disabled' : ''}>
    <span class="ca-ic" aria-hidden="true">${icon ?? '✨'}</span>
    <span class="ca-body"><strong>${esc(a.label)}</strong>
      <span class="ca-chips">${chipsFor(a.desc)}</span>
      ${a.note ? `<small class="ca-note">${esc(a.note)}</small>` : ''}
      ${a.blocked ? `<span class="ca-why">🔒 ${esc(a.blocked)}</span>` : ''}</span>
  </button>`;
}

// A circular gauge for the HUD.
function gauge(icon, value, label) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const tone = value >= 50 ? 'ok' : value >= 25 ? 'mid' : 'low';
  return `<div class="gauge ${tone}" title="${label} ${Math.round(value)}" data-label="${label}">
    <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" class="g-track"/>
      <circle cx="22" cy="22" r="${r}" class="g-fill" stroke-dasharray="${(value / 100) * c} ${c}" transform="rotate(-90 22 22)"/></svg>
    <span class="g-ic" aria-hidden="true">${icon}</span><span class="g-val">${Math.round(value)}</span>
  </div>`;
}

const timeOfDay = (h) => (h < 9 ? 'morning' : h < 17 ? 'day' : h < 19.5 ? 'evening' : 'night');

function renderTop() {
  const m = G.moodScore(s);
  const ring = m >= 70 ? 'var(--green)' : m >= 45 ? 'var(--accent)' : 'var(--red)';
  $('#me').innerHTML = `<span class="me-ava" style="--ring:${ring}">${avatarSvg(s.avatar, { width: 34, label: s.name })}</span>
    <span class="me-text"><strong>${esc(s.name)}</strong><small>${mood(m)} · ❤️ ${Math.round(s.health)}</small></span>`;
  // The clock arc fills as the day goes from 06h00 to midnight.
  const dayFrac = Math.max(0, Math.min(1, (s.hour - 6) / 18));
  const arc = 2 * Math.PI * 15;
  const tod = { morning: '🌅', day: '☀️', evening: '🌇', night: '🌙' }[timeOfDay(s.hour)];
  $('#status').innerHTML = `
    <span class="clock"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="c-track"/>
      <circle cx="18" cy="18" r="15" class="c-fill" stroke-dasharray="${dayFrac * arc} ${arc}" transform="rotate(-90 18 18)"/></svg>
      <span class="c-ic">${tod}</span></span>
    <span class="when"><b>${G.clock(s.hour)}</b><small>${esc(G.dateLabel(s.day).replace(/ \d{4}$/, ''))} · Day ${s.day}</small></span>
    ${s.today.strike ? '<span class="alert">🚐 Strike</span>' : ''}${s.today.flood ? '<span class="alert">🌧 Floods</span>' : ''}`;
  $('#wallet').innerHTML = `<span class="coin" aria-hidden="true">₣</span><span><b>${n(s.cash)}</b>${s.bank ? `<small>Bank ${n(s.bank)}</small>` : ''}</span>`;
  $('#meters').innerHTML = G.NEEDS.map((nd) => gauge(nd.icon, s[nd.id], nd.label)).join('');
  $('#meters').setAttribute('aria-label', G.NEEDS.map((nd) => `${nd.label} ${Math.round(s[nd.id])}`).join(', '));
  $('.stage').dataset.time = timeOfDay(s.hour);
}

function renderTabs() {
  for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === (view === 'lot' ? 'street' : view));
  const unread = G.unreadCount(s);
  $('#phone-badge').hidden = !unread;
  $('#phone-badge').textContent = unread;
}

// ---------- toasts ----------

const logKey = (l) => l && `${l.day}|${l.hour}|${l.text}`;

function showNewToasts() {
  if (inSetup) return;
  const fresh = [];
  for (const l of s.log) {
    if (logKey(l) === lastToast) break;
    fresh.push(l);
    if (fresh.length === 3) break;
  }
  if (lastToast !== null) for (const l of fresh.reverse()) toast(l.text, l.tone);
  lastToast = logKey(s.log[0]);
}

function toast(text, tone = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 4200);
  setTimeout(() => el.remove(), 4700);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}

// ---------- the stage ----------

const BASE_OBJECTS = ['bed', 'chair', 'bucket', 'toilet'];

// Places you can walk into, and what each thing inside them does.
let lotKind = null;
const LOTS = {
  maquis: { label: 'Maquis', sign: 'MAQUIS', color: '#c7362b', where: () => PLACES.maquis === s.area },
  market: { label: 'Market', sign: 'MARCHÉ', color: '#009e60', where: () => Boolean(MARKETS[s.area]) },
  beach: { label: 'Beach', sign: 'PLAGE', color: '#1f7ae0', where: () => PLACES.beach === s.area },
};
const LOT_OBJECTS = {
  maquis: {
    bar: { label: 'The bar', acts: ['maquisdrink'] },
    dance: { label: 'Dance floor', acts: ['maquis'] },
    table: { label: 'A table of regulars', acts: ['chat'] },
    dj: { label: 'DJ booth', acts: ['maquis', 'audition'] },
  },
  market: {
    stall: { label: 'Market stalls', acts: ['market'] },
    garba: { label: 'Food stand', acts: ['eat', 'alloco'] },
    wc: { label: 'Public toilet', acts: ['publictoilet'] },
  },
  beach: {
    sea: { label: 'The sea', acts: ['swim'] },
    umbrella: { label: 'Beach umbrella', acts: ['beach'] },
    grill: { label: 'Fish grill', acts: ['eat'] },
  },
};
// A city can rename a place (Dakar has dibiteries, not maquis).
for (const [id, o] of Object.entries(T.lots ?? {})) Object.assign(LOTS[id], o);
const doorsHere = () => Object.entries(LOTS).filter(([, l]) => l.where()).map(([id, l]) => ({ id, label: l.label, sign: l.sign, color: l.color }));

function enterLot(kind) {
  lotKind = kind;
  view = 'lot';
  render();
}

function renderStage() {
  $('#map-view').hidden = view !== 'map';
  const h = G.house(s);
  const atHome = G.canSleepAtHome(s);
  const msg = $('#stage-msg');
  msg.hidden = true;
  if (view === 'map') {
    $('#place').innerHTML = `<b>🗺️ ${esc(BRAND.cityName)}</b><small>Tap a neighbourhood to travel there</small>`;
    $('#hint').hidden = true;
    return;
  }
  if (view === 'home' && !atHome) {
    msg.hidden = false;
    msg.innerHTML = h
      ? `<p>Your ${esc(h.name.toLowerCase())} is in <b>${esc(AREAS[h.area].name)}</b>. You're in ${esc(AREAS[s.area].name)}.</p>
         <button class="primary" id="go-home">Go home</button>`
      : '<p>You have no home right now. Find a housing agent on the street and save up for the move-in fee.</p>';
    $('#go-home')?.addEventListener('click', () => openTravel(h.area));
  }
  if (view === 'lot' && !LOTS[lotKind]?.where()) view = 'street';
  $('#place').innerHTML = view === 'home'
    ? `<b>🏠 ${esc(h ? h.name : 'No home')}</b><small>${esc(AREAS[h?.area ?? s.area].name)}</small>`
    : view === 'lot'
      ? `<b>${esc(LOTS[lotKind].label)} · ${esc(AREAS[s.area].name)}</b><small>Tap things to use them · tap people to talk</small>`
      : `<b>📍 ${esc(AREAS[s.area].name)}</b><small>${esc(AREAS[s.area].blurb)}</small>`;
  $('#leave').hidden = view !== 'lot';
  $('#hint').hidden = !(s.day <= 3 && msg.hidden);
  $('#hint').textContent = view === 'home' ? 'Tap the floor to walk · tap your things to use them' : 'Tap the ground to walk · tap a person to talk';
  stage?.setTime?.(s.hour);
  if (stage) {
    $('#stage3d').hidden = !msg.hidden;
    $('#stage2d').hidden = true;
    if (view === 'home' && atHome) {
      const owned = Object.keys(FURNITURE).filter((id) => G.owns(s, id) && id !== 'mattress' && id !== 'net');
      stage.showHome({ items: [...BASE_OBJECTS, ...owned], mattress: G.owns(s, 'mattress'), net: G.owns(s, 'net'), look: s.avatar, scene: SCENE });
    } else if (view === 'street') {
      stage.showStreet({ area: { id: s.area, ...AREAS[s.area] }, look: s.avatar, scene: SCENE, doors: doorsHere(),
        people: G.peopleHere(s).map((p) => ({ id: p.id, name: p.name, level: p.level, look: p.look })) });
    } else if (view === 'lot') {
      stage.showLot({ kind: lotKind, look: s.avatar,
        people: G.peopleHere(s).map((p) => ({ id: p.id, name: p.name, level: p.level, look: p.look })) });
    }
  } else {
    $('#stage2d').hidden = !msg.hidden;
    if (view === 'home' && atHome) renderHome();
    else renderStreet();
  }
}

function initStage() {
  if (!has3D()) return;
  try {
    stage = createStage($('#stage3d'), { onObject: openObject, onPerson: openPerson, onDoor: enterLot });
    window.frenzyStage = stage;
  } catch {
    stage = null;
  }
}

function renderMap() {
  const homeArea = G.house(s)?.area;
  const roads = ROADS.map(([a, b]) => `<line class="road" x1="${AREAS[a].x}" y1="${AREAS[a].y}" x2="${AREAS[b].x}" y2="${AREAS[b].y}"/>`).join('');
  const areas = Object.entries(AREAS).map(([id, a]) => {
    const cls = ['area', id === s.area ? 'here' : '', id === homeArea ? 'home' : ''].join(' ');
    const labelBelow = a.y < 120 || MAP.labelBelow.includes(id) || id === s.area;
    const ty = labelBelow ? a.y + 28 : a.y - 18;
    return `<g class="${cls}" data-area="${id}" tabindex="0" role="button" aria-label="Travel to ${esc(a.name)}${id === s.area ? ' (you are here)' : ''}">
      <circle cx="${a.x}" cy="${a.y}" r="11"/>
      <text x="${a.x}" y="${ty}" text-anchor="middle">${esc(a.name)}</text>
      ${id === s.area ? `<g class="you" transform="translate(${a.x - 12} ${a.y - 36})">${avatarSvg(s.avatar, { width: 24, label: 'You' })}</g>` : ''}
    </g>`;
  }).join('');
  $('#map').innerHTML = `
    ${MAP.land.map((d) => `<path class="land" d="${d}"/>`).join('')}
    ${MAP.labels.map(([x, y, label]) => `<text class="map-label" x="${x}" y="${y}">${esc(label)}</text>`).join('')}
    ${roads}${areas}`;
  for (const g of document.querySelectorAll('.area')) {
    const go = () => openTravel(g.dataset.area);
    g.addEventListener('click', go);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }
}

const GROUPS = { work: 'Hustle', home: 'At home', life: 'Enjoy life', learn: 'Learn', money: 'Money & places', do: 'Other' };

const GROUP_ICON = { work: '💼', home: '🏠', life: '🎉', learn: '📚', money: '💰', do: '✨' };
let doTab = null;

function openDo() {
  const list = G.actions(s);
  const here = G.peopleHere(s);
  const groups = Object.keys(GROUPS).filter((g) => list.some((a) => a.group === g));
  if (!groups.includes(doTab)) doTab = groups.find((g) => list.some((a) => a.group === g && !a.blocked)) ?? groups[0];
  const tabs = groups.map((g) => {
    const open = list.filter((a) => a.group === g && !a.blocked).length;
    return `<button class="seg ${g === doTab ? 'on' : ''}" data-seg="${g}" aria-pressed="${g === doTab}">${GROUP_ICON[g]} ${GROUPS[g]}<span class="seg-n">${open}</span></button>`;
  }).join('');
  const people = here.length ? `<div class="who-row">${here.map((p) => `
      <button class="who-chip" type="button" data-person="${p.id}">${avatarSvg(p.look, { width: 26, label: p.name })}
        <span><strong>${esc(p.name)}</strong><small>${esc(p.level)}</small></span></button>`).join('')}</div>` : '';
  const atHome = G.canSleepAtHome(s);
  showModal(`In ${AREAS[s.area].name}`, `
    ${people}
    <div class="segs" role="group" aria-label="Kinds of things to do">${tabs}</div>
    <div class="card-grid">${list.filter((a) => a.group === doTab).map((a) => actCard(a)).join('')}</div>
    <button class="sleep-card ${atHome ? '' : 'risky'}" data-sleep><span aria-hidden="true">🌙</span>
      <span><strong>${atHome ? 'Sleep at home' : 'Sleep rough here'}</strong><small>${atHome ? 'End the day and get your energy back' : 'Risky: you could get robbed'}</small></span></button>`);
  wire('[data-seg]', (b) => { doTab = b.dataset.seg; openDo(); });
  wire('[data-act]', (b) => {
    modal.close();
    const panel = G.act(s, b.dataset.act);
    render();
    if (panel) openPanel(panel);
  });
  wire('[data-person]', (b) => openPerson(b.dataset.person));
  wire('[data-sleep]', () => { modal.close(); trySleep(); });
}

function relBar(rel) {
  return `<div class="bar"><span>Bond</span><div class="bar-track"><div class="bar-fill clout" style="width:${rel}%"></div></div><span>${rel}</span></div>`;
}

function openPerson(id) {
  const p = PEOPLE[id];
  const rel = G.relation(s, id);
  const opts = G.socialOptions(s, id);
  showModal(p.name, `<div class="welcome">
      ${avatarSvg(p.look, { width: 64, label: p.name })}
      <div class="stack" style="flex:1;min-width:0">
        <div><strong>${esc(p.role)}</strong><div class="sub">${esc(AREAS[p.area].name)}, ${G.clock(p.hours[0])}–${G.clock(p.hours[1] % 24)} · ${esc(G.levelName(rel))}</div></div>
        ${relBar(rel)}
      </div>
    </div>
    <p class="sub">${rel >= 45 ? '✅' : '🔒'} Friend perk: ${esc(p.perkText)}${rel >= 45 ? '' : ' (unlocks at 45)'}.</p>
    <div class="card-grid">${opts.map((o) => actCard({ ...o, desc: '' }, 'data-social')).join('')}</div>`);
  wire('[data-social]', (el) => { G.socialize(s, id, el.dataset.social); refresh(() => openPerson(id)); });
}

function openLife() {
  const h = G.house(s);
  const rentLeft = s.home ? s.home.paidUntil - s.day : null;
  const job = s.job ? JOBS[s.job] : null;
  const owned = Object.entries(s.items).filter(([, v]) => v).map(([k]) => k);
  const inv = Object.entries(s.inventory).map(([k, v]) => `${v.qty} × ${GOODS[k].name}`);
  showModal('Your life', `
    <div class="welcome">${avatarSvg(s.avatar, { width: 64, label: s.name })}
      <div><div class="name">${esc(s.name)}</div><div class="sub">${mood(G.moodScore(s))} · Day ${s.day}</div>
      <div class="sub">${s.traits.map((id) => `${TRAITS[id].icon} ${esc(TRAITS[id].name)}`).join(' · ')}</div></div></div>
    <div class="life-grid">
      <div class="bars">${G.NEEDS.map((nd) => bar(`${nd.icon} ${nd.label}`, s[nd.id])).join('')}
        ${bar('❤️ Health', s.health)}${bar('⭐ Clout', s.clout, 'clout')}<div class="sub">Mood ${G.moodScore(s)}/100 · ${mood(G.moodScore(s))}</div></div>
      <div class="stack">
        <div><b>${n(s.cash)}</b> cash · bank ${n(s.bank)}${s.crypto > 0 ? ` · crypto ${n(G.cryptoValue(s))}` : ''}</div>
        <div class="sub">Net worth ${n(G.netWorth(s))}</div>
        <div class="sub">🏠 ${!h ? 'Homeless' : !h.monthly ? `${esc(h.name)} · no rent` : `${esc(h.name)} · rent ${rentLeft >= 0 ? `due in ${rentLeft} days` : `overdue ${-rentLeft} days!`}`}</div>
        <div class="sub">💼 ${job ? esc(job.title) : 'No job yet'}</div>
        <div class="chips"><span class="chip">Tech ${s.skills.tech}</span><span class="chip">Trade ${s.skills.trade}</span><span class="chip">Charm ${s.skills.charm}</span>
          ${owned.map((o) => `<span class="chip">${o}</span>`).join('')}</div>
        ${inv.length ? `<div class="sub">🎒 ${inv.map(esc).join(', ')} (${G.carried(s)}/${G.capacity(s)})</div>` : ''}
      </div>
    </div>
    <div class="group-title">Goals</div>
    <ol class="goals">${G.goalList(s).map((g) => `<li class="${[s.goals[g.id] ? 'done' : '', g.dream ? 'dream' : ''].join(' ')}">${g.dream ? DREAMS[s.dream].icon + ' ' : ''}${esc(g.label)}</li>`).join('')}</ol>
    <div class="group-title">News</div>
    <ul class="log">${s.log.slice(0, 40).map((l) => `<li class="${l.tone}"><time>Day ${l.day}, ${G.clock(l.hour)}</time>${esc(l.text)}</li>`).join('')}</ul>
    <div class="money-input"><button data-help>How to play</button><button data-newlife>Start a new life</button></div>`);
  wire('[data-help]', openHelp);
  wire('[data-newlife]', () => askFirst('Start a new life?', 'Your current progress will be lost.', 'Start a new life', openSetup));
}

// ---------- walking scenes ----------
// Your character walks to wherever you click, and walks up to objects and people before using them.
// Positions live only in the page (not the save): each scene remembers where you last stood.

const scenePos = { home: { x: 190, y: 170 }, street: { x: 60, y: 120 } };
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let walking = false;

function avatarGroup(av, scene, label) {
  const { x, y } = scenePos[scene];
  return `<g class="walker" id="walker-${scene}" style="transform: translate(${x - 15}px, ${y - 40}px)">
    <g class="walker-body"><g class="bobber">${avatarSvg(av, { width: 30, label })}</g></g>
    <text class="bubble" x="15" y="-4" text-anchor="middle"></text>
  </g>`;
}

function svgPoint(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

// Walks the avatar in `scene` to (x, y), then calls done().
function walkTo(scene, x, y, done = () => {}) {
  const el = document.getElementById(`walker-${scene}`);
  if (!el || walking) return;
  const from = scenePos[scene];
  const dist = Math.hypot(x - from.x, y - from.y);
  const secs = reduceMotion() ? 0 : Math.min(2.2, dist / 110);
  scenePos[scene] = { x, y };
  el.classList.toggle('left', x < from.x);
  el.classList.add('moving');
  el.style.transition = `transform ${secs}s linear`;
  el.style.transform = `translate(${x - 15}px, ${y - 40}px)`;
  walking = true;
  setTimeout(() => {
    walking = false;
    el.classList.remove('moving');
    done();
  }, secs * 1000);
}

// Shows a bubble over the avatar for a moment (e.g. 💤 while napping), then calls done().
// `at` moves the avatar onto something first, like the bed.
function perform(scene, icon, pose, done, at = null) {
  const el = document.getElementById(`walker-${scene}`);
  if (!el) return done();
  if (at) {
    el.style.transition = 'none';
    el.style.transform = `translate(${at.x - 15}px, ${at.y - 40}px)`;
  }
  el.querySelector('.bubble').textContent = icon;
  if (pose) el.classList.add(pose);
  setTimeout(done, reduceMotion() ? 0 : 1300);
}

function wireScene(svg, scene, onFloor) {
  svg.addEventListener('click', (e) => {
    if (e.target.closest('[data-obj]')) return;
    const p = svgPoint(svg, e);
    walkTo(scene, Math.max(20, Math.min(340, p.x)), Math.max(onFloor[0], Math.min(onFloor[1], p.y)));
  });
}

function bindObjects(svg, handler) {
  for (const g of svg.querySelectorAll('[data-obj]')) {
    const go = (e) => { e.stopPropagation(); handler(g.dataset.obj, Number(g.dataset.x), Number(g.dataset.y)); };
    g.addEventListener('click', go);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
  }
}

// Home objects: where they stand, where you stand to use them, and what you can do there.
const HOME_OBJECTS = {
  bed: { x: 62, y: 112, label: 'Bed', acts: ['sleep', 'nap', 'liein'] },
  chair: { x: 150, y: 124, icon: '🪑', label: 'Plastic chair', sit: true, acts: ['callmaman', 'daydream', 'whatsapp'] },
  bucket: { x: 326, y: 196, icon: '🪣', label: 'Bucket', acts: ['wash'] },
  toilet: { x: 340, y: 140, icon: '🚽', label: 'Toilet', acts: ['toilet'] },
  shower: { x: 300, y: 205, icon: '🚿', label: 'Shower', need: 'shower', acts: ['wash'] },
  fridge: { x: 240, y: 92, icon: '🧊', label: 'Fridge', need: 'fridge', acts: ['snack'] },
  fan: { x: 112, y: 96, icon: '🌀', label: 'Standing fan', need: 'fan' },
  net: { x: 62, y: 84, icon: '🕸️', label: 'Mosquito net', need: 'net' },
  desk: { x: 214, y: 96, icon: '📚', label: 'Desk', need: 'desk', acts: ['study'] },
  stove: { x: 266, y: 96, icon: '🍳', label: 'Gas stove', need: 'stove', acts: ['cook'] },
  tv: { x: 318, y: 96, icon: '📺', label: 'TV', need: 'tv', acts: ['relax'] },
  speaker: { x: 214, y: 186, icon: '🔊', label: 'Speaker', need: 'speaker', acts: ['dance'] },
  sofa: { x: 268, y: 178, icon: '🛋️', label: 'Sofa', need: 'sofa', sit: true, acts: ['relax'] },
  dog: { x: 150, y: 192, icon: '🐕', label: T.dogName, need: 'dog', acts: ['playdog'] },
  ac: { x: 100, y: 30, icon: '❄️', label: 'Air conditioner', need: 'ac' },
};
// What the avatar shows while doing each thing.
const PERFORM = {
  sleep: ['💤', 'lying'], nap: ['💤', 'lying'], liein: ['📱', 'lying'], callmaman: ['📞'], daydream: ['✈️'],
  whatsapp: ['📱'], wash: ['💦'], study: ['📖'], cook: ['🍲'], relax: ['📺'], dance: ['🎵', 'dancing'], playdog: ['🎾'],
  toilet: ['🚽'], publictoilet: ['🚽'], snack: ['🥤'], maquisdrink: ['🍗'], chat: ['💬'], swim: ['🏊🏾'], maquis: ['🎶', 'dancing'],
  beach: ['😎'], eat: ['🍛'], alloco: ['🍢'], market: ['🧺'], audition: ['🎤', 'dancing'],
};

function renderHome() {
  const h = G.house(s);
  if (!h) {
    $('#stage2d').innerHTML = '<p class="sub">You have no home.</p>';
    return;
  }
  const here = G.canSleepAtHome(s);
  const objs = Object.entries(HOME_OBJECTS).filter(([, o]) => !o.need || G.owns(s, o.need));
  const bed = G.owns(s, 'mattress')
    ? '<rect x="-30" y="-12" width="60" height="26" rx="5" class="bed-frame"/><rect x="-28" y="-10" width="18" height="22" rx="4" class="pillow"/>'
    : '<rect x="-30" y="-10" width="60" height="22" rx="3" class="mat"/>';
  const objSvg = objs.map(([id, o]) => {
    const art = id === 'bed' ? bed : `<text class="furn" text-anchor="middle" dominant-baseline="middle">${o.icon}</text>`;
    return `<g class="obj" data-obj="${id}" data-x="${o.x}" data-y="${o.y}" transform="translate(${o.x} ${o.y})"
      tabindex="${here ? 0 : -1}" role="button" aria-label="${esc(o.label)}">${art}</g>`;
  }).join('');
  $('#stage2d').innerHTML = `
    <div class="room">
      <svg viewBox="0 0 360 220" id="home-scene" role="group" aria-label="Your ${esc(h.name)}. ${here ? 'Click the floor to walk, or an object to use it.' : 'You are out.'}">
        <defs><pattern id="tiles" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" class="floor-a"/><rect width="10" height="10" class="floor-b"/><rect x="10" y="10" width="10" height="10" class="floor-b"/>
        </pattern></defs>
        <rect width="360" height="64" class="wall"/>
        <rect y="64" width="360" height="156" fill="url(#tiles)"/>
        <rect x="262" y="14" width="64" height="34" rx="3" class="window"/>
        <rect x="170" y="10" width="34" height="54" rx="2" class="door"/><circle cx="198" cy="40" r="2" class="knob"/>
        ${objSvg}
        ${here ? avatarGroup(s.avatar, 'home', `${s.name}, at home`) : ''}
      </svg>
    </div>
    <p class="sub">${esc(h.name)}, ${esc(AREAS[h.area].name)} · ${here ? 'Click the floor to walk around, or click something to use it.' : 'You are out. Come home to use your things.'}</p>`;
  if (!here) return;
  const svg = $('#home-scene');
  wireScene(svg, 'home', [80, 205]);
  bindObjects(svg, (id, x, y) => walkTo('home', x, Math.min(205, y + 22), () => openObject(id)));
}

function openObject(id, where = 'home') {
  const o = where === 'home' ? HOME_OBJECTS[id] : LOT_OBJECTS[where]?.[id];
  if (!o) return;
  const list = G.actions(s);
  const acts = (o.acts ?? []).map((a) => (a === 'sleep'
    ? { id: 'sleep', label: 'Sleep (end the day)', desc: 'Restores energy overnight', blocked: null }
    : list.find((x) => x.id === a))).filter(Boolean);
  const info = o.need ? FURNITURE[o.need].blurb : id === 'bed' && !G.owns(s, 'mattress') ? 'A thin mat on the floor. A foam mattress would help.' : '';
  showModal(o.label, `${info ? `<p class="sub">${esc(info)}</p>` : ''}
    ${acts.length ? `<div class="card-grid">${acts.map((a) => actCard(a, 'data-do')).join('')}</div>`
      : '<p class="sub">Nothing to do here, but it is working hard for you.</p>'}`);
  wire('[data-do]', (el) => {
    const act = el.dataset.do;
    modal.close();
    const [icon, pose] = PERFORM[act] ?? ['✨'];
    const finish = () => {
      if (act === 'sleep') sleepNow();
      else {
        const panel = G.act(s, act);
        render();
        if (panel) openPanel(panel);
      }
    };
    if (stage) {
      const pose3d = pose === 'lying' ? 'lying' : o.sit ? 'sitting' : pose === 'dancing' ? 'dancing' : 'idle';
      stage.perform({ pose: pose3d, icon, objectId: id, ms: act === 'sleep' ? 1800 : 1400 }, finish);
      return;
    }
    const onBed = pose === 'lying' ? { x: HOME_OBJECTS.bed.x + 6, y: HOME_OBJECTS.bed.y + 14 } : null;
    perform('home', icon, pose, finish, onBed);
  });
}

// Street scene: who is around in this commune. Walk up to someone to talk.
const STREET_SPOTS = [[110, 112], [175, 128], [240, 110], [300, 126]];

function renderStreet() {
  const here = G.peopleHere(s);
  const area = AREAS[s.area];
  const buildings = Array.from({ length: 6 }, (_, i) => {
    const hgt = 30 + ((i * 29 + area.x) % 34);
    return `<rect x="${i * 62 + 4}" y="${70 - hgt}" width="54" height="${hgt}" class="bld bld${(i + area.y) % 3}"/>
      <rect x="${i * 62 + 10}" y="${76 - hgt}" width="42" height="6" class="awning a${(i + area.x) % 3}"/>`;
  }).join('');
  const people = here.map((p, i) => {
    const [x, y] = STREET_SPOTS[i % STREET_SPOTS.length];
    return `<g class="obj npc" data-obj="${p.id}" data-x="${x}" data-y="${y}" transform="translate(${x - 15} ${y - 40})" tabindex="0" role="button" aria-label="Talk to ${esc(p.name)}, ${esc(p.level)}">
      ${avatarSvg(p.look, { width: 30, label: p.name })}
      <text x="15" y="48" text-anchor="middle" class="npc-name">${esc(p.name)}</text></g>`;
  }).join('');
  $('#stage2d').innerHTML = `<div class="group-title">Out on the street${here.length ? '' : ' · nobody you know is around right now'}</div>
    <div class="street-scene">
      <svg viewBox="0 0 360 160" id="street-scene" role="group" aria-label="Street in ${esc(area.name)}. Click to walk, click a person to talk.">
        <rect width="360" height="160" class="sky"/>
        ${buildings}
        <rect y="70" width="360" height="60" class="pavement"/>
        <rect y="130" width="360" height="30" class="road"/>
        ${Array.from({ length: 6 }, (_, i) => `<rect x="${i * 64 + 8}" y="143" width="30" height="3" class="lane"/>`).join('')}
        ${people}
        ${avatarGroup(s.avatar, 'street', s.name)}
      </svg>
    </div>`;
  const svg = $('#street-scene');
  wireScene(svg, 'street', [86, 128]);
  bindObjects(svg, (id, x, y) => walkTo('street', x < scenePos.street.x ? x + 34 : x - 34, y, () => openPerson(id)));
}


// ---------- modal ----------

function showModal(title, body, { closable = true } = {}) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = body;
  $('#modal-x').hidden = !closable;
  modal.dataset.closable = closable ? '1' : '';
  if (!modal.open) modal.showModal();
}

// Pressing Enter in an amount box should not close the dialog.
modal.querySelector('form').addEventListener('submit', (e) => { if (document.activeElement?.tagName === 'INPUT') e.preventDefault(); });
modal.addEventListener('cancel', (e) => { if (!modal.dataset.closable) e.preventDefault(); });
modal.addEventListener('close', () => { if (!inSetup && !s.ending && s.pendingEvent) openEvent(); });

function wire(sel, fn) {
  for (const el of $('#modal-body').querySelectorAll(sel)) {
    el.addEventListener('click', (e) => { e.preventDefault(); fn(el, e); });
  }
}

function openTravel(to) {
  if (to === s.area) return;
  const opts = G.travelOptions(s, to);
  const km = G.distanceKm(s.area, to).toFixed(1);
  const rows = opts.map((o) => actCard({ id: o.id, label: o.name, blocked: o.blocked,
    note: o.note, desc: [`${o.hours}h`, o.cost ? n(o.cost) : 'free', `-${o.energy} energy`].join(' · ') }, 'data-mode', VEHICLE[o.id])).join('');
  showModal(`Travel to ${AREAS[to].name}`, `<p class="sub">📍 ${km} km from ${esc(AREAS[s.area].name)}. Rush hours (07h–10h and 16h–20h) are slow.</p>
    <div class="card-grid">${rows}</div>`);
  wire('[data-mode]', (el) => {
    if (G.travel(s, to, el.dataset.mode)) { scenePos.street = { x: 30, y: 120 }; view = 'street'; render(); showStreet(el.dataset.mode, to); }
  });
}

const VEHICLE = Object.fromEntries(Object.entries(TRANSPORT).map(([id, tr]) => [id, tr.icon ?? '🚌']));
let streetTimer = 0;

function showStreet(mode, to) {
  const water = Boolean(TRANSPORT[mode].water);
  const blocks = Array.from({ length: 10 }, (_, i) => {
    const h = 40 + ((i * 37) % 60);
    const x = i * 100 + 10;
    return water ? `<path d="M${x} 120 l40 -${h / 2} l40 ${h / 2}Z" class="palm"/>`
      : `<rect x="${x}" y="${130 - h}" width="70" height="${h}" class="bld bld${i % 3}"/><rect x="${x + 10}" y="${138 - h}" width="50" height="8" class="awning a${i % 3}"/>`;
  }).join('');
  const line = STREET_LINES[Math.floor(Math.random() * STREET_LINES.length)];
  showModal(`On the way to ${AREAS[to].name}`, `
    <div class="street ${water ? 'water' : ''}">
      <svg viewBox="0 0 600 220" role="img" aria-label="${water ? 'The lagoon' : 'Street traffic'} on the way to ${esc(AREAS[to].name)}">
        <rect width="600" height="220" class="sky"/>
        <g class="scroll slow">${blocks}</g>
        <rect y="130" width="600" height="90" class="${water ? 'lagoon' : 'road'}"/>
        <g class="scroll">${water ? Array.from({ length: 12 }, (_, i) => `<path d="M${i * 100} 180 q25 -10 50 0 t50 0" class="wave"/>`).join('')
          : Array.from({ length: 12 }, (_, i) => `<rect x="${i * 100}" y="173" width="50" height="5" class="lane"/>`).join('')}</g>
        <text x="300" y="${water ? 168 : 165}" text-anchor="middle" class="vehicle">${VEHICLE[mode]}</text>
      </svg>
    </div>
    <p class="event-text">${esc(line)}</p>
    <p class="sub">${esc(s.log[0].text)}</p>
    <div class="stack"><button class="primary" data-arrive>Arrive in ${esc(AREAS[to].name)}</button></div>`);
  const arrive = () => { clearTimeout(streetTimer); if (modal.open) modal.close(); };
  wire('[data-arrive]', arrive);
  clearTimeout(streetTimer);
  streetTimer = setTimeout(() => { if ($('#modal-body [data-arrive]')) arrive(); }, 4000);
}

function openPanel(id) {
  ({ market: openMarket, jobs: openJobs, shop: openShop, agent: openAgent, bank: openBank, phone: openPhone, furnish: openFurnish })[id]?.();
}

function refresh(fn) {
  render();
  if (!s.ending && !s.pendingEvent) fn();
}

function openMarket() {
  const free = G.capacity(s) - G.carried(s);
  const rows = Object.entries(GOODS).map(([id, g]) => {
    const have = s.inventory[id];
    const buyP = G.buyPrice(s, id);
    const sellP = G.sellPrice(s, id);
    const diff = have ? sellP - have.avgCost : 0;
    return `<div class="row">
      <div><strong>${esc(g.name)}</strong>
        <div class="meta">Buy ${n(buyP)} · Sell ${n(sellP)}</div>
        ${have ? `<div class="meta">You have ${have.qty} (paid ${n(have.avgCost)}) <span class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'} ${n(Math.abs(diff))}</span></div>` : ''}
      </div>
      <div class="btns">
        <button data-buy="${id}" data-q="1" ${free < 1 || s.cash < buyP ? 'disabled' : ''}>Buy 1</button>
        <button data-buy="${id}" data-q="999" ${free < 1 || s.cash < buyP ? 'disabled' : ''}>Max</button>
        <button data-sell="${id}" data-q="1" ${!have ? 'disabled' : ''}>Sell 1</button>
        <button class="primary" data-sell="${id}" data-q="999" ${!have ? 'disabled' : ''}>Sell all</button>
      </div>
    </div>`;
  }).join('');
  showModal(MARKETS[s.area], `<p class="sub">Cash ${n(s.cash)} · carrying ${G.carried(s)}/${G.capacity(s)}. Prices change every day and differ across ${esc(BRAND.cityName)}. Your trade skill gets you better prices.</p>${rows}`);
  wire('[data-buy]', (el) => { G.buy(s, el.dataset.buy, +el.dataset.q); refresh(openMarket); });
  wire('[data-sell]', (el) => { G.sell(s, el.dataset.sell, +el.dataset.q); refresh(openMarket); });
}

function reqText(job) {
  const parts = Object.entries(job.req).map(([k, v]) => `${k} ${v}`);
  for (const it of job.items || []) parts.push(it);
  return parts.length ? `Needs ${parts.join(', ')}` : 'No requirements';
}

function openJobs() {
  const rows = G.jobsHere(s).map((j) => `
    <div class="row">
      <div><strong>${esc(j.title)}</strong>
        <div class="meta">${n(j.pay)} per shift${j.usd ? ' (dollar pay)' : ''} · ${esc(reqText(j))}${j.closedSunday ? ' · closed Sundays' : ''}</div>
        ${j.blurb ? `<div class="meta">${esc(j.blurb)}</div>` : ''}
        ${j.blocked ? `<div class="why">${esc(j.blocked)}</div>` : ''}
      </div>
      <div class="btns"><button class="primary" data-job="${j.id}" ${j.blocked ? 'disabled' : ''}>Take job</button></div>
    </div>`).join('');
  const quit = s.job ? `<p class="sub">You are a ${esc(JOBS[s.job].title)}. <button data-quit>Resign</button></p>` : '';
  showModal('Jobs', quit + rows);
  wire('[data-job]', (el) => { G.takeJob(s, el.dataset.job); refresh(openJobs); });
  wire('[data-quit]', () => { G.quitJob(s); refresh(openJobs); });
}

function openShop() {
  const rows = G.shopItems(s).map((it) => `
    <div class="row">
      <div><strong>${esc(it.name)}</strong><div class="meta">${n(it.cost)} · ${esc(it.blurb)}</div>
        ${it.blocked ? `<div class="why">${esc(it.blocked)}</div>` : ''}</div>
      <div class="btns"><button class="primary" data-item="${it.id}" ${it.blocked ? 'disabled' : ''}>Buy</button></div>
    </div>`).join('');
  showModal('Black Market & car lot', `<p class="sub">Cash ${n(s.cash)}. Imported goods follow the dollar.</p>${rows}`);
  wire('[data-item]', (el) => { G.buyItem(s, el.dataset.item); refresh(openShop); });
}

function openAgent() {
  const rows = G.housesHere(s).map((h) => `
    <div class="row">
      <div><strong>${esc(h.name)}</strong>
        <div class="meta">${n(h.monthly)} a month · move-in total ${n(h.cost)} (${esc(T.moveIn)})</div>
        <div class="meta">Sleep +${h.sleep} energy · ${h.power === 0 ? 'Power never goes off' : `Power cuts on ${Math.round(h.power * 100)}% of nights`}</div>
        ${h.blocked ? `<div class="why">${esc(h.blocked)}</div>` : ''}
      </div>
      <div class="btns"><button class="primary" data-house="${h.id}" ${h.blocked ? 'disabled' : ''}>Rent it</button></div>
    </div>`).join('');
  const others = Object.values(HOUSES).filter((h) => h.area !== s.area).map((h) => `${h.name} (${AREAS[h.area].name}, ${n(h.monthly)}/month)`);
  showModal('Housing agent', `<p class="sub">"It's ${MOVE_IN_MONTHS} months to move in, my friend: advance, deposit and my fee." Cash ${n(s.cash)}.</p>${rows}
    <p class="sub">Other places in ${esc(BRAND.cityName)}: ${others.map(esc).join(' · ')}</p>`);
  wire('[data-house]', (el) => { G.moveHouse(s, el.dataset.house); refresh(openAgent); });
}

function openFurnish() {
  const rows = G.furnitureList(s).map((f) => `
    <div class="row">
      <div><strong>${f.icon} ${esc(f.name)}</strong><div class="meta">${n(f.price)} · ${esc(f.blurb)}</div>
        ${f.blocked ? `<div class="${f.owned ? 'meta' : 'why'}">${esc(f.blocked)}</div>` : ''}</div>
      <div class="btns"><button class="primary" data-furn="${f.id}" ${f.blocked ? 'disabled' : ''}>Buy</button></div>
    </div>`).join('');
  showModal('Furnish your home', `<p class="sub">Cash ${n(s.cash)}. Everything is delivered today, and it comes with you if you move.</p>${rows}`);
  wire('[data-furn]', (el) => { G.buyFurniture(s, el.dataset.furn); refresh(openFurnish); });
}

function moneyForm(prefix) {
  return `<div class="money-input"><input type="number" min="0" step="1000" inputmode="numeric" id="${prefix}-amt" placeholder="Amount in FCFA">`;
}

function openBank() {
  showModal('Bank', `
    <p>Cash ${n(s.cash)} · Savings <strong>${n(s.bank)}</strong></p>
    <p class="sub">Savings earn a little interest every day and pickpockets can't touch them.</p>
    ${moneyForm('bank')}
      <button data-dep>Deposit</button><button data-wd>Withdraw</button>
    </div>
    <div class="money-input"><button class="primary" data-depall>Deposit all cash</button><button data-wdall>Withdraw all</button></div>`);
  const amt = () => Number($('#bank-amt').value) || 0;
  wire('[data-dep]', () => { G.deposit(s, amt()); refresh(openBank); });
  wire('[data-wd]', () => { G.withdraw(s, amt()); refresh(openBank); });
  wire('[data-depall]', () => { G.deposit(s, s.cash); refresh(openBank); });
  wire('[data-wdall]', () => { G.withdraw(s, s.bank); refresh(openBank); });
}

const APPS = [
  { id: 'messages', name: 'Messages', icon: '💬', basic: true },
  { id: 'contacts', name: 'Contacts', icon: '👥', basic: true },
  { id: 'coin', name: T.coin, icon: '🪙' },
  { id: 'rich', name: 'Rich list', icon: '👑' },
  { id: 'business', name: 'Business', icon: '🏪' },
  { id: 'staff', name: 'Staff', icon: '🧹' },
];

function phoneFrame(title, body, back = true) {
  return `<div class="phone">
    <div class="phone-top"><span>${G.clock(s.hour)}</span>${back ? '<button class="link" data-home>‹ Apps</button>' : ''}<span>${esc(title)}</span></div>
    <div class="phone-body">${body}</div></div>`;
}

function openPhone(app = null) {
  const smart = s.items.smartphone;
  const view = (title, body) => {
    showModal('Phone', phoneFrame(title, body));
    wire('[data-home]', () => openPhone());
  };
  if (!app) {
    const unread = G.unreadCount(s);
    showModal('Phone', phoneFrame(smart ? 'Smartphone' : 'Basic phone', `<div class="apps">${APPS.map((a) => {
      const locked = !a.basic && !smart;
      return `<button class="app" data-app="${a.id}" ${locked ? 'disabled' : ''}><span class="app-ic">${a.icon}</span>${esc(a.name)}${a.id === 'messages' && unread ? `<span class="badge">${unread}</span>` : ''}</button>`;
    }).join('')}</div>${smart ? '' : `<p class="sub">Buy a smartphone in ${esc(AREAS[SHOP_AREA].name)} to unlock more apps.</p>`}`, false));
    wire('[data-app]', (el) => openPhone(el.dataset.app));
    return;
  }
  if (app === 'messages') {
    const list = s.messages.map((m) => `<div class="msg ${m.read ? '' : 'unread'}">${avatarSvg(PEOPLE[m.from].look, { width: 28, label: PEOPLE[m.from].name })}
      <div><strong>${esc(PEOPLE[m.from].name)}</strong> <small class="sub">day ${m.day}</small><div>${esc(m.text)}</div></div></div>`).join('');
    G.readMessages(s);
    save();
    renderTabs();
    view('Messages', list || `<p class="sub">No messages yet. Make friends around ${esc(BRAND.city)} and they will text you.</p>`);
  } else if (app === 'contacts') {
    const known = Object.keys(s.people).sort((a, b) => G.relation(s, b) - G.relation(s, a));
    view('Contacts', known.length ? known.map((id) => `<div class="msg">${avatarSvg(PEOPLE[id].look, { width: 28, label: PEOPLE[id].name })}
      <div style="flex:1;min-width:0"><strong>${esc(PEOPLE[id].name)}</strong> <small class="sub">${esc(G.levelName(G.relation(s, id)))} · ${esc(AREAS[PEOPLE[id].area].name)}</small>${relBar(G.relation(s, id))}</div></div>`).join('')
      : '<p class="sub">No contacts yet. Say hello to people you meet around the city.</p>');
  } else if (app === 'coin') {
    view(T.coin, `
      <p>1 coin = <strong>${n(s.cryptoPrice)}</strong></p>
      <p>You hold ${s.crypto.toFixed(3)} coins, worth <strong>${n(G.cryptoValue(s))}</strong>. Cash ${n(s.cash)}.</p>
      <p class="sub">The price moves every night. It can fly, and it can crash. Don't put your rent money in.</p>
      ${moneyForm('coin')}<button data-cbuy>Buy</button></div>
      <div class="money-input"><button data-csell="0.5" ${s.crypto ? '' : 'disabled'}>Sell half</button><button class="primary" data-csell="1" ${s.crypto ? '' : 'disabled'}>Sell all</button></div>`);
    wire('[data-cbuy]', () => { G.buyCrypto(s, Number($('#coin-amt').value) || 0); refresh(() => openPhone('coin')); });
    wire('[data-csell]', (el) => { G.sellCrypto(s, Number(el.dataset.csell)); refresh(() => openPhone('coin')); });
  } else if (app === 'rich') {
    view(T.richTitle, `<ol class="rich">${G.richList(s).map((r) => `<li class="${r.you ? 'you' : ''}"><span><strong>${esc(r.name)}</strong><small class="sub"> · ${esc(r.source)}</small></span><span>${n(r.worth)}</span></li>`).join('')}</ol>`);
  } else if (app === 'business') {
    view('Business', `<p class="sub">Cash ${n(s.cash)}. Takings land in your cash every night.</p>${G.businessList(s).map((b) => `
      <div class="row"><div><strong>${b.icon} ${esc(b.name)}</strong><div class="meta">${n(b.price)} · earns ${n(b.income[0])}–${n(b.income[1])} a day · you own ${b.owned}</div>
        <div class="meta">${esc(b.blurb)}</div>${b.blocked ? `<div class="why">${esc(b.blocked)}</div>` : ''}</div>
        <div class="btns"><button class="primary" data-biz="${b.id}" ${b.blocked ? 'disabled' : ''}>Buy</button></div></div>`).join('')}`);
    wire('[data-biz]', (el) => { G.buyBusiness(s, el.dataset.biz); refresh(() => openPhone('business')); });
  } else if (app === 'staff') {
    view('Staff', `<p class="sub">Wages are paid every Saturday. If you can't pay, they leave.</p>${G.staffList(s).map((st) => `
      <div class="row"><div><strong>${st.icon} ${esc(st.name)}</strong><div class="meta">${n(st.wage)} a week · ${esc(st.blurb)}</div>${st.blocked && !st.hired ? `<div class="why">${esc(st.blocked)}</div>` : ''}</div>
        <div class="btns">${st.hired ? `<button data-fire="${st.id}">Let go</button>` : `<button class="primary" data-hire="${st.id}" ${st.blocked ? 'disabled' : ''}>Hire</button>`}</div></div>`).join('')}`);
    wire('[data-hire]', (el) => { G.setStaff(s, el.dataset.hire, true); refresh(() => openPhone('staff')); });
    wire('[data-fire]', (el) => { G.setStaff(s, el.dataset.fire, false); refresh(() => openPhone('staff')); });
  }
}

function openEvent() {
  const opts = G.eventOptions(s);
  showModal('What\'s going on?', `<p class="event-text">${esc(s.pendingEvent.text)}</p>
    <div class="stack">${opts.map((o, i) => `<button class="${i === 0 ? 'primary' : ''}" data-ev="${i}" ${o.blocked ? 'disabled' : ''}>${esc(o.label)}${o.blocked ? ` (${esc(o.blocked)})` : ''}</button>`).join('')}</div>`,
  { closable: false });
  wire('[data-ev]', (el) => {
    if (G.resolveEvent(s, Number(el.dataset.ev))) { modal.close(); render(); }
  });
}

function openEnding() {
  const e = s.ending;
  const emoji = { win: '🏡', japa: '✈️', hospital: '🏥' }[e.kind];
  showModal('Game over', `<div class="ending">
    <div class="emoji">${emoji}</div>
    <h2 style="text-transform:none;letter-spacing:0;font-size:1.4rem;margin:.4rem 0">${esc(e.title)}</h2>
    <p>${esc(e.text)}</p>
    <p class="sub">Days in ${esc(BRAND.city)}: ${s.day} · Best net worth: ${n(s.stats.maxNetWorth)} · Shifts worked: ${s.stats.shifts} · Viral skits: ${s.stats.viral}</p>
    <button class="primary" data-again>Play again</button></div>`, { closable: false });
  wire('[data-again]', () => openSetup());
}

function openHelp() {
  showModal('How to play', `<div class="help">
    <p>${esc(HELP.intro)} Your goal is the dream you picked: <strong>${esc(DREAMS[s.dream].blurb)}</strong></p>
    <h3>Each day</h3>
    <ul>
      <li>Watch your <strong>needs</strong> on the left: hunger, energy, hygiene, bladder, fun and social. Eat, sleep, wash, use the toilet and see people to keep them up. A low need puts you in a bad mood, and a bad mood cuts your pay.</li>
      <li>On the street, tap a door to go into the maquis, the market or the beach.</li>
      <li>Every action takes time. The day runs from 06h00 to midnight.</li>
      <li><strong>Eat</strong> every day or your health drops. Sleep at <strong>home</strong> to get your energy back. Sleeping rough is risky.</li>
      <li>${esc(HELP.transport)} Rush hours (07h–10h and 16h–20h) are slow.</li>
    </ul>
    <h3>Make money</h3>
    <ul>
      <li>${esc(HELP.work)}</li>
      <li>${esc(HELP.trade)}</li>
      <li>${esc(HELP.learn)}</li>
    </ul>
    <h3>Watch out</h3>
    <ul>
      <li>Rent is due every month, and moving in costs ${MOVE_IN_MONTHS} months up front. Miss the rent by more than 7 days and you're out.</li>
      <li>Furnish your home: a mattress, a fan or a stove make every night and meal better.</li>
      <li>Meet people around the city. Friends unlock perks: job referrals, loans, free meals and more.</li>
      <li>Your phone has messages from friends, a rich list, staff to hire and businesses to buy.</li>
      <li>${esc(HELP.power)} Keep your savings in the bank, away from pickpockets.</li>
      <li>If your health hits zero, it's game over. Moving abroad needs ${n(JAPA.proofOfFunds)} in proof of funds.</li>
    </ul>
    <p class="sub">Your game saves automatically in this browser.</p></div>`);
}

// Asks inside the page, since embedded viewers block window.confirm().
function askFirst(title, text, yesLabel, onYes) {
  showModal(title, `<p class="event-text">${esc(text)}</p>
    <div class="stack"><button class="primary" data-yes>${esc(yesLabel)}</button><button data-no>Cancel</button></div>`);
  wire('[data-yes]', () => { modal.close(); onYes(); });
  wire('[data-no]', () => modal.close());
}

function sleepNow() {
  G.sleep(s);
  if (G.canSleepAtHome(s)) view = 'home';
  render();
}

function trySleep() {
  if (G.canSleepAtHome(s)) sleepNow();
  else askFirst('Sleep rough?', s.home ? 'You are not at home. If you sleep here you may get robbed.' : 'You are homeless. Sleep on a bench tonight?', 'Sleep here', sleepNow);
}

for (const b of document.querySelectorAll('[data-tab]')) {
  b.addEventListener('click', () => { view = b.dataset.tab; render(); });
}
$('#btn-do').addEventListener('click', openDo);
$('#leave').addEventListener('click', () => { view = 'street'; render(); });
$('#btn-phone').addEventListener('click', () => openPhone());
$('#me').addEventListener('click', openLife);
$('#wallet').addEventListener('click', openLife);
$('#btn-help').addEventListener('click', openHelp);

// ---------- new life setup ----------

const STEPS = ['Look', 'Personality', 'Dream', 'Birth lottery', 'Home'];
let draft = null;
let step = 0;

function openSetup() {
  inSetup = true;
  draft = { ...G.DEFAULT_SETUP, name: '', avatar: { ...G.DEFAULT_SETUP.avatar }, traits: [], dream: null, background: null, start: null };
  step = 0;
  showStep();
}

function stepFrame(body, { canNext, nextLabel = 'Continue' }) {
  const dots = STEPS.map((_, i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('');
  return `<div class="steps" aria-label="Step ${step + 1} of ${STEPS.length}">${dots}</div>${body}
    <div class="wizard-nav">
      ${step > 0 ? '<button data-back>Back</button>' : '<span></span>'}
      <button class="primary" data-next ${canNext ? '' : 'disabled'}>${nextLabel}</button>
    </div>`;
}

function choiceCards(list, isOn, attr) {
  return `<div class="choice-grid">${list.map(([id, c]) => `
    <button class="choice ${isOn(id) ? 'on' : ''}" ${attr}="${id}" aria-pressed="${isOn(id)}">
      <span class="ic" aria-hidden="true">${c.icon}</span><strong>${esc(c.name)}</strong><small>${esc(c.blurb)}</small>
    </button>`).join('')}</div>`;
}

function showStep() {
  const title = `New life · ${STEPS[step]}`;
  const opts = { closable: false };
  const next = () => { step += 1; showStep(); };
  if (step === 0) {
    const av = draft.avatar;
    const sw = (key, values) => values.map((v) => `<button class="swatch ${av[key] === v ? 'on' : ''}" style="background:${v}" data-sw="${key}" data-v="${v}" aria-label="${key} ${v}" aria-pressed="${av[key] === v}"></button>`).join('');
    const opt = (key, map) => Object.entries(map).map(([v, label]) => `<button class="pill ${av[key] === v ? 'on' : ''}" data-sw="${key}" data-v="${v}" aria-pressed="${av[key] === v}">${esc(label)}</button>`).join('');
    showModal(title, stepFrame(`
      <div class="setup-look">
        <div class="avatar-preview">${avatarSvg(av, { width: 110, label: 'Preview of your character' })}</div>
        <div class="stack">
          <div class="field"><label for="setup-name">Name</label>
            <input class="text-input" id="setup-name" maxlength="24" placeholder="e.g. Kouassi, Aya, Yao" value="${esc(draft.name)}"></div>
          <div class="field"><label>Skin</label><div class="swatches">${sw('skin', AVATAR.skins)}</div></div>
          <div class="field"><label>Hair</label><div class="pills">${opt('hair', AVATAR.hair)}</div></div>
          <div class="field"><label>Outfit colour</label><div class="swatches">${sw('outfit', AVATAR.outfits)}</div></div>
          <div class="field"><label>Pattern</label><div class="pills">${opt('pattern', AVATAR.patterns)}</div></div>
        </div>
      </div>`, { canNext: draft.name.trim().length > 0 }), opts);
    const input = $('#setup-name');
    input.addEventListener('input', () => {
      draft.name = input.value;
      $('#modal-body [data-next]').disabled = !draft.name.trim();
    });
    wire('[data-sw]', (el) => { draft.avatar[el.dataset.sw] = el.dataset.v; showStep(); });
    wire('[data-next]', next);
    if (!draft.name) input.focus();
    return;
  }
  if (step === 1) {
    showModal(title, stepFrame(`<p class="sub">Choose 2 traits for ${esc(draft.name)}. Each one changes how the game plays.</p>
      ${choiceCards(Object.entries(TRAITS), (id) => draft.traits.includes(id), 'data-trait')}`,
    { canNext: draft.traits.length === 2, nextLabel: draft.traits.length === 2 ? 'Continue' : `Choose ${2 - draft.traits.length} more` }), opts);
    wire('[data-trait]', (el) => {
      const id = el.dataset.trait;
      if (draft.traits.includes(id)) draft.traits = draft.traits.filter((x) => x !== id);
      else if (draft.traits.length < 2) draft.traits.push(id);
      showStep();
    });
  } else if (step === 2) {
    showModal(title, stepFrame(`<p class="sub">What is ${esc(draft.name)}'s big dream? Reach it to win.</p>
      ${choiceCards(Object.entries(DREAMS), (id) => draft.dream === id, 'data-dream')}`, { canNext: Boolean(draft.dream) }), opts);
    wire('[data-dream]', (el) => { draft.dream = el.dataset.dream; showStep(); });
  } else if (step === 3) {
    const bg = BACKGROUNDS[draft.background];
    showModal(title, stepFrame(`<p class="sub">Nobody chooses where they are born. Draw to find out what life gave ${esc(draft.name)}.</p>
      <div class="lottery-card">
        ${bg ? `<div class="big-emoji" aria-hidden="true">🎟️</div><h3>${esc(bg.name)}</h3><p>${esc(bg.blurb)}</p>`
          : '<div class="big-emoji" aria-hidden="true">🎲</div><button class="primary" data-draw>Draw</button>'}
      </div>`, { canNext: Boolean(bg) }), opts);
    wire('[data-draw]', () => { draft.background = G.drawBackground(); showStep(); });
  } else {
    const bonus = BACKGROUNDS[draft.background]?.cash ?? 0;
    const cards = Object.entries(STARTS).map(([id, st]) => {
      const h = HOUSES[id];
      return `<button class="choice ${draft.start === id ? 'on' : ''}" data-start="${id}" aria-pressed="${draft.start === id}">
        <span class="tag">${esc(st.label)}</span><strong>${esc(h.name)} · ${esc(AREAS[h.area].name)}</strong>
        <small>${esc(st.blurb)}</small>
        <small>Start with <b>${n(st.cash + bonus)}</b> · ${h.monthly ? `rent ${n(h.monthly)} a month` : 'no rent'}</small>
      </button>`;
    }).join('');
    showModal(title, stepFrame(`<p class="sub">Where will ${esc(draft.name)} live? The first month is paid.</p><div class="stack">${cards}</div>`,
      { canNext: Boolean(draft.start), nextLabel: 'Move in' }), opts);
    wire('[data-start]', (el) => { draft.start = el.dataset.start; showStep(); });
    wire('[data-next]', () => {
      inSetup = false;
      s = G.newGame(undefined, draft);
      view = 'home';
      lastToast = null;
      stage?.clear();
      modal.close();
      render();
    });
  }
  if (step < 4) wire('[data-next]', next);
  wire('[data-back]', () => { step -= 1; showStep(); });
}

function openWelcomeBack() {
  showModal('Welcome back', `<div class="welcome">
      ${avatarSvg(s.avatar, { width: 72, label: s.name })}
      <div><div class="name">${esc(s.name)}</div><div class="sub">Day ${s.day} · ${esc(AREAS[s.area].name)} · ${n(G.netWorth(s))}</div>
      <div class="sub">Dream: ${DREAMS[s.dream].icon} ${esc(DREAMS[s.dream].name)}</div></div>
    </div>
    <div class="stack"><button class="primary" data-continue>Continue</button><button data-newlife>New life</button></div>`, { closable: false });
  wire('[data-continue]', () => { modal.close(); render(); });
  wire('[data-newlife]', openSetup);
}

initStage();
render();
if (!saved) openSetup();
else if (!hotState && !s.ending) openWelcomeBack();
