// City pack: Kigali, Rwanda (Kigali Frenzy).
// Shares the game engine with Babi Frenzy and Dakar Frenzy; everything here is what makes it Kigali.
// Amounts below are in the game's internal units and are shown in Rwandan francs (see MONEY).

import * as abidjan from './abidjan.js';

// Shared with Abidjan as-is.
export const { GEN_FUEL, CARRY, AVATAR, LEVELS, STAFF } = abidjan;

// About 2.3 Rwandan francs to one CFA franc.
export const MONEY = { code: 'RWF', rate: 2.3 };

// Map coordinates are in the SVG viewBox (640 x 400). 10 map units ≈ 1 km. Kigali is spread over hills.
export const AREAS = {
  nyabugogo: { name: 'Nyabugogo', x: 200, y: 110, price: 0.75, blurb: 'The big bus park and market. Buses to every corner of Rwanda leave from here.' },
  nyamirambo: { name: 'Nyamirambo', x: 130, y: 250, price: 0.8, blurb: 'Kigali\'s liveliest quarter. Colourful shops, brochette grills and music late into the night.' },
  city: { name: 'Town (CBD)', x: 265, y: 195, price: 1.4, style: 'towers', blurb: 'Downtown: banks, ministries, the university and shiny towers.' },
  gikondo: { name: 'Gikondo', x: 285, y: 300, price: 0.8, blurb: 'Workshops, factories and a busy local market in the valley.' },
  kicukiro: { name: 'Kicukiro', x: 390, y: 345, price: 0.85, blurb: 'Quiet family neighbourhoods on the road to the airport.' },
  remera: { name: 'Remera', x: 440, y: 220, price: 1.0, blurb: 'The Amahoro Stadium, milk bars and lots of young people.' },
  kimironko: { name: 'Kimironko', x: 520, y: 150, price: 0.9, blurb: 'Kimironko market: kitenge fabric, fresh fruit and tailors.' },
  kacyiru: { name: 'Kacyiru', x: 340, y: 125, price: 1.2, blurb: 'Government offices, embassies and tech hubs.' },
  kimihurura: { name: 'Kimihurura', x: 370, y: 190, price: 1.5, style: 'posh', blurb: 'The Convention Centre dome, rooftop bars and nightlife.' },
  nyarutarama: { name: 'Nyarutarama', x: 450, y: 85, price: 2.5, style: 'posh', blurb: 'Villas, the golf course and the quietest streets in the city.' },
};

export const ROADS = [
  ['nyabugogo', 'city'], ['nyabugogo', 'nyamirambo'], ['nyabugogo', 'kacyiru'], ['nyamirambo', 'city'],
  ['city', 'kacyiru'], ['city', 'kimihurura'], ['city', 'gikondo'], ['gikondo', 'kicukiro'],
  ['kimihurura', 'remera'], ['kacyiru', 'kimihurura'], ['kacyiru', 'nyarutarama'], ['remera', 'kimironko'],
  ['nyarutarama', 'kimironko'], ['remera', 'kicukiro'],
];

export const TRANSPORT = {
  bus: { name: 'City bus (Tap&Go card)', icon: '🚌', pickpockets: true, base: 100, perKm: 12, speed: 17, energyPerKm: 0.8, trafficHit: 1,
    note: 'Cheap and orderly, but you wait at the stop and it gets packed at rush hour.' },
  moto: { name: 'Moto-taxi', icon: '🛵', base: 150, perKm: 35, speed: 30, energyPerKm: 0.5, trafficHit: 0.15,
    note: 'Kigali\'s favourite way around. The driver hands you a helmet.' },
  ebike: { name: 'Electric bike', icon: '🚲', base: 80, perKm: 20, speed: 16, energyPerKm: 1.1, trafficHit: 0.3,
    note: 'Rent one from a docking station. Cheap, but the hills are steep!' },
  taxi: { name: 'Taxi cab (ride app)', icon: '🚕', base: 500, perKm: 120, speed: 24, energyPerKm: 0.15, trafficHit: 1,
    note: 'Book on your phone. Comfortable, with a fixed price.' },
  car: { name: 'Your own car', icon: '🚗', noStrike: true, base: 0, perKm: 60, speed: 26, energyPerKm: 0.3, trafficHit: 1,
    needs: 'car', note: 'Fuel money. Police checks are strict, so keep your papers in order.' },
};

