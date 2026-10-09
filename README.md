# Babi Frenzy 🚐

A life-sim browser game set in Abidjan, Côte d'Ivoire. You arrive in Babi with 25,000 FCFA and a room in a
cour commune in Yopougon. Hustle, trade, learn and party your way to **a villa in Riviera Golf**, or save enough to **move abroad**.

## Start a new life

Every game starts with a short setup, inspired by Lagos Life:

1. **Look:** pick a name, skin tone, hair (short, afro, locks or a head wrap) and a wax-print outfit.
2. **Personality:** choose 2 of 10 traits (Hustler, Foodie, Enjaillement spirit, Gym rat, Smooth talker, Lazy bone,
   Clean and careful, Night owl, Tech bro or sis, Musical). Each one changes the rules a little.
3. **Dream:** this is how you win. A Riviera Golf villa, 10 million FCFA net worth, coupé-décalé stardom, Babi unicorn or going abroad.
4. **Birth lottery:** a random background, from "raised by the streets of Yop" to "you just won the tontine".
5. **Home:** start in a cour commune in Yopougon, the university residence in Cocody, or on your tantie's living-room mat in Abobo.

Furnish your home from a catalogue (mattress, mosquito net, fan, gas stove, TV, a dog called Drogba, air conditioning and more).
Each piece has a real effect on sleep, meals, learning or mood, and it moves with you when you change house.

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
- **Endings:** reach your dream to win. You can also move abroad from the embassy in Plateau, or end up in hospital if your health runs out.

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
