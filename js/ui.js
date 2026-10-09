// DOM rendering and input. All game rules live in engine.js.

import { AREAS, ROADS, GOODS, MARKETS, JOBS, HOUSES } from './data.js';
import * as G from './engine.js';

const SAVE_KEY = 'lagos-frenzy-save-v1';
const $ = (sel) => document.querySelector(sel);
const modal = $('#modal');
let s = load() ?? G.newGame();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const saved = raw && JSON.parse(raw);
    return saved?.version === 1 ? saved : null;
  } catch {
    return null;
  }
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const n = G.naira;

// ---------- main render ----------

function render() {
  renderHud();
  renderMap();
  renderActions();
  renderGoals();
  renderLog();
  save();
  if (s.ending) openEnding();
  else if (s.pendingEvent) openEvent();
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
    <div class="hud-block">
      <h3>Day ${s.day}</h3>
      <div class="big">${G.clock(s.hour)}</div>
      <div class="sub">${G.dateLabel(s.day)} · in ${esc(AREAS[s.area].name)}</div>
      ${s.today.fuelScarcity ? '<div class="warn">⛽ Fuel scarcity today</div>' : ''}
      ${s.today.flood ? '<div class="warn">🌧 Flooding on the Island side</div>' : ''}
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
      <div class="sub">🏠 ${h ? `${esc(h.name)} · ${rentLeft >= 0 ? `rent ends in ${rentLeft} days` : `<span class="warn">rent overdue ${-rentLeft} days!</span>`}` : '<span class="warn">Homeless</span>'}</div>
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
    const labelBelow = a.y < 120 || id === 'banana';
    const ty = labelBelow ? a.y + 28 : a.y - 18;
    return `<g class="${cls}" data-area="${id}" tabindex="0" role="button" aria-label="Travel to ${esc(a.name)}${id === s.area ? ' (you are here)' : ''}">
      <circle cx="${a.x}" cy="${a.y}" r="11"/>
      <text x="${a.x}" y="${ty}" text-anchor="middle">${esc(a.name)}</text>
      ${id === s.area ? `<text class="you" x="${a.x}" y="${a.y + 6}" text-anchor="middle">🧍🏾</text>` : ''}
    </g>`;
  }).join('');
  $('#map').innerHTML = `
    <path class="land" d="M0 0 H640 V215 C600 225 560 260 470 262 C430 240 420 232 360 236 C330 245 300 248 270 262 C220 250 180 250 140 236 C90 226 40 236 0 230 Z"/>
    <path class="land" d="M250 285 C270 272 320 270 345 282 C352 300 330 312 300 314 C270 314 250 304 250 285 Z"/>
    <path class="land" d="M355 290 C400 280 470 290 640 280 V345 C520 350 420 352 340 345 C335 320 340 300 355 290 Z"/>
    <path class="land" d="M362 244 C390 236 420 240 440 252 C438 268 410 276 380 274 C365 268 358 256 362 244 Z"/>
    <path class="land" d="M0 250 C40 250 90 245 140 255 C170 262 200 270 230 275 C220 300 150 300 0 300 Z"/>
    <text class="map-label" x="470" y="200">Lagos Lagoon</text>
    <text class="map-label" x="250" y="385">Atlantic Ocean</text>
    ${roads}${areas}`;
  for (const g of document.querySelectorAll('.area')) {
    const go = () => openTravel(g.dataset.area);
    g.addEventListener('click', go);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }
}

const GROUPS = { work: 'Hustle', life: 'Enjoy life', learn: 'Learn', money: 'Money & places', do: 'Other' };

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
  const sleepBtn = $('#btn-sleep');
  sleepBtn.textContent = G.canSleepAtHome(s) ? '🛏 Sleep at home' : '🛏 Sleep rough here';
  sleepBtn.title = G.canSleepAtHome(s) ? 'End the day' : 'You are not at home. Sleeping here is risky.';
}

function renderGoals() {
  $('#goals').innerHTML = G.GOALS.map((g) => `<li class="${s.goals[g.id] ? 'done' : ''}">${esc(g.label)}</li>`).join('');
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
modal.addEventListener('close', () => { if (!s.ending && s.pendingEvent) openEvent(); });

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
  showModal(`Travel to ${AREAS[to].name}`, `<p class="sub">${km} km from ${esc(AREAS[s.area].name)}. Rush hours (7–10am, 4–8pm) are slow.</p>${rows}`);
  wire('[data-mode]', (el) => {
    if (G.travel(s, to, el.dataset.mode)) { modal.close(); render(); }
  });
}

function openPanel(id) {
  ({ market: openMarket, jobs: openJobs, shop: openShop, agent: openAgent, bank: openBank, phone: openPhone })[id]?.();
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
  showModal(MARKETS[s.area], `<p class="sub">Cash ${n(s.cash)} · carrying ${G.carried(s)}/${G.capacity(s)}. Prices change every day and differ across Lagos. Your trade skill gets you better prices.</p>${rows}`);
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
  showModal('Computer Village & car lot', `<p class="sub">Cash ${n(s.cash)}. Imported prices follow the exchange rate.</p>${rows}`);
  wire('[data-item]', (el) => { G.buyItem(s, el.dataset.item); refresh(openShop); });
}

