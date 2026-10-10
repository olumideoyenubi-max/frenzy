// City pack: Dakar, Senegal (Dakar Frenzy).
// Shares the game engine with Babi Frenzy; everything here is what makes it Dakar.
// All money is in CFA francs (FCFA).

import * as abidjan from './abidjan.js';

// Shared with Abidjan as-is.
export const { GEN_FUEL, CARRY, AVATAR, LEVELS, STAFF } = abidjan;

// Map coordinates are in the SVG viewBox (640 x 400). 10 map units ≈ 1 km.
export const AREAS = {
  almadies: { name: 'Les Almadies', x: 72, y: 150, price: 2.5, style: 'posh', blurb: 'The westernmost point of Africa. Villas, beach clubs and embassies.' },
  ouakam: { name: 'Ouakam', x: 140, y: 208, price: 0.9, blurb: 'Fishing village under the African Renaissance Monument.' },
  yoff: { name: 'Yoff', x: 235, y: 96, price: 0.9, blurb: 'Lébou fishing beach, pirogues and the old airport.' },
  mermoz: { name: 'Mermoz–Sacré-Cœur', x: 230, y: 190, price: 1.3, blurb: 'Middle-class streets, startups and cafés along the VDN.' },
  fann: { name: 'Fann & Point E', x: 285, y: 266, price: 1.1, blurb: 'The UCAD university, students and the Corniche.' },
  grandyoff: { name: 'Grand Yoff', x: 322, y: 145, price: 0.8, blurb: 'Busy, popular and always moving. Car rapides everywhere.' },
  parcelles: { name: 'Parcelles Assainies', x: 405, y: 92, price: 0.75, blurb: 'Big family houses, navétanes football and a lot of cousins.' },
  medina: { name: 'Médina', x: 352, y: 296, price: 0.85, blurb: 'Tilène market, the Grand Mosque and sabar drums at night.' },
  plateau: { name: 'Plateau', x: 425, y: 345, price: 1.4, style: 'towers', blurb: 'Downtown: Sandaga market, banks, ministries and the port.' },
  pikine: { name: 'Pikine', x: 560, y: 172, price: 0.7, blurb: 'The huge banlieue. Marché Syndicat and the TER station.' },
};

// Roads drawn on the map (visual only; travel uses straight-line distance).
export const ROADS = [
  ['almadies', 'ouakam'], ['almadies', 'yoff'], ['ouakam', 'mermoz'], ['yoff', 'grandyoff'], ['yoff', 'mermoz'],
  ['mermoz', 'fann'], ['mermoz', 'grandyoff'], ['fann', 'medina'], ['grandyoff', 'parcelles'], ['grandyoff', 'medina'],
  ['medina', 'plateau'], ['parcelles', 'pikine'], ['grandyoff', 'pikine'], ['plateau', 'pikine'],
];

export const TRANSPORT = {
  carrapide: { name: 'Car rapide', icon: '🚌', pickpockets: true, base: 100, perKm: 15, speed: 16, energyPerKm: 0.9, trafficHit: 1,
    note: 'The painted blue-and-yellow legend. Cheap and packed, with the apprenti hanging off the back.' },
  ndiaga: { name: 'Ndiaga Ndiaye minibus', icon: '🚐', base: 150, perKm: 18, speed: 18, energyPerKm: 0.8, trafficHit: 1,
    note: 'White Mercedes minibus. A little more room than a car rapide.' },
  brt: { name: 'BRT bus', icon: '🚍', base: 300, perKm: 8, speed: 26, energyPerKm: 0.5, trafficHit: 0.3,
    stops: ['parcelles', 'grandyoff', 'mermoz', 'medina', 'plateau'], offRoute: 'Not on the BRT line',
    note: 'Electric buses in their own lane, along the BRT line only.' },
  ter: { name: 'TER train', icon: '🚆', noStrike: true, base: 500, perKm: 10, speed: 45, energyPerKm: 0.3, trafficHit: 0,
    stops: ['plateau', 'medina', 'pikine'], offRoute: 'No TER station there',
    note: 'The regional express train. Fast, but it only stops at its stations.' },
  moto: { name: 'Jakarta moto-taxi', icon: '🛵', base: 150, perKm: 35, speed: 30, energyPerKm: 0.5, trafficHit: 0.15,
    banned: ['plateau', 'almadies', 'mermoz'], note: 'Beats traffic. Risky. Not allowed downtown or in the smart areas.' },
  taxi: { name: 'Yellow-and-black taxi', icon: '🚕', base: 500, perKm: 120, speed: 24, energyPerKm: 0.15, trafficHit: 1,
    note: 'Agree the price before you get in!' },
  car: { name: 'Your own car', icon: '🚗', noStrike: true, base: 0, perKm: 60, speed: 26, energyPerKm: 0.3, trafficHit: 1,
    needs: 'car', note: 'Fuel money. Police checks.' },
};

