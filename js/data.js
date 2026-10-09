// Static game data: communes, transport, jobs, goods, housing and things you can buy.
// All money is in CFA francs (FCFA).

// Map coordinates are in the SVG viewBox (640 x 400). 10 map units ≈ 1 km.
export const AREAS = {
  abobo: { name: 'Abobo', x: 300, y: 45, price: 0.7, blurb: 'The biggest popular commune. Gbakas, noise and hustle everywhere.' },
  bingerville: { name: 'Bingerville', x: 600, y: 118, price: 0.7, blurb: 'The old colonial capital. Quiet, green, far from everything.' },
  adjame: { name: 'Adjamé', x: 285, y: 128, price: 0.8, blurb: 'The giant market, the main bus station and the Black Market for phones.' },
  yopougon: { name: 'Yopougon', x: 105, y: 140, price: 0.7, blurb: 'Yop City! Maquis, music and enjaillement. Where many Babi stories start.' },
  cocody: { name: 'Cocody', x: 405, y: 162, price: 1.3, blurb: 'The university, startups and the Allocodrome.' },
  riviera: { name: 'Riviera Golf', x: 515, y: 185, price: 2.5, blurb: 'Villas, the golf club and very quiet streets. The big-boss life.' },
  plateau: { name: 'Plateau', x: 305, y: 205, price: 1.4, blurb: 'The business district. Towers, banks, ministries and embassies.' },
  treichville: { name: 'Treichville', x: 290, y: 280, price: 0.9, blurb: 'Historic Treich: the port, the market and the Palais des Sports.' },
  marcory: { name: 'Marcory Zone 4', x: 400, y: 285, price: 1.5, blurb: 'Restaurants, clubs, expats and fintech offices.' },
  portbouet: { name: 'Port-Bouët', x: 385, y: 352, price: 0.9, blurb: 'The airport and the beach, right on the Atlantic.' },
};

// Roads drawn on the map (visual only; travel uses straight-line distance).
export const ROADS = [
  ['abobo', 'adjame'], ['abobo', 'cocody'], ['adjame', 'yopougon'], ['adjame', 'plateau'],
  ['adjame', 'cocody'], ['plateau', 'cocody'], ['plateau', 'treichville'], ['cocody', 'riviera'],
  ['riviera', 'bingerville'], ['riviera', 'marcory'], ['treichville', 'marcory'],
  ['marcory', 'portbouet'], ['treichville', 'portbouet'],
];

export const TRANSPORT = {
  gbaka: { name: 'Gbaka minibus', base: 100, perKm: 15, speed: 18, energyPerKm: 0.9, trafficHit: 1,
    note: 'Cheap. Packed. The apprenti never has change.' },
  boat: { name: 'Lagoon water bus', base: 200, perKm: 5, speed: 22, energyPerKm: 0.4, trafficHit: 0,
    stops: ['yopougon', 'plateau', 'treichville', 'cocody', 'marcory'], note: 'No traffic on the lagoon. Only between lagoon stops.' },
  woro: { name: 'Woro-woro shared taxi', base: 200, perKm: 30, speed: 22, energyPerKm: 0.5, trafficHit: 1,
    note: 'Shared taxi. Fast enough, fair price.' },
  moto: { name: 'Moto-taxi', base: 150, perKm: 35, speed: 30, energyPerKm: 0.5, trafficHit: 0.15,
    banned: ['plateau', 'cocody', 'riviera', 'marcory'], note: 'Beats traffic. Risky. Not allowed in the smart communes.' },
  taxi: { name: 'Orange metered taxi', base: 500, perKm: 120, speed: 24, energyPerKm: 0.15, trafficHit: 1,
    note: 'Air-con and comfort, at a price.' },
  car: { name: 'Your own car', base: 0, perKm: 60, speed: 26, energyPerKm: 0.3, trafficHit: 1,
    needs: 'car', note: 'Fuel money. Police checks.' },
};

