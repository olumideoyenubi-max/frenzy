# Babi Frenzy 🚐

A life-sim browser game set in Abidjan, Côte d'Ivoire. You arrive in Babi with 25,000 FCFA and a room in a
cour commune in Yopougon. Hustle, trade, learn and party your way to **a villa in Riviera Golf**, or save enough to **move abroad**.

## Play

```bash
npm start          # http://localhost:8080
```

No install or build step. It's plain HTML, CSS and JavaScript modules, so any static host works, including GitHub Pages.
(Opening `index.html` straight from disk won't work, because browsers block JavaScript modules on `file://`.)

## How it works

- **Time:** each day runs from 06h00 to midnight, and every action takes hours. Eat every day and sleep at home.
- **Getting around:** 10 communes: Abobo, Adjamé, Yopougon, Plateau, Cocody, Riviera Golf, Bingerville, Treichville, Marcory Zone 4 and Port-Bouët.
  Travel by gbaka (cheap, pickpockets), lagoon water bus (no traffic, lagoon stops only), woro-woro, moto-taxi (fast, risky,
  not allowed in the smart communes), orange metered taxi (pricey) or your own car (police checks). Rush hour,
  transport strikes and rainy-season floods affect journeys.
- **Money:** sell water sachets in traffic, work jobs from gbaka apprenti up to cocoa export executive, shoot Nouchi comedy skits that might go viral,
  audition for coupé-décalé music videos, trade goods between markets (plantain, attiéké, wax pagne, rice, "venu de France" iPhones),
  save in the bank or gamble on crypto.
- **Skills:** tech (Cocody bootcamp, YouTube), trade (Tantie Awa in Adjamé, selling) and charm (after-work networking, the golf club) unlock better jobs.
- **Life:** rent is monthly, and moving in costs 5 months up front (advance, deposit and agency fee). CIE cuts the power
  (buy a generator), and random events pop up: wedding pagne, family asking for money, neighbourhood toughs, WhatsApp scams,
  the LONACI lottery, a baptism feast, the dollar rising and malaria.
- **Endings:** a Riviera Golf villa (win), moving abroad from the embassy in Plateau, or a hospital bed if your health runs out.

The game saves automatically in your browser.

## Code

| File | What it does |
| --- | --- |
| `js/data.js` | Communes, transport, jobs, goods, housing and items |
| `js/engine.js` | All game rules. Pure functions with no DOM and a seeded RNG |
| `js/ui.js` | Rendering, the SVG map and dialogs |
| `test/engine.test.js` | Rule tests plus a long random-play stress test |

```bash
npm test
```
