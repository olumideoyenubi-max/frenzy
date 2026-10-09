# Babi Frenzy 🚐

A life-sim browser game set in Abidjan, Côte d'Ivoire. You arrive in Babi with 25,000 FCFA and a room in a
cour commune in Yopougon. Hustle, trade, learn and party your way to **a villa in Riviera Golf**, or save enough to **move abroad**.

## Look and feel

The game fills the screen like a mobile game. A 3D isometric scene sits in the middle (your room, or the street of the
commune you're in), with a floating status bar, your meters, pop-up news and a bottom tab bar: Home, Street, Map, Do and Phone.
Tap your name for your stats, goals and news.

The 3D scenes use [three.js](https://threejs.org) r128 from cdnjs. Your low-poly character wears the wax print you picked,
walks with swinging arms and legs, lies on the bed, sits on the plastic chair and dances. If WebGL or the CDN isn't
available, the game falls back to flat 2D scenes.

## Start a new life

Every game starts with a short setup, inspired by Lagos Life:

1. **Look:** pick a name, skin tone, hair (short, afro, locks or a head wrap) and a wax-print outfit.
2. **Personality:** choose 2 of 10 traits (Hustler, Foodie, Enjaillement spirit, Gym rat, Smooth talker, Lazy bone,
   Clean and careful, Night owl, Tech bro or sis, Musical). Each one changes the rules a little.
3. **Dream:** this is how you win. A Riviera Golf villa, 10 million FCFA net worth, coupé-décalé stardom, Babi unicorn, going abroad or being everybody's padi.
4. **Birth lottery:** a random background, from "raised by the streets of Yop" to "you just won the tontine".
5. **Home:** start in a cour commune in Yopougon, the university residence in Cocody, or on your tantie's living-room mat in Abobo.

Furnish your home from a catalogue (mattress, mosquito net, fan, gas stove, TV, a dog called Drogba, air conditioning and more).
Each piece has a real effect on sleep, meals, learning or mood, and it moves with you when you change house.

## Around the city

- **Walk around:** click the floor of your room or the street and your character walks there. Click your bed,
  chair, bucket, stove, TV, desk, speaker or dog and your character walks over, then you choose what to do
  (sleep, nap, stay in bed, call Maman, have a bucket bath, cook, study, dance) and watch them do it.
  On the street, click a resident to walk up to them and talk.

- **People of Babi:** 13 residents live their lives around the city, like Tantie Awa at Adjamé market, DJ Koffi in Yopougon
  at night, Grace the Zone 4 founder and Nadia the influencer in Riviera. Say hello, gist, crack jokes, give compliments or gifts.
  Bonds grow from Stranger to Acquaintance, Friend, Padi and Like family. Friends unlock perks: job referrals that skip
  skill requirements, better market prices, loans, free meals, study sessions and video features. Friends also text you.
- **Street scenes:** every trip shows your gbaka, taxi, moto or water bus on the road, with a bit of Abidjan street life.
- **At home:** call Maman, dance to coupé-décalé, daydream about going abroad, or sell on your WhatsApp status.
- **Your phone:** Messages, Contacts, BabiCoin, the Babi rich list, Business (buy gbakas and maquis that earn every night)
  and Staff (a house help or a cook, paid every Saturday).

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
| `js/ui.js` | Interface, the SVG map, dialogs and the 2D fallback scenes |
| `js/scene3d.js` | The three.js stage: characters, the room, the street, walking and poses |
| `test/engine.test.js` | Rule tests plus a long random-play stress test |

```bash
npm test
```