// Pay is per 8-hour shift. `area: null` means you work from home.
export const JOBS = {
  apprenti: { title: 'Gbaka apprenti', area: 'abobo', req: {}, pay: 5000, energy: 35, skill: 'charm',
    blurb: '"Adjamé! Adjamé! On est deux-deux!"' },
  vendeur: { title: 'Seller at Adjamé market', area: 'adjame', req: { trade: 10 }, pay: 7000, energy: 25,
    skill: 'trade', closedSunday: true },
  momo: { title: 'Mobile Money agent', area: 'treichville', req: { trade: 15, charm: 10 }, pay: 9000, energy: 20, skill: 'trade' },
  repair: { title: 'Phone repairer, Black Market', area: 'adjame', req: { tech: 20 }, pay: 13000, energy: 20,
    skill: 'tech', closedSunday: true },
  bank: { title: 'Bank customer adviser', area: 'plateau', req: { charm: 30 }, items: ['smartphone'], pay: 20000,
    energy: 25, skill: 'charm', closedSunday: true },
  dev: { title: 'Junior developer, Cocody startup', area: 'cocody', req: { tech: 40 }, items: ['laptop'], pay: 30000,
    energy: 20, skill: 'tech', closedSunday: true },
  pm: { title: 'Product manager, Zone 4 fintech', area: 'marcory', req: { tech: 50, charm: 45 }, items: ['laptop'],
    pay: 65000, energy: 22, skill: 'charm', closedSunday: true },
  remote: { title: 'Senior engineer (remote, paid in dollars)', area: null, req: { tech: 80 },
    items: ['laptop', 'generator'], pay: 140000, usd: true, energy: 20, skill: 'tech',
    blurb: 'Work from home. When CIE cuts the power, the generator keeps you online.' },
  cocoa: { title: 'Executive at a cocoa export firm', area: 'plateau', req: { charm: 70, tech: 40, clout: 60 }, pay: 340000,
    energy: 25, skill: 'charm', closedSunday: true },
};

export const GOODS = {
  plantain: { name: 'Bunch of plantain', base: 4000,
    mods: { bingerville: 0.6, abobo: 0.8, yopougon: 0.9, adjame: 0.85, treichville: 1.0, portbouet: 1.05, plateau: 1.25, cocody: 1.3, marcory: 1.4 } },
  attieke: { name: 'Sack of attiéké', base: 12000,
    mods: { yopougon: 0.7, adjame: 0.85, abobo: 0.9, treichville: 1.0, bingerville: 1.1, portbouet: 1.05, plateau: 1.2, cocody: 1.3, marcory: 1.35 } },
  pagne: { name: 'Bundle of wax pagne', base: 10000,
    mods: { adjame: 0.7, treichville: 0.75, abobo: 0.95, yopougon: 1.0, portbouet: 1.05, bingerville: 1.15, plateau: 1.25, cocody: 1.3, marcory: 1.4 } },
  rice: { name: 'Sack of rice', base: 25000,
    mods: { treichville: 0.85, adjame: 0.88, portbouet: 0.95, yopougon: 1.0, abobo: 1.0, cocody: 1.15, bingerville: 1.15, plateau: 1.2, marcory: 1.25 } },
  phones: { name: '"Venu de France" iPhone', base: 100000, fx: true,
    mods: { adjame: 0.78, treichville: 0.92, yopougon: 0.98, plateau: 1.0, abobo: 1.08, portbouet: 1.05, cocody: 1.1, bingerville: 1.15, marcory: 1.15 } },
};

export const MARKETS = {
  abobo: 'Abobo Grand Marché', bingerville: 'Bingerville market', adjame: 'Adjamé market',
  yopougon: 'Siporex market, Yopougon', cocody: 'Cocody market', plateau: 'Plateau street traders',
  treichville: 'Treichville market', marcory: 'Marcory market', portbouet: 'Port-Bouët market',
};

// Monthly rent. `power` is the chance CIE cuts the power on a given night.
export const HOUSES = {
  cour: { name: 'Room in a cour commune', area: 'yopougon', monthly: 25000, sleep: 55, mood: -3, power: 0.3, clout: 0 },
  bingerville: { name: 'Little house in Bingerville', area: 'bingerville', monthly: 60000, sleep: 72, mood: 1, power: 0.3, clout: 2 },
  studio: { name: 'Studio in Cocody', area: 'cocody', monthly: 90000, sleep: 70, mood: 0, power: 0.25, clout: 2 },
  appart: { name: 'Two-room apartment in Treichville', area: 'treichville', monthly: 150000, sleep: 80, mood: 2, power: 0.25, clout: 5 },
  zone4: { name: 'Apartment in Marcory Zone 4', area: 'marcory', monthly: 450000, sleep: 90, mood: 3, power: 0.2, clout: 12 },
  villa: { name: 'Villa in Riviera Golf', area: 'riviera', monthly: 3000000, sleep: 100, mood: 6, power: 0, clout: 30 },
  // Starting homes only; agents don't rent these out.
  citeu: { name: 'Room at the university residence', area: 'cocody', monthly: 15000, sleep: 60, mood: 0, power: 0.25, clout: 0, startOnly: true },
  tantie: { name: 'Mat in your tantie\'s living room', area: 'abobo', monthly: 0, sleep: 50, mood: -4, power: 0.3, clout: 0, startOnly: true },
};