// Pay is per 8-hour shift. `area: null` means you work from home.
export const JOBS = {
  apprenti: { title: 'Moto-taxi driver (renting a bike)', area: 'nyabugogo', req: {}, pay: 5000, energy: 35, skill: 'charm',
    blurb: '"Moto! Moto! Where are you going?" Helmets for you and your passenger.' },
  vendeur: { title: 'Seller at Kimironko market', area: 'kimironko', req: { trade: 10 }, pay: 7000, energy: 25,
    skill: 'trade', closedSunday: true },
  momo: { title: 'MoMo agent', area: 'remera', req: { trade: 15, charm: 10 }, pay: 9000, energy: 20, skill: 'trade' },
  repair: { title: 'Phone repairer in town', area: 'city', req: { tech: 20 }, pay: 13000, energy: 20,
    skill: 'tech', closedSunday: true },
  bank: { title: 'Bank customer adviser', area: 'city', req: { charm: 30 }, items: ['smartphone'], pay: 20000,
    energy: 25, skill: 'charm', closedSunday: true },
  dev: { title: 'Junior developer at a Kacyiru tech hub', area: 'kacyiru', req: { tech: 40 }, items: ['laptop'], pay: 30000,
    energy: 20, skill: 'tech', closedSunday: true },
  pm: { title: 'Product manager at a fintech', area: 'kimihurura', req: { tech: 50, charm: 45 }, items: ['laptop'],
    pay: 65000, energy: 22, skill: 'charm', closedSunday: true },
  remote: { title: 'Senior engineer (remote, paid in dollars)', area: null, req: { tech: 80 },
    items: ['laptop', 'generator'], pay: 140000, usd: true, energy: 20, skill: 'tech',
    blurb: 'Work from home. The generator covers you on the rare nights the power goes.' },
  coffee: { title: 'Manager at a coffee and tea export company', area: 'city', req: { charm: 70, tech: 40, clout: 60 },
    pay: 340000, energy: 25, skill: 'charm', closedSunday: true },
};

export const GOODS = {
  tomatoes: { name: 'Crate of tomatoes', base: 6000,
    mods: { nyabugogo: 0.65, gikondo: 0.8, nyamirambo: 0.9, kimironko: 0.9, kicukiro: 1.0, remera: 1.1, kacyiru: 1.2, city: 1.25, kimihurura: 1.35 } },
  potatoes: { name: 'Sack of Irish potatoes', base: 14000,
    mods: { nyabugogo: 0.7, gikondo: 0.85, kicukiro: 0.95, nyamirambo: 0.95, kimironko: 1.0, remera: 1.05, kacyiru: 1.15, city: 1.2, kimihurura: 1.3 } },
  kitenge: { name: 'Bundle of kitenge fabric', base: 12000,
    mods: { kimironko: 0.7, nyabugogo: 0.85, nyamirambo: 0.95, gikondo: 1.0, remera: 1.05, kicukiro: 1.1, city: 1.25, kacyiru: 1.3, kimihurura: 1.4 } },
  bananas: { name: 'Bunch of matoke bananas', base: 5000,
    mods: { nyabugogo: 0.65, gikondo: 0.85, nyamirambo: 0.9, kicukiro: 0.95, kimironko: 1.0, remera: 1.1, kacyiru: 1.2, city: 1.25, kimihurura: 1.3 } },
  phones: { name: 'Used smartphone', base: 100000, fx: true,
    mods: { city: 0.78, nyabugogo: 0.88, nyamirambo: 0.95, remera: 1.0, gikondo: 1.0, kimironko: 1.05, kicukiro: 1.08, kacyiru: 1.12, kimihurura: 1.15 } },
};

export const MARKETS = {
  nyabugogo: 'Nyabugogo market', kimironko: 'Kimironko market', nyamirambo: 'Nyamirambo market', city: 'Downtown shops',
  gikondo: 'Gikondo market', kicukiro: 'Kicukiro market', remera: 'Remera market', kacyiru: 'Kacyiru shops',
  kimihurura: 'Kimihurura stalls',
};

