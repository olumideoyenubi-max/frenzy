// DOM rendering and input. All game rules live in engine.js.

import {
  AREAS, ROADS, GOODS, MARKETS, JOBS, HOUSES, MOVE_IN_MONTHS, JAPA,
  TRAITS, DREAMS, BACKGROUNDS, STARTS, AVATAR, FURNITURE, PEOPLE, STREET_LINES,
} from './data.js';
import * as G from './engine.js';

const SAVE_KEY = 'babi-frenzy-save-v2';
const $ = (sel) => document.querySelector(sel);
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

function render() {
  renderHud();
  renderMap();
  renderActions();
  renderHome();
  renderGoals();
  renderLog();
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

function renderHud() {
  const h = G.house(s);
  const rentLeft = s.home ? s.home.paidUntil - s.day : null;
  const job = s.job ? JOBS[s.job] : null;
  const owned = Object.entries(s.items).filter(([, v]) => v).map(([k]) => k);
  const inv = Object.entries(s.inventory).map(([k, v]) => `${v.qty} × ${GOODS[k].name}`);
  $('#hud').innerHTML = `
    <div class="hud-block who">
      ${avatarSvg(s.avatar, { width: 48, label: s.name })}
      <div>
        <div class="name">${esc(s.name)}</div>
        <div class="sub">${mood(s.happiness)}</div>
        <div class="sub">${s.traits.map((id) => `${TRAITS[id].icon} ${esc(TRAITS[id].name)}`).join(' · ')}</div>
      </div>
    </div>
    <div class="hud-block">
      <h3>Day ${s.day}</h3>
      <div class="big">${G.clock(s.hour)}</div>
      <div class="sub">${G.dateLabel(s.day)} · in ${esc(AREAS[s.area].name)}</div>
      ${s.today.strike ? '<div class="warn">🚐 Transport strike today</div>' : ''}
      ${s.today.flood ? '<div class="warn">🌧 Flooding in Cocody, Abobo and Yopougon</div>' : ''}
    </div>
    <div class="hud-block">
      <h3>Money</h3>
      <div class="big">${n(s.cash)}</div>
      <div class="money-row sub">
        <span>Bank ${n(s.bank)}</span>
        ${s.crypto > 0 ? `<span>Crypto ${n(G.cryptoValue(s))}</span>` : ''}
        <span>Net worth ${n(G.netWorth(s))}</span>
      </div>
    </div>
    <div class="hud-block bars">
      ${bar('Energy', s.energy)}
      ${bar('Health', s.health)}
      ${bar('Vibes', s.happiness)}
      ${bar('Clout', s.clout, 'clout')}
    </div>
    <div class="hud-block">
      <h3>Life</h3>
      <div class="sub">🏠 ${!h ? '<span class="warn">Homeless</span>' : !h.monthly ? `${esc(h.name)} · no rent`
        : `${esc(h.name)} · ${rentLeft >= 0 ? `rent due in ${rentLeft} days` : `<span class="warn">rent overdue ${-rentLeft} days!</span>`}`}</div>
      <div class="sub">💼 ${job ? esc(job.title) : 'No job yet'}</div>
      <div class="chips" style="margin-top:.4rem">
        <span class="chip">Tech ${s.skills.tech}</span>
        <span class="chip">Trade ${s.skills.trade}</span>
        <span class="chip">Charm ${s.skills.charm}</span>
        ${owned.map((o) => `<span class="chip">${o}</span>`).join('')}
      </div>
      ${inv.length ? `<div class="sub" style="margin-top:.3rem">🎒 ${inv.map(esc).join(', ')} (${G.carried(s)}/${G.capacity(s)})</div>` : ''}
    </div>`;
}

function renderMap() {
  const homeArea = G.house(s)?.area;
  const roads = ROADS.map(([a, b]) => `<line class="road" x1="${AREAS[a].x}" y1="${AREAS[a].y}" x2="${AREAS[b].x}" y2="${AREAS[b].y}"/>`).join('');
  const areas = Object.entries(AREAS).map(([id, a]) => {
    const cls = ['area', id === s.area ? 'here' : '', id === homeArea ? 'home' : ''].join(' ');
    const labelBelow = a.y < 120 || ['adjame', 'portbouet'].includes(id) || id === s.area;
    const ty = labelBelow ? a.y + 28 : a.y - 18;
    return `<g class="${cls}" data-area="${id}" tabindex="0" role="button" aria-label="Travel to ${esc(a.name)}${id === s.area ? ' (you are here)' : ''}">
      <circle cx="${a.x}" cy="${a.y}" r="11"/>
      <text x="${a.x}" y="${ty}" text-anchor="middle">${esc(a.name)}</text>
      ${id === s.area ? `<g class="you" transform="translate(${a.x - 12} ${a.y - 36})">${avatarSvg(s.avatar, { width: 24, label: 'You' })}</g>` : ''}
    </g>`;
  }).join('');
  $('#map').innerHTML = `
    <path class="land" d="M0 0 H640 V222 C590 232 540 228 470 222 C430 218 380 212 350 222 C340 245 305 250 282 236 C262 214 232 212 200 214 C150 218 100 206 0 208 Z"/>
    <path class="land" d="M222 262 C250 250 300 252 360 258 C420 252 480 254 530 262 C542 288 522 314 470 318 C400 322 300 322 240 312 C220 300 214 280 222 262 Z"/>
    <path class="land" d="M110 338 C250 330 450 332 640 334 V372 C450 370 250 372 110 372 C100 360 100 345 110 338 Z"/>
    <text class="map-label" x="70" y="246">Ébrié Lagoon</text>
    <text class="map-label" x="250" y="392">Atlantic Ocean</text>
    ${roads}${areas}`;
  for (const g of document.querySelectorAll('.area')) {
    const go = () => openTravel(g.dataset.area);
    g.addEventListener('click', go);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }
}

const GROUPS = { work: 'Hustle', home: 'At home', life: 'Enjoy life', learn: 'Learn', money: 'Money & places', do: 'Other' };

function renderActions() {
  const area = AREAS[s.area];
  $('#here-title').textContent = area.name;
  $('#here-blurb').textContent = area.blurb;
  const list = G.actions(s);
  const html = Object.entries(GROUPS).map(([g, title]) => {
    const items = list.filter((a) => a.group === g);
    if (!items.length) return '';
    return `<div class="group-title">${title}</div>` + items.map((a) => `
      <button class="action" type="button" data-act="${a.id}" ${a.blocked ? 'disabled' : ''}>
        <strong>${esc(a.label)}</strong>
        <small>${esc(a.desc)}</small>
        ${a.blocked ? `<small class="why"> · ${esc(a.blocked)}</small>` : ''}
      </button>`).join('');
  }).join('');
  $('#actions').innerHTML = html;
  for (const b of document.querySelectorAll('[data-act]')) {
    b.addEventListener('click', () => {
      const panel = G.act(s, b.dataset.act);
      render();
      if (panel) openPanel(panel);
    });
  }
  renderStreet();
  const unread = G.unreadCount(s);
  $('#phone-badge').hidden = !unread;
  $('#phone-badge').textContent = unread;
  const sleepBtn = $('#btn-sleep');
  sleepBtn.textContent = G.canSleepAtHome(s) ? '🛏 Sleep at home' : '🛏 Sleep rough here';
  sleepBtn.title = G.canSleepAtHome(s) ? 'End the day' : 'You are not at home. Sleeping here is risky.';
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
    <div class="social">${opts.map((o) => `<button data-social="${o.id}" ${o.blocked ? 'disabled' : ''}>
      <strong>${esc(o.label)}</strong>${o.blocked ? `<small>${esc(o.blocked)}</small>` : ''}</button>`).join('')}</div>`);
  wire('[data-social]', (el) => { G.socialize(s, id, el.dataset.social); refresh(() => openPerson(id)); });
}

function renderGoals() {
  $('#goals').innerHTML = G.goalList(s)
    .map((g) => `<li class="${[s.goals[g.id] ? 'done' : '', g.dream ? 'dream' : ''].join(' ')}">${g.dream ? DREAMS[s.dream].icon + ' ' : ''}${esc(g.label)}</li>`)
    .join('');
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
  chair: { x: 150, y: 124, icon: '🪑', label: 'Chair', acts: ['callmaman', 'daydream', 'whatsapp'] },
  bucket: { x: 326, y: 196, icon: '🪣', label: 'Bucket', acts: ['wash'] },
  fan: { x: 112, y: 96, icon: '🌀', label: 'Standing fan', need: 'fan' },
  net: { x: 62, y: 84, icon: '🕸️', label: 'Mosquito net', need: 'net' },
  desk: { x: 214, y: 96, icon: '📚', label: 'Desk', need: 'desk', acts: ['study'] },
  stove: { x: 266, y: 96, icon: '🍳', label: 'Gas stove', need: 'stove', acts: ['cook'] },
  tv: { x: 318, y: 96, icon: '📺', label: 'TV', need: 'tv', acts: ['relax'] },
  speaker: { x: 214, y: 186, icon: '🔊', label: 'Speaker', need: 'speaker', acts: ['dance'] },
  sofa: { x: 268, y: 178, icon: '🛋️', label: 'Sofa', need: 'sofa', acts: ['relax'] },
  dog: { x: 150, y: 192, icon: '🐕', label: 'Drogba', need: 'dog', acts: ['playdog'] },
  ac: { x: 100, y: 30, icon: '❄️', label: 'Air conditioner', need: 'ac' },
};
// What the avatar shows while doing each thing.
const PERFORM = {
  sleep: ['💤', 'lying'], nap: ['💤', 'lying'], liein: ['📱', 'lying'], callmaman: ['📞'], daydream: ['✈️'],
  whatsapp: ['📱'], wash: ['💦'], study: ['📖'], cook: ['🍲'], relax: ['📺'], dance: ['🎵', 'dancing'], playdog: ['🎾'],
};

function renderHome() {
  const h = G.house(s);
  if (!h) {
    $('#home').innerHTML = '<p class="sub">You have no home. Find a housing agent and save up for the move-in fee.</p>';
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
  $('#home').innerHTML = `
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

function openObject(id) {
  const o = HOME_OBJECTS[id];
  const list = G.actions(s);
  const acts = (o.acts ?? []).map((a) => (a === 'sleep'
    ? { id: 'sleep', label: 'Sleep (end the day)', desc: 'Restores energy overnight', blocked: null }
    : list.find((x) => x.id === a))).filter(Boolean);
  const info = o.need ? FURNITURE[o.need].blurb : id === 'bed' && !G.owns(s, 'mattress') ? 'A thin mat on the floor. A foam mattress would help.' : '';
  showModal(o.label, `${info ? `<p class="sub">${esc(info)}</p>` : ''}
    <div class="stack">${acts.length ? acts.map((a) => `<button class="action" data-do="${a.id}" ${a.blocked ? 'disabled' : ''}>
      <strong>${esc(a.label)}</strong><small>${esc(a.desc)}</small>${a.blocked ? `<small class="why"> · ${esc(a.blocked)}</small>` : ''}</button>`).join('')
      : '<p class="sub">Nothing to do here, but it is working hard for you.</p>'}</div>`);
  wire('[data-do]', (el) => {
    const act = el.dataset.do;
    modal.close();
    const [icon, pose] = PERFORM[act] ?? ['✨'];
    const onBed = pose === 'lying' ? { x: HOME_OBJECTS.bed.x + 6, y: HOME_OBJECTS.bed.y + 14 } : null;
    perform('home', icon, pose, () => {
      if (act === 'sleep') sleepNow();
      else {
        const panel = G.act(s, act);
        render();
        if (panel) openPanel(panel);
      }
    }, onBed);
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
  $('#people').innerHTML = `<div class="group-title">Out on the street${here.length ? '' : ' · nobody you know is around right now'}</div>
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

function renderLog() {
  $('#log').innerHTML = s.log.slice(0, 60).map((l) => `<li class="${l.tone}"><time>Day ${l.day}, ${G.clock(l.hour)}</time>${esc(l.text)}</li>`).join('');
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
  const rows = opts.map((o) => `
    <div class="row">
      <div><strong>${esc(o.name)}</strong>
        <div class="meta">${o.hours}h · ${o.cost ? n(o.cost) : 'free'} · -${o.energy} energy</div>
        <div class="meta">${esc(o.note)}</div>
        ${o.blocked ? `<div class="why">${esc(o.blocked)}</div>` : ''}
      </div>
      <div class="btns"><button class="primary" data-mode="${o.id}" ${o.blocked ? 'disabled' : ''}>Go</button></div>
    </div>`).join('');
  showModal(`Travel to ${AREAS[to].name}`, `<p class="sub">${km} km from ${esc(AREAS[s.area].name)}. Rush hours (07h–10h and 16h–20h) are slow.</p>${rows}`);
  wire('[data-mode]', (el) => {
    if (G.travel(s, to, el.dataset.mode)) { scenePos.street = { x: 30, y: 120 }; render(); showStreet(el.dataset.mode, to); }
  });
}

const VEHICLE = { gbaka: '🚐', boat: '🛥️', woro: '🚕', moto: '🛵', taxi: '🚖', car: '🚗' };
let streetTimer = 0;

function showStreet(mode, to) {
  const water = mode === 'boat';
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
  showModal(MARKETS[s.area], `<p class="sub">Cash ${n(s.cash)} · carrying ${G.carried(s)}/${G.capacity(s)}. Prices change every day and differ across Abidjan. Your trade skill gets you better prices.</p>${rows}`);
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
        <div class="meta">${n(h.monthly)} a month · move-in total ${n(h.cost)} (2 months' advance, 2 months' deposit, 1 month agency fee)</div>
        <div class="meta">Sleep +${h.sleep} energy · ${h.power === 0 ? 'Power never goes off' : `Power cuts on ${Math.round(h.power * 100)}% of nights`}</div>
        ${h.blocked ? `<div class="why">${esc(h.blocked)}</div>` : ''}
      </div>
      <div class="btns"><button class="primary" data-house="${h.id}" ${h.blocked ? 'disabled' : ''}>Rent it</button></div>
    </div>`).join('');
  const others = Object.values(HOUSES).filter((h) => h.area !== s.area).map((h) => `${h.name} (${AREAS[h.area].name}, ${n(h.monthly)}/month)`);
  showModal('Housing agent', `<p class="sub">"It's ${MOVE_IN_MONTHS} months to move in, my friend: advance, deposit and my fee." Cash ${n(s.cash)}.</p>${rows}
    <p class="sub">Other places in Abidjan: ${others.map(esc).join(' · ')}</p>`);
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
  { id: 'coin', name: 'BabiCoin', icon: '🪙' },
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
    }).join('')}</div>${smart ? '' : '<p class="sub">Buy a smartphone at the Black Market in Adjamé to unlock more apps.</p>'}`, false));
    wire('[data-app]', (el) => openPhone(el.dataset.app));
    return;
  }
  if (app === 'messages') {
    const list = s.messages.map((m) => `<div class="msg ${m.read ? '' : 'unread'}">${avatarSvg(PEOPLE[m.from].look, { width: 28, label: PEOPLE[m.from].name })}
      <div><strong>${esc(PEOPLE[m.from].name)}</strong> <small class="sub">day ${m.day}</small><div>${esc(m.text)}</div></div></div>`).join('');
    G.readMessages(s);
    save();
    renderActions();
    view('Messages', list || '<p class="sub">No messages yet. Make friends around Babi and they will text you.</p>');
  } else if (app === 'contacts') {
    const known = Object.keys(s.people).sort((a, b) => G.relation(s, b) - G.relation(s, a));
    view('Contacts', known.length ? known.map((id) => `<div class="msg">${avatarSvg(PEOPLE[id].look, { width: 28, label: PEOPLE[id].name })}
      <div style="flex:1;min-width:0"><strong>${esc(PEOPLE[id].name)}</strong> <small class="sub">${esc(G.levelName(G.relation(s, id)))} · ${esc(AREAS[PEOPLE[id].area].name)}</small>${relBar(G.relation(s, id))}</div></div>`).join('')
      : '<p class="sub">No contacts yet. Say hello to people you meet around the city.</p>');
  } else if (app === 'coin') {
    view('BabiCoin', `
      <p>1 coin = <strong>${n(s.cryptoPrice)}</strong></p>
      <p>You hold ${s.crypto.toFixed(3)} coins, worth <strong>${n(G.cryptoValue(s))}</strong>. Cash ${n(s.cash)}.</p>
      <p class="sub">The price moves every night. It can fly, and it can crash. Don't put your rent money in.</p>
      ${moneyForm('coin')}<button data-cbuy>Buy</button></div>
      <div class="money-input"><button data-csell="0.5" ${s.crypto ? '' : 'disabled'}>Sell half</button><button class="primary" data-csell="1" ${s.crypto ? '' : 'disabled'}>Sell all</button></div>`);
    wire('[data-cbuy]', () => { G.buyCrypto(s, Number($('#coin-amt').value) || 0); refresh(() => openPhone('coin')); });
    wire('[data-csell]', (el) => { G.sellCrypto(s, Number(el.dataset.csell)); refresh(() => openPhone('coin')); });
  } else if (app === 'rich') {
    view('Babi rich list', `<ol class="rich">${G.richList(s).map((r) => `<li class="${r.you ? 'you' : ''}"><span><strong>${esc(r.name)}</strong><small class="sub"> · ${esc(r.source)}</small></span><span>${n(r.worth)}</span></li>`).join('')}</ol>`);
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
    <p class="sub">Days in Babi: ${s.day} · Best net worth: ${n(s.stats.maxNetWorth)} · Shifts worked: ${s.stats.shifts} · Viral skits: ${s.stats.viral}</p>
    <button class="primary" data-again>Play again</button></div>`, { closable: false });
  wire('[data-again]', () => openSetup());
}