// Moving in: 2 months' advance + 2 months' deposit + 1 month agency fee. The advance covers 60 days.
export const MOVE_IN_MONTHS = 5;
export const ADVANCE_DAYS = 60;

export const ITEMS = {
  smartphone: { name: 'Smartphone', price: 70000, fx: true, blurb: 'Shoot skits, learn on YouTube, trade crypto.' },
  laptop: { name: 'Laptop', price: 180000, fx: true, blurb: 'Needed for tech jobs.' },
  generator: { name: 'Generator', price: 100000, blurb: 'Sleep well when CIE cuts the power (1,500 FCFA fuel a night).' },
  car: { name: '"France au revoir" Toyota', price: 2000000, fx: true, clout: 10,
    blurb: 'A used car shipped from Europe. Drive yourself and carry 40 goods instead of 10.' },
};
export const SHOP_AREA = 'adjame';

export const JAPA = { area: 'plateau', proofOfFunds: 6000000, fee: 400000, chance: 0.6 };
export const GEN_FUEL = 1500;
export const CARRY = { base: 10, car: 40 };

// ---------- new-life setup ----------

// Pick two. Effects are applied in engine.js through hasTrait().
export const TRAITS = {
  hustler: { name: 'Hustler', icon: '💼', blurb: 'Sees money everywhere. Street selling pays 25% more.' },
  foodie: { name: 'Foodie', icon: '🍲', blurb: 'Lives for garba. Every meal gives +5 extra vibes.' },
  enjaillement: { name: 'Enjaillement spirit', icon: '🎉', blurb: 'Always ready to party. Nights out give 50% more vibes and clout.' },
  gym: { name: 'Gym rat', icon: '💪', blurb: 'Starts fitter (+10 health). Sport gives 50% more health.' },
  talker: { name: 'Smooth talker', icon: '😎', blurb: 'Starts with +10 charm and learns charm faster.' },
  lazy: { name: 'Lazy bone', icon: '😴', blurb: 'Sleeps like a baby (+10 energy a night), but shifts drain 5 more energy.' },
  clean: { name: 'Clean and careful', icon: '🧼', blurb: 'Never catches malaria. Sleeping rough hurts half as much.' },
  nightowl: { name: 'Night owl', icon: '🌙', blurb: 'Nights out cost no energy.' },
  tech: { name: 'Tech bro or sis', icon: '💻', blurb: 'Starts with +10 tech and learns tech faster.' },
  musical: { name: 'Musical', icon: '🎵', blurb: 'Auditions are 20% likelier to succeed and pay 50% more.' },
};

// Your dream is how you win.
export const DREAMS = {
  villa: { name: 'Big boss of Babi', icon: '🏡', blurb: 'Move into a villa in Riviera Golf.' },
  landlord: { name: 'Cocody landlord', icon: '💰', blurb: 'Build a net worth of 10 million FCFA.' },
  star: { name: 'Coupé-décalé star', icon: '🎤', blurb: 'Land 5 music video roles and reach 100 clout.' },
  unicorn: { name: 'Babi unicorn', icon: '🦄', blurb: 'Reach 100 tech and land the remote senior engineer job.' },
  abroad: { name: 'Go abroad', icon: '✈️', blurb: 'Get a visa at the embassy in Plateau.' },
  padi: { name: 'Everybody\'s padi', icon: '🤝', blurb: 'Become padis (80+) with 4 people in Babi.' },
};

// The birth lottery: one is drawn at random for each new life.
export const BACKGROUNDS = {
  street: { name: 'Raised by the streets of Yop', weight: 3, cash: 0, skills: { trade: 5, charm: 5 },
    blurb: 'No money, but you know how the street works. +5 trade, +5 charm.' },
  village: { name: 'Village kid from Korhogo', weight: 3, cash: 5000, health: 10, skills: { trade: 3 },
    blurb: 'Strong body, small savings. +5,000 FCFA, +10 health, +3 trade.' },
  maquis: { name: 'Your parents run a maquis', weight: 2, cash: 15000, skills: { trade: 8 },
    blurb: 'You grew up counting coins behind the counter. +15,000 FCFA, +8 trade.' },
  fonctionnaire: { name: 'Child of a Plateau civil servant', weight: 2, cash: 40000, skills: { charm: 5 },
    blurb: 'Papa has a pension and a network. +40,000 FCFA, +5 charm.' },
  diaspora: { name: 'Cousin in Paris sends money', weight: 1, cash: 60000, happiness: 10,
    blurb: 'A transfer lands now and then. +60,000 FCFA, +10 vibes.' },
  tontine: { name: 'You just won the tontine', weight: 1, cash: 80000,
    blurb: 'The savings circle paid out to you this month. +80,000 FCFA.' },
};

