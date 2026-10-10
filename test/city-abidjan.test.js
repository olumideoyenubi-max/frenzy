import { checkCity } from './city-checks.js';

const G = await import('../js/engine.js');
const D = await import('../js/data.js');
checkCity(G, D);
