# Lagos Frenzy 🚌

A Lagos life-sim browser game. You arrive in Lagos with ₦50,000 and a face-me-I-face-you room in Ajegunle.
Hustle, trade, learn and party your way to **a duplex on Banana Island**, or save enough to **japa**.

## Play

```bash
npm start          # http://localhost:8080
```

No install or build step. It's plain HTML, CSS and JavaScript modules, so any static host works, including GitHub Pages.
(Opening `index.html` straight from disk won't work, because browsers block JavaScript modules on `file://`.)

## How it works

- **Time:** each day runs from 6am to midnight, and every action takes hours. Eat every day and sleep at home.
- **Getting around:** 10 areas: Ikeja, Oshodi, Ikorodu, Yaba, Surulere, Ajegunle, Lagos Island, Ikoyi & Banana Island, VI and Lekki.
  Travel by danfo (cheap, pickpockets), BRT (own lane, corridor only), okada (fast, risky, banned on the Island),
  ride-hailing (pricey) or your own car (police checkpoints). Rush hour, go-slow, fuel scarcity and floods affect journeys.
- **Money:** hawk pure water, work jobs from danfo conductor up to oil & gas consultant, shoot skits that might go viral,
  audition for Nollywood, trade goods between markets (pepper, garri, Ankara, rice, tokunbo iPhones), save in the bank or gamble on crypto.
- **Skills:** tech (Yaba bootcamp, YouTube), trade (Balogun, selling) and charm (VI mixers, Ikoyi country club) unlock better jobs.
- **Life:** rent is a year upfront plus agent fees, NEPA takes light (buy a generator), and random events pop up:
  owambe aso-ebi, black tax, area boys, transformer levies, naira devaluation, malaria, 419 emails and Baba Ijebu lotto.
- **Endings:** Banana Island duplex (win), japa from the embassy in VI, or a hospital bed if your health runs out.

The game saves automatically in your browser.

## Code

| File | What it does |
| --- | --- |
| `js/data.js` | Areas, transport, jobs, goods, houses and items |
| `js/engine.js` | All game rules. Pure functions with no DOM and a seeded RNG |
| `js/ui.js` | Rendering, the SVG map and dialogs |
| `test/engine.test.js` | Rule tests plus a long random-play stress test |

```bash
npm test
```