// Pay is per 8-hour shift. `area: null` means you work from home.
export const JOBS = {
  apprenti: { title: 'Car rapide apprenti', area: 'grandyoff', req: {}, pay: 5000, energy: 35, skill: 'charm',
    blurb: '"Colobane! Petersen!" You hang off the back and slap the roof to stop.' },
  vendeur: { title: 'Seller at Tilène market', area: 'medina', req: { trade: 10 }, pay: 7000, energy: 25,
    skill: 'trade', closedSunday: true },
  momo: { title: 'Wave and Orange Money agent', area: 'parcelles', req: { trade: 15, charm: 10 }, pay: 9000, energy: 20, skill: 'trade' },
  repair: { title: 'Phone repairer at Sandaga', area: 'plateau', req: { tech: 20 }, pay: 13000, energy: 20,
    skill: 'tech', closedSunday: true },
  bank: { title: 'Bank customer adviser', area: 'plateau', req: { charm: 30 }, items: ['smartphone'], pay: 20000,
    energy: 25, skill: 'charm', closedSunday: true },
  dev: { title: 'Junior developer, Sacré-Cœur startup', area: 'mermoz', req: { tech: 40 }, items: ['laptop'], pay: 30000,
    energy: 20, skill: 'tech', closedSunday: true },
  pm: { title: 'Product manager at a fintech', area: 'almadies', req: { tech: 50, charm: 45 }, items: ['laptop'],
    pay: 65000, energy: 22, skill: 'charm', closedSunday: true },
  remote: { title: 'Senior engineer (remote, paid in dollars)', area: null, req: { tech: 80 },
    items: ['laptop', 'generator'], pay: 140000, usd: true, energy: 20, skill: 'tech',
    blurb: 'Work from home. When SENELEC cuts the power, the generator keeps you online.' },
  oilgas: { title: 'Manager at an offshore oil and gas company', area: 'plateau', req: { charm: 70, tech: 40, clout: 60 },
    pay: 340000, energy: 25, skill: 'charm', closedSunday: true },
};

export const GOODS = {
  fish: { name: 'Crate of thiof (grouper)', base: 15000,
    mods: { yoff: 0.6, ouakam: 0.7, medina: 0.95, grandyoff: 1.0, pikine: 1.0, parcelles: 1.05, fann: 1.2, plateau: 1.25, mermoz: 1.3 } },
  onions: { name: 'Sack of onions', base: 12000,
    mods: { pikine: 0.7, parcelles: 0.85, grandyoff: 0.9, medina: 0.95, yoff: 1.05, ouakam: 1.1, fann: 1.15, plateau: 1.2, mermoz: 1.25 } },
  bazin: { name: 'Length of bazin riche', base: 15000,
    mods: { medina: 0.7, plateau: 0.8, grandyoff: 0.95, parcelles: 1.0, pikine: 1.05, ouakam: 1.1, yoff: 1.1, fann: 1.3, mermoz: 1.4 } },
  rice: { name: 'Sack of broken rice', base: 20000,
    mods: { plateau: 0.85, medina: 0.88, pikine: 0.95, grandyoff: 1.0, parcelles: 1.0, yoff: 1.1, ouakam: 1.1, fann: 1.15, mermoz: 1.25 } },
  phones: { name: 'Used iPhone', base: 100000, fx: true,
    mods: { plateau: 0.78, medina: 0.9, grandyoff: 0.98, fann: 1.0, yoff: 1.05, parcelles: 1.05, ouakam: 1.08, pikine: 1.12, mermoz: 1.15 } },
};