function openHelp() {
  showModal('How to play', `<div class="help">
    <p>You arrive in Abidjan, Babi, with very little money. Your goal is the dream you picked: <strong>${esc(DREAMS[s.dream].blurb)}</strong></p>
    <h3>Each day</h3>
    <ul>
      <li>Every action takes time. The day runs from 06h00 to midnight.</li>
      <li><strong>Eat</strong> every day or your health drops. Sleep at <strong>home</strong> to get your energy back. Sleeping rough is risky.</li>
      <li>Get around by gbaka, water bus, woro-woro, moto-taxi, taxi or your own car. Rush hours (07h–10h and 16h–20h) are slow.</li>
    </ul>
    <h3>Make money</h3>
    <ul>
      <li>Sell water sachets in traffic, take jobs, shoot skits, audition for music videos in Treichville.</li>
      <li>Trade: buy where things are cheap (plantain in Bingerville, attiéké in Yopougon, pagne and iPhones in Adjamé) and sell where they're dear (Cocody, Zone 4).</li>
      <li>Learn tech in Cocody, haggling in Adjamé and charm at networking events in Plateau and Zone 4 to unlock better jobs.</li>
    </ul>
    <h3>Watch out</h3>
    <ul>
      <li>Rent is due every month, and moving in costs ${MOVE_IN_MONTHS} months up front. Miss the rent by more than 7 days and you're out.</li>
      <li>Furnish your home: a mattress, a fan or a stove make every night and meal better.</li>
      <li>Meet people around the city. Friends unlock perks: job referrals, loans, free meals and more.</li>
      <li>Your phone has messages from friends, a rich list, staff to hire and businesses to buy.</li>
      <li>CIE sometimes cuts the power. A generator helps you sleep. Keep your savings in the bank, away from pickpockets.</li>
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
  render();
}

$('#btn-sleep').addEventListener('click', () => {
  if (G.canSleepAtHome(s)) sleepNow();
  else askFirst('Sleep rough?', s.home ? 'You are not at home. If you sleep here you may get robbed.' : 'You are homeless. Sleep on a bench tonight?', 'Sleep here', sleepNow);
});
$('#btn-new').addEventListener('click', () => {
  askFirst('Start a new life?', 'Your current progress will be lost.', 'Start a new life', openSetup);
});
$('#btn-help').addEventListener('click', openHelp);
$('#btn-phone').addEventListener('click', () => openPhone());

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

render();
if (!saved) openSetup();
else if (!hotState && !s.ending) openWelcomeBack();
