// DOM rendering and input. All game rules live in engine.js.

import { AREAS, ROADS, GOODS, MARKETS, JOBS, HOUSES, MOVE_IN_MONTHS, JAPA } from './data.js';
import * as G from './engine.js';

const SAVE_KEY = 'babi-frenzy-save-v1';
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

const n = G.cfa;

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
    const labelBelow = a.y < 120 || ['adjame', 'portbouet'].includes(id);
    const ty = labelBelow ? a.y + 28 : a.y - 18;
    return `<g class="${cls}" data-area="${id}" tabindex="0" role="button" aria-label="Travel to ${esc(a.name)}${id === s.area ? ' (you are here)' : ''}">
      <circle cx="${a.x}" cy="${a.y}" r="11"/>
      <text x="${a.x}" y="${ty}" text-anchor="middle">${esc(a.name)}</text>
      ${id === s.area ? `<text class="you" x="${a.x}" y="${a.y + 6}" text-anchor="middle">🧍🏾</text>` : ''}
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
  showModal(`Travel to ${AREAS[to].name}`, `<p class="sub">${km} km from ${esc(AREAS[s.area].name)}. Rush hours (07h–10h and 16h–20h) are slow.</p>${rows}`);
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

function openPhone() {
  showModal('BabiCoin', `
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
  wire('[data-again]', () => { s = G.newGame(); modal.close(); render(); });
}

function openHelp() {
  showModal('How to play', `<div class="help">
    <p>You arrive in Abidjan, Babi, with ${n(25000)} and a room in a cour commune in Yopougon. Your goal: <strong>a villa in Riviera Golf</strong>. Or save up and <strong>move abroad</strong> from the embassy in Plateau.</p>
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
      <li>CIE sometimes cuts the power. A generator helps you sleep. Keep your savings in the bank, away from pickpockets.</li>
      <li>If your health hits zero, it's game over. Moving abroad needs ${n(JAPA.proofOfFunds)} in proof of funds.</li>
    </ul>
    <p class="sub">Your game saves automatically in this browser.</p></div>`);
}

$('#btn-sleep').addEventListener('click', () => {
  if (!G.canSleepAtHome(s) && !confirm(s.home ? 'You are not at home. Sleep rough here? You may get robbed.' : 'You are homeless. Sleep on a bench?')) return;
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

