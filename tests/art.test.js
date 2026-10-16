import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { settings, giftCatalog, categoryCatalog } from '../src/data/index.js';
import { buildArtCatalog, boxKeyFor } from '../src/art/index.js';
import { placeholderPortraitSvg } from '../src/art/placeholderPortrait.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Controllo minimo di buona formazione XML: tag bilanciati e attributi chiusi. */
function checkWellFormed(svg) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  let consumed = 0;
  let m;
  while ((m = re.exec(svg))) {
    const [full, closing, name, , selfClosing] = m;
    if (svg.slice(consumed, m.index).includes('<')) return `testo con "<" inatteso prima di ${full}`;
    consumed = m.index + full.length;
    if (selfClosing) continue;
    if (closing) {
      if (stack.pop() !== name) return `tag di chiusura </${name}> non corrisponde`;
    } else stack.push(name);
  }
  if (svg.slice(consumed).trim()) return 'contenuto dopo l’ultimo tag';
  return stack.length ? `tag non chiusi: ${stack.join(',')}` : null;
}

describe('arte procedurale', () => {
  // con il cappellino attivo, così il catalogo contiene tutte le texture possibili
  const art = buildArtCatalog({ character: { ...settings.character, accessory: 'partyHat' }, categories: categoryCatalog, gifts: giftCatalog, categoryHints: true });

  it('ogni SVG è ben formato, con dimensioni valide e senza valori sporchi', () => {
    for (const [key, item] of Object.entries(art)) {
      expect(item.svg.startsWith('<svg '), `${key}: deve iniziare con <svg`).toBe(true);
      expect(checkWellFormed(item.svg), `${key}: XML non ben formato`).toBeNull();
      expect(item.svg, `${key}: contiene NaN`).not.toMatch(/NaN|undefined|Infinity/);
      expect(item.svg, `${key}: width/height mancanti`).toMatch(new RegExp(`width="${item.w}" height="${item.h}"`));
      expect(item.w).toBeGreaterThan(0);
      expect(item.h).toBeGreaterThan(0);
      expect(item.origin[0]).toBeGreaterThanOrEqual(0);
      expect(item.origin[1]).toBeLessThanOrEqual(1);
    }
  });

  it('ogni riferimento a gradienti, filtri e clip esiste e gli id non sono duplicati', () => {
    for (const [key, item] of Object.entries(art)) {
      const ids = [...item.svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size, `${key}: id duplicati`).toBe(ids.length);
      const refs = [...item.svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
      for (const ref of refs) expect(ids, `${key}: manca #${ref}`).toContain(ref);
    }
  });

  it('esistono tutte le texture citate nel codice di gioco', () => {
    const dir = join(root, 'src', 'game');
    const used = new Set();
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
      const text = readFileSync(join(dir, file), 'utf8');
      for (const m of text.matchAll(/['"`]((?:c|fx|big|ob|sc)-[A-Za-z-]+)['"`]/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(30);
    for (const key of used) expect(art, `texture mancante: ${key}`).toHaveProperty(key);
  });

  it('ogni regalo ha il suo pacco (con e senza suggerimenti di categoria)', () => {
    for (const gift of giftCatalog) expect(art, `pacco di ${gift.id}`).toHaveProperty(boxKeyFor(gift, true));
    const mystery = buildArtCatalog({ character: settings.character, categories: categoryCatalog, gifts: giftCatalog, categoryHints: false });
    for (const gift of giftCatalog) expect(mystery, `pacco misterioso di ${gift.id}`).toHaveProperty(boxKeyFor(gift, false));
  });

  it('il cappellino manca solo se l’accessorio è disattivato', () => {
    const hat = buildArtCatalog({ character: { ...settings.character, accessory: 'partyHat' }, categories: categoryCatalog, gifts: giftCatalog });
    const none = buildArtCatalog({ character: { ...settings.character, accessory: 'none' }, categories: categoryCatalog, gifts: giftCatalog });
    expect(hat).toHaveProperty('c-hat');
    expect(none).not.toHaveProperty('c-hat');
  });

  it('i ritratti segnaposto sono ben formati per tutti i regali e tolgono i caratteri speciali dal nome', () => {
    for (const gift of giftCatalog) {
      const cat = categoryCatalog[gift.category];
      const svg = placeholderPortraitSvg({ name: gift.name, color: cat.color, symbol: cat.symbol, type: gift.type, size: 256 });
      expect(checkWellFormed(svg), gift.id).toBeNull();
      expect(svg).toContain('PLACEHOLDER');
    }
    const tricky = placeholderPortraitSvg({ name: 'A <b>&"\'</b> molto molto molto lungo da tagliare davvero' });
    expect(checkWellFormed(tricky)).toBeNull();
    expect(tricky).not.toContain('<b>');
  });
});
