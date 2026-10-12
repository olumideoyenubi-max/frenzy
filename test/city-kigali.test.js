import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCity } from './city-checks.js';

globalThis.FRENZY_CITY = 'kigali';
const G = await import('../js/engine.js');
const D = await import('../js/data.js');

test('the Kigali pack is loaded and shows Rwandan francs', () => {
  assert.equal(D.CITY_ID, 'kigali');
  assert.equal(D.BRAND.name, 'Kigali Frenzy');
  assert.equal(G.cfa(1000).replace(/ /g, ' '), '2 300 RWF');
  assert.ok(Math.abs(G.fromMoney(2300) - 1000) < 1e-6);
});

test('Kigali starts in a shared house in Nyamirambo', () => {
  const s = G.newGame(1);
  assert.equal(s.home.id, 'chambre');
  assert.equal(s.area, 'nyamirambo');
});

test('there is no beach in Kigali, but there is a brochette bar', () => {
  const s = G.newGame(2);
  s.pendingEvent = null;
  for (const a of Object.keys(D.AREAS)) {
    s.area = a;
    s.hour = 12;
    assert.equal(G.actions(s).some((x) => x.id === 'swim' || x.id === 'beach'), false);
  }
  s.area = 'nyamirambo';
  assert.ok(G.actions(s).some((x) => x.id === 'maquisdrink'));
});

test('Umuganda only happens on the last Saturday of the month', () => {
  const ev = D.CITY_EVENTS.find((e) => e.id === 'umuganda');
  assert.ok(ev.lastOfMonth && ev.weekday === 6);
  let seen = 0;
  for (let seed = 0; seed < 400; seed++) {
    const s = G.newGame(seed);
    for (let i = 0; i < 40 && !s.ending; i++) {
      if (s.pendingEvent?.id === 'umuganda') {
        const d = G.dateOf(s.day);
        assert.equal(d.getUTCDay(), 6);
        assert.notEqual(G.dateOf(s.day + 7).getUTCMonth(), d.getUTCMonth());
        seen += 1;
        break;
      }
      s.pendingEvent = null;
      s.today.ate = true;
      s.health = 100;
      G.sleep(s);
    }
    if (seen) break;
  }
  assert.ok(seen, 'Umuganda came up at least once');
});

checkCity(G, D);