// Where a new life can start. Rent for the first month is already paid.
export const STARTS = {
  cour: { label: 'Balanced', cash: 25000, blurb: 'A room around a shared courtyard. Cheap rent, lively neighbours.' },
  citeu: { label: 'Student', cash: 20000, blurb: 'A room in the university residence in Cocody, next to the coding bootcamp.' },
  tantie: { label: 'Hard start', cash: 10000, blurb: 'A mat in your tantie\'s living room in Abobo. No rent, no privacy.' },
};

export const AVATAR = {
  skins: ['#f1c7a1', '#d39b6a', '#a8693f', '#7a4a2a', '#4a2c1a'],
  outfits: ['#f77f00', '#009e60', '#c7362b', '#1f5fbf', '#7b3fa0', '#e8b100'],
  patterns: { plain: 'Plain', stripes: 'Stripes', dots: 'Wax dots', kente: 'Kente checks' },
  hair: { short: 'Short', afro: 'Afro', locks: 'Locks', foulard: 'Head wrap' },
};

// Furniture for your home. Items move with you when you change house.
export const FURNITURE = {
  mattress: { name: 'Foam mattress', icon: '🛏️', price: 25000, blurb: '+10 energy every night at home.' },
  net: { name: 'Mosquito net', icon: '🕸️', price: 5000, blurb: 'No more malaria.' },
  fan: { name: 'Standing fan', icon: '🌀', price: 15000, blurb: 'Power cuts hurt your sleep half as much.' },
  stove: { name: 'Gas stove and pots', icon: '🍳', price: 30000, blurb: 'Cook at home for 300 FCFA a meal.' },
  speaker: { name: 'Bluetooth speaker', icon: '🔊', price: 20000, blurb: '+2 vibes every night.' },
  desk: { name: 'Desk and books', icon: '📚', price: 35000, blurb: 'Study at home for +2 tech.' },
  tv: { name: 'TV with satellite', icon: '📺', price: 80000, blurb: 'Watching TV at home gives +8 more vibes.' },
  dog: { name: 'A dog called Drogba', icon: '🐕', price: 40000, blurb: '+4 vibes a night. Toughs think twice.' },
  sofa: { name: 'Leather sofa', icon: '🛋️', price: 120000, clout: 3, blurb: '+3 vibes a night, +3 clout.' },
  ac: { name: 'Air conditioner', icon: '❄️', price: 350000, clout: 5, blurb: '+10 energy a night when the power is on. +5 clout.' },
};

// ---------- people of Babi ----------

