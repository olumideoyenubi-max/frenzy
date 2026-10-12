// Picks the city pack for this page. A page sets globalThis.FRENZY_CITY before loading the game;
// without it, the game is Babi Frenzy (Abidjan).

import * as abidjan from './cities/abidjan.js';
import * as dakar from './cities/dakar.js';
import * as kigali from './cities/kigali.js';

const PACKS = { abidjan, dakar, kigali };
export const CITY_ID = PACKS[globalThis.FRENZY_CITY] ? globalThis.FRENZY_CITY : 'abidjan';
const P = PACKS[CITY_ID];

export const {
  AREAS, ROADS, TRANSPORT, JOBS, GOODS, MARKETS, HOUSES, MOVE_IN_MONTHS, ADVANCE_DAYS, ITEMS, SHOP_AREA, JAPA,
  GEN_FUEL, CARRY, TRAITS, DREAMS, BACKGROUNDS, STARTS, AVATAR, FURNITURE, PEOPLE, LEVELS, BUSINESSES, STAFF,
  STREET_LINES, BRAND, DEFAULT_START, PLACES, RAINY_MONTHS, MAP, SCENE, T, GIST, FRIEND_TEXTS, RICH, HELP,
} = P;

// Optional parts of a pack.
export const MONEY = P.MONEY ?? { code: 'FCFA', rate: 1 };
export const CITY_EVENTS = P.CITY_EVENTS ?? [];