// Monthly rent. `power` is the chance the power goes on a given night (rare in Kigali).
export const HOUSES = {
  chambre: { name: 'Room in a shared house', area: 'nyamirambo', monthly: 30000, sleep: 58, mood: -2, power: 0.12, clout: 0 },
  kicukirohouse: { name: 'Small house in Kicukiro', area: 'kicukiro', monthly: 65000, sleep: 72, mood: 1, power: 0.1, clout: 2 },
  studio: { name: 'Studio in Remera', area: 'remera', monthly: 120000, sleep: 70, mood: 0, power: 0.08, clout: 2 },
  appart: { name: 'Apartment in Kacyiru', area: 'kacyiru', monthly: 250000, sleep: 80, mood: 2, power: 0.06, clout: 5 },
  hillview: { name: 'Hill-view apartment in Kimihurura', area: 'kimihurura', monthly: 500000, sleep: 90, mood: 4, power: 0.05, clout: 12 },
  villa: { name: 'Villa in Nyarutarama', area: 'nyarutarama', monthly: 3500000, sleep: 100, mood: 6, power: 0, clout: 30 },
  // Starting homes only; agents don't rent these out.
  citeu: { name: 'Room in a student hostel near the university', area: 'city', monthly: 15000, sleep: 58, mood: 0, power: 0.08, clout: 0, startOnly: true },
  tantie: { name: "Mat in your aunt's sitting room", area: 'gikondo', monthly: 0, sleep: 50, mood: -4, power: 0.12, clout: 0, startOnly: true },
};

// Moving in: 2 months' advance + 1 month agency fee. The advance covers 60 days.
export const MOVE_IN_MONTHS = 3;
export const ADVANCE_DAYS = 60;

export const ITEMS = {
  ...abidjan.ITEMS,
  generator: { ...abidjan.ITEMS.generator, blurb: `For the rare nights the power goes (about ${Math.round(GEN_FUEL * MONEY.rate / 10) * 10} RWF of fuel a night).` },
  car: { ...abidjan.ITEMS.car, name: 'Used Toyota RAV4', blurb: 'Drive yourself up the hills and carry 40 goods instead of 10.' },
};
export const SHOP_AREA = 'city';

export const JAPA = { area: 'kacyiru', proofOfFunds: 6000000, fee: 400000, chance: 0.6 };

// ---------- new-life setup ----------

export const TRAITS = {
  ...abidjan.TRAITS,
  foodie: { ...abidjan.TRAITS.foodie, blurb: 'Lives for brochettes and isombe. Every meal gives +5 extra vibes.' },
  enjaillement: { ...abidjan.TRAITS.enjaillement, name: 'Party spirit', icon: '🎶' },
};

export const DREAMS = {
  villa: { name: 'Big boss of Kigali', icon: '🏡', blurb: 'Move into a villa in Nyarutarama.' },
  landlord: { name: 'Kigali tycoon', icon: '💰', blurb: `Build a net worth of ${Math.round(10000000 * MONEY.rate / 1e6)} million RWF.` },
  star: { name: 'Music star', icon: '🎤', blurb: 'Land 5 music video roles and reach 100 clout.' },
  unicorn: { name: 'Kigali unicorn', icon: '🦄', blurb: 'Reach 100 tech and land the remote senior engineer job.' },
  abroad: { name: 'Go abroad', icon: '✈️', blurb: 'Get a visa at an embassy in Kacyiru.' },
  padi: { name: 'Ubumwe champion', icon: '🤝', blurb: 'Become close friends (80+) with 4 people in Kigali.' },
};

export const BACKGROUNDS = {
  street: { ...abidjan.BACKGROUNDS.street, name: 'Raised in the streets of Nyamirambo' },
  village: { ...abidjan.BACKGROUNDS.village, name: 'Farm kid from Musanze' },
  maquis: { ...abidjan.BACKGROUNDS.maquis, name: 'Your parents run a milk bar' },
  fonctionnaire: { ...abidjan.BACKGROUNDS.fonctionnaire, name: 'Child of a civil servant in Kacyiru' },
  diaspora: { ...abidjan.BACKGROUNDS.diaspora, name: 'Aunt in Brussels sends money' },
  tontine: { ...abidjan.BACKGROUNDS.tontine, name: 'Your savings group (ikimina) paid out to you' },
};

export const STARTS = {
  chambre: { label: 'Balanced', cash: 25000, blurb: 'A room in a shared house in Nyamirambo. Cheap rent, friendly neighbours.' },
  citeu: { label: 'Student', cash: 20000, blurb: 'A hostel room near the university in town, close to the banks and tech jobs.' },
  tantie: { label: 'Hard start', cash: 10000, blurb: "A mat in your aunt's sitting room in Gikondo. No rent, no privacy." },
};
export const DEFAULT_START = 'chambre';