function openAgent() {
  const rows = G.housesHere(s).map((h) => `
    <div class="row">
      <div><strong>${esc(h.name)}</strong>
        <div class="meta">${n(h.yearly)} a year · move-in total ${n(h.cost)} (rent + 15% agent & legal)</div>
        <div class="meta">Sleep +${h.sleep} energy · ${h.power === 0 ? '24-hour light' : `NEPA takes light ${Math.round(h.power * 100)}% of nights`}</div>
        ${h.blocked ? `<div class="why">${esc(h.blocked)}</div>` : ''}
      </div>
      <div class="btns"><button class="primary" data-house="${h.id}" ${h.blocked ? 'disabled' : ''}>Rent it</button></div>
    </div>`).join('');
  const others = Object.values(HOUSES).filter((h) => h.area !== s.area).map((h) => `${h.name} (${AREAS[h.area].name}, ${n(h.yearly)}/yr)`);
  showModal('House agent', `<p class="sub">"Na one year upfront, plus agreement and agency." Cash ${n(s.cash)}.</p>${rows}
    <p class="sub">Other places in Lagos: ${others.map(esc).join(' · ')}</p>`);
  wire('[data-house]', (el) => { G.moveHouse(s, el.dataset.house); refresh(openAgent); });
}

function moneyForm(prefix) {
  return `<div class="money-input"><input type="number" min="0" step="1000" inputmode="numeric" id="${prefix}-amt" placeholder="Amount in ₦">`;
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

function openPhone() {
  showModal('LagosCoin', `
    <p>1 coin = <strong>${n(s.cryptoPrice)}</strong></p>
    <p>You hold ${s.crypto.toFixed(3)} coins, worth <strong>${n(G.cryptoValue(s))}</strong>. Cash ${n(s.cash)}.</p>
    <p class="sub">The price moves every night. It can fly, and it can crash. Don't put your rent money in.</p>
    ${moneyForm('coin')}<button data-cbuy>Buy</button></div>
    <div class="money-input"><button data-csell="0.5" ${s.crypto ? '' : 'disabled'}>Sell half</button><button class="primary" data-csell="1" ${s.crypto ? '' : 'disabled'}>Sell all</button></div>`);
  wire('[data-cbuy]', () => { G.buyCrypto(s, Number($('#coin-amt').value) || 0); refresh(openPhone); });
  wire('[data-csell]', (el) => { G.sellCrypto(s, Number(el.dataset.csell)); refresh(openPhone); });
}

function openEvent() {
  const opts = G.eventOptions(s);
  showModal('Wetin happen?', `<p class="event-text">${esc(s.pendingEvent.text)}</p>
    <div class="stack">${opts.map((o, i) => `<button class="${i === 0 ? 'primary' : ''}" data-ev="${i}" ${o.blocked ? 'disabled' : ''}>${esc(o.label)}${o.blocked ? ` (${esc(o.blocked)})` : ''}</button>`).join('')}</div>`,
  { closable: false });
  wire('[data-ev]', (el) => {
    if (G.resolveEvent(s, Number(el.dataset.ev))) { modal.close(); render(); }
  });
}

function openEnding() {
  const e = s.ending;
  const emoji = { win: '🏝️', japa: '✈️', hospital: '🏥' }[e.kind];
  showModal('Game over', `<div class="ending">
    <div class="emoji">${emoji}</div>
    <h2 style="text-transform:none;letter-spacing:0;font-size:1.4rem;margin:.4rem 0">${esc(e.title)}</h2>
    <p>${esc(e.text)}</p>
    <p class="sub">Days in Lagos: ${s.day} · Best net worth: ${n(s.stats.maxNetWorth)} · Shifts worked: ${s.stats.shifts} · Viral skits: ${s.stats.viral}</p>
    <button class="primary" data-again>Play again</button></div>`, { closable: false });
  wire('[data-again]', () => { s = G.newGame(); modal.close(); render(); });
}

function openHelp() {
  showModal('How to play', `<div class="help">
    <p>You arrive in Lagos with ₦50,000 and a face-me-I-face-you room in Ajegunle. Your goal: <strong>a duplex on Banana Island</strong>. Or save enough to <strong>japa</strong> from the embassy in VI.</p>
    <h3>Each day</h3>
    <ul>
      <li>Every action takes time. The day runs from 6am to midnight.</li>
      <li><strong>Eat</strong> every day or your health drops. Sleep at <strong>home</strong> to restore energy. Sleeping rough is risky.</li>
      <li>Travel by danfo, BRT, okada, ride-hailing or your own car. Rush hours (7–10am, 4–8pm) are slow.</li>
    </ul>
    <h3>Make money</h3>
    <ul>
      <li>Hawk pure water, take jobs, shoot skits, audition in Surulere.</li>
      <li>Trade: buy goods where they're cheap (pepper in Ikorodu, Ankara at Balogun, iPhones in Ikeja) and sell where they're dear (Lekki, VI).</li>
      <li>Learn tech in Yaba, haggling at Balogun and charm at VI mixers to unlock better jobs.</li>
    </ul>
    <h3>Watch out</h3>
    <ul>
      <li>Rent is paid a year at a time. If it runs out, you get 7 days before eviction.</li>
      <li>NEPA takes light. A generator helps you sleep. Keep savings in the bank, away from pickpockets.</li>
      <li>If your health hits zero, it's game over.</li>
    </ul>
    <p class="sub">Your game saves automatically in this browser.</p></div>`);
}

$('#btn-sleep').addEventListener('click', () => {
  if (!G.canSleepAtHome(s) && !confirm(s.home ? 'You are not at home. Sleep rough here? You may get robbed.' : 'You are homeless. Sleep under the bridge?')) return;
  G.sleep(s);
  render();
});
$('#btn-new').addEventListener('click', () => {
  if (confirm('Start a new game? Your current progress will be lost.')) { s = G.newGame(); if (modal.open) modal.close(); render(); }
});
$('#btn-help').addEventListener('click', openHelp);

render();
// First visit: show the rules first. Closing them brings up any pending event.
if (s.day === 1 && s.hour === 6 && !s.ending) openHelp();

