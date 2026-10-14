import { describe, it, expect } from 'vitest';
import { config } from '../src/data/config.js';
import { gifts, categories } from '../src/data/gifts.js';
import { normalizeGifts } from '../src/data/validate.js';
import { GiftPicker } from '../src/game/GiftPicker.js';
import { createRng } from '../src/game/rng.js';

const { gifts: catalog } = normalizeGifts(gifts, categories);

describe('GiftPicker', () => {
  it('rispetta la probabilità configurata (~75% positivi)', () => {
    const picker = new GiftPicker(catalog, config.gifts, createRng(42));
    let positive = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (picker.pick({ progress: 0.5 }).type === 'positive') positive++;
    const ratio = positive / n;
    // La regola anti-serie spinge leggermente sopra 0.75
    expect(ratio).toBeGreaterThan(0.73);
    expect(ratio).toBeLessThan(0.82);
  });

  it('non genera mai più negativi consecutivi del massimo', () => {
    const cfg = { ...config.gifts, positiveChance: 0 };
    const picker = new GiftPicker(catalog, cfg, createRng(7));
    let streak = 0;
    let maxStreak = 0;
    for (let i = 0; i < 2000; i++) {
      const g = picker.pick();
      streak = g.type === 'negative' ? streak + 1 : 0;
      maxStreak = Math.max(maxStreak, streak);
    }
    expect(maxStreak).toBe(cfg.maxNegativeStreak);
  });

  it('forcePositive restituisce sempre un positivo', () => {
    const cfg = { ...config.gifts, positiveChance: 0 };
    const picker = new GiftPicker(catalog, cfg, createRng(3));
    for (let i = 0; i < 500; i++) expect(picker.pick({ forcePositive: true }).type).toBe('positive');
  });

  it('i regali rari compaiono ma restano una minoranza', () => {
    const picker = new GiftPicker(catalog, config.gifts, createRng(11));
    let rare = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) if (picker.pick({ progress: 1 }).rarity === 'rare') rare++;
    expect(rare).toBeGreaterThan(n * 0.03);
    expect(rare).toBeLessThan(n * 0.2);
  });

  it('evita le ripetizioni immediate più di una scelta casuale', () => {
    const picker = new GiftPicker(catalog, config.gifts, createRng(5));
    let repeats = 0;
    let prev = null;
    for (let i = 0; i < 5000; i++) {
      const g = picker.pick();
      if (prev && prev.id === g.id) repeats++;
      prev = g;
    }
    expect(repeats / 5000).toBeLessThan(0.04);
  });

  it('funziona anche senza sorprese negative o rare', () => {
    const onlyPositive = catalog.filter((g) => g.type === 'positive' && g.rarity !== 'rare');
    const picker = new GiftPicker(onlyPositive, config.gifts, createRng(1));
    for (let i = 0; i < 200; i++) expect(picker.pick({ progress: 1 }).type).toBe('positive');
  });
});
