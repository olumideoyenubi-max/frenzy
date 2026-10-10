import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCity } from './city-checks.js';

globalThis.FRENZY_CITY = 'dakar';
const G = await import('../js/engine.js');
const D = await import('../js/data.js');

test('the Dakar pack is the one loaded', () => {
  assert.equal(D.CITY_ID, 'dakar');
  assert.equal(D.BRAND.name, 'Dakar Frenzy');
});

test('Dakar starts in a family house in Parcelles', () => {
  const s = G.newGame(1);
  assert.equal(s.home.id, 'chambre');
  assert.equal(s.area, 'parcelles');
});

test('the TER only stops at its stations, and strikes do not touch it', () => {
  const s = G.newGame(2);
  s.pendingEvent = null;
  s.area = 'plateau';
  s.cash = 100000;
  assert.equal(G.travelOptions(s, 'pikine').find((o) => o.id === 'ter').blocked, null);
  assert.equal(G.travelOptions(s, 'yoff').find((o) => o.id === 'ter').blocked, 'No TER station there');
  const before = G.travelOptions(s, 'pikine').find((o) => o.id === 'ter').cost;
  s.today.strike = true;
  assert.equal(G.travelOptions(s, 'pikine').find((o) => o.id === 'ter').cost, before);
});

test('moving in takes four months up front and covers 30 days', () => {
  const s = G.newGame(3);
  s.pendingEvent = null;
  s.area = 'almadies';
  s.cash = 20_000_000;
  assert.ok(G.moveHouse(s, 'villa'));
  assert.equal(s.cash, 20_000_000 - 4 * 3_500_000);
  assert.equal(s.home.paidUntil, s.day + 30);
  assert.equal(s.ending?.kind, 'win');
});

test('a friend at the oil company gets you hired', () => {
  const s = G.newGame(4);
  s.pendingEvent = null;
  s.area = 'plateau';
  s.hour = 10;
  assert.ok(G.jobsHere(s).find((j) => j.id === 'oilgas').blocked);
  s.people.ousmane = { rel: 50 };
  assert.equal(G.jobsHere(s).find((j) => j.id === 'oilgas').blocked, null);
});

checkCity(G, D);