export const MARKETS = {
  plateau: 'Sandaga market', medina: 'Tilène market', grandyoff: 'Grand Yoff market', parcelles: 'Parcelles Assainies market',
  pikine: 'Marché Syndicat, Pikine', yoff: 'Yoff beach fish market', ouakam: 'Ouakam market', fann: 'Point E stalls',
  mermoz: 'Sacré-Cœur market',
};

// Monthly rent. `power` is the chance SENELEC cuts the power on a given night.
export const HOUSES = {
  chambre: { name: 'Room in a family house', area: 'parcelles', monthly: 30000, sleep: 55, mood: -2, power: 0.25, clout: 0 },
  pikinehouse: { name: 'Small house in Pikine', area: 'pikine', monthly: 65000, sleep: 72, mood: 1, power: 0.25, clout: 2 },
  studio: { name: 'Studio in Point E', area: 'fann', monthly: 120000, sleep: 70, mood: 0, power: 0.2, clout: 2 },
  appart: { name: 'Apartment in Mermoz', area: 'mermoz', monthly: 250000, sleep: 80, mood: 2, power: 0.2, clout: 5 },
  seaview: { name: 'Sea-view apartment in Ouakam', area: 'ouakam', monthly: 500000, sleep: 90, mood: 4, power: 0.15, clout: 12 },
  villa: { name: 'Villa in Les Almadies', area: 'almadies', monthly: 3500000, sleep: 100, mood: 6, power: 0, clout: 30 },
  // Starting homes only; agents don't rent these out.
  citeu: { name: 'Room at the UCAD university residence', area: 'fann', monthly: 15000, sleep: 58, mood: 0, power: 0.2, clout: 0, startOnly: true },
  tantie: { name: "Mat in your aunt's living room", area: 'pikine', monthly: 0, sleep: 50, mood: -4, power: 0.3, clout: 0, startOnly: true },
};

// Moving in: 2 months' deposit + 1 month's advance + 1 month agency fee. The advance covers 30 days.
export const MOVE_IN_MONTHS = 4;
export const ADVANCE_DAYS = 30;

export const ITEMS = {
  ...abidjan.ITEMS,
  generator: { ...abidjan.ITEMS.generator, blurb: 'Sleep well when SENELEC cuts the power (1,500 FCFA fuel a night).' },
  car: { ...abidjan.ITEMS.car, name: '"Venant" Toyota', blurb: 'A used car shipped from Europe. Drive yourself and carry 40 goods instead of 10.' },
};
export const SHOP_AREA = 'plateau';

export const JAPA = { area: 'plateau', proofOfFunds: 6000000, fee: 400000, chance: 0.6 };

// ---------- new-life setup ----------

export const TRAITS = {
  ...abidjan.TRAITS,
  foodie: { ...abidjan.TRAITS.foodie, blurb: 'Lives for thiéboudienne. Every meal gives +5 extra vibes.' },
  enjaillement: { ...abidjan.TRAITS.enjaillement, name: 'Sabar spirit', icon: '🥁' },
};

export const DREAMS = {
  villa: { name: 'Big boss of Dakar', icon: '🏡', blurb: 'Move into a villa in Les Almadies.' },
  landlord: { name: 'Teranga tycoon', icon: '💰', blurb: 'Build a net worth of 10 million FCFA.' },
  star: { name: 'Mbalax star', icon: '🎤', blurb: 'Land 5 music video roles and reach 100 clout.' },
  unicorn: { name: 'Dakar unicorn', icon: '🦄', blurb: 'Reach 100 tech and land the remote senior engineer job.' },
  abroad: { name: 'Go abroad', icon: '✈️', blurb: 'Get a visa at the embassy in Plateau.' },
  padi: { name: 'Teranga champion', icon: '🤝', blurb: 'Become close friends (80+) with 4 people in Dakar.' },
};

