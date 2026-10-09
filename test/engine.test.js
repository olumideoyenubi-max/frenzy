import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../js/engine.js';

function fresh(seed = 42) {
  const s = G.newGame(seed);
  s.pendingEvent = null;
  return s;
}

test('new game starts in Ajegunle with ₦50,000', () => {
  const s = fresh();
  assert.equal(s.area, 'ajegunle');
  assert.equal(s.cash, 50000);
  assert.equal(s.home.id, 'facemi');
  assert.equal(s.day, 1);
});

test('same seed replays the same game', () => {
  const a = G.newGame(7);
  const b = G.newGame(7);
  assert.deepEqual(a, b);
});

test('travel costs money and time, and moves you', () => {
  const s = fresh();
  const opt = G.travelOptions(s, 'oshodi').find((o) => o.id === 'danfo');
  assert.equal(opt.blocked, null);
  const cashBefore = s.cash;
  assert.ok(G.travel(s, 'oshodi', 'danfo'));
  assert.equal(s.area, 'oshodi');
  assert.ok(s.cash <= cashBefore - opt.cost);
  assert.equal(s.hour, 6 + opt.hours);
});

test('okada is banned on the Island and you need a car to drive', () => {
  const s = fresh();
  const opts = G.travelOptions(s, 'vi');
  assert.equal(opts.find((o) => o.id === 'okada').blocked, 'Okada is banned there');
  assert.equal(opts.find((o) => o.id === 'car').blocked, 'You do not own a car');
  assert.equal(opts.find((o) => o.id === 'brt').blocked, 'Not on the BRT route');
});

test('eating marks the day as fed and costs cash', () => {
  const s = fresh();
  G.act(s, 'eat');
  assert.equal(s.today.ate, true);
  assert.ok(s.cash < 50000);
});

test('skipping food hurts health overnight', () => {
  const s = fresh();
  const before = s.health;
  G.sleep(s);
  assert.ok(s.health < before);
  assert.equal(s.day, 2);
  assert.equal(s.hour, 6);
});

test('job requirements are enforced', () => {
  const s = fresh();
  s.area = 'yaba';
  const dev = G.jobsHere(s).find((j) => j.id === 'dev');
  assert.match(dev.blocked, /tech/);
  s.skills.tech = 50;
  s.items.laptop = true;
  assert.ok(G.takeJob(s, 'dev'));
  assert.equal(s.job, 'dev');
});

test('working a shift pays once a day', () => {
  const s = fresh();
  s.area = 'oshodi';
  G.takeJob(s, 'conductor');
  const before = s.cash;
  G.act(s, 'work');
  assert.equal(s.cash, before + 10000);
  const again = G.actions(s).find((a) => a.id === 'work');
  assert.ok(again.blocked);
});

test('buying and selling goods tracks inventory and capacity', () => {
  const s = fresh();
  s.area = 'ikorodu';
  s.cash = 1_000_000;
  assert.ok(G.buy(s, 'pepper', 999));
  assert.equal(G.carried(s), 10);
  assert.equal(G.buy(s, 'pepper', 1), false);
  s.area = 'vi';
  assert.ok(G.sell(s, 'pepper', 999));
  assert.equal(G.carried(s), 0);
  assert.ok(s.cash > 1_000_000, 'pepper from Ikorodu should sell for a profit in VI');
});

test('bank deposits are capped by cash', () => {
  const s = fresh();
  G.deposit(s, 1e9);
  assert.equal(s.cash, 0);
  assert.equal(s.bank, 50000);
  G.withdraw(s, 20000);
  assert.equal(s.cash, 20000);
});

test('unpaid rent leads to eviction after the grace week', () => {
  const s = fresh();
  for (let i = 0; i < 40 && !s.ending; i++) {
    s.pendingEvent = null;
    s.today.ate = true;
    s.health = 100;
    G.sleep(s);
  }
  assert.equal(s.home, null);
});

test('moving into Banana Island wins the game', () => {
  const s = fresh();
  s.area = 'banana';
  s.cash = 100_000_000;
  assert.ok(G.moveHouse(s, 'banana'));
  assert.equal(s.ending.kind, 'win');
  assert.equal(s.goals.banana, true);
});

test('health reaching zero ends the game', () => {
  const s = fresh();
  s.health = 5;
  G.sleep(s);
  assert.equal(s.ending.kind, 'hospital');
});

test('every action listed on every area can be checked without errors', () => {
  const s = fresh();
  s.items = { smartphone: true, laptop: true, generator: true, car: true };
  for (const area of ['ikorodu', 'ikeja', 'oshodi', 'yaba', 'surulere', 'ajegunle', 'island', 'banana', 'vi', 'lekki']) {
    s.area = area;
    for (const hour of [6, 12, 20]) {
      s.hour = hour;
      for (const a of G.actions(s)) assert.equal(typeof a.label, 'string');
    }
  }
});

test('a long random playthrough never breaks the state', () => {
  const s = G.newGame(1234);
  for (let step = 0; step < 4000 && !s.ending; step++) {
    if (s.pendingEvent) {
      const opts = G.eventOptions(s);
      G.resolveEvent(s, opts.findIndex((o) => !o.blocked));
      continue;
    }
    const r = G.rand(s);
    const acts = G.actions(s).filter((a) => !a.blocked && !['embassy'].includes(a.id));
    if (r < 0.15 || !acts.length) {
      G.sleep(s);
    } else if (r < 0.35) {
      const areas = ['ikorodu', 'ikeja', 'oshodi', 'yaba', 'surulere', 'ajegunle', 'island', 'banana', 'vi', 'lekki'];
      const to = areas[Math.floor(G.rand(s) * areas.length)];
      const opt = G.travelOptions(s, to).find((o) => !o.blocked);
      if (opt) G.travel(s, to, opt.id);
    } else {
      G.act(s, acts[Math.floor(G.rand(s) * acts.length)].id);
    }
    for (const k of ['energy', 'health', 'happiness', 'clout']) assert.ok(s[k] >= 0 && s[k] <= 100, k);
    assert.ok(s.cash >= 0, `cash went negative on day ${s.day}`);
    assert.ok(s.hour <= 24);
  }
});
