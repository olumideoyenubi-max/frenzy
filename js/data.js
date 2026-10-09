// Static game data: places, jobs, goods, houses and things you can buy.

// Map coordinates are in the SVG viewBox (640 x 400). 10 map units ≈ 1 km.
export const AREAS = {
  ikorodu: { name: 'Ikorodu', x: 535, y: 70, price: 0.7, blurb: 'Far, but rent is cheap and food is cheaper.' },
  ikeja: { name: 'Ikeja', x: 290, y: 78, price: 1.0, blurb: 'State capital. Computer Village, car lots and the Shrine.' },
  oshodi: { name: 'Oshodi', x: 228, y: 148, price: 0.8, blurb: 'The busiest bus park in West Africa. Hold your bag well.' },
  yaba: { name: 'Yaba', x: 340, y: 182, price: 0.9, blurb: 'Tech bootcamps, startups and Unilag students.' },
  surulere: { name: 'Surulere', x: 240, y: 226, price: 0.9, blurb: 'Nollywood, the National Stadium and Ojuelegba.' },
  ajegunle: { name: 'Ajegunle', x: 110, y: 270, price: 0.7, blurb: 'AJ City. Where many Lagos stories start.' },
  island: { name: 'Lagos Island', x: 285, y: 300, price: 0.9, blurb: 'Balogun Market. If e dey Lagos, e dey Balogun.' },
  banana: { name: 'Ikoyi & Banana Island', x: 400, y: 258, price: 3.0, blurb: 'Old money, new money, 24-hour light.' },
  vi: { name: 'Victoria Island', x: 385, y: 325, price: 1.8, blurb: 'Banks, clubs, embassies and big boys.' },
  lekki: { name: 'Lekki', x: 535, y: 318, price: 1.6, blurb: 'Estates, beaches and fintech offices.' },
};

// Roads drawn on the map (visual only; travel uses straight-line distance).
export const ROADS = [
  ['ikorodu', 'ikeja'], ['ikorodu', 'yaba'], ['ikeja', 'oshodi'], ['oshodi', 'yaba'],
  ['oshodi', 'surulere'], ['oshodi', 'ajegunle'], ['surulere', 'yaba'], ['surulere', 'ajegunle'],
  ['surulere', 'island'], ['yaba', 'island'], ['island', 'banana'], ['island', 'vi'],
  ['banana', 'vi'], ['vi', 'lekki'], ['banana', 'lekki'],
];

export const TRANSPORT = {
  danfo: { name: 'Danfo bus', base: 200, perKm: 40, speed: 18, energyPerKm: 0.9, trafficHit: 1,
    note: 'Cheap. Hot. Watch for pickpockets.' },
  brt: { name: 'BRT bus', base: 400, perKm: 15, speed: 26, energyPerKm: 0.6, trafficHit: 0.35,
    stops: ['ikorodu', 'ikeja', 'oshodi', 'yaba', 'island'], note: 'Has its own lane. Only on the BRT corridor.' },
  okada: { name: 'Okada', base: 300, perKm: 90, speed: 30, energyPerKm: 0.5, trafficHit: 0.15,
    banned: ['vi', 'banana', 'island'], note: 'Beats traffic. Risky. Banned on the Island.' },
  bolt: { name: 'Ride-hailing car', base: 1200, perKm: 320, speed: 22, energyPerKm: 0.15, trafficHit: 1,
    note: 'AC and comfort, at a price.' },
  car: { name: 'Your own car', base: 0, perKm: 160, speed: 24, energyPerKm: 0.3, trafficHit: 1,
    needs: 'car', note: 'Fuel money. Police checkpoints.' },
};

// Pay is per 8-hour shift. `area: null` means you work from home.
export const JOBS = {
  conductor: { title: 'Danfo conductor', area: 'oshodi', req: {}, pay: 10000, energy: 35, skill: 'charm',
    blurb: '"Oshodi! Oshodi! Enter with your change!"' },
  balogun: { title: 'Shop attendant, Balogun Market', area: 'island', req: { trade: 10 }, pay: 16000, energy: 25,
    skill: 'trade', closedSunday: true },
  pos: { title: 'POS agent', area: 'surulere', req: { trade: 15, charm: 10 }, pay: 22000, energy: 20, skill: 'trade' },
  repair: { title: 'Phone repairer, Computer Village', area: 'ikeja', req: { tech: 20 }, pay: 32000, energy: 20,
    skill: 'tech', closedSunday: true },
  bank: { title: 'Bank customer service', area: 'vi', req: { charm: 30 }, items: ['smartphone'], pay: 48000,
    energy: 25, skill: 'charm', closedSunday: true },
  dev: { title: 'Junior developer, Yaba startup', area: 'yaba', req: { tech: 40 }, items: ['laptop'], pay: 75000,
    energy: 20, skill: 'tech', closedSunday: true },
  pm: { title: 'Product manager, Lekki fintech', area: 'lekki', req: { tech: 50, charm: 45 }, items: ['laptop'],
    pay: 160000, energy: 22, skill: 'charm', closedSunday: true },
  remote: { title: 'Senior engineer (remote, paid in dollars)', area: null, req: { tech: 80 },
    items: ['laptop', 'generator'], pay: 350000, usd: true, energy: 20, skill: 'tech',
    blurb: 'Work from home. NEPA no fit carry your standup, so you need a generator.' },
  oil: { title: 'Oil & gas consultant', area: 'vi', req: { charm: 70, tech: 40, clout: 60 }, pay: 850000,
    energy: 25, skill: 'charm', closedSunday: true },
};