export const FURNITURE = {
  ...abidjan.FURNITURE,
  dog: { ...abidjan.FURNITURE.dog, name: 'A dog called Simba' },
};

// ---------- people of Kigali ----------

export const PEOPLE = {
  gisele: { name: 'Mama Gisele', area: 'kimironko', hours: [7, 19], role: 'Kitenge seller at Kimironko market',
    perk: 'discount', perkText: '5% better prices at every market',
    look: { skin: '#7a4a2a', hair: 'foulard', outfit: '#00a1de', pattern: 'kente' } },
  eric: { name: 'Eric', area: 'city', hours: [8, 19], role: 'Phone repairer in town',
    perk: 'job', job: 'repair', perkText: 'Gets you hired as a phone repairer without the tech requirement',
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#1f5fbf', pattern: 'plain' } },
  jeanpaul: { name: 'Jean-Paul "Boss"', area: 'nyabugogo', hours: [6, 20], role: 'Owns a fleet of moto-taxis',
    perk: 'loan', perkText: `Helps you out with ${Math.round(20000 * MONEY.rate).toLocaleString('en')} RWF once a week`,
    look: { skin: '#7a4a2a', hair: 'short', outfit: '#e8b100', pattern: 'stripes' } },
  aline: { name: 'Aline', area: 'nyamirambo', hours: [11, 23], role: 'Runs the best brochette grill in Nyamirambo',
    perk: 'food', perkText: 'Shares brochettes and fries with you once a day',
    look: { skin: '#a8693f', hair: 'foulard', outfit: '#20603d', pattern: 'dots' } },
  pius: { name: 'DJ Pius', area: 'kimihurura', hours: [18, 24], role: 'DJ at a Kimihurura rooftop bar',
    perk: 'audition', perkText: 'Music video auditions are 15% likelier to succeed',
    look: { skin: '#4a2c1a', hair: 'locks', outfit: '#7b3fa0', pattern: 'plain' } },
  divine: { name: 'Divine', area: 'city', hours: [8, 20], role: 'Computer science student at the university',
    perk: 'tech', perkText: 'Study sessions together: +4 tech once a week',
    look: { skin: '#a8693f', hair: 'locks', outfit: '#00a1de', pattern: 'dots' } },
  mugisha: { name: 'Monsieur Mugisha', area: 'city', hours: [8, 18], role: 'Bank branch manager',
    perk: 'job', job: 'bank', perkText: 'Gets you hired at the bank without the charm requirement',
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#1d1b16', pattern: 'plain' } },
  patrick: { name: 'Patrick', area: 'city', hours: [9, 19], role: 'Director at a coffee and tea export company',
    perk: 'job', job: 'coffee', perkText: 'Gets you hired at the coffee company without the skill requirements',
    look: { skin: '#7a4a2a', hair: 'short', outfit: '#6b3e26', pattern: 'plain' } },
  uwase: { name: 'Uwase', area: 'remera', hours: [8, 21], role: 'Runs a MoMo kiosk',
    perk: 'job', job: 'momo', perkText: 'Gets you hired as a MoMo agent without the requirements',
    look: { skin: '#a8693f', hair: 'afro', outfit: '#fad201', pattern: 'kente' } },
  kevin: { name: 'Kevin', area: 'kimihurura', hours: [10, 22], role: 'Founder of a Kigali fintech',
    perk: 'job', job: 'pm', perkText: 'Gets you hired as a product manager without the skill requirements',
    look: { skin: '#7a4a2a', hair: 'short', outfit: '#20603d', pattern: 'plain' } },
  ange: { name: 'Ange', area: 'nyarutarama', hours: [10, 23], role: 'Influencer with 2 million followers',
    perk: 'clout', perkText: 'Features you in a video: +8 clout once a week',
    look: { skin: '#a8693f', hair: 'locks', outfit: '#c7362b', pattern: 'dots' } },
  claudine: { name: 'Claudine', area: 'remera', hours: [6, 20], role: 'Runs a milk bar near the stadium',
    perk: 'food', perkText: 'Pours you a glass of fresh milk and a snack once a day',
    look: { skin: '#4a2c1a', hair: 'foulard', outfit: '#f4f1ea', pattern: 'kente' } },
  innocent: { name: 'Tonton Innocent', area: 'kicukiro', hours: [7, 20], role: 'Retired teacher who knows everybody',
    perk: 'loan', perkText: `Helps you out with ${Math.round(20000 * MONEY.rate).toLocaleString('en')} RWF once a week`,
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#e8b100', pattern: 'kente' } },
};

// Businesses you can buy from your phone. Income lands every night.
export const BUSINESSES = {
  moto: { name: 'Moto-taxi fleet on the Nyabugogo–Remera route', short: 'moto', icon: '🛵', price: 2500000, max: 5,
    income: [18000, 30000], breakdown: 0.05, repair: 60000, blurb: 'Your riders work the hills every day.' },
  bar: { name: 'Brochette bar in Nyamirambo', short: 'brochette bar', icon: '🍢', price: 6000000, max: 3, income: [40000, 80000],
    weekend: 1.8, blurb: 'Goat brochettes, fries and cold drinks. Busiest at the weekend.' },
};

// Lines for the street scene while you travel.
export const STREET_LINES = [
  'The moto driver hands you a helmet with a grin.',
  'The streets are spotless. Plastic bags have been banned for years.',
  'A road sweeper in a bright vest waves as you pass.',
  'The Convention Centre dome glows on the hill.',
  'Someone sells chilled Inyange juice at the bus stop.',
  'A choir rehearses in a church as you go by.',
  'The road climbs one hill, dips into a valley and climbs the next.',
  'A wedding convoy goes past, ribbons on every car.',
  'Gorillas on a tourist billboard stare down at the traffic.',
  'Banana trees and red-earth gardens line the side street.',
];

// ---------- city identity, places and text ----------

export const BRAND = {
  name: 'Kigali Frenzy',
  city: 'Kigali',
  cityName: 'Kigali',
  country: 'Rwanda',
  tagline: 'From Nyamirambo to Nyarutarama · Kigali, Rwanda',
  saveKey: 'kigali-frenzy-save-v1',
  defaultName: 'Mugisha',
  icon: '🛵',
};

export const PLACES = {
  bank: ['city', 'kacyiru', 'kimihurura', 'remera', 'nyabugogo', 'kicukiro', 'nyarutarama'],
  hawk: ['city', 'kacyiru', 'kimihurura', 'remera', 'nyarutarama', 'kicukiro'],
  posh: ['nyarutarama', 'kimihurura', 'city'],
  alloco: ['nyamirambo', 'remera', 'kicukiro', 'nyabugogo'],
  flood: ['nyabugogo', 'gikondo'],
  maquis: 'nyamirambo',
  beach: null, // Kigali has hills, not beaches.
  club: 'kimihurura',
  football: 'nyamirambo',
  gym: 'remera',
  audition: 'nyamirambo',
  bootcamp: 'kacyiru',
  haggle: 'kimironko',
  mixer: ['city', 'kimihurura'],
  golf: 'nyarutarama',
};
// Two rainy seasons: March–May and October–November.
export const RAINY_MONTHS = [2, 3, 4, 9, 10];

// Rwanda is landlocked: the map is all hills, with the valley wetlands in pale green.
export const MAP = {
  land: [
    'M0 0 H640 V400 H0 Z',
  ],
  labels: [[20, 360, 'Mount Kigali'], [190, 80, 'Nyabugogo valley'], [520, 380, 'to the airport'], [180, 340, 'Nyabarongo wetlands']],
  labelBelow: ['city', 'kimihurura'],
};

// Red-brick walls, blue-and-white buses, and Rwanda's horizontal flag with its sun.
export const SCENE = {
  wall: '#a8553a',
  van: ['#f4f4f4', '#00a1de', '#2b3a4a'],
  traffic: ['#00a1de', '#e8e8e8', '#fad201', '#20603d'],
  flag: ['#00a1de', '#fad201', '#20603d'],
  flagStyle: 'horizontal',
  flagSun: '#fad201',
  shops: ['SUPERMARKET', 'SALON', 'MOMO', 'PHARMACY', 'BOUTIQUE', 'TAILOR', 'AIRTIME'],
  trees: 'jacaranda',
  backdrop: 'hills',
  flowerBeds: true,
  motos: 3,
  motoVest: '#20603d',
  homeArt: 'imigongo',
};

export const T = {
  coin: 'MilleCoin',
  welcome: (name) => `Welcome to Kigali, ${name}! Murakaza neza!`,
  strike: 'Bus disruption today: long queues at every stop and fares are up.',
  flood: 'Heavy rain last night. Nyabugogo and Gikondo are flooded and traffic there is terrible.',
  genSaved: (fuel) => `The power went off, but your generator saved the night (${fuel} of fuel).`,
  hospital: {
    title: 'Kigali wore you out',
    text: 'You collapsed and woke up at King Faisal Hospital. The family has sent a bus ticket back to the village. '
      + 'Rest well, and Kigali will still be here.',
  },
  abroad: 'Visa approved! You packed Rwandan coffee, a kitenge shirt and a lot of memories, and flew out from Kanombe airport. '
    + 'Kigali made you. Wherever you land, you will hustle like a true Kigalian.',
  pickpocket: (lost) => ` Someone in the crowded bus took ${lost}.`,
  police: (bribe) => ` Traffic police check: your papers were fine, but you paid a ${bribe} fine for a broken light.`,
  act: {
    hawk: 'Do food deliveries on a bicycle',
    skit: 'Shoot a comedy skit in Kinyarwanda',
    audition: 'Audition for a music video',
    eat: 'Eat a buffet lunch (rice, beans, isombe and matoke)',
    alloco: 'Brochettes and fries at a roadside grill',
    relaxPhone: 'Watch a Rwandan series on your phone at home',
    playdog: 'Play with Simba',
    callmaman: 'Call your mum',
    dance: 'Dance to Afrobeat and Rwandan pop',
    maquis: 'Night out at a Nyamirambo bar',
    beach: 'Relax by the water',
    club: 'Show off at a Kimihurura rooftop bar',
    gym: 'Jog the steps at Amahoro Stadium',
    haggle: 'Learn to haggle from Mama Gisele',
    golf: 'Brunch at the Nyarutarama golf club',
    shop: 'Shop for phones, laptops and cars in town',
    football: 'Play football at the Nyamirambo pitch',
    maquisdrink: 'Order brochettes and a cold drink',
    chat: 'Chat with the regulars',
  },
  log: {
    hawk: (amt) => `You pedalled lunch orders up and down the hills and made ${amt}. Your legs are burning.`,
    auditionWin: (fee) => `You got the part! You're dancing in the new hit music video and earned ${fee}.`,
    eat: (cost) => `A full buffet plate: rice, beans, isombe, matoke and a bit of meat (${cost}).`,
    eatPosh: (cost) => `Grilled tilapia from Lake Kivu and a fresh passion juice. You posted it, of course (${cost}).`,
    alloco: 'Goat brochettes, crispy fries and a little pili-pili. Delicious!',
    relaxTv: 'You watched the Amavubi play on the big screen. What a goal!',
    relaxPhone: 'You binged a Rwandan series on your phone and laughed until you cried.',
    cook: 'You cooked isombe and rice at home. Cheap and tasty.',
    playdog: 'You played fetch with Simba until he flopped down in the shade.',
    mamanSends: (amt) => `Your mum asked if you are eating well, then sent ${amt} by MoMo "for food".`,
    mamanNews: 'Your mum gave you all the family news and reminded you to go to church. +8 vibes.',
    dance: 'You danced in your room until the neighbours knocked on the wall.',
    whatsapp: (amt) => `You posted shoes, kitenge and perfume on your WhatsApp status. Sales: ${amt}.`,
    maquis: 'Brochettes, cold drinks and Afrobeat until late. What a night!',
    beach: 'You relaxed by the water and watched the sun go down.',
    club: 'City lights below, music loud, and the DJ shouted your name. Kimihurura nights are something else.',
    football: 'You scored at the Nyamirambo pitch. The kids are calling you the new star of the Amavubi.',
    gym: 'Up and down the stadium steps until your legs shook. Your body thanks you.',
    haggle: 'Mama Gisele: "Never take the first price, my child." +3 trade.',
    golf: 'Brunch with the Nyarutarama crowd. You are learning how the big bosses talk.',
    maquisdrink: 'Goat brochettes, fries and a cold drink on the terrace.',
    chat: 'You chatted with the regulars about football, music and everybody\'s business.',
    swim: 'You swam and dried off in the sun.',
  },
  ev: {
    wedding: (c) => `Your cousin's gusaba (bride-price ceremony) is on Saturday and the family umushanana costs ${c}.`,
    weddingYes: 'Get the umushanana and go',
    family: (a) => `Your uncle in the village near Huye needs ${a} for "urgent" roof repairs.`,
    familyThanks: 'Your uncle blessed you for ten minutes on the phone.',
    lotto: (c) => `A lottery kiosk is calling your name. A ticket costs ${c}.`,
    feast: 'Your neighbour is celebrating a baby\'s naming day, and the smell of brochettes and isombe is coming into your room.',
    feastYes: 'A full plate of brochettes, isombe and matoke. Free!',
  },
  goalFriend: 'Make a friend in Kigali',
  dogName: 'Simba',
  richTitle: 'Kigali rich list',
  moveIn: "2 months' advance, 1 month agency fee",
  lots: {
    maquis: { label: 'Brochette bar', sign: 'BROCHETTES', color: '#00a1de' },
    market: { sign: 'ISOKO' },
  },
};

// Kigali's own events: monthly community work, Car Free Day and a milk-bar treat.
export const CITY_EVENTS = [
  {
    id: 'umuganda', weight: 12, weekday: 6, lastOfMonth: true,
    text: 'It\'s Umuganda morning! The whole neighbourhood is out cleaning the streets and planting trees.',
    options: [
      { label: 'Grab a hoe and join in', fx: { social: 20, clout: 3, energy: -15, happiness: 5 },
        text: 'You worked side by side with your neighbours, then stayed for the community meeting. Everyone knows your name now.', tone: 'good' },
      { label: 'Stay in bed', fx: { social: -5, clout: -2 },
        text: 'The cell leader noticed you were missing.', tone: 'bad' },
    ],
  },
  {
    id: 'carfree', weight: 3, weekday: 0,
    text: 'It\'s Car Free Day! The main roads are closed to traffic and there are free aerobics in the street.',
    options: [
      { label: 'Join the aerobics', fx: { health: 8, happiness: 8, social: 8, energy: -10 },
        text: 'Hundreds of people dancing and stretching on an empty boulevard. What a way to start the day!', tone: 'good' },
      { label: 'Skip it', fx: {}, text: 'Maybe next time.' },
    ],
  },
  {
    id: 'milkbar', weight: 2,
    text: 'A friend is waving you over to a milk bar for a glass of fresh ikivuguto (fermented milk).',
    options: [
      { label: 'Have a glass', cost: 300, fx: { hunger: 20, social: 10, happiness: 4 },
        text: 'Thick, cold and tangy. Just what you needed.', tone: 'good' },
      { label: 'No thanks', fx: {}, text: 'You kept walking.' },
    ],
  },
];

export const GIST = [
  'talked about the Amavubi\'s last match for an hour',
  'shared the latest news from the neighbourhood',
  'argued about who makes the best brochettes in Kigali',
  'laughed about the moto driver who took the longest route up the hill',
  'talked about plans for the future',
];

export const FRIEND_TEXTS = [
  'Amakuru? Long time no see.',
  'Did you see the Amavubi last night? Too sweet!',
  'Come for brochettes on Saturday, everybody will be there.',
  'Courage with the hustle. Kigali is hard but we are strong.',
  'I heard potato prices are going up. Stock up!',
  'Happy Sunday! God bless.',
];

export const RICH = [
  ['Patrick', 'Coffee exports', 450000000], ['Kevin', 'Fintech', 120000000], ['Ange', 'Influencer', 35000000],
  ['Monsieur Mugisha', 'Banking', 25000000], ['Jean-Paul "Boss"', 'Moto-taxi fleet', 8000000], ['Mama Gisele', 'Kitenge trade', 3000000],
];

export const HELP = {
  intro: 'You arrive in Kigali with very little money.',
  transport: 'Get around by city bus, moto-taxi, electric bike, taxi cab or your own car. Kigali is all hills, so walking and cycling are tiring.',
  work: 'Do bicycle deliveries, take jobs, shoot skits, audition for music videos in Nyamirambo.',
  trade: 'Trade: buy where things are cheap (tomatoes, potatoes and bananas at Nyabugogo, kitenge at Kimironko, phones in town) and sell where they\'re dear (Kimihurura, Kacyiru).',
  learn: 'Learn tech at the Kacyiru tech hubs, haggling at Kimironko and charm at networking events in town and Kimihurura to unlock better jobs.',
  power: 'The power rarely goes in Kigali, but a generator helps when it does. On the last Saturday of the month, join Umuganda community work.',
};
