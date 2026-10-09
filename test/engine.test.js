import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../js/engine.js';
import { AREAS, BACKGROUNDS } from '../js/data.js';

function fresh(seed = 42) {
  const s = G.newGame(seed);
  s.pendingEvent = null;
  return s;
}

test('new game starts in Yopougon with 25,000 FCFA', () => {
  const s = fresh();
  assert.equal(s.area, 'yopougon');
  assert.equal(s.cash, 25000);
  assert.equal(s.home.id, 'cour');
  assert.equal(s.day, 1);
});

test('same seed replays the same game', () => {
  const a = G.newGame(7);
  const b = G.newGame(7);
  assert.deepEqual(a, b);
});

test('travel costs money and time, and moves you', () => {
  const s = fresh();
  const opt = G.travelOptions(s, 'adjame').find((o) => o.id === 'gbaka');
  assert.equal(opt.blocked, null);
  const cashBefore = s.cash;
  assert.ok(G.travel(s, 'adjame', 'gbaka'));
  assert.equal(s.area, 'adjame');
  assert.ok(s.cash <= cashBefore - opt.cost);
  assert.equal(s.hour, 6 + opt.hours);
});

test('moto-taxis are banned in Plateau, the water bus only serves lagoon stops, cars need owning', () => {
  const s = fresh();
  const opts = G.travelOptions(s, 'plateau');
  assert.equal(opts.find((o) => o.id === 'moto').blocked, 'Moto-taxis are not allowed there');
  assert.equal(opts.find((o) => o.id === 'car').blocked, 'You do not own a car');
  assert.equal(opts.find((o) => o.id === 'boat').blocked, null);
  assert.equal(G.travelOptions(s, 'abobo').find((o) => o.id === 'boat').blocked, 'No water bus on this route');
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
  s.area = 'cocody';
  const dev = G.jobsHere(s).find((j) => j.id === 'dev');
  assert.match(dev.blocked, /tech/);
  s.skills.tech = 50;
  s.items.laptop = true;
  assert.ok(G.takeJob(s, 'dev'));
  assert.equal(s.job, 'dev');
});

test('working a shift pays once a day', () => {
  const s = fresh();
  s.area = 'abobo';
  G.takeJob(s, 'apprenti');
  const before = s.cash;
  G.act(s, 'work');
  assert.equal(s.cash, before + 5000);
  const again = G.actions(s).find((a) => a.id === 'work');
  assert.ok(again.blocked);
});

test('buying and selling goods tracks inventory and capacity', () => {
  const s = fresh();
  s.area = 'bingerville';
  s.cash = 1_000_000;
  assert.ok(G.buy(s, 'plantain', 999));
  assert.equal(G.carried(s), 10);
  assert.equal(G.buy(s, 'plantain', 1), false);
  s.area = 'marcory';
  assert.ok(G.sell(s, 'plantain', 999));
  assert.equal(G.carried(s), 0);
  assert.ok(s.cash > 1_000_000, 'plantain from Bingerville should sell for a profit in Zone 4');
});

test('bank deposits are capped by cash', () => {
  const s = fresh();
  G.deposit(s, 1e9);
  assert.equal(s.cash, 0);
  assert.equal(s.bank, 25000);
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

test('moving into a Riviera Golf villa wins the game', () => {
  const s = fresh();
  s.area = 'riviera';
  s.cash = 100_000_000;
  assert.ok(G.moveHouse(s, 'villa'));
  assert.equal(s.ending.kind, 'win');
  assert.equal(s.goals.dream, true);
  assert.equal(s.cash, 100_000_000 - 5 * 3_000_000);
});

test('paying rent covers another 30 days', () => {
  const s = fresh();
  G.act(s, 'rent');
  assert.equal(s.home.paidUntil, 60);
  assert.equal(s.cash, 0);
});

test('money is shown in CFA francs', () => {
  assert.equal(G.cfa(1234567).replace(/\u202f/g, ' '), '1 234 567 FCFA');
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
  for (const area of Object.keys(AREAS)) {
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
      const areas = Object.keys(AREAS);
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

test('setup choices shape the new life', () => {
  const s = G.newGame(9, { name: 'Aya', traits: ['tech', 'gym'], dream: 'unicorn', background: 'tontine', start: 'citeu' });
  assert.equal(s.name, 'Aya');
  assert.equal(s.area, 'cocody');
  assert.equal(s.cash, 20000 + 80000);
  assert.equal(s.skills.tech, 10);
  assert.equal(s.dream, 'unicorn');
});

test('the tantie start has no rent and is never evicted', () => {
  const s = G.newGame(3, { start: 'tantie' });
  assert.equal(G.actions(s).some((a) => a.id === 'rent'), false);
  for (let i = 0; i < 45 && !s.ending; i++) {
    s.pendingEvent = null;
    s.today.ate = true;
    s.health = 100;
    G.sleep(s);
  }
  assert.equal(s.home.id, 'tantie');
});

test('starting homes are not offered by housing agents', () => {
  const s = fresh();
  s.area = 'cocody';
  assert.deepEqual(G.housesHere(s).map((h) => h.id), ['studio']);
});

test('the birth lottery only draws real backgrounds', () => {
  for (const r of [0, 0.3, 0.6, 0.999]) assert.ok(BACKGROUNDS[G.drawBackground(() => r)]);
});

test('furniture is bought at home and improves sleep', () => {
  const a = fresh(11);
  const b = fresh(11);
  b.cash = 100000;
  assert.ok(G.buyFurniture(b, 'mattress'));
  assert.equal(G.buyFurniture(b, 'mattress'), false, 'cannot buy twice');
  a.energy = b.energy = 20;
  a.today.ate = b.today.ate = true;
  G.sleep(a);
  G.sleep(b);
  assert.equal(b.energy - a.energy, 10);
  b.area = 'plateau';
  assert.equal(G.buyFurniture(b, 'fan'), false, 'only at home');
});

test('a stove lets you cook at home', () => {
  const s = fresh();
  s.cash = 100000;
  G.buyFurniture(s, 'stove');
  const before = s.cash;
  G.act(s, 'cook');
  assert.equal(s.today.ate, true);
  assert.equal(s.cash, before - 300);
});

test('traits change outcomes', () => {
  const owl = G.newGame(4, { traits: ['nightowl', 'hustler'] });
  owl.pendingEvent = null;
  owl.hour = 19;
  const energy = owl.energy;
  G.act(owl, 'maquis');
  assert.equal(owl.energy, energy, 'night owls party for free');
});

test('reaching the landlord dream wins', () => {
  const s = G.newGame(8, { dream: 'landlord' });
  s.pendingEvent = null;
  s.bank = 10_000_000;
  G.deposit(s, 1);
  G.act(s, 'eat');
  assert.equal(s.ending?.kind, 'win');
});