// Residents you can meet. They are in their commune between `hours[0]` and `hours[1]`.
// A perk unlocks once you are friends (45+). `job` perks let you skip that job's skill requirements.
export const PEOPLE = {
  awa: { name: 'Tantie Awa', area: 'adjame', hours: [7, 19], role: 'Pagne seller at Adjamé market',
    perk: 'discount', perkText: '5% better prices at every market',
    look: { skin: '#7a4a2a', hair: 'foulard', outfit: '#009e60', pattern: 'kente' } },
  ibrahim: { name: 'Ibrahim', area: 'adjame', hours: [8, 19], role: 'Phone repairer at the Black Market',
    perk: 'job', job: 'repair', perkText: 'Gets you hired as a phone repairer without the tech requirement',
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#1f5fbf', pattern: 'plain' } },
  yao: { name: 'Yao "Le Boss"', area: 'abobo', hours: [6, 20], role: 'Owns three gbakas',
    perk: 'loan', perkText: 'Helps you out with 20,000 FCFA once a week',
    look: { skin: '#a8693f', hair: 'short', outfit: '#c7362b', pattern: 'stripes' } },
  aicha: { name: 'Aïcha', area: 'abobo', hours: [6, 22], role: 'Sells the best garba in Abobo',
    perk: 'food', perkText: 'Shares a plate of garba with you once a day',
    look: { skin: '#7a4a2a', hair: 'foulard', outfit: '#e8b100', pattern: 'dots' } },
  koffi: { name: 'DJ Koffi', area: 'yopougon', hours: [17, 24], role: 'DJ at a Yop maquis',
    perk: 'audition', perkText: 'Music video auditions are 15% likelier to succeed',
    look: { skin: '#4a2c1a', hair: 'locks', outfit: '#7b3fa0', pattern: 'plain' } },
  mariam: { name: 'Mariam', area: 'cocody', hours: [8, 20], role: 'Computer science student',
    perk: 'tech', perkText: 'Study sessions together: +4 tech once a week',
    look: { skin: '#a8693f', hair: 'locks', outfit: '#1f5fbf', pattern: 'dots' } },
  seydou: { name: 'Monsieur Seydou', area: 'plateau', hours: [8, 18], role: 'Bank branch manager',
    perk: 'job', job: 'bank', perkText: 'Gets you hired at the bank without the charm requirement',
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#1d1b16', pattern: 'plain' } },
  hermann: { name: 'Hermann', area: 'plateau', hours: [9, 19], role: 'Director at a cocoa export firm',
    perk: 'job', job: 'cocoa', perkText: 'Gets you hired at the cocoa firm without the skill requirements',
    look: { skin: '#7a4a2a', hair: 'short', outfit: '#7b3fa0', pattern: 'stripes' } },
  fatou: { name: 'Fatou', area: 'treichville', hours: [8, 20], role: 'Runs a Mobile Money kiosk',
    perk: 'job', job: 'momo', perkText: 'Gets you hired as a Mobile Money agent without the requirements',
    look: { skin: '#a8693f', hair: 'afro', outfit: '#f77f00', pattern: 'kente' } },
  grace: { name: 'Grace', area: 'marcory', hours: [10, 24], role: 'Founder of a Zone 4 fintech',
    perk: 'job', job: 'pm', perkText: 'Gets you hired as a product manager without the skill requirements',
    look: { skin: '#d39b6a', hair: 'afro', outfit: '#009e60', pattern: 'plain' } },
  nadia: { name: 'Nadia', area: 'riviera', hours: [10, 23], role: 'Influencer with 2 million followers',
    perk: 'clout', perkText: 'Features you in a video: +8 clout once a week',
    look: { skin: '#d39b6a', hair: 'locks', outfit: '#c7362b', pattern: 'dots' } },
  didier: { name: 'Didier', area: 'portbouet', hours: [6, 19], role: 'Fisherman and beach football coach',
    perk: 'food', perkText: 'Shares grilled fish with you once a day',
    look: { skin: '#4a2c1a', hair: 'short', outfit: '#1f5fbf', pattern: 'stripes' } },
  paul: { name: 'Pasteur Paul', area: 'bingerville', hours: [7, 20], role: 'Pastor and plantain farmer',
    perk: 'loan', perkText: 'Helps you out with 20,000 FCFA once a week',
    look: { skin: '#7a4a2a', hair: 'short', outfit: '#e8b100', pattern: 'kente' } },
};

// Relationship levels by minimum score.
export const LEVELS = [[0, 'Stranger'], [20, 'Acquaintance'], [45, 'Friend'], [70, 'Padi'], [90, 'Like family']];

// Businesses you can buy from your phone. Income lands every night.
export const BUSINESSES = {
  gbaka: { name: 'Gbaka on the Adjamé–Abobo line', icon: '🚐', price: 2500000, max: 5, income: [18000, 30000],
    breakdown: 0.05, repair: 60000, blurb: 'Your driver and apprenti work the line every day.' },
  maquis: { name: 'Maquis in Yopougon', icon: '🍻', price: 6000000, max: 3, income: [40000, 80000],
    weekend: 1.8, blurb: 'Braised chicken and cold drinks. Busiest on Fridays and Saturdays.' },
};

// Staff are paid every Saturday. If you can't pay, they leave.
export const STAFF = {
  help: { name: 'House help', icon: '🧹', wage: 10000, blurb: 'Keeps your place clean: +3 vibes every night at home.' },
  cook: { name: 'Cook', icon: '👩🏾‍🍳', wage: 20000, blurb: 'Makes breakfast when you sleep at home: you start the day fed with +10 energy.' },
};

// Lines for the street scene while you travel.
export const STREET_LINES = [
  'The apprenti still owes you 50 FCFA change.',
  'A vendor passes a cold bissap through the window.',
  'Someone is selling phone chargers in the traffic.',
  'Coupé-décalé is blasting from the speaker at the back.',
  'The driver argues with a woro-woro about a lane.',
  'A wedding convoy goes past, horns blaring.',
  'A boy sells garba in little plastic bags at the junction.',
  'Traffic crawls past a billboard for a new phone.',
  'A police officer waves the traffic through the junction.',
  'The lagoon shines in the sun as you cross the bridge.',
];
