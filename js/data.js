// Picks the city pack for this page. A page sets globalThis.FRENZY_CITY before loading the game;
// without it, the game is Babi Frenzy (Abidjan).

import * as abidjan from './cities/abidjan.js';
import * as dakar from './cities/dakar.js';

const PACKS = { abidjan, dakar };
export const CITY_ID = PACKS[globalThis.FRENZY_CITY] ? globalThis.FRENZY_CITY : 'abidjan';
const P = PACKS[CITY_ID];

export const {
  AREAS, ROADS, TRANSPORT, JOBS, GOODS, MARKETS, HOUSES, MOVE_IN_MONTHS, ADVANCE_DAYS, ITEMS, SHOP_AREA, JAPA,
  GEN_FUEL, CARRY, TRAITS, DREAMS, BACKGROUNDS, STARTS, AVATAR, FURNITURE, PEOPLE, LEVELS, BUSINESSES, STAFF,
  STREET_LINES, BRAND, DEFAULT_START, PLACES, RAINY_MONTHS, MAP, SCENE, T, GIST, FRIEND_TEXTS, RICH, HELP,
} = P;
