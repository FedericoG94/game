/**
 * Punto unico di accesso ai dati del gioco: configurazione e regali già
 * controllati. Il codice di gioco importa SEMPRE da qui, mai da config.js/gifts.js.
 */
import { config as rawConfig } from './config.js';
import { gifts as rawGifts, categories as rawCategories } from './gifts.js';
import { normalizeConfig, normalizeGifts } from './validate.js';

const cfgResult = normalizeConfig(rawConfig, rawConfig);
const giftResult = normalizeGifts(rawGifts, rawCategories);

export const settings = cfgResult.config;
export const giftCatalog = giftResult.gifts;
export const categoryCatalog = giftResult.categories;
export const dataWarnings = [...cfgResult.warnings, ...giftResult.warnings];

if (dataWarnings.length && typeof console !== 'undefined') {
  console.warn(`[Carlotta's Gift Run] ${dataWarnings.length} avvisi sui dati:\n - ${dataWarnings.join('\n - ')}`);
}