export const BACKGROUNDS = {
  street: { ...abidjan.BACKGROUNDS.street, name: 'Raised in the streets of Médina' },
  village: { ...abidjan.BACKGROUNDS.village, name: 'Village kid from Kaolack' },
  maquis: { ...abidjan.BACKGROUNDS.maquis, name: 'Your parents run a dibiterie' },
  fonctionnaire: { ...abidjan.BACKGROUNDS.fonctionnaire, name: 'Child of a civil servant in Plateau' },
  diaspora: { ...abidjan.BACKGROUNDS.diaspora, name: 'Uncle in Milan sends money' },
  tontine: { ...abidjan.BACKGROUNDS.tontine },
};

export const STARTS = {
  chambre: { label: 'Balanced', cash: 25000, blurb: 'A room in a big family house in Parcelles. Cheap rent, lots of cousins.' },
  citeu: { label: 'Student', cash: 20000, blurb: 'A room at the UCAD residence in Fann, next to the coding bootcamp.' },
  tantie: { label: 'Hard start', cash: 10000, blurb: "A mat in your aunt's living room in Pikine. No rent, no privacy." },
};
export const DEFAULT_START = 'chambre';

export const FURNITURE = {
  ...abidjan.FURNITURE,
  dog: { ...abidjan.FURNITURE.dog, name: 'A dog called Sadio' },
};

// ---------- people of Dakar ----------

