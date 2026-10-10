// Shared checks that a city pack is complete and playable. Each test file runs in its own process,
// so a file can pick its city by setting globalThis.FRENZY_CITY before importing the game.
import { test } from 'node:test';
import assert from 'node:assert/strict';

export function checkCity(G, D) {
  const areas = new Set(Object.keys(D.AREAS));
  const inCity = (a, what) => assert.ok(areas.has(a), `${what} points at unknown area "${a}"`);

  test(`${D.BRAND.name}: every reference points at a real place`, () => {
    for (const [a, b] of D.ROADS) { inCity(a, 'road'); inCity(b, 'road'); }
    for (const [k, v] of Object.entries(D.PLACES)) for (const a of [v].flat()) inCity(a, `place ${k}`);
    for (const [id, j] of Object.entries(D.JOBS)) if (j.area) inCity(j.area, `job ${id}`);
    for (const [id, h] of Object.entries(D.HOUSES)) inCity(h.area, `house ${id}`);
    for (const [id, p] of Object.entries(D.PEOPLE)) inCity(p.area, `person ${id}`);
    for (const a of Object.keys(D.MARKETS)) inCity(a, 'market');
    for (const g of Object.values(D.GOODS)) for (const a of Object.keys(g.mods)) inCity(a, `goods ${g.name}`);
    for (const t of Object.values(D.TRANSPORT)) for (const a of [...(t.stops ?? []), ...(t.banned ?? [])]) inCity(a, `transport ${t.name}`);
    inCity(D.SHOP_AREA, 'shop');
    inCity(D.JAPA.area, 'embassy');
    for (const id of Object.keys(D.STARTS)) assert.ok(D.HOUSES[id], `start ${id} has no house`);
    assert.ok(D.STARTS[D.DEFAULT_START], 'default start exists');
    for (const p of Object.values(D.PEOPLE)) if (p.job) assert.ok(D.JOBS[p.job], `${p.name} refers to unknown job ${p.job}`);
    assert.ok(D.JOBS.remote && D.HOUSES.villa, 'dreams need the remote job and the villa');
    assert.ok(Object.values(D.TRANSPORT).some((t) => t.pickpockets), 'one cheap transport has pickpockets');
    assert.ok(D.TRANSPORT.car && D.TRANSPORT.moto, 'car and moto exist');
  });

  test(`${D.BRAND.name}: a new life starts in the right place`, () => {
    for (const start of Object.keys(D.STARTS)) {
      const s = G.newGame(5, { start });
      assert.equal(s.area, D.HOUSES[start].area);
      assert.ok(s.log.some((l) => l.text.includes(D.BRAND.city)));
    }
  });

  test(`${D.BRAND.name}: a long random playthrough never breaks the state`, () => {
    for (const seed of [11, 22, 33]) {
      const s = G.newGame(seed, { traits: ['hustler', 'nightowl'] });
      s.items.smartphone = true;
      const all = Object.keys(D.AREAS);
      for (let step = 0; step < 3000 && !s.ending; step++) {
        if (s.pendingEvent) { G.resolveEvent(s, G.eventOptions(s).findIndex((o) => !o.blocked)); continue; }
        const r = G.rand(s);
        const acts = G.actions(s).filter((a) => !a.blocked && a.id !== 'embassy');
        if (r < 0.12 || !acts.length) G.sleep(s);
        else if (r < 0.3) {
          const to = all[Math.floor(G.rand(s) * all.length)];
          const opt = G.travelOptions(s, to).find((o) => !o.blocked);
          if (opt) G.travel(s, to, opt.id);
        } else if (r < 0.4) {
          const p = G.peopleHere(s)[0];
          if (p) G.socialize(s, p.id, ['hello', 'compliment', 'gist', 'joke'][Math.floor(G.rand(s) * 4)]);
        } else G.act(s, acts[Math.floor(G.rand(s) * acts.length)].id);
        for (const k of ['energy', 'health', 'happiness', 'clout']) assert.ok(s[k] >= 0 && s[k] <= 100, k);
        assert.ok(s.cash >= 0, `cash went negative on day ${s.day}`);
        assert.ok(s.hour <= 24);
      }
    }
  });
}