export const GOODS = {
  pepper: { name: 'Basket of pepper', base: 8000,
    mods: { ikorodu: 0.62, oshodi: 0.85, ajegunle: 0.9, island: 0.95, yaba: 1.1, surulere: 1.05, ikeja: 1.1, lekki: 1.35, vi: 1.45 } },
  garri: { name: 'Bag of garri', base: 30000,
    mods: { ikorodu: 0.72, oshodi: 0.85, island: 0.9, surulere: 1.05, ikeja: 1.05, yaba: 1.1, ajegunle: 1.15, lekki: 1.3, vi: 1.35 } },
  ankara: { name: 'Bundle of Ankara', base: 25000,
    mods: { island: 0.7, oshodi: 0.85, ajegunle: 1.0, ikeja: 1.05, yaba: 1.1, ikorodu: 1.1, surulere: 1.25, vi: 1.35, lekki: 1.4 } },
  rice: { name: 'Bag of rice', base: 75000,
    mods: { island: 0.85, oshodi: 0.88, yaba: 1.0, surulere: 1.0, ikeja: 1.0, ajegunle: 1.05, ikorodu: 1.1, lekki: 1.25, vi: 1.3 } },
  phones: { name: 'Tokunbo iPhone', base: 250000, fx: true,
    mods: { ikeja: 0.78, oshodi: 0.92, island: 0.95, yaba: 1.0, surulere: 1.05, vi: 1.1, ajegunle: 1.1, ikorodu: 1.12, lekki: 1.15 } },
};

export const MARKETS = {
  ikorodu: 'Ikorodu Market', ikeja: 'Computer Village stalls', oshodi: 'Oshodi under-bridge market',
  yaba: 'Tejuosho Market', surulere: 'Ojuelegba market', ajegunle: 'Boundary Market',
  island: 'Balogun Market', vi: 'Falomo traders', lekki: 'Lekki Market',
};

// `power` is the chance NEPA takes light on a given night.
export const HOUSES = {
  facemi: { name: 'Face-me-I-face-you room', area: 'ajegunle', yearly: 240000, sleep: 55, mood: -3, power: 0.55, clout: 0 },
  ikorodu: { name: 'Bungalow in Ikorodu', area: 'ikorodu', yearly: 600000, sleep: 72, mood: 1, power: 0.5, clout: 2 },
  selfcon: { name: 'Self-contain in Yaba', area: 'yaba', yearly: 900000, sleep: 70, mood: 0, power: 0.5, clout: 2 },
  miniflat: { name: 'Mini flat in Surulere', area: 'surulere', yearly: 2400000, sleep: 80, mood: 2, power: 0.45, clout: 5 },
  lekki: { name: '2-bedroom flat, Lekki Phase 1', area: 'lekki', yearly: 8000000, sleep: 90, mood: 3, power: 0.35, clout: 12 },
  banana: { name: 'Duplex on Banana Island', area: 'banana', yearly: 40000000, sleep: 100, mood: 6, power: 0, clout: 30, win: true },
};

// Agent fee plus legal fee on top of one year's rent.
export const MOVE_IN_FEE = 0.15;

export const ITEMS = {
  smartphone: { name: 'Smartphone', price: 180000, area: 'ikeja', fx: true,
    blurb: 'Shoot skits, learn on YouTube, trade crypto.' },
  laptop: { name: 'Laptop', price: 450000, area: 'ikeja', fx: true, blurb: 'Needed for tech jobs.' },
  generator: { name: '"I better pass my neighbour" generator', price: 250000, area: 'ikeja',
    blurb: 'Sleep well when NEPA takes light (₦4,000 fuel a night).' },
  car: { name: 'Tokunbo Toyota Corolla', price: 5000000, area: 'ikeja', fx: true, clout: 10,
    blurb: 'Drive yourself. Carry 40 goods instead of 10.' },
};

export const JAPA = { area: 'vi', proofOfFunds: 15000000, fee: 1000000, chance: 0.6 };
export const GEN_FUEL = 4000;
export const CARRY = { base: 10, car: 40 };