export const PEOPLE = {
  adja: { name: 'Adja Fatou', area: 'medina', hours: [7, 19], role: 'Bazin seller at Tilène market',
    perk: 'discount', perkText: '5% better prices at every market',
    look: { skin: '#4a2c1a', hair: 'foulard', outfit: '#7b3fa0', pattern: 'kente' } },
  moussa: { name: 'Moussa', area: 'plateau', hours: [8, 19], role: 'Phone repairer at Sandaga',
    perk: 'job', job: 'repair', perkText: 'Gets you hired as a phone repairer without the tech requirement',
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#1f5fbf', pattern: 'plain' } },
  pape: { name: 'Pape "Boss"', area: 'grandyoff', hours: [6, 20], role: 'Owns three car rapides',
    perk: 'loan', perkText: 'Helps you out with 20,000 FCFA once a week',
    look: { skin: '#7a4a2a', hair: 'short', outfit: '#e8b100', pattern: 'stripes' } },
  yacine: { name: 'Yacine', area: 'parcelles', hours: [6, 22], role: 'Cooks the best thiéboudienne in Parcelles',
    perk: 'food', perkText: 'Shares a plate of thiéboudienne with you once a day',
    look: { skin: '#7a4a2a', hair: 'foulard', outfit: '#009e60', pattern: 'dots' } },
  babacar: { name: 'DJ Babacar', area: 'almadies', hours: [18, 24], role: 'Mbalax DJ at an Almadies club',
    perk: 'audition', perkText: 'Music video auditions are 15% likelier to succeed',
    look: { skin: '#4a2c1a', hair: 'locks', outfit: '#c7362b', pattern: 'plain' } },
  awa: { name: 'Awa', area: 'fann', hours: [8, 20], role: 'Computer science student at UCAD',
    perk: 'tech', perkText: 'Study sessions together: +4 tech once a week',
    look: { skin: '#a8693f', hair: 'locks', outfit: '#1f5fbf', pattern: 'dots' } },
  diop: { name: 'Monsieur Diop', area: 'plateau', hours: [8, 18], role: 'Bank branch manager',
    perk: 'job', job: 'bank', perkText: 'Gets you hired at the bank without the charm requirement',
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#1d1b16', pattern: 'plain' } },
  ousmane: { name: 'Ousmane', area: 'plateau', hours: [9, 19], role: 'Director at an offshore oil and gas company',
    perk: 'job', job: 'oilgas', perkText: 'Gets you hired at the oil and gas company without the skill requirements',
    look: { skin: '#7a4a2a', hair: 'short', outfit: '#f4f1ea', pattern: 'plain' } },
  mariama: { name: 'Mariama', area: 'parcelles', hours: [8, 21], role: 'Runs a Wave kiosk',
    perk: 'job', job: 'momo', perkText: 'Gets you hired as a mobile money agent without the requirements',
    look: { skin: '#a8693f', hair: 'afro', outfit: '#1f5fbf', pattern: 'kente' } },
  aminata: { name: 'Aminata', area: 'mermoz', hours: [10, 22], role: 'Founder of a Dakar fintech',
    perk: 'job', job: 'pm', perkText: 'Gets you hired as a product manager without the skill requirements',
    look: { skin: '#7a4a2a', hair: 'afro', outfit: '#009e60', pattern: 'plain' } },
  khady: { name: 'Khady', area: 'almadies', hours: [10, 23], role: 'Influencer with 2 million followers',
    perk: 'clout', perkText: 'Features you in a video: +8 clout once a week',
    look: { skin: '#a8693f', hair: 'locks', outfit: '#c7362b', pattern: 'dots' } },
  lamine: { name: 'Lamine', area: 'yoff', hours: [6, 19], role: 'Fisherman with a painted pirogue',
    perk: 'food', perkText: 'Shares grilled fish with you once a day',
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#f77f00', pattern: 'stripes' } },
  ibrahima: { name: 'Tonton Ibrahima', area: 'pikine', hours: [7, 20], role: 'Retired teacher who knows everybody',
    perk: 'loan', perkText: 'Helps you out with 20,000 FCFA once a week',
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#e8b100', pattern: 'kente' } },
};

// Businesses you can buy from your phone. Income lands every night.
export const BUSINESSES = {
  carrapide: { name: 'Car rapide on the Pikine–Colobane line', short: 'car rapide', icon: '🚌', price: 2500000, max: 5,
    income: [18000, 30000], breakdown: 0.06, repair: 60000, blurb: 'Your driver and apprenti work the line every day.' },
  dibiterie: { name: 'Dibiterie in Médina', short: 'dibiterie', icon: '🍖', price: 6000000, max: 3, income: [40000, 80000],
    weekend: 1.8, blurb: 'Grilled lamb with onions and mustard. Busiest at the weekend.' },
};

// Lines for the street scene while you travel.
export const STREET_LINES = [
  'The apprenti bangs on the roof: "Petersen! Petersen!"',
  'A boy pours café Touba from a big kettle at the junction.',
  'A horse cart loaded with sand trots past.',
  'Mbalax is blasting from a shop speaker.',
  'Someone sells Lions jerseys in the traffic.',
  'The sea breeze from the Corniche cools the bus down.',
  'A wedding convoy goes past, horns blaring.',
  'The African Renaissance Monument towers over the hills of Ouakam.',
  'A pirogue painted in red, yellow and green rests on the sand.',
  'The driver argues with a taxi about a lane.',
];

// ---------- city identity, places and text ----------

export const BRAND = {
  name: 'Dakar Frenzy',
  city: 'Dakar',
  cityName: 'Dakar',
  country: 'Senegal',
  tagline: 'From Parcelles to Les Almadies · Dakar, Senegal',
  saveKey: 'dakar-frenzy-save-v1',
  defaultName: 'Modou',
  icon: '🚌',
};

export const PLACES = {
  bank: ['plateau', 'medina', 'mermoz', 'fann', 'almadies', 'grandyoff', 'parcelles'],
  hawk: ['grandyoff', 'parcelles', 'pikine', 'medina', 'plateau', 'mermoz'],
  posh: ['almadies', 'plateau', 'mermoz'],
  alloco: ['medina', 'parcelles', 'grandyoff', 'ouakam'],
  flood: ['pikine', 'parcelles', 'grandyoff'],
  maquis: 'medina',
  beach: 'yoff',
  club: 'almadies',
  football: 'parcelles',
  gym: 'ouakam',
  audition: 'medina',
  bootcamp: 'fann',
  haggle: 'medina',
  mixer: ['plateau', 'almadies'],
  golf: 'almadies',
};
export const RAINY_MONTHS = [6, 7, 8, 9]; // July to October

export const MAP = {
  land: [
    'M640 28 C560 40 470 50 380 58 C320 62 270 66 230 74 C170 86 110 100 60 122 C30 136 26 166 48 184 C80 208 110 230 150 252 '
      + 'C190 274 230 292 280 304 C320 318 360 350 410 376 C440 386 470 372 476 350 C482 326 500 300 540 282 C580 268 610 258 640 252 Z',
    'M510 386 C510 380 528 380 528 386 C528 392 510 392 510 386 Z',
  ],
  labels: [[40, 330, 'Atlantic Ocean'], [550, 320, 'Bay of Hann'], [534, 392, 'Gorée']],
  labelBelow: ['grandyoff'],
};

// Sandy walls at home, and a blue-and-yellow car rapide on the street.
export const SCENE = { wall: '#c98a4b', van: ['#f2c200', '#1f5fbf', '#2b3a4a'] };

export const T = {
  coin: 'TerangaCoin',
  welcome: (name) => `Welcome to Dakar, ${name}! Dalal ak jamm!`,
  strike: 'Transport strike! Few car rapides are running and every fare has gone up.',
  flood: 'Heavy rain last night. Pikine, Parcelles and Grand Yoff are flooded and traffic there is terrible.',
  genSaved: (fuel) => `SENELEC cut the power, but your generator saved the night (${fuel} of fuel).`,
  hospital: {
    title: 'Dakar wore you out',
    text: 'You collapsed and woke up at the Hôpital Principal. The family has sent a ticket back to the village. '
      + 'Rest well, and Dakar will still be here.',
  },
  abroad: 'Visa approved! You packed thiakry, a bazin boubou and a lot of memories, and flew out from Blaise Diagne airport. '
    + 'Dakar made you. Wherever you land, you will hustle like a true Dakarois.',
  pickpocket: (lost) => ` A pickpocket in the car rapide took ${lost}.`,
  police: (bribe) => ` Police check: "Nanga def, chef?" You left ${bribe} "for tea".`,
  act: {
    hawk: 'Sell café Touba in traffic',
    skit: 'Shoot a comedy skit in Wolof',
    audition: 'Audition for a mbalax music video',
    eat: 'Eat thiéboudienne (fish and rice)',
    alloco: 'Fataya and dibi at the dibiterie',
    relaxPhone: 'Watch a Senegalese series on your phone at home',
    playdog: 'Play with Sadio',
    callmaman: 'Call your mum',
    dance: 'Dance to mbalax',
    maquis: 'Sabar night in Médina',
    beach: 'Chill at Yoff beach',
    club: 'Show off at an Almadies club',
    gym: 'Train with the wrestlers on the beach',
    haggle: 'Learn to haggle from Adja Fatou',
    football: 'Play a navétanes football match',
    golf: 'Lunch at a Ngor beach club',
    shop: 'Shop at Sandaga and the car lot',
    maquisdrink: 'Order dibi and a cold bissap',
    chat: 'Share attaya with the regulars',
  },
  log: {
    hawk: (amt) => `"Café Touba! Café Touba!" You made ${amt} in the traffic jams.`,
    auditionWin: (fee) => `You got the part! You're dancing in the new mbalax hit and earned ${fee}.`,
    eat: (cost) => `Thiéboudienne with thiof, rice and vegetables. The national dish (${cost}).`,
    eatPosh: (cost) => `Grilled lobster, chicken yassa and a fresh bissap. You posted it, of course (${cost}).`,
    alloco: 'Hot fataya and grilled dibi with mustard and onions. Delicious!',
    relaxTv: 'You watched the Lions of Teranga on the big screen. What a goal!',
    relaxPhone: 'You binged a Senegalese series on your phone and gasped at every twist.',
    cook: 'You cooked chicken yassa at home. Cheap and tasty.',
    playdog: 'You played fetch with Sadio until he flopped down in the shade.',
    mamanSends: 'Your mum asked if you are eating well, then sent 5,000 FCFA by Wave "for food".',
    mamanNews: 'Your mum gave you all the family news and reminded you to pray. +8 vibes.',
    dance: 'You danced the "ventilateur" in your room until the neighbours banged on the wall.',
    whatsapp: (amt) => `You posted perfume, sneakers and bazin on your WhatsApp status. Sales: ${amt}.`,
    maquis: 'Sabar drums, dancing and attaya tea until late. What an ambiance!',
    beach: 'Sea breeze, pirogues and grilled fish at Yoff beach.',
    club: 'Sparklers, bottles, and the DJ shouted your name. Almadies nights are something else.',
    football: 'You scored in a navétanes match. The whole quartier is chanting your name.',
    gym: 'Push-ups and sprints in the sand with the wrestlers. Your body thanks you.',
    haggle: 'Adja Fatou: "Never take the first price, my child." +3 trade.',
    golf: 'Lunch with the Almadies crowd. You are learning how the big bosses talk.',
    maquisdrink: 'Grilled dibi with onions and a cold bissap while the sabar drums warm up.',
    chat: 'You shared three rounds of attaya and all the gist from the quartier.',
    swim: 'You swam between the pirogues at Yoff and dried off in the sun.',
  },
  ev: {
    wedding: (c) => `Your cousin's wedding is on Saturday and the family bazin costs ${c}.`,
    weddingYes: 'Buy the bazin and go dance',
    family: (a) => `Your uncle in the village near Kaolack needs ${a} for "urgent" roof repairs.`,
    familyThanks: 'Your uncle prayed for you for ten minutes on the phone.',
    lotto: 'The LONASE kiosk is calling your name. A lottery ticket costs 500 FCFA.',
    feast: 'Your neighbour is celebrating a naming ceremony, and the smell of thiéré and lakh is coming into your room.',
    feastYes: 'A full plate of thiéré, lamb and lakh. Free!',
  },
  goalFriend: 'Make a friend in Dakar',
  dogName: 'Sadio',
  richTitle: 'Dakar rich list',
  moveIn: "2 months' deposit, 1 month's advance, 1 month agency fee",
  lots: { maquis: { label: 'Dibiterie & sabar', sign: 'DIBITERIE' } },
};

export const GIST = [
  'talked about the Lions\' last match for an hour',
  'shared the latest gist from the quartier over attaya',
  'argued about who makes the best thiéboudienne in Dakar',
  'laughed about the car rapide driver who took the wrong road',
  'talked about plans for the future',
];

export const FRIEND_TEXTS = [
  'Nanga def? Long time no see.',
  'Did you see the Lions last night? Too sweet!',
  'Come for attaya on Saturday, everybody will be there.',
  'Courage with the hustle. Dakar is hard but we are strong.',
  'I heard onion prices are going up. Stock up!',
  'Jumma mubarak! Have a blessed Friday.',
];

export const RICH = [
  ['Ousmane', 'Oil and gas', 450000000], ['Aminata', 'Fintech', 120000000], ['Khady', 'Influencer', 35000000],
  ['Monsieur Diop', 'Banking', 25000000], ['Pape "Boss"', 'Car rapide fleet', 8000000], ['Adja Fatou', 'Bazin trade', 3000000],
];

export const HELP = {
  intro: 'You arrive in Dakar with very little money.',
  transport: 'Get around by car rapide, Ndiaga Ndiaye, BRT, TER train, Jakarta moto-taxi, taxi or your own car.',
  work: 'Sell café Touba in traffic, take jobs, shoot skits, audition for mbalax videos in Médina.',
  trade: 'Trade: buy where things are cheap (fish in Yoff, onions in Pikine, bazin in Médina, iPhones at Sandaga) and sell where they\'re dear (Mermoz, Point E).',
  learn: 'Learn tech at UCAD in Fann, haggling in Médina and charm at networking events in Plateau and Les Almadies to unlock better jobs.',
  power: 'SENELEC sometimes cuts the power. A generator helps you sleep.',
};
